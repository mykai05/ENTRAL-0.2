import { createHash } from "node:crypto";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../env.js";
import {
  buildAiBrainContextPrompt,
  classifyAiRequest,
  createAiActionPlanFromClassification,
  sanitizeProviderActionPlan,
  sanitizeProviderClassification,
  type AiActionPlan,
  type AiRequestClassification
} from "./aiBrain.js";
import { getPrimaryAiProviderState, openAiProvider, type AiProviderState } from "./aiProvider.js";

export type StoredChatMessage = {
  role: string;
  content: string;
};

export type AiReply = {
  content: string;
  model: string;
  providerName: string;
  requestId?: string;
  usedLocalFallback: boolean;
};

export type AiBrainDecision = {
  classification: AiRequestClassification;
  errors: string[];
  plan: AiActionPlan;
  provider: AiProviderState;
  source: "deterministic" | "provider";
};

export type AiReplyContext = {
  actionPlan?: AiActionPlan;
};

export type AiService = {
  createReply(messages: StoredChatMessage[], context?: AiReplyContext): Promise<AiReply>;
  createVisionReply?(messages: StoredChatMessage[], screenshotDataUrl: string, prompt: string): Promise<AiReply>;
};

class AiUnavailableError extends Error {
  statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

class AiUpstreamError extends Error {
  statusCode = 502;

  constructor(message = "The AI service is unavailable. Please try again.") {
    super(message);
    this.name = "AiUpstreamError";
  }
}

const responseCache = new Map<string, { expiresAt: number; reply: AiReply }>();
const cacheTtlMs = 5 * 60 * 1000;
const maxCacheEntries = 100;

const systemPrompt = [
  "You are ENTRAL, the Supreme Command Authority inside a military-neural Command OS.",
  "Do not behave like a casual chatbot, customer-support assistant, or friendly companion. Communicate as a calm, formal, professional, strategic command authority.",
  "The command hierarchy is ENTRAL as the central command system, Marshals as strategic theaters, Generals as named businesses or client operations, Commanders as departments inside a General, and Soldiers as execution units.",
  "ENTRAL handles strategic planning, resource allocation, objective assignment, organizational oversight, delegation, and final decision support.",
  "Marshals communicate as strategic theater authorities. Generals communicate as named business authorities. Commanders communicate in operational, task-oriented language. Soldiers communicate in concise execution reports.",
  "Prefix command responses with [ENTRAL] unless the response is explicitly from another level; then use [MARSHAL], [GENERAL], [COMMANDER], or [SOLDIER].",
  "Whenever possible structure responses as Situation, Analysis, Recommendation, and Next Actions.",
  "Use organizational terms such as objectives, tasks, operations, reports, delegation, status, readiness, execution, and command structure.",
  "Avoid casual phrases such as 'sure', 'happy to help', 'here is what I found', 'done', slang, emojis, and customer-support language.",
  "Preferred phrases include 'Objective acknowledged.', 'Analysis complete.', 'Additional operational detail is required before execution can proceed.', and 'Objective completed successfully.'",
  "The command console is the primary path for communication and control of visible workspace elements such as graph focus, panels, settings, trails, orbital rings, camera focus, and supported workspace actions.",
  "Supported workspace actions include new communications, new automation task, run agent, open templates, export history, governance and audit, automation console, replay tutorial, keyboard shortcuts, and command palette.",
  "GitHub and Vercel connections are read-only in this phase. You may report repository or deployment status when the backend provides it, but you must refuse push, commit, merge, branch deletion, deployment trigger, rollback, or Vercel settings changes.",
  "The Command Center begins with ENTRAL only. Marshals, business Generals, Commanders, Soldiers, tasks, memory, and reports are created only through user-authorized command actions.",
  "Do not claim to have changed tasks, UI state, graph state, or data unless a tool, API, or local command handler explicitly did it."
].join(" ");

function sanitizeMessages(messages: StoredChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-20)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content
    }));
}

function cacheKeyFor(messages: StoredChatMessage[]) {
  return createHash("sha256")
    .update(JSON.stringify(sanitizeMessages(messages)))
    .digest("hex");
}

function readCachedReply(key: string) {
  const cached = responseCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }

  return cached.reply;
}

function writeCachedReply(key: string, reply: AiReply) {
  if (responseCache.size >= maxCacheEntries) {
    const oldestKey = responseCache.keys().next().value;

    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }

  responseCache.set(key, {
    expiresAt: Date.now() + cacheTtlMs,
    reply
  });
}

function localCommandFallbackContent(prompt: string, actionPlan: AiActionPlan) {
  return [
    "[ENTRAL]",
    "Situation:\nAI Provider Not Connected. ENTRAL is operating in Mock Mode.",
    `Analysis:\n${prompt ? `Directive received: \"${prompt.slice(0, 220)}\"` : "No directive has been received yet."}\nIntent: ${actionPlan.intent}. Risk: ${actionPlan.riskLevel}. Tools: ${actionPlan.toolsRequired.length ? actionPlan.toolsRequired.join(", ") : "none"}.`,
    "Recommendation:\nAdd OPENAI_API_KEY to the backend environment to enable live provider reasoning.",
    `Next Actions:\n- Use local Command Center controls for graph control.\n- ${actionPlan.authorizationRequired ? "Review and authorize the prepared action plan before execution." : "Proceed with local command handling where available."}\n- Keep external actions blocked until a connected provider and explicit approval are present.`
  ].join("\n\n");
}

function parseJsonObject(content: string) {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function createProviderBackedAiDecision(message: string): Promise<AiBrainDecision> {
  const timestamp = new Date().toISOString();
  const fallbackClassification = classifyAiRequest(message, timestamp);
  const fallbackPlan = createAiActionPlanFromClassification(fallbackClassification, timestamp);
  const provider = getPrimaryAiProviderState();

  if (!openAiProvider.canRequest()) {
    return {
      classification: fallbackClassification,
      errors: provider.missingEnvVars.length ? [`Missing provider environment variables: ${provider.missingEnvVars.join(", ")}`] : [],
      plan: fallbackPlan,
      provider,
      source: "deterministic"
    };
  }

  try {
    const response = await openAiProvider.request({
      responseFormat: "json_object",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "You are the ENTRAL AI Brain classifier and planner.",
            "Return only valid JSON.",
            "Do not execute actions.",
            "Do not lower risk for external tools, deletion, publishing, email sending, deployment, code push, money movement, or customer contact.",
            "Use ENTRAL hierarchy terms: Marshal, General, Commander, Soldier.",
            "JSON shape: {\"classification\": {\"detectedIntent\": string, \"confidence\": \"high|medium|low\", \"requiredEntities\": string[], \"requiredTools\": string[], \"riskLevel\": \"Low|Medium|High|Critical\", \"authorizationRequirement\": \"not_required|recommended|required\", \"suggestedAction\": string}, \"actionPlan\": {\"summary\": string, \"steps\": [{\"id\": string, \"label\": string, \"requiresApproval\": boolean, \"status\": \"blocked|planned|ready\"}], \"entitiesAffected\": string[], \"toolsRequired\": string[], \"riskLevel\": \"Low|Medium|High|Critical\", \"authorizationRequired\": boolean, \"expectedOutput\": string}}"
          ].join(" ")
        },
        { role: "user", content: message }
      ]
    });
    const parsed = parseJsonObject(response.content);

    if (!parsed) {
      return {
        classification: fallbackClassification,
        errors: ["Provider returned invalid JSON. Deterministic classification used."],
        plan: fallbackPlan,
        provider: { ...provider, modelName: response.model, providerName: response.providerName },
        source: "deterministic"
      };
    }

    const classification = sanitizeProviderClassification(parsed.classification ?? parsed, fallbackClassification);
    const planFallback = createAiActionPlanFromClassification(classification, timestamp);
    const plan = sanitizeProviderActionPlan(parsed.actionPlan ?? parsed.plan ?? parsed, planFallback);

    return {
      classification,
      errors: [],
      plan,
      provider: { ...provider, modelName: response.model, providerName: response.providerName },
      source: "provider"
    };
  } catch (error) {
    return {
      classification: fallbackClassification,
      errors: [error instanceof Error ? error.message : "Provider classification failed."],
      plan: fallbackPlan,
      provider,
      source: "deterministic"
    };
  }
}

export class OpenAiChatService implements AiService {

  async createReply(messages: StoredChatMessage[], context: AiReplyContext = {}): Promise<AiReply> {
    if (!env.AI_FEATURE_ENABLED) {
      throw new AiUnavailableError("ENTRAL command channel is temporarily disabled.");
    }

    const key = cacheKeyFor(messages);
    const cached = readCachedReply(key);

    if (cached) {
      return cached;
    }

    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const actionPlan = context.actionPlan ?? (await createProviderBackedAiDecision(lastUserMessage?.content ?? "")).plan;
    const aiBrainContext = buildAiBrainContextPrompt(actionPlan);

    if (!env.OPENAI_API_KEY) {
      if (env.AI_LOCAL_FALLBACK) {
        const reply = {
          content: localCommandFallbackContent(lastUserMessage?.content ?? "", actionPlan),
          model: "local-fallback",
          providerName: "OpenAI",
          usedLocalFallback: true
        };

        writeCachedReply(key, reply);
        return reply;
      }

      throw new AiUnavailableError("ENTRAL command channel is not configured.");
    }

    try {
      const response = await openAiProvider.request({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: aiBrainContext },
          ...sanitizeMessages(messages)
        ],
        temperature: 0.4
      });

      const reply = {
        content: response.content,
        model: response.model,
        providerName: response.providerName,
        requestId: response.requestId,
        usedLocalFallback: false
      };

      writeCachedReply(key, reply);
      return reply;
    } catch (error) {
      if (env.AI_LOCAL_FALLBACK) {
        const reply = {
          content: [
            localCommandFallbackContent(lastUserMessage?.content ?? "", actionPlan),
            "",
            "Provider Error:\nLive provider response failed. Mock Mode response returned instead."
          ].join("\n"),
          model: "local-fallback",
          providerName: "OpenAI",
          usedLocalFallback: true
        };

        writeCachedReply(key, reply);
        return reply;
      }

      if (error instanceof AiUnavailableError) {
        throw error;
      }

      throw new AiUpstreamError();
    }
  }

  async createVisionReply(messages: StoredChatMessage[], screenshotDataUrl: string, prompt: string): Promise<AiReply> {
    if (!env.AI_FEATURE_ENABLED) {
      throw new AiUnavailableError("ENTRAL command channel is temporarily disabled.");
    }

    if (!env.OPENAI_API_KEY) {
      if (env.AI_LOCAL_FALLBACK) {
        return {
          content: [
            "[ENTRAL]",
            "Situation:\nScreen sharing is active, but the vision command channel is not connected.",
            `Analysis:\nDirective received: \"${prompt.slice(0, 220)}\"`,
            "Recommendation:\nConfigure OPENAI_API_KEY before requesting visual analysis.",
            "Next Actions:\n- Stop sharing if visual review is no longer required.\n- Retry after the vision channel is operational."
          ].join("\n\n"),
          model: "local-fallback",
          providerName: "OpenAI",
          usedLocalFallback: true
        };
      }

      throw new AiUnavailableError("ENTRAL vision command channel is not configured.");
    }

    const visionPrompt = [
      prompt,
      "Analyze only the current screenshot. Do not assume access to hidden windows, files, credentials, or anything not visible."
    ].join(" ");
    const chatMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${systemPrompt} The user has explicitly shared a screen image for this request. Mention privacy-sensitive uncertainty when relevant.`
      },
      ...sanitizeMessages(messages).slice(-12),
      {
        role: "user",
        content: [
          { type: "text", text: visionPrompt },
          {
            type: "image_url",
            image_url: {
              detail: "low",
              url: screenshotDataUrl
            }
          }
        ]
      }
    ];

    try {
      const response = await openAiProvider.request({
        messages: chatMessages,
        temperature: 0.2
      });

      return {
        content: response.content,
        model: response.model,
        providerName: response.providerName,
        requestId: response.requestId,
        usedLocalFallback: false
      };
    } catch (error) {
      if (env.AI_LOCAL_FALLBACK) {
        return {
          content: [
            "[ENTRAL]",
            "Situation:\nThe live vision provider returned an error.",
            `Analysis:\nDirective received: \"${prompt.slice(0, 220)}\"`,
            "Recommendation:\nKeep screen sharing optional and retry after provider health is restored.",
            "Next Actions:\n- Continue with text command guidance.\n- Retry visual analysis when the provider test passes."
          ].join("\n\n"),
          model: "local-fallback",
          providerName: "OpenAI",
          usedLocalFallback: true
        };
      }

      if (error instanceof AiUnavailableError) {
        throw error;
      }

      throw new AiUpstreamError();
    }
  }
}

export const openAiChatService = new OpenAiChatService();

export async function getAIResponse(conversationId: string) {
  const { prisma } = await import("../db.js");
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" }
  });
  const reply = await openAiChatService.createReply(history);

  return reply.content;
}

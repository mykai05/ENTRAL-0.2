import { createHash } from "node:crypto";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../env.js";

export type StoredChatMessage = {
  role: string;
  content: string;
};

export type AiReply = {
  content: string;
  model: string;
  requestId?: string;
  usedLocalFallback: boolean;
};

export type AiService = {
  createReply(messages: StoredChatMessage[]): Promise<AiReply>;
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
  "Generals communicate in executive, analytical, report-focused language. Commanders communicate in operational, task-oriented language. Soldiers communicate in concise execution reports.",
  "Prefix command responses with [ENTRAL] unless the response is explicitly from another level; then use [GENERAL], [COMMANDER], or [SOLDIER].",
  "Whenever possible structure responses as Situation, Analysis, Recommendation, and Next Actions.",
  "Use organizational terms such as objectives, tasks, operations, reports, delegation, status, readiness, execution, and command structure.",
  "Avoid casual phrases such as 'sure', 'happy to help', 'here is what I found', 'done', slang, emojis, and customer-support language.",
  "Preferred phrases include 'Objective acknowledged.', 'Analysis complete.', 'Additional operational detail is required before execution can proceed.', and 'Objective completed successfully.'",
  "The command console is the primary path for communication and control of visible workspace elements such as graph focus, panels, settings, trails, orbital rings, camera focus, and supported workspace actions.",
  "Supported workspace actions include new chat, new task, run agent, open templates, export history, governance dashboard, automation console, replay tutorial, keyboard shortcuts, and command palette.",
  "The dashboard exposes a local Command OS hierarchy seeded with a Merch Marshal, an ENTRAL business General, operating Commanders, and execution Soldiers. Real autonomous execution remains policy-gated until explicitly wired.",
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

export class OpenAiChatService implements AiService {
  private client?: OpenAI;

  async createReply(messages: StoredChatMessage[]): Promise<AiReply> {
    if (!env.AI_FEATURE_ENABLED) {
      throw new AiUnavailableError("ENTRAL command channel is temporarily disabled.");
    }

    const key = cacheKeyFor(messages);
    const cached = readCachedReply(key);

    if (cached) {
      return cached;
    }

    if (!env.OPENAI_API_KEY) {
      if (env.NODE_ENV !== "production" && env.AI_LOCAL_FALLBACK) {
        const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

        const reply = {
          content: [
            "[ENTRAL]",
            "Situation:\nLive AI command channel is not connected.",
            `Analysis:\n${lastUserMessage ? `Directive received: \"${lastUserMessage.content.slice(0, 220)}\"` : "No directive has been received yet."}`,
            "Recommendation:\nAdd OPENAI_API_KEY to the backend environment and restart ENTRAL before requesting live strategic analysis.",
            "Next Actions:\n- Use local dashboard commands for graph control.\n- Restore the OpenAI channel when external reasoning is required."
          ].join("\n\n"),
          model: "local-fallback",
          usedLocalFallback: true
        };

        writeCachedReply(key, reply);
        return reply;
      }

      throw new AiUnavailableError("ENTRAL command channel is not configured.");
    }

    this.client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });

    try {
      const response = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...sanitizeMessages(messages)
        ],
        temperature: 0.4
      });

      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new AiUnavailableError("The AI service returned an empty response.");
      }

      const reply = {
        content,
        model: response.model,
        requestId: response._request_id ?? undefined,
        usedLocalFallback: false
      };

      writeCachedReply(key, reply);
      return reply;
    } catch (error) {
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
      if (env.NODE_ENV !== "production" && env.AI_LOCAL_FALLBACK) {
        return {
          content: [
            "[ENTRAL]",
            "Situation:\nScreen sharing is active, but the vision command channel is not configured in this local environment.",
            `Analysis:\nDirective received: \"${prompt.slice(0, 220)}\"`,
            "Recommendation:\nConfigure OPENAI_API_KEY before requesting visual analysis.",
            "Next Actions:\n- Stop sharing if visual review is no longer required.\n- Retry after the vision channel is operational."
          ].join("\n\n"),
          model: "local-fallback",
          usedLocalFallback: true
        };
      }

      throw new AiUnavailableError("ENTRAL vision command channel is not configured.");
    }

    this.client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });

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
      const response = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: chatMessages,
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new AiUnavailableError("The AI service returned an empty response.");
      }

      return {
        content,
        model: response.model,
        requestId: response._request_id ?? undefined,
        usedLocalFallback: false
      };
    } catch (error) {
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

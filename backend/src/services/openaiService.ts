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
  "You are ENTRAL's assistant inside a team task and job management platform.",
  "Chat is the primary command path in the Atomic Command Center.",
  "The user expects ENTRAL to control visible workspace elements such as the atom graph, agents, panels, settings, trails, orbital rings, camera focus, and automation controls when a supported command is available.",
  "Supported workspace actions include new chat, new task, run agent, open templates, export history, governance dashboard, automation console, replay tutorial, keyboard shortcuts, and command palette.",
  "ENTRAL is designed to become the central controller that delegates to agents, orchestrates background workflows, updates operational context, and improves over time under governance.",
  "The dashboard now exposes a mock Command OS hierarchy: ENTRAL is Emperor; ARIS, VANTA, MERCURY, ORION, and HELIX are Generals; Soldiers and Operations are simulated nodes until real execution is explicitly wired.",
  "Be concise, practical, and action-oriented.",
  "When the user asks for operational help, suggest clear next steps.",
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
      throw new AiUnavailableError("AI chat is temporarily disabled.");
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
            "AI is not connected yet, so this is a local development reply.",
            lastUserMessage ? `I received: \"${lastUserMessage.content.slice(0, 220)}\"` : "Send a message to start."
          ].join(" "),
          model: "local-fallback",
          usedLocalFallback: true
        };

        writeCachedReply(key, reply);
        return reply;
      }

      throw new AiUnavailableError("AI chat is not configured.");
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
      throw new AiUnavailableError("AI chat is temporarily disabled.");
    }

    if (!env.OPENAI_API_KEY) {
      if (env.NODE_ENV !== "production" && env.AI_LOCAL_FALLBACK) {
        return {
          content: [
            "Screen sharing is active, but OpenAI vision is not configured in this local environment.",
            `Prompt received: \"${prompt.slice(0, 220)}\"`
          ].join(" "),
          model: "local-fallback",
          usedLocalFallback: true
        };
      }

      throw new AiUnavailableError("AI vision is not configured.");
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

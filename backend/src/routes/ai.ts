import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  chatMessageSchema,
  conversationIdParamsSchema,
  createConversationSchema,
  importConversationsSchema,
  screenInsightSchema
} from "../schemas.js";
import { openAiChatService, type AiReply, type AiService } from "../services/openaiService.js";

type AiRoutesOptions = {
  aiService?: AiService;
};

function conversationTitle(message: string) {
  return message.length > 58 ? `${message.slice(0, 58)}...` : message;
}

async function assertConversationOwner(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId
    }
  });
}

export async function aiRoutes(app: FastifyInstance, options: AiRoutesOptions = {}) {
  const aiService = options.aiService ?? openAiChatService;

  app.get("/ai/conversations", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: currentUser.sub },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return reply.send({
      items: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title ?? "New chat",
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessage: conversation.messages[0]?.content ?? null
      }))
    });
  });

  app.post("/ai/conversations", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = createConversationSchema.parse(request.body ?? {});
    const conversation = await prisma.conversation.create({
      data: {
        userId: currentUser.sub,
        title: input.title ?? "New chat"
      }
    });

    return reply.code(201).send({ conversation });
  });

  app.post("/ai/conversations/import", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = importConversationsSchema.parse(request.body);
    const conversations = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const item of input.conversations) {
        const conversation = await tx.conversation.create({
          data: {
            userId: currentUser.sub,
            title: item.title ?? "Imported chat",
            messages: item.messages?.length ? {
              create: item.messages.map((message) => ({
                content: message.content,
                role: message.role
              }))
            } : undefined
          }
        });
        created.push(conversation);
      }

      return created;
    });

    return reply.code(201).send({ conversations });
  });

  app.get("/ai/conversations/:conversationId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = conversationIdParamsSchema.parse(request.params);
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        userId: currentUser.sub
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!conversation) {
      return reply.code(404).send({ error: "Not Found", message: "Conversation was not found." });
    }

    return reply.send({ conversation });
  });

  app.delete("/ai/conversations/:conversationId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = conversationIdParamsSchema.parse(request.params);
    const conversation = await assertConversationOwner(params.conversationId, currentUser.sub);

    if (!conversation) {
      return reply.code(404).send({ error: "Not Found", message: "Conversation was not found." });
    }

    await prisma.conversation.delete({ where: { id: conversation.id } });
    return reply.send({ ok: true });
  });

  app.post("/ai/chat", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = chatMessageSchema.parse(request.body);
    const startedAt = performance.now();

    const result = await prisma.$transaction(async (tx) => {
      const conversation = input.conversationId
        ? await tx.conversation.findFirst({
          where: {
            id: input.conversationId,
            userId: currentUser.sub
          }
        })
        : await tx.conversation.create({
          data: {
            userId: currentUser.sub,
            title: conversationTitle(input.message)
          }
        });

      if (!conversation) {
        throw Object.assign(new Error("Conversation was not found."), { statusCode: 404 });
      }

      const userMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: input.message
        }
      });

      if (!conversation.title || conversation.title === "New chat") {
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { title: conversationTitle(input.message) }
        });
      }

      return { conversation, userMessage };
    });

    const history = await prisma.message.findMany({
      where: { conversationId: result.conversation.id },
      orderBy: { createdAt: "asc" },
      take: 40
    });

    let aiReply: AiReply;

    try {
      aiReply = await aiService.createReply(history);
    } catch (error) {
      await prisma.message.delete({ where: { id: result.userMessage.id } }).catch(() => undefined);
      throw error;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: result.conversation.id,
        role: "assistant",
        content: aiReply.content
      }
    });

    await prisma.conversation.update({
      where: { id: result.conversation.id },
      data: { updatedAt: new Date() }
    });

    request.log.info({
      conversationId: result.conversation.id,
      userMessageId: result.userMessage.id,
      assistantMessageId: assistantMessage.id,
      aiModel: aiReply.model,
      openAiRequestId: aiReply.requestId,
      usedLocalFallback: aiReply.usedLocalFallback,
      latencyMs: Math.round(performance.now() - startedAt)
    }, "AI chat completed");

    return reply.send({
      conversationId: result.conversation.id,
      messageId: assistantMessage.id,
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt,
      userMessage: {
        messageId: result.userMessage.id,
        content: result.userMessage.content,
        createdAt: result.userMessage.createdAt
      }
    });
  });

  app.post("/ai/screen", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 12,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    if (!aiService.createVisionReply) {
      return reply.code(503).send({ error: "Unavailable", message: "Screen analysis is not available." });
    }

    const input = screenInsightSchema.parse(request.body);
    const startedAt = performance.now();

    const result = await prisma.$transaction(async (tx) => {
      const conversation = input.conversationId
        ? await tx.conversation.findFirst({
          where: {
            id: input.conversationId,
            userId: currentUser.sub
          }
        })
        : await tx.conversation.create({
          data: {
            userId: currentUser.sub,
            title: conversationTitle(input.message)
          }
        });

      if (!conversation) {
        throw Object.assign(new Error("Conversation was not found."), { statusCode: 404 });
      }

      const userMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: input.message
        }
      });

      if (!conversation.title || conversation.title === "New chat") {
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { title: conversationTitle(input.message) }
        });
      }

      return { conversation, userMessage };
    });

    const history = await prisma.message.findMany({
      where: { conversationId: result.conversation.id },
      orderBy: { createdAt: "asc" },
      take: 30
    });

    let aiReply: AiReply;

    try {
      aiReply = await aiService.createVisionReply(history, input.screenshot, input.prompt ?? input.message);
    } catch (error) {
      await prisma.message.delete({ where: { id: result.userMessage.id } }).catch(() => undefined);
      throw error;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: result.conversation.id,
        role: "assistant",
        content: aiReply.content
      }
    });

    await prisma.conversation.update({
      where: { id: result.conversation.id },
      data: { updatedAt: new Date() }
    });

    request.log.info({
      conversationId: result.conversation.id,
      userMessageId: result.userMessage.id,
      assistantMessageId: assistantMessage.id,
      aiModel: aiReply.model,
      openAiRequestId: aiReply.requestId,
      usedLocalFallback: aiReply.usedLocalFallback,
      latencyMs: Math.round(performance.now() - startedAt)
    }, "AI screen analysis completed");

    return reply.send({
      conversationId: result.conversation.id,
      messageId: assistantMessage.id,
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt,
      userMessage: {
        messageId: result.userMessage.id,
        content: result.userMessage.content,
        createdAt: result.userMessage.createdAt
      }
    });
  });
}

import type { FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  chatMessageSchema,
  conversationIdParamsSchema,
  createConversationSchema,
  importConversationsSchema,
  screenInsightSchema
} from "../schemas.js";
import { openAiChatService, createProviderBackedAiDecision, type AiReply, type AiService } from "../services/openaiService.js";
import { createAiAuditEntry, type AiActionPlan } from "../services/aiBrain.js";
import { recordAuditLog } from "../services/audit.js";
import {
  AiUsageLimitError,
  assertAiUsageAllowed,
  getAiUsageSummary,
  recordAiUsageEvent,
  type AiUsageRequestKind
} from "../services/aiUsage.js";
import {
  buildDevelopmentStatusAuditEntry,
  createDevelopmentStatusReport,
  createReadOnlyWriteRefusal,
  isDevelopmentStatusRequest,
  isDevelopmentWriteActionRequest
} from "../services/developmentConnections.js";

type AiRoutesOptions = {
  aiService?: AiService;
};

function conversationTitle(message: string) {
  return message.length > 58 ? `${message.slice(0, 58)}...` : message;
}

function auditSeverityFor(plan: AiActionPlan) {
  if (plan.riskLevel === "Critical") return "critical";
  if (plan.riskLevel === "High") return "high";
  if (plan.riskLevel === "Medium") return "medium";
  return "info";
}

function sendAiUsageLimit(reply: FastifyReply, error: AiUsageLimitError) {
  return reply.code(error.statusCode).send({
    error: "Usage Limit Reached",
    message: error.message,
    mode: "real",
    summary: error.summary
  });
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

  app.get("/ai/usage", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    return reply.send({
      summary: await getAiUsageSummary(currentUser.sub)
    });
  });

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
        title: conversation.title ?? "New thread",
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
        title: input.title ?? "New thread"
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
            title: item.title ?? "Imported thread",
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
    const requestKind: AiUsageRequestKind = isDevelopmentWriteActionRequest(input.message)
      ? "development_write_refusal"
      : isDevelopmentStatusRequest(input.message) ? "development_status" : "chat";
    let usagePreflight: Awaited<ReturnType<typeof assertAiUsageAllowed>>;

    try {
      usagePreflight = await assertAiUsageAllowed(currentUser.sub, requestKind);
    } catch (error) {
      if (error instanceof AiUsageLimitError) {
        return sendAiUsageLimit(reply, error);
      }

      throw error;
    }

    const startedAt = performance.now();
    const brainDecision = await createProviderBackedAiDecision(input.message);
    const brainPlan = brainDecision.plan;

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

      if (!conversation.title || conversation.title === "New chat" || conversation.title === "New thread") {
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
      if (isDevelopmentWriteActionRequest(input.message)) {
        aiReply = {
          content: createReadOnlyWriteRefusal(),
          model: "read-only-development-policy",
          providerName: "ENTRAL Development Monitor",
          usedLocalFallback: false
        };
      } else if (isDevelopmentStatusRequest(input.message)) {
        const developmentReport = await createDevelopmentStatusReport(input.message);
        await Promise.all(developmentReport.checks.map((result) => recordAuditLog(buildDevelopmentStatusAuditEntry({
          actorRole: currentUser.role,
          actorUserId: currentUser.sub,
          requestId: request.id,
          result,
          userRequest: input.message
        })).catch((error) => {
          request.log.warn({ err: error, toolId: result.toolId }, "Development status audit log write failed");
        })));
        aiReply = {
          content: developmentReport.content,
          model: "read-only-development-status",
          providerName: "ENTRAL Development Monitor",
          usedLocalFallback: false
        };
      } else {
        aiReply = await aiService.createReply(history, { actionPlan: brainPlan });
      }
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
    const usageEvent = await recordAiUsageEvent({
      estimatedCostCents: usagePreflight.estimatedCostCents,
      metadata: {
        authorizationRequired: brainPlan.authorizationRequired,
        intent: brainPlan.intent,
        riskLevel: brainPlan.riskLevel,
        source: brainDecision.source,
        toolsRequired: brainPlan.toolsRequired
      },
      modelName: aiReply.model,
      providerName: aiReply.providerName,
      requestId: request.id,
      requestKind,
      usedLocalFallback: aiReply.usedLocalFallback,
      userId: currentUser.sub
    });

    const brainAuditEntry = createAiAuditEntry({
      errors: brainDecision.errors,
      executionResult: brainPlan.authorizationRequired
        ? "Plan prepared. Authorization required before execution."
        : "Plan prepared. No external action executed.",
      modelName: aiReply.model,
      plan: brainPlan,
      providerName: aiReply.providerName
    });

    await recordAuditLog({
      action: "ai.command.planned",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        authorizationRequired: brainPlan.authorizationRequired,
        classification: brainDecision.classification,
        decisionSource: brainDecision.source,
        errors: brainDecision.errors,
        model: aiReply.model,
        plan: brainPlan,
        provider: aiReply.providerName,
        providerStatus: brainDecision.provider.connectionStatus,
        usage: {
          estimatedCostCents: usageEvent.estimatedCostCents,
          eventId: usageEvent.id,
          requestKind
        },
        userMessage: input.message,
        usedLocalFallback: aiReply.usedLocalFallback
      },
      outcome: "success",
      requestId: request.id,
      severity: auditSeverityFor(brainPlan),
      targetId: result.conversation.id,
      targetType: "ai_conversation"
    }).catch((error) => {
      request.log.warn({ err: error, conversationId: result.conversation.id }, "AI audit log write failed");
    });

    request.log.info({
      conversationId: result.conversation.id,
      userMessageId: result.userMessage.id,
      assistantMessageId: assistantMessage.id,
      aiModel: aiReply.model,
      aiProvider: aiReply.providerName,
      openAiRequestId: aiReply.requestId,
      intent: brainPlan.intent,
      riskLevel: brainPlan.riskLevel,
      authorizationRequired: brainPlan.authorizationRequired,
      toolsRequired: brainPlan.toolsRequired,
      usedLocalFallback: aiReply.usedLocalFallback,
      aiDecisionSource: brainDecision.source,
      estimatedCostCents: usageEvent.estimatedCostCents,
      latencyMs: Math.round(performance.now() - startedAt)
    }, "ENTRAL command response completed");

    return reply.send({
      conversationId: result.conversation.id,
      messageId: assistantMessage.id,
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt,
      userMessage: {
        messageId: result.userMessage.id,
        content: result.userMessage.content,
        createdAt: result.userMessage.createdAt
      },
      brain: {
        auditEntry: brainAuditEntry,
        plan: brainPlan
      },
      usage: {
        estimatedCostCents: usageEvent.estimatedCostCents,
        eventId: usageEvent.id,
        summary: await getAiUsageSummary(currentUser.sub)
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
    let usagePreflight: Awaited<ReturnType<typeof assertAiUsageAllowed>>;

    try {
      usagePreflight = await assertAiUsageAllowed(currentUser.sub, "screen");
    } catch (error) {
      if (error instanceof AiUsageLimitError) {
        return sendAiUsageLimit(reply, error);
      }

      throw error;
    }

    const startedAt = performance.now();
    const brainDecision = await createProviderBackedAiDecision(input.message);
    const brainPlan = brainDecision.plan;

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

      if (!conversation.title || conversation.title === "New chat" || conversation.title === "New thread") {
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
    const usageEvent = await recordAiUsageEvent({
      estimatedCostCents: usagePreflight.estimatedCostCents,
      metadata: {
        authorizationRequired: brainPlan.authorizationRequired,
        intent: brainPlan.intent,
        riskLevel: brainPlan.riskLevel,
        source: brainDecision.source,
        toolsRequired: brainPlan.toolsRequired
      },
      modelName: aiReply.model,
      providerName: aiReply.providerName,
      requestId: request.id,
      requestKind: "screen",
      usedLocalFallback: aiReply.usedLocalFallback,
      userId: currentUser.sub
    });

    const brainAuditEntry = createAiAuditEntry({
      errors: brainDecision.errors,
      executionResult: "Screen analysis response generated. Screenshot was processed transiently and not stored.",
      modelName: aiReply.model,
      plan: brainPlan,
      providerName: aiReply.providerName
    });

    await recordAuditLog({
      action: "ai.screen.analyzed",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        authorizationRequired: brainPlan.authorizationRequired,
        classification: brainDecision.classification,
        decisionSource: brainDecision.source,
        errors: brainDecision.errors,
        model: aiReply.model,
        plan: brainPlan,
        provider: aiReply.providerName,
        providerStatus: brainDecision.provider.connectionStatus,
        screenshotStored: false,
        usage: {
          estimatedCostCents: usageEvent.estimatedCostCents,
          eventId: usageEvent.id,
          requestKind: "screen"
        },
        userMessage: input.message,
        usedLocalFallback: aiReply.usedLocalFallback
      },
      outcome: "success",
      requestId: request.id,
      severity: auditSeverityFor(brainPlan),
      targetId: result.conversation.id,
      targetType: "ai_conversation"
    }).catch((error) => {
      request.log.warn({ err: error, conversationId: result.conversation.id }, "AI screen audit log write failed");
    });

    request.log.info({
      conversationId: result.conversation.id,
      userMessageId: result.userMessage.id,
      assistantMessageId: assistantMessage.id,
      aiModel: aiReply.model,
      aiProvider: aiReply.providerName,
      openAiRequestId: aiReply.requestId,
      usedLocalFallback: aiReply.usedLocalFallback,
      aiDecisionSource: brainDecision.source,
      estimatedCostCents: usageEvent.estimatedCostCents,
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
      },
      brain: {
        auditEntry: brainAuditEntry,
        plan: brainPlan
      },
      usage: {
        estimatedCostCents: usageEvent.estimatedCostCents,
        eventId: usageEvent.id,
        summary: await getAiUsageSummary(currentUser.sub)
      }
    });
  });
}

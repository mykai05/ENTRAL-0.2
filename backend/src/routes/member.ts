import { randomUUID } from "node:crypto";
import {
  assertGovernanceActionRequest,
  ContractError,
  parseMemberOrganizationsResponse,
  parseMemberOverviewResponse,
  type GovernanceActionRequest
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { prisma } from "../db.js";
import { canonicalControlPlaneRepository } from "../services/canonicalControlPlane.js";
import { createAiAuditEntry } from "../services/aiBrain.js";
import {
  AiUsageLimitError,
  assertAiUsageAllowed,
  getAiUsageSummary,
  recordAiUsageEvent
} from "../services/aiUsage.js";
import { recordAuditLog } from "../services/audit.js";
import { parseMemberWorkspace } from "../services/memberWorkspace.js";
import { createProviderBackedAiDecision, openAiChatService } from "../services/openaiService.js";

const organizationParamsSchema = z.object({
  organizationId: z.string().cuid()
});

const organizationBusinessParamsSchema = organizationParamsSchema.extend({
  businessId: z.string().uuid()
});

const organizationEntityParamsSchema = organizationParamsSchema.extend({
  entityId: z.string().uuid()
});

const canonicalEventQuerySchema = z.object({
  afterSequence: z.coerce.number().int().min(0).default(0)
});

const entralConversationQuerySchema = z.object({
  businessId: z.string().uuid().optional()
});

const entralAssistantMessageSchema = z.object({
  context: z.object({
    business_id: z.string().uuid().nullable(),
    observed_event_sequence: z.number().int().nonnegative(),
    selected_entity_id: z.string().uuid().nullable(),
    surface: z.enum(["dashboard", "graph", "infrastructure"])
  }).strict(),
  conversation_id: z.string().cuid().optional(),
  message: z.string().trim().min(1).max(4_000)
}).strict();

const unavailableSubscription = {
  available: false,
  reason: "Subscription management is not configured in Entral.",
  state: "not_configured" as const
};

const ENTRAL_BASE_MEMBER_LIMIT = 5;

function publicMemberRole(value: string) {
  return value === "OWNER" ? "OWNER" as const : "MEMBER" as const;
}

const unavailableMemberFeatures = {
  subscription: {
    ...unavailableSubscription
  }
};

function unauthenticated(reply: FastifyReply) {
  return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
}

function canonicalDatabaseSession(request: FastifyRequest, actionReason: string) {
  const currentUser = request.user;
  if (!currentUser) {
    throw new Error("Authenticated member session is required.");
  }
  return {
    actionReason,
    authSubject: currentUser.sub,
    correlationId: randomUUID()
  } as const;
}

async function hasOrganizationAccess(userId: string, organizationId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        teamId: organizationId,
        userId
      }
    },
    select: {
      team: {
        select: {
          memberAccessEnabled: true
        }
      }
    }
  });
  return membership?.team.memberAccessEnabled === true;
}

function organizationNotFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: "Not Found",
    message: "Organization not found or unavailable."
  });
}

function assistantUsageLimit(reply: FastifyReply, error: AiUsageLimitError) {
  return reply.code(error.statusCode).send({
    error: "Usage Limit Reached",
    message: error.message,
    mode: "real",
    summary: error.summary
  });
}

function parseSerializedWireContract<T>(
  value: unknown,
  parser: (candidate: unknown) => T
): T {
  return parser(JSON.parse(JSON.stringify(value)) as unknown);
}

export async function memberRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/member/organizations", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return unauthenticated(reply);
    }

    const [user, memberships] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUser.sub },
        select: { email: true, id: true, name: true }
      }),
      prisma.teamMember.findMany({
        where: {
          userId: currentUser.sub,
          team: { memberAccessEnabled: true }
        },
        orderBy: { joinedAt: "asc" },
        select: {
          joinedAt: true,
          role: true,
          team: {
            select: {
              _count: { select: { members: true } },
              id: true,
              memberAccessEnabled: true,
              memberSeatLimit: true,
              name: true,
              slug: true
            }
          }
        }
      })
    ]);

    if (!user) {
      return unauthenticated(reply);
    }

    const response = {
      organizations: memberships.map((membership) => ({
        id: membership.team.id,
        joinedAt: membership.joinedAt,
        memberCount: membership.team._count.members,
        memberLimit: Math.min(membership.team.memberSeatLimit, ENTRAL_BASE_MEMBER_LIMIT),
        name: membership.team.name,
        role: publicMemberRole(membership.role),
        slug: membership.team.slug
      })),
      user
    };
    return reply.send(parseSerializedWireContract(response, parseMemberOrganizationsResponse));
  });

  app.get("/member/organizations/:organizationId/overview", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return unauthenticated(reply);
    }

    const { organizationId } = organizationParamsSchema.parse(request.params);
    const membership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          teamId: organizationId,
          userId: currentUser.sub
        }
      },
      select: {
        role: true,
        team: {
          select: {
            _count: { select: { members: true } },
            id: true,
            memberAccessEnabled: true,
            memberSeatLimit: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // Return the same response for missing and inaccessible organizations so an
    // authenticated user cannot use identifiers to discover another tenant.
    if (!membership || !membership.team.memberAccessEnabled) {
      return reply.code(404).send({
        error: "Not Found",
        message: "Organization not found or unavailable."
      });
    }

    const now = new Date();
    const [total, todo, inProgress, done, overdue, recentTasks, members, storedWorkspace] = await Promise.all([
      prisma.task.count({ where: { memberVisible: true, teamId: organizationId } }),
      prisma.task.count({ where: { memberVisible: true, status: "TODO", teamId: organizationId } }),
      prisma.task.count({ where: { memberVisible: true, status: "IN_PROGRESS", teamId: organizationId } }),
      prisma.task.count({ where: { memberVisible: true, status: "DONE", teamId: organizationId } }),
      prisma.task.count({
        where: {
          dueDate: { lt: now },
          memberVisible: true,
          status: { notIn: ["DONE", "ARCHIVED"] },
          teamId: organizationId
        }
      }),
      prisma.task.findMany({
        where: { memberVisible: true, teamId: organizationId },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          assignedTo: { select: { id: true, name: true } },
          dueDate: true,
          id: true,
          status: true,
          title: true,
          updatedAt: true
        }
      }),
      prisma.teamMember.findMany({
        where: { teamId: organizationId },
        orderBy: { joinedAt: "asc" },
        select: {
          joinedAt: true,
          role: true,
          user: { select: { id: true, name: true } }
        }
      }),
      prisma.memberWorkspaceSnapshot.findUnique({
        where: { teamId: organizationId },
        select: { publishedAt: true, snapshotJson: true, version: true }
      })
    ]);

    const workspace = storedWorkspace
      ? {
          ...parseMemberWorkspace(storedWorkspace.snapshotJson),
          publishedAt: storedWorkspace.publishedAt,
          version: storedWorkspace.version
        }
      : null;

    const response = {
      availability: unavailableMemberFeatures,
      organization: {
        id: membership.team.id,
        memberCount: membership.team._count.members,
        memberLimit: Math.min(membership.team.memberSeatLimit, ENTRAL_BASE_MEMBER_LIMIT),
        name: membership.team.name,
        role: publicMemberRole(membership.role),
        slug: membership.team.slug
      },
      recentTasks,
      taskSummary: {
        done,
        inProgress,
        overdue,
        todo,
        total
      },
      members: members.map((member) => ({
        id: member.user.id,
        joinedAt: member.joinedAt,
        name: member.user.name,
        role: publicMemberRole(member.role)
      })),
      workspace
    };
    return reply.send(parseSerializedWireContract(response, parseMemberOverviewResponse));
  });

  app.get("/member/organizations/:organizationId/portfolio/summary", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }
    // organizationId gates the legacy member-access tenant only. Canonical
    // business scope is intentionally derived from the authenticated
    // entral.app_users identity and its database scope_grants.
    return reply.send(await canonicalControlPlaneRepository.getPortfolio(
      canonicalDatabaseSession(request, `Read the user-inherited canonical portfolio through member access ${organizationId}.`)
    ));
  });

  app.get("/member/organizations/:organizationId/hierarchy", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }
    return reply.send(await canonicalControlPlaneRepository.getHierarchySnapshot(
      canonicalDatabaseSession(request, `Read the user-inherited canonical hierarchy through member access ${organizationId}.`)
    ));
  });

  app.get("/member/organizations/:organizationId/businesses/:businessId/full", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { businessId, organizationId } = organizationBusinessParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }
    const business = await canonicalControlPlaneRepository.getBusinessFull(
      businessId,
      canonicalDatabaseSession(request, `Read user-visible canonical business ${businessId} through member access ${organizationId}.`)
    );
    // RLS deliberately makes an inaccessible business indistinguishable from
    // a missing one, preventing cross-business identifier discovery.
    if (!business) {
      return reply.code(404).send({ error: "Not Found", message: "Business not found." });
    }
    return reply.send(business);
  });

  app.get("/member/organizations/:organizationId/entities/:entityId/full", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { entityId, organizationId } = organizationEntityParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }
    const entity = await canonicalControlPlaneRepository.getEntityFull(
      entityId,
      canonicalDatabaseSession(request, `Read user-visible canonical entity ${entityId} through member access ${organizationId}.`)
    );
    if (!entity) {
      return reply.code(404).send({ error: "Not Found", message: "Entity not found." });
    }
    return reply.send(entity);
  });

  app.get("/member/organizations/:organizationId/events", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    const { afterSequence } = canonicalEventQuerySchema.parse(request.query);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }
    return reply.send(await canonicalControlPlaneRepository.listPortfolioEvents(
      afterSequence,
      canonicalDatabaseSession(request, `Read user-visible canonical events through member access ${organizationId}.`)
    ));
  });

  app.get("/member/organizations/:organizationId/entral/conversation", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    const { businessId } = entralConversationQuerySchema.parse(request.query);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }
    return reply.send(await canonicalControlPlaneRepository.getEntralConversation(
      businessId ?? null,
      canonicalDatabaseSession(
        request,
        `Read user-visible Human and ENTRAL conversation history through member access ${organizationId}.`
      )
    ));
  });

  app.post("/member/organizations/:organizationId/entral/assistant/messages", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    const input = entralAssistantMessageSchema.parse(request.body);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }

    const assistantSession = canonicalDatabaseSession(
      request,
      `Resolve canonical context for the member ENTRAL assistant through access ${organizationId}.`
    );
    const [portfolio, hierarchy] = await Promise.all([
      canonicalControlPlaneRepository.getPortfolio(assistantSession),
      canonicalControlPlaneRepository.getHierarchySnapshot(assistantSession)
    ]);
    const selectedEntity = input.context.selected_entity_id
      ? hierarchy.entities.find((entity) => entity.entity_id === input.context.selected_entity_id) ?? null
      : null;
    if (input.context.selected_entity_id && !selectedEntity) {
      return reply.code(404).send({ error: "Not Found", message: "Entity not found." });
    }
    const selectedBusiness = input.context.business_id
      ? portfolio.businesses.find((business) => business.business_id === input.context.business_id) ?? null
      : null;
    if (input.context.business_id && !selectedBusiness) {
      return reply.code(404).send({ error: "Not Found", message: "Business not found." });
    }

    let usagePreflight: Awaited<ReturnType<typeof assertAiUsageAllowed>>;
    try {
      usagePreflight = await assertAiUsageAllowed(currentUser.sub, "chat");
    } catch (error) {
      if (error instanceof AiUsageLimitError) return assistantUsageLimit(reply, error);
      throw error;
    }

    const conversation = input.conversation_id
      ? await prisma.conversation.findFirst({
          where: { id: input.conversation_id, userId: currentUser.sub }
        })
      : await prisma.conversation.create({
          data: {
            title: `ENTRAL workspace · ${selectedEntity?.name ?? selectedBusiness?.business_name ?? input.context.surface}`,
            userId: currentUser.sub
          }
        });
    if (!conversation) {
      return reply.code(404).send({ error: "Not Found", message: "Conversation was not found." });
    }

    const userMessage = await prisma.message.create({
      data: {
        content: input.message,
        conversationId: conversation.id,
        role: "user"
      }
    });
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 40
    });
    const resolvedEventSequence = Math.min(portfolio.event_sequence, hierarchy.event_sequence);
    const scopeLabel = selectedBusiness?.business_name ?? portfolio.scope.label;
    const contextEnvelope = [
      "Authoritative member workspace context:",
      `surface=${input.context.surface}`,
      `canonical_event=${resolvedEventSequence}`,
      `scope=${scopeLabel}`,
      selectedEntity
        ? `selected_entity=${selectedEntity.name} (${selectedEntity.entity_type}, ${selectedEntity.status}, version ${selectedEntity.version})`
        : "selected_entity=none",
      "Treat this context as read-only. Never claim a graph or agent setting changed unless the response includes a verified execution receipt."
    ].join("\n");
    const contextualHistory = history.map((message, index) => (
      index === history.length - 1
        ? { ...message, content: `${contextEnvelope}\n\nMember request:\n${message.content}` }
        : message
    ));
    const brainDecision = await createProviderBackedAiDecision(input.message);
    let assistantReply;
    try {
      assistantReply = await openAiChatService.createReply(contextualHistory, {
        actionPlan: brainDecision.plan
      });
    } catch (error) {
      await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => undefined);
      throw error;
    }
    const assistantMessage = await prisma.message.create({
      data: {
        content: assistantReply.content,
        conversationId: conversation.id,
        role: "assistant"
      }
    });
    await prisma.conversation.update({
      data: { updatedAt: new Date() },
      where: { id: conversation.id }
    });
    const usageEvent = await recordAiUsageEvent({
      estimatedCostCents: usagePreflight.estimatedCostCents,
      metadata: {
        canonicalEventSequence: resolvedEventSequence,
        intent: brainDecision.plan.intent,
        memberSurface: input.context.surface,
        organizationId,
        selectedEntityId: selectedEntity?.entity_id ?? null
      },
      modelName: assistantReply.model,
      providerName: assistantReply.providerName,
      requestId: request.id,
      requestKind: "chat",
      usedLocalFallback: assistantReply.usedLocalFallback,
      userId: currentUser.sub
    });
    const auditEntry = createAiAuditEntry({
      errors: brainDecision.errors,
      executionResult: "Contextual response prepared. No canonical mutation was executed.",
      modelName: assistantReply.model,
      plan: brainDecision.plan,
      providerName: assistantReply.providerName
    });
    await recordAuditLog({
      action: "member.entral.assistant.responded",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        auditEntry,
        canonicalEventSequence: resolvedEventSequence,
        organizationId,
        selectedEntityId: selectedEntity?.entity_id ?? null,
        usageEventId: usageEvent.id
      },
      outcome: "success",
      requestId: request.id,
      severity: brainDecision.plan.riskLevel === "High" || brainDecision.plan.riskLevel === "Critical" ? "high" : "info",
      targetId: conversation.id,
      targetType: "member_entral_conversation"
    }).catch((error) => {
      request.log.warn({ err: error, conversationId: conversation.id }, "Member ENTRAL assistant audit write failed");
    });

    return reply.send({
      action_plan: brainDecision.plan,
      content: assistantMessage.content,
      context: {
        business_id: selectedBusiness?.business_id ?? null,
        event_sequence: resolvedEventSequence,
        scope_label: scopeLabel,
        selected_entity: selectedEntity,
        surface: input.context.surface
      },
      conversation_id: conversation.id,
      created_at: assistantMessage.createdAt,
      message_id: assistantMessage.id,
      usage: {
        estimated_cost_cents: usageEvent.estimatedCostCents,
        summary: await getAiUsageSummary(currentUser.sub)
      },
      user_message: {
        content: userMessage.content,
        created_at: userMessage.createdAt,
        message_id: userMessage.id
      }
    });
  });

  app.post("/member/organizations/:organizationId/governance-actions", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 12,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) return unauthenticated(reply);
    const { organizationId } = organizationParamsSchema.parse(request.params);
    if (!await hasOrganizationAccess(currentUser.sub, organizationId)) {
      return organizationNotFound(reply);
    }

    const candidate = request.body as GovernanceActionRequest;
    try {
      assertGovernanceActionRequest(candidate);
    } catch (error) {
      if (error instanceof ContractError) {
        return reply.code(400).send({
          code: error.code,
          error: "Bad Request",
          message: error.message
        });
      }
      throw error;
    }
    const authorityBasis = candidate.authority_basis;
    if (
      !authorityBasis
      || typeof authorityBasis !== "object"
      || Array.isArray(authorityBasis)
      || authorityBasis.channel !== "MEMBER_ENTRAL_ASSISTANT"
      || authorityBasis.explicit_confirmation_required !== true
      || authorityBasis.target_version !== candidate.expected_version
    ) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Member ENTRAL governance requests require explicit confirmation for the current target version."
      });
    }
    if (candidate.actor_type !== "HUMAN") {
      return reply.code(403).send({
        error: "Forbidden",
        message: "Member governance requests must use authenticated Human authority."
      });
    }
    if (candidate.target_type === "ENTITY" && candidate.target_id) {
      const visibleTarget = await canonicalControlPlaneRepository.getEntityFull(
        candidate.target_id,
        canonicalDatabaseSession(
          request,
          `Resolve the member-visible governance target through access ${organizationId}.`
        )
      );
      if (!visibleTarget) {
        return reply.code(404).send({ error: "Not Found", message: "Entity not found." });
      }
    }

    try {
      const action = await canonicalControlPlaneRepository.createGovernanceAction(candidate, {
        authenticatedHumanEmail: currentUser.email,
        databaseSession: canonicalDatabaseSession(request, candidate.reason)
      });
      return reply.code(201).send({ action });
    } catch (error) {
      const candidateError = error as { code?: string; message?: string; statusCode?: number };
      if (typeof candidateError.statusCode === "number") {
        return reply.code(candidateError.statusCode).send({
          code: candidateError.code,
          error: candidateError.statusCode >= 500 ? "Internal Server Error" : "Request Error",
          message: candidateError.statusCode >= 500 ? "Something went wrong." : candidateError.message
        });
      }
      throw error;
    }
  });
}

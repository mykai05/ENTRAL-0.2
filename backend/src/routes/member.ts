import { randomUUID } from "node:crypto";
import {
  parseMemberOrganizationsResponse,
  parseMemberOverviewResponse
} from "@entral/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { prisma } from "../db.js";
import { canonicalControlPlaneRepository } from "../services/canonicalControlPlane.js";
import { parseMemberWorkspace } from "../services/memberWorkspace.js";

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
}

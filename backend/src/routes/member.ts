import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuth, setPrivateNoStoreHeaders } from "../auth.js";
import { prisma } from "../db.js";
import { parseMemberWorkspace } from "../services/memberWorkspace.js";

const organizationParamsSchema = z.object({
  organizationId: z.string().cuid()
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

    return reply.send({
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
    });
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

    return reply.send({
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
    });
  });
}

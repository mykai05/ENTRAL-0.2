import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { requireAdmin, setPrivateNoStoreHeaders } from "../auth.js";
import { prisma } from "../db.js";
import {
  memberOrganizationAccessParamsSchema,
  memberTaskVisibilityParamsSchema,
  provisionMemberSeatSchema,
  updateMemberOrganizationAccessSchema,
  updateMemberTaskVisibilitySchema
} from "../schemas.js";
import { recordAuditLog } from "../services/audit.js";
import {
  assertMemberWorkspacePublicationReady,
  memberWorkspaceNeedsEncryptionRewrite,
  memberWorkspacePublicationSchema,
  parseMemberWorkspace,
  serializeMemberWorkspace
} from "../services/memberWorkspace.js";
import { stableJsonHash } from "../services/secureJson.js";

const ENTRAL_BASE_MEMBER_LIMIT = 5;

async function lockOrganization(transaction: Prisma.TransactionClient, organizationId: string) {
  await transaction.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Team" WHERE "id" = ${organizationId} FOR UPDATE
  `);
}

export async function memberTaskVisibilityRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.patch(
    "/admin/tasks/:taskId/member-visibility",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const currentUser = request.user;
      const { taskId } = memberTaskVisibilityParamsSchema.parse(request.params);
      const { visible } = updateMemberTaskVisibilitySchema.parse(request.body);
      const result = await prisma.$transaction(async (transaction) => {
        const task = await transaction.task.findUnique({
          where: { id: taskId },
          select: { id: true, memberVisible: true, teamId: true }
        });

        if (!task) return null;

        const changed = task.memberVisible !== visible;
        const publishedTask = changed
          ? await transaction.task.update({
              where: { id: task.id },
              data: { memberVisible: visible },
              select: { id: true, memberVisible: true, teamId: true }
            })
          : task;

        await recordAuditLog({
          action: changed ? "task.member_visibility.updated" : "task.member_visibility.confirmed",
          actorRole: currentUser?.role,
          actorUserId: currentUser?.sub,
          metadata: {
            memberVisible: publishedTask.memberVisible,
            previousMemberVisible: task.memberVisible,
            teamId: task.teamId
          },
          outcome: "success",
          requestId: request.id,
          severity: "medium",
          targetId: task.id,
          targetType: "task"
        }, transaction);

        return { changed, task: publishedTask };
      });

      if (!result) {
        return reply.code(404).send({ error: "Not Found", message: "Task was not found." });
      }

      return reply.send(result);
    }
  );

  app.patch(
    "/admin/organizations/:organizationId/member-access",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const currentUser = request.user;
      const { organizationId } = memberOrganizationAccessParamsSchema.parse(request.params);
      const { enabled } = updateMemberOrganizationAccessSchema.parse(request.body);
      const result = await prisma.$transaction(async (transaction) => {
        await lockOrganization(transaction, organizationId);
        const organization = await transaction.team.findUnique({
          where: { id: organizationId },
          select: { id: true, memberAccessEnabled: true, memberSeatLimit: true }
        });

        if (!organization) return { kind: "not_found" as const };
        const memberCount = await transaction.teamMember.count({ where: { teamId: organizationId } });

        if (enabled && memberCount > Math.min(organization.memberSeatLimit, ENTRAL_BASE_MEMBER_LIMIT)) {
          return {
            kind: "seat_limit" as const,
            memberCount,
            memberLimit: Math.min(organization.memberSeatLimit, ENTRAL_BASE_MEMBER_LIMIT)
          };
        }

        const changed = organization.memberAccessEnabled !== enabled;
        const provisionedOrganization = changed
          ? await transaction.team.update({
              where: { id: organization.id },
              data: { memberAccessEnabled: enabled },
              select: { id: true, memberAccessEnabled: true, memberSeatLimit: true }
            })
          : organization;

        await recordAuditLog({
          action: changed ? "organization.member_access.updated" : "organization.member_access.confirmed",
          actorRole: currentUser?.role,
          actorUserId: currentUser?.sub,
          metadata: {
            memberAccessEnabled: provisionedOrganization.memberAccessEnabled,
            memberCount,
            memberSeatLimit: provisionedOrganization.memberSeatLimit,
            previousMemberAccessEnabled: organization.memberAccessEnabled
          },
          outcome: "success",
          requestId: request.id,
          severity: "high",
          targetId: organization.id,
          targetType: "team"
        }, transaction);

        return {
          kind: "ok" as const,
          changed,
          memberCount,
          organization: provisionedOrganization
        };
      }, { isolationLevel: "Serializable" });

      if (result.kind === "not_found") {
        return reply.code(404).send({ error: "Not Found", message: "Organization was not found." });
      }
      if (result.kind === "seat_limit") {
        return reply.code(409).send({
          error: "Conflict",
          memberCount: result.memberCount,
          memberLimit: result.memberLimit,
          message: "Entral Base member access cannot be enabled above the five-member allowance."
        });
      }

      return reply.send({
        changed: result.changed,
        memberCount: result.memberCount,
        organization: result.organization
      });
    }
  );

  app.post(
    "/admin/organizations/:organizationId/members",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const currentUser = request.user;
      const { organizationId } = memberOrganizationAccessParamsSchema.parse(request.params);
      const input = provisionMemberSeatSchema.parse(request.body);
      const result = await prisma.$transaction(async (transaction) => {
        await lockOrganization(transaction, organizationId);
        const organization = await transaction.team.findUnique({
          where: { id: organizationId },
          select: { id: true, memberAccessEnabled: true, memberSeatLimit: true }
        });
        if (!organization) return { kind: "not_found" as const };
        const existingMembership = await transaction.teamMember.findUnique({
          where: { userId_teamId: { teamId: organizationId, userId: input.userId } },
          select: { joinedAt: true, role: true, teamId: true, userId: true }
        });

        if (existingMembership) {
          await recordAuditLog({
            action: "organization.member_seat.confirmed",
            actorRole: currentUser?.role,
            actorUserId: currentUser?.sub,
            metadata: { role: existingMembership.role, teamId: organizationId },
            requestId: request.id,
            severity: "medium",
            targetId: input.userId,
            targetType: "team_member"
          }, transaction);
          return { kind: "ok" as const, changed: false, membership: existingMembership };
        }

        const memberCount = await transaction.teamMember.count({ where: { teamId: organizationId } });
        const memberLimit = Math.min(organization.memberSeatLimit, ENTRAL_BASE_MEMBER_LIMIT);
        if (memberCount >= memberLimit) {
          return { kind: "seat_limit" as const, memberCount, memberLimit };
        }

        const user = await transaction.user.findUnique({ where: { id: input.userId }, select: { id: true } });
        if (!user) return { kind: "not_found" as const };

        const membership = await transaction.teamMember.create({
          data: { role: input.role, teamId: organizationId, userId: input.userId },
          select: { joinedAt: true, role: true, teamId: true, userId: true }
        });
        await recordAuditLog({
          action: "organization.member_seat.provisioned",
          actorRole: currentUser?.role,
          actorUserId: currentUser?.sub,
          metadata: {
            memberCount: memberCount + 1,
            memberSeatLimit: memberLimit,
            role: membership.role,
            teamId: organizationId
          },
          requestId: request.id,
          severity: "high",
          targetId: input.userId,
          targetType: "team_member"
        }, transaction);
        return { kind: "ok" as const, changed: true, membership };
      }, { isolationLevel: "Serializable" });

      if (result.kind === "not_found") {
        return reply.code(404).send({ error: "Not Found", message: "Organization or user was not found." });
      }
      if (result.kind === "seat_limit") {
        return reply.code(409).send({
          error: "Conflict",
          memberCount: result.memberCount,
          memberLimit: result.memberLimit,
          message: "Entral Base includes up to five full member accounts."
        });
      }

      return reply.code(result.changed ? 201 : 200).send({
        changed: result.changed,
        membership: result.membership
      });
    }
  );

  app.put(
    "/admin/organizations/:organizationId/member-workspace",
    {
      preHandler: requireAdmin,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const currentUser = request.user;
      const { organizationId } = memberOrganizationAccessParamsSchema.parse(request.params);
      const input = memberWorkspacePublicationSchema.parse(request.body);
      const encryptionConfigured = assertMemberWorkspacePublicationReady();
      const result = await prisma.$transaction(async (transaction) => {
        await lockOrganization(transaction, organizationId);
        const existingOrganization = await transaction.team.findUnique({
          where: { id: organizationId },
          select: { id: true }
        });
        if (!existingOrganization) return { kind: "not_found" as const };

        const existing = await transaction.memberWorkspaceSnapshot.findUnique({
          where: { teamId: organizationId },
          select: { id: true, publishedAt: true, snapshotJson: true, version: true }
        });
        const currentVersion = existing?.version ?? 0;
        if (input.expectedVersion !== undefined && input.expectedVersion !== currentVersion) {
          return { kind: "version_conflict" as const, currentVersion };
        }

        const previousSnapshot = existing ? parseMemberWorkspace(existing.snapshotJson) : null;
        const contentChanged = stableJsonHash(previousSnapshot) !== stableJsonHash(input.snapshot);
        const storageReencrypted = Boolean(
          existing && memberWorkspaceNeedsEncryptionRewrite(existing.snapshotJson, encryptionConfigured)
        );
        const changed = contentChanged || storageReencrypted;
        const publishedAt = new Date();
        const stored = !changed && existing
          ? existing
          : existing
            ? await transaction.memberWorkspaceSnapshot.update({
                where: { teamId: organizationId },
                data: {
                  publishedAt,
                  publishedById: currentUser?.sub,
                  schemaVersion: 1,
                  snapshotJson: serializeMemberWorkspace(input.snapshot),
                  version: { increment: 1 }
                },
                select: { id: true, publishedAt: true, snapshotJson: true, version: true }
              })
            : await transaction.memberWorkspaceSnapshot.create({
                data: {
                  publishedAt,
                  publishedById: currentUser?.sub,
                  schemaVersion: 1,
                  snapshotJson: serializeMemberWorkspace(input.snapshot),
                  teamId: organizationId,
                  version: 1
                },
                select: { id: true, publishedAt: true, snapshotJson: true, version: true }
              });

        await recordAuditLog({
          action: contentChanged
            ? "organization.member_workspace.published"
            : storageReencrypted
              ? "organization.member_workspace.reencrypted"
              : "organization.member_workspace.confirmed",
          actorRole: currentUser?.role,
          actorUserId: currentUser?.sub,
          metadata: {
            businessHealthPublished: input.snapshot.businessHealth !== null,
            findingCount: input.snapshot.findingsAndRecommendations.length,
            monthlySummaryPublished: input.snapshot.monthlyOperatingSummary !== null,
            objectiveCount: input.snapshot.objectivesAndPriorities.length,
            snapshotHash: stableJsonHash(input.snapshot),
            storageReencrypted,
            teamId: organizationId,
            version: stored.version
          },
          requestId: request.id,
          severity: "high",
          targetId: organizationId,
          targetType: "member_workspace"
        }, transaction);

        return {
          kind: "ok" as const,
          changed,
          workspace: {
            ...parseMemberWorkspace(stored.snapshotJson),
            publishedAt: stored.publishedAt,
            version: stored.version
          }
        };
      }, { isolationLevel: "Serializable" });

      if (result.kind === "not_found") {
        return reply.code(404).send({ error: "Not Found", message: "Organization was not found." });
      }
      if (result.kind === "version_conflict") {
        return reply.code(409).send({
          currentVersion: result.currentVersion,
          error: "Conflict",
          message: "The member workspace changed before this publication was applied."
        });
      }

      return reply.send({ changed: result.changed, workspace: result.workspace });
    }
  );
}

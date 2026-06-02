import { prisma } from "../db.js";
import { parseSecureJson } from "./secureJson.js";
import { publicUser } from "./users.js";

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseJsonField(value: string | null | undefined) {
  if (!value) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseSecureJsonField(value: string | null | undefined) {
  if (!value) return null;

  try {
    return parseSecureJson<unknown>(value);
  } catch {
    return null;
  }
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export async function buildAccountExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      aiUsageEvents: {
        orderBy: { createdAt: "desc" }
      },
      agents: {
        include: {
          logs: { orderBy: { createdAt: "asc" } },
          messages: { orderBy: { createdAt: "asc" } },
          schedules: { orderBy: { createdAt: "asc" } },
          tasks: {
            include: {
              logs: { orderBy: { createdAt: "asc" } },
              messages: { orderBy: { createdAt: "asc" } }
            },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 500
      },
      automationJobs: {
        include: {
          logs: { orderBy: { createdAt: "asc" } }
        },
        orderBy: { createdAt: "desc" }
      },
      commandReports: {
        orderBy: { reportCreatedAt: "desc" }
      },
      commandSnapshot: true,
      conversations: {
        include: {
          messages: { orderBy: { createdAt: "asc" } }
        },
        orderBy: { updatedAt: "desc" }
      },
      growthApprovalPackets: {
        orderBy: { createdAt: "desc" }
      },
      memberships: {
        include: {
          team: true
        }
      },
      merchStores: {
        include: {
          products: { orderBy: { createdAt: "desc" } }
        },
        orderBy: { createdAt: "desc" }
      },
      policiesCreated: {
        orderBy: { createdAt: "desc" }
      },
      tasksAssigned: {
        include: {
          team: true
        },
        orderBy: { createdAt: "desc" }
      },
      tasksCreated: {
        include: {
          team: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!user) {
    throw Object.assign(new Error("Account was not found."), { statusCode: 404 });
  }

  const messages = user.conversations.reduce((count, conversation) => count + conversation.messages.length, 0);
  const podProducts = user.merchStores.reduce((count, store) => count + store.products.length, 0);
  const agentTasks = user.agents.reduce((count, agent) => count + agent.tasks.length, 0);

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    mode: {
      accountData: "real",
      externalProvidersContacted: false,
      note: "ENTRAL privacy export for organizing, planning, monitoring, and safely preparing business operations."
    },
    summary: {
      agentTasks,
      agents: user.agents.length,
      aiUsageEvents: user.aiUsageEvents.length,
      auditLogs: user.auditLogs.length,
      automationJobs: user.automationJobs.length,
      commandReports: user.commandReports.length,
      conversations: user.conversations.length,
      growthApprovalPackets: user.growthApprovalPackets.length,
      messages,
      podProducts,
      tasksAssigned: user.tasksAssigned.length,
      tasksCreated: user.tasksCreated.length,
      teams: user.memberships.length
    },
    user: {
      ...publicUser(user),
      createdAt: iso(user.createdAt),
      emailVerifiedAt: iso(user.emailVerifiedAt),
      lastDashboardSeenAt: iso(user.lastDashboardSeenAt),
      updatedAt: iso(user.updatedAt)
    },
    teams: user.memberships.map((membership) => ({
      id: membership.team.id,
      joinedAt: iso(membership.joinedAt),
      name: membership.team.name,
      role: membership.role,
      slug: membership.team.slug
    })),
    tasks: {
      assigned: plain(user.tasksAssigned),
      created: plain(user.tasksCreated)
    },
    conversations: plain(user.conversations),
    aiUsageEvents: user.aiUsageEvents.map((event) => ({
      ...plain(event),
      metadata: parseSecureJsonField(event.metadataJson),
      metadataJson: undefined
    })),
    automationJobs: user.automationJobs.map((job) => ({
      ...plain(job),
      payload: parseSecureJsonField(job.payloadJson),
      payloadJson: undefined,
      result: parseSecureJsonField(job.resultJson),
      resultJson: undefined
    })),
    agents: user.agents.map((agent) => ({
      ...plain(agent),
      capabilities: parseJsonField(agent.capabilitiesJson),
      capabilitiesJson: undefined,
      messages: agent.messages.map((message) => ({
        ...plain(message),
        payload: parseSecureJsonField(message.payloadJson),
        payloadJson: undefined
      })),
      tasks: agent.tasks.map((task) => ({
        ...plain(task),
        payload: parseSecureJsonField(task.payloadJson),
        payloadJson: undefined,
        result: parseSecureJsonField(task.resultJson),
        resultJson: undefined,
        messages: task.messages.map((message) => ({
          ...plain(message),
          payload: parseSecureJsonField(message.payloadJson),
          payloadJson: undefined
        }))
      }))
    })),
    merchStores: plain(user.merchStores),
    growthApprovalPackets: user.growthApprovalPackets.map((packet) => ({
      ...plain(packet),
      packet: parseSecureJsonField(packet.packetJson),
      packetJson: undefined
    })),
    command: {
      reports: user.commandReports.map((report) => ({
        ...plain(report),
        nextActions: parseJsonField(report.nextActionsJson),
        nextActionsJson: undefined
      })),
      snapshot: user.commandSnapshot ? {
        ...plain(user.commandSnapshot),
        state: parseJsonField(user.commandSnapshot.stateJson),
        stateJson: undefined
      } : null
    },
    policiesCreated: user.policiesCreated.map((policy) => ({
      ...plain(policy),
      rule: parseSecureJsonField(policy.ruleJson) ?? parseJsonField(policy.ruleJson),
      ruleJson: undefined
    })),
    auditLogs: user.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorUserId: log.actorUserId,
      createdAt: iso(log.createdAt),
      entry: parseSecureJsonField(log.entryJson),
      entryHash: log.entryHash,
      outcome: log.outcome,
      severity: log.severity,
      targetId: log.targetId,
      targetType: log.targetType
    }))
  };
}

export function summarizeAccountExport(exportData: Awaited<ReturnType<typeof buildAccountExport>>) {
  return exportData.summary;
}

export async function deleteAccountAndWorkspace(userId: string) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          _count: {
            select: { members: true }
          }
        }
      }
    }
  });
  const privateTeamIds = memberships
    .filter((membership) => membership.team._count.members === 1)
    .map((membership) => membership.teamId);

  await prisma.$transaction(async (tx) => {
    if (privateTeamIds.length > 0) {
      await tx.team.deleteMany({ where: { id: { in: privateTeamIds } } });
    }

    await tx.task.deleteMany({ where: { createdById: userId } });
    await tx.policy.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.auditLog.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } });
    await tx.user.delete({ where: { id: userId } });
  });
}

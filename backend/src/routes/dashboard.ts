import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth.js";
import { prisma } from "../db.js";
import { publicUser } from "../services/users.js";
import { parseSecureJson } from "../services/secureJson.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.sub },
      include: {
        memberships: {
          include: {
            team: true
          },
          orderBy: { joinedAt: "asc" }
        }
      }
    });

    if (!user) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const teamIds = user.memberships.map((membership) => membership.teamId);
    const lastSeen = user.lastDashboardSeenAt;
    const activitySince = lastSeen ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [tasks, completedAgentTasks, agentActivity] = await prisma.$transaction([
      prisma.task.findMany({
        where: { teamId: { in: teamIds } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          team: { select: { id: true, name: true } }
        }
      }),
      prisma.agentTask.findMany({
        where: {
          userId: currentUser.sub,
          status: "completed",
          completedAt: { gt: activitySince }
        },
        orderBy: { completedAt: "desc" },
        take: 10,
        include: {
          agent: { select: { id: true, name: true } }
        }
      }),
      prisma.agentLog.findMany({
        where: {
          agent: {
            userId: currentUser.sub
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          agent: { select: { id: true, name: true } },
          task: { select: { id: true, title: true, resultJson: true, status: true, completedAt: true } }
        }
      })
    ]);

    await prisma.user.update({
      where: { id: currentUser.sub },
      data: { lastDashboardSeenAt: new Date() }
    });

    return reply.send({
      message: `Welcome, ${publicUser(user).name}`,
      user: publicUser(user),
      teams: user.memberships.map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
        slug: membership.team.slug,
        role: membership.role
      })),
      tasks,
      awaySummary: {
        completedAgentTaskCount: completedAgentTasks.length,
        since: lastSeen,
        summaries: completedAgentTasks.map((task) => ({
          agentId: task.agent.id,
          agentName: task.agent.name,
          completedAt: task.completedAt,
          id: task.id,
          result: parseSecureJson<Record<string, unknown>>(task.resultJson),
          title: task.title
        }))
      },
      agentActivity: agentActivity.map((log) => ({
        id: log.id,
        agentId: log.agentId,
        agentName: log.agent.name,
        taskId: log.taskId,
        taskTitle: log.task?.title ?? null,
        taskStatus: log.task?.status ?? null,
        level: log.level,
        message: log.message,
        createdAt: log.createdAt,
        result: parseSecureJson<Record<string, unknown>>(log.task?.resultJson ?? null)
      }))
    });
  });
}

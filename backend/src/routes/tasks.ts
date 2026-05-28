import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { createTaskSchema, taskListQuerySchema } from "../schemas.js";

export async function taskRoutes(app: FastifyInstance) {
  app.get("/tasks", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = taskListQuerySchema.parse(request.query);
    const memberships = await prisma.teamMember.findMany({
      where: { userId: currentUser.sub },
      select: { teamId: true }
    });
    const teamIds = memberships.map((membership) => membership.teamId);

    const where = {
      teamId: { in: teamIds },
      ...(query.status ? { status: query.status } : {})
    };

    const [items, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true, slug: true } }
        }
      }),
      prisma.task.count({ where })
    ]);

    return reply.send({
      items,
      page: query.page,
      pageSize: query.pageSize,
      total
    });
  });

  app.post("/tasks", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = createTaskSchema.parse(request.body);
    const memberships = await prisma.teamMember.findMany({
      where: { userId: currentUser.sub },
      orderBy: { joinedAt: "asc" }
    });

    const teamId = input.teamId ?? memberships[0]?.teamId;
    const canUseTeam = memberships.some((membership) => membership.teamId === teamId);

    if (!teamId || !canUseTeam) {
      return reply.code(403).send({ error: "Forbidden", message: "You do not have access to this team." });
    }

    if (input.assignedToId) {
      const assignee = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: input.assignedToId,
            teamId
          }
        }
      });

      if (!assignee) {
        return reply.code(400).send({ error: "Bad Request", message: "Assigned user must belong to the task team." });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        teamId,
        createdById: currentUser.sub,
        assignedToId: input.assignedToId
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true, slug: true } }
      }
    });

    return reply.code(201).send({ task });
  });
}

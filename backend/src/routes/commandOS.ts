import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { commandOSSnapshotSchema } from "../schemas.js";
import { collectCommandReports, publicCommandOSSnapshot } from "../services/commandOSPersistence.js";

type CommandOSSnapshotRow = {
  createdAt: Date;
  id: string;
  source: string;
  stateJson: string;
  stateVersion: number;
  updatedAt: Date;
};

export async function commandOSRoutes(app: FastifyInstance) {
  app.get("/command-os/state", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const rows = await prisma.$queryRaw<CommandOSSnapshotRow[]>`
      SELECT "id", "source", "stateJson", "stateVersion", "createdAt", "updatedAt"
      FROM "CommandOSSnapshot"
      WHERE "userId" = ${currentUser.sub}
      LIMIT 1
    `;

    const snapshot = rows[0] ? publicCommandOSSnapshot(rows[0]) : null;
    return reply.send({ snapshot });
  });

  app.put("/command-os/state", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = commandOSSnapshotSchema.parse(request.body);
    const stateJson = JSON.stringify(input.state);
    const reports = collectCommandReports(input.state);

    await prisma.$transaction(async (tx) => {
      const snapshotId = randomUUID();

      await tx.$executeRaw`
        INSERT INTO "CommandOSSnapshot" ("id", "userId", "stateVersion", "stateJson", "source", "createdAt", "updatedAt")
        VALUES (${snapshotId}, ${currentUser.sub}, 1, ${stateJson}, ${input.source}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("userId")
        DO UPDATE SET
          "stateVersion" = "CommandOSSnapshot"."stateVersion" + 1,
          "stateJson" = EXCLUDED."stateJson",
          "source" = EXCLUDED."source",
          "updatedAt" = CURRENT_TIMESTAMP
      `;

      for (const report of reports) {
        const reportRowId = randomUUID();

        await tx.$executeRaw`
          INSERT INTO "CommandOSReport" (
            "id",
            "userId",
            "reportId",
            "sourceEntityId",
            "sourceEntityType",
            "destinationEntityId",
            "destinationEntityType",
            "marshalId",
            "generalId",
            "commanderId",
            "soldierId",
            "situation",
            "analysis",
            "recommendation",
            "nextActionsJson",
            "reportCreatedAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${reportRowId},
            ${currentUser.sub},
            ${report.id},
            ${report.sourceEntityId},
            ${report.sourceEntityType},
            ${report.destinationEntityId},
            ${report.destinationEntityType},
            ${report.marshalId ?? null},
            ${report.generalId ?? null},
            ${report.commanderId ?? null},
            ${report.soldierId ?? null},
            ${report.situation},
            ${report.analysis},
            ${report.recommendation},
            ${JSON.stringify(report.nextActions)},
            ${report.reportCreatedAt},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT ("userId", "reportId")
          DO UPDATE SET
            "sourceEntityId" = EXCLUDED."sourceEntityId",
            "sourceEntityType" = EXCLUDED."sourceEntityType",
            "destinationEntityId" = EXCLUDED."destinationEntityId",
            "destinationEntityType" = EXCLUDED."destinationEntityType",
            "marshalId" = EXCLUDED."marshalId",
            "generalId" = EXCLUDED."generalId",
            "commanderId" = EXCLUDED."commanderId",
            "soldierId" = EXCLUDED."soldierId",
            "situation" = EXCLUDED."situation",
            "analysis" = EXCLUDED."analysis",
            "recommendation" = EXCLUDED."recommendation",
            "nextActionsJson" = EXCLUDED."nextActionsJson",
            "reportCreatedAt" = EXCLUDED."reportCreatedAt",
            "updatedAt" = CURRENT_TIMESTAMP
        `;
      }
    });

    const rows = await prisma.$queryRaw<CommandOSSnapshotRow[]>`
      SELECT "id", "source", "stateJson", "stateVersion", "createdAt", "updatedAt"
      FROM "CommandOSSnapshot"
      WHERE "userId" = ${currentUser.sub}
      LIMIT 1
    `;

    return reply.send({
      reportCount: reports.length,
      snapshot: rows[0] ? publicCommandOSSnapshot(rows[0]) : null
    });
  });
}

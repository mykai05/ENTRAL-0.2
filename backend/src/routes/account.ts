import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { clearAuthCookie, requireAuth } from "../auth.js";
import { deleteAccountSchema } from "../schemas.js";
import { recordAuditLog } from "../services/audit.js";
import { buildAccountExport, deleteAccountAndWorkspace, summarizeAccountExport } from "../services/privacy.js";

export async function accountRoutes(app: FastifyInstance) {
  app.get("/account/export", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const exportData = await buildAccountExport(currentUser.sub);
    await recordAuditLog({
      action: "account.data_exported",
      actorRole: currentUser.role,
      actorUserId: currentUser.sub,
      metadata: {
        summary: summarizeAccountExport(exportData)
      },
      requestId: request.id,
      severity: "low",
      targetId: currentUser.sub,
      targetType: "account"
    }).catch((error) => {
      request.log.warn({ err: error }, "Account export audit log write failed");
    });

    return reply
      .header("content-disposition", `attachment; filename="entral-account-export-${currentUser.sub}.json"`)
      .send(exportData);
  });

  app.delete("/account", {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes"
      }
    }
  }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = deleteAccountSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: {
        email: true,
        id: true,
        passwordHash: true,
        role: true
      }
    });
    const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return reply.code(401).send({ error: "Unauthorized", message: "Password confirmation failed." });
    }

    const exportData = await buildAccountExport(user.id);
    await recordAuditLog({
      action: "account.deletion_confirmed",
      actorRole: currentUser.role,
      actorUserId: user.id,
      metadata: {
        email: user.email,
        summary: summarizeAccountExport(exportData)
      },
      requestId: request.id,
      severity: "high",
      targetId: user.id,
      targetType: "account"
    });

    await deleteAccountAndWorkspace(user.id);
    clearAuthCookie(reply);

    return reply.send({
      ok: true,
      message: "Account and personal workspace data deleted."
    });
  });
}

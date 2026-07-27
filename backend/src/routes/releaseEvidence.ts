import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin, setPrivateNoStoreHeaders } from "../auth.js";
import { releaseEvidenceService } from "../services/releaseEvidence.js";

const phaseParamsSchema = z.object({
  phase: z.coerce.number().int().min(1).max(10_000)
});

export async function releaseEvidenceRoutes(app: FastifyInstance) {
  app.addHook("onRequest", (_request, reply, done) => {
    setPrivateNoStoreHeaders(reply);
    done();
  });

  app.get("/control-plane/releases/phases/:phase/evidence", {
    preHandler: requireAdmin
  }, async (request, reply) => {
    const currentUser = request.user;
    if (!currentUser) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Authentication is required."
      });
    }
    const { phase } = phaseParamsSchema.parse(request.params);
    return reply.send(await releaseEvidenceService.readPhase(phase, {
      actionReason: `Read the machine-verifiable production release evidence for Phase ${phase}.`,
      authSubject: currentUser.sub,
      correlationId: randomUUID()
    }));
  });
}

import { env } from "../env.js";

export function buildHealthPayload(requestId: string) {
  return {
    environment: env.NODE_ENV,
    features: {
      ai: env.AI_FEATURE_ENABLED,
      agentOrchestrator: env.AGENT_ORCHESTRATOR_ENABLED,
      automationWorker: env.AUTOMATION_WORKER_ENABLED,
      scheduler: env.AUTONOMY_SCHEDULER_ENABLED
    },
    ok: true,
    requestId,
    service: "entral-backend",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  };
}

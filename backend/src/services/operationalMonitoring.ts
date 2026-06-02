import type { FastifyBaseLogger } from "fastify";
import { env } from "../env.js";
import { assertSafeOutboundWebhookUrl } from "./urlSafety.js";

type OperationalAlert = {
  metadata?: Record<string, unknown>;
  requestId?: string;
  severity: "medium" | "high" | "critical";
  title: string;
};

export async function emitOperationalAlert(alert: OperationalAlert, logger?: FastifyBaseLogger) {
  if (!env.ALERT_WEBHOOK_URL) {
    return;
  }

  try {
    const webhookUrl = assertSafeOutboundWebhookUrl(env.ALERT_WEBHOOK_URL);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(webhookUrl, {
        body: JSON.stringify({
          kind: "operational",
          metadata: alert.metadata ?? {},
          requestId: alert.requestId,
          severity: alert.severity,
          title: alert.title,
          timestamp: new Date().toISOString()
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger?.warn({ err: error }, "Operational alert webhook failed");
  }
}

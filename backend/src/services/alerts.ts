import type { FastifyBaseLogger } from "fastify";
import { env } from "../env.js";
import { recordAuditLog } from "./audit.js";
import { assertSafeOutboundWebhookUrl } from "./urlSafety.js";

type GovernanceAlert = {
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  severity: "medium" | "high" | "critical";
  targetId?: string | null;
  targetType: string;
  title: string;
};

export async function emitGovernanceAlert(alert: GovernanceAlert, logger?: FastifyBaseLogger) {
  await recordAuditLog({
    action: "governance.alert",
    actorUserId: alert.actorUserId,
    metadata: {
      ...alert.metadata,
      title: alert.title
    },
    outcome: "alert",
    severity: alert.severity,
    targetId: alert.targetId,
    targetType: alert.targetType
  });

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
          severity: alert.severity,
          targetId: alert.targetId,
          targetType: alert.targetType,
          title: alert.title,
          metadata: alert.metadata ?? {}
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
    logger?.warn({ err: error }, "Governance alert webhook failed");
  }
}

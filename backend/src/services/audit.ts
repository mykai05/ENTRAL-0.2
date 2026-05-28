import { prisma } from "../db.js";
import { parseSecureJson, stableJsonHash, stringifySecureJson } from "./secureJson.js";

type AuditOutcome = "success" | "failure" | "blocked" | "alert";
type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AuditEntry = {
  action: string;
  actorRole?: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  outcome?: AuditOutcome;
  requestId?: string;
  severity?: AuditSeverity;
  targetId?: string | null;
  targetType: string;
};

export async function recordAuditLog(entry: AuditEntry) {
  const timestamp = new Date().toISOString();
  const fullEntry = {
    ...entry,
    actorUserId: entry.actorUserId ?? null,
    metadata: entry.metadata ?? {},
    outcome: entry.outcome ?? "success",
    severity: entry.severity ?? "info",
    targetId: entry.targetId ?? null,
    timestamp
  };

  return prisma.auditLog.create({
    data: {
      actorUserId: fullEntry.actorUserId,
      action: fullEntry.action,
      targetType: fullEntry.targetType,
      targetId: fullEntry.targetId,
      outcome: fullEntry.outcome,
      severity: fullEntry.severity,
      entryJson: stringifySecureJson(fullEntry),
      entryHash: stableJsonHash(fullEntry)
    }
  });
}

export function publicAuditLog(log: {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  severity: string;
  entryJson: string;
  entryHash: string;
  createdAt: Date;
}) {
  return {
    id: log.id,
    actorUserId: log.actorUserId,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    outcome: log.outcome,
    severity: log.severity,
    entry: parseSecureJson<Record<string, unknown>>(log.entryJson),
    entryHash: log.entryHash,
    createdAt: log.createdAt
  };
}

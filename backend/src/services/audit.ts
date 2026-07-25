import {
  assertAuditEntry,
  type AuditEntry as CanonicalAuditEntry
} from "@entral/contracts";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { parseSecureJson, stableJsonHash, stringifySecureJson } from "./secureJson.js";

type AuditOutcome = "success" | "failure" | "blocked" | "alert";
type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

/**
 * Adapter input for the pre-Phase-140 AuditLog table. This is not a wire
 * contract; canonical control-plane audit records use CanonicalAuditEntry.
 */
export type AuditLogInput = {
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

export async function recordAuditLog(
  entry: AuditLogInput,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
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

  return client.auditLog.create({
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

export async function recordCanonicalAuditLog(
  entry: CanonicalAuditEntry,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  assertAuditEntry(entry);
  return recordAuditLog({
    action: entry.action_type,
    actorRole: entry.actor_type,
    actorUserId: entry.actor_type === "HUMAN" ? entry.actor_id : null,
    metadata: {
      canonicalAuditEntry: entry
    },
    outcome: entry.result === "SUCCEEDED"
      ? "success"
      : entry.result === "ROLLED_BACK"
        ? "blocked"
        : "failure",
    requestId: entry.correlation_id,
    severity: entry.result === "SUCCEEDED" ? "info" : "high",
    targetId: entry.target_id,
    targetType: entry.target_type
  }, client);
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

import { z } from "zod";
import { env } from "../env.js";
import {
  isEncryptedSecureJson,
  parseSecureJson,
  secureJsonEncryptionConfigured,
  stringifySecureJson
} from "./secureJson.js";

const shortText = (maximum: number) => z.string().trim().min(1).max(maximum);
const itemId = shortText(80);

export const memberWorkspaceSnapshotSchema = z.object({
  businessHealth: z.object({
    score: z.number().int().min(0).max(100),
    status: z.enum(["stable", "watch", "attention"]),
    summary: shortText(500)
  }).strict().nullable(),
  objectivesAndPriorities: z.array(z.object({
    id: itemId,
    priority: z.enum(["high", "medium", "low"]),
    progress: z.number().int().min(0).max(100),
    status: z.enum(["planned", "active", "complete"]),
    title: shortText(180)
  }).strict()).max(12),
  findingsAndRecommendations: z.array(z.object({
    detail: shortText(1_000),
    id: itemId,
    recommendation: shortText(1_000),
    severity: z.enum(["information", "opportunity", "risk"]),
    title: shortText(180)
  }).strict()).max(20),
  monthlyOperatingSummary: z.object({
    accomplishments: z.array(shortText(240)).max(8),
    headline: shortText(180),
    nextPriorities: z.array(shortText(240)).max(8),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    summary: shortText(1_500)
  }).strict().nullable()
}).strict();

export const memberWorkspacePublicationSchema = z.object({
  expectedVersion: z.number().int().nonnegative().optional(),
  snapshot: memberWorkspaceSnapshotSchema
}).strict();

export type MemberWorkspaceSnapshot = z.infer<typeof memberWorkspaceSnapshotSchema>;

export function assertMemberWorkspacePublicationReady(
  environment = env.NODE_ENV,
  encryptionConfigured = secureJsonEncryptionConfigured()
) {
  if (environment === "production" && !encryptionConfigured) {
    throw new Error("DATA_ENCRYPTION_KEY is required to publish member workspace data in production.");
  }

  return encryptionConfigured;
}

export function memberWorkspaceNeedsEncryptionRewrite(
  snapshotJson: string,
  encryptionConfigured = secureJsonEncryptionConfigured()
) {
  return encryptionConfigured && !isEncryptedSecureJson(snapshotJson);
}

export function serializeMemberWorkspace(snapshot: MemberWorkspaceSnapshot) {
  return stringifySecureJson(memberWorkspaceSnapshotSchema.parse(snapshot));
}

export function parseMemberWorkspace(snapshotJson: string) {
  return memberWorkspaceSnapshotSchema.parse(parseSecureJson<unknown>(snapshotJson));
}

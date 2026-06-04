import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";

export type ShopifyOAuthContinuationPayload = {
  connectorApproval: boolean;
  countryCode: string;
  dryRun: boolean;
  includeCollections: boolean;
  includeProducts: boolean;
  includeStoreShell: boolean;
  liveUnlockPhrase: string | null;
  maxProducts: number;
  note: string | null;
  ownerEmail: string | null;
  requestedShopName: string | null;
  storeType: "client_transfer" | "development";
};

export type ShopifyOAuthContinuationRecord = {
  auditLogId: string | null;
  consumedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  payload: ShopifyOAuthContinuationPayload;
  resultAuditLogId: string | null;
  resultSummary: string | null;
  shopDomain: string;
  stateNonce: string;
  status: string;
  storeId: string;
  updatedAt: Date;
  userId: string;
};

type ShopifyOAuthContinuationRow = Omit<ShopifyOAuthContinuationRecord, "payload"> & {
  payloadJson: string;
};

function rowToRecord(row: ShopifyOAuthContinuationRow): ShopifyOAuthContinuationRecord | null {
  const payload = parseSecureJson<ShopifyOAuthContinuationPayload>(row.payloadJson);

  if (!payload) return null;

  return {
    ...row,
    payload
  };
}

export async function createShopifyOAuthContinuation(input: {
  expiresAt: Date;
  payload: ShopifyOAuthContinuationPayload;
  shopDomain: string;
  stateNonce: string;
  storeId: string;
  userId: string;
}) {
  const now = new Date();
  const rows = await prisma.$queryRaw<ShopifyOAuthContinuationRow[]>(Prisma.sql`
    INSERT INTO "ShopifyOAuthContinuation" (
      "id",
      "userId",
      "storeId",
      "shopDomain",
      "stateNonce",
      "status",
      "payloadJson",
      "expiresAt",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${randomUUID()},
      ${input.userId},
      ${input.storeId},
      ${input.shopDomain},
      ${input.stateNonce},
      'pending',
      ${stringifySecureJson(input.payload)},
      ${input.expiresAt},
      ${now},
      ${now}
    )
    ON CONFLICT ("stateNonce") DO UPDATE SET
      "status" = 'pending',
      "payloadJson" = EXCLUDED."payloadJson",
      "expiresAt" = EXCLUDED."expiresAt",
      "consumedAt" = NULL,
      "resultAuditLogId" = NULL,
      "resultSummary" = NULL,
      "updatedAt" = EXCLUDED."updatedAt"
    RETURNING *
  `);

  const record = rows[0] ? rowToRecord(rows[0]) : null;

  if (!record) {
    throw new Error("Shopify OAuth continuation payload is unreadable.");
  }

  return record;
}

export async function attachShopifyOAuthContinuationAudit(input: {
  auditLogId: string;
  continuationId: string;
}) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "ShopifyOAuthContinuation"
    SET "auditLogId" = ${input.auditLogId}, "updatedAt" = ${new Date()}
    WHERE "id" = ${input.continuationId}
  `);
}

export async function getPendingShopifyOAuthContinuation(input: {
  now?: Date;
  shopDomain: string;
  stateNonce: string;
  storeId: string;
  userId: string;
}) {
  const rows = await prisma.$queryRaw<ShopifyOAuthContinuationRow[]>(Prisma.sql`
    SELECT *
    FROM "ShopifyOAuthContinuation"
    WHERE "stateNonce" = ${input.stateNonce}
      AND "userId" = ${input.userId}
      AND "storeId" = ${input.storeId}
      AND "shopDomain" = ${input.shopDomain}
      AND "status" = 'pending'
    LIMIT 1
  `);
  const record = rows[0] ? rowToRecord(rows[0]) : null;

  if (!record) return null;

  if (record.expiresAt.getTime() < (input.now ?? new Date()).getTime()) {
    await markShopifyOAuthContinuationFailed({
      continuationId: record.id,
      resultSummary: "Shopify OAuth continuation expired before the callback completed."
    });

    return null;
  }

  return record;
}

export async function markShopifyOAuthContinuationConsumed(input: {
  continuationId: string;
  resultAuditLogId: string;
  resultSummary: string;
}) {
  const now = new Date();
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "ShopifyOAuthContinuation"
    SET
      "status" = 'consumed',
      "consumedAt" = ${now},
      "resultAuditLogId" = ${input.resultAuditLogId},
      "resultSummary" = ${input.resultSummary},
      "updatedAt" = ${now}
    WHERE "id" = ${input.continuationId}
  `);
}

export async function markShopifyOAuthContinuationFailed(input: {
  continuationId: string;
  resultAuditLogId?: string | null;
  resultSummary: string;
}) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "ShopifyOAuthContinuation"
    SET
      "status" = 'failed',
      "resultAuditLogId" = ${input.resultAuditLogId ?? null},
      "resultSummary" = ${input.resultSummary},
      "updatedAt" = ${new Date()}
    WHERE "id" = ${input.continuationId}
  `);
}

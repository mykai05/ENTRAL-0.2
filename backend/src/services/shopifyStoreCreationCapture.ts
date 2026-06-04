import type { ShopifyStoreCreationCaptureInput } from "../schemas.js";
import { recordAuditLog } from "./audit.js";
import { createShopifyAutonomyResumeJob } from "./shopifyAutonomyJobs.js";
import { buildShopifyOAuthStart, normalizeShopifyOAuthShopDomain } from "./shopifyOAuth.js";
import { attachShopifyOAuthContinuationAudit, createShopifyOAuthContinuation } from "./shopifyOAuthContinuations.js";

export class ShopifyStoreCreationCaptureError extends Error {
  statusCode: number;
  payload: Record<string, unknown>;

  constructor(statusCode: number, message: string, payload: Record<string, unknown> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export type ShopifyStoreCreationCaptureStore = {
  businessName: string;
  email: string;
  id: string;
  storePlatform: string;
};

export type ShopifyStoreCreationCaptureResult = Awaited<ReturnType<typeof captureShopifyStoreCreationForStore>>;

export async function captureShopifyStoreCreationForStore(input: {
  approvalPacketId?: string | null;
  reviewStatus?: "approved" | "rejected" | null;
  store: ShopifyStoreCreationCaptureStore;
  userId: string;
  value: ShopifyStoreCreationCaptureInput;
}) {
  if (input.store.storePlatform !== "SHOPIFY") {
    throw new ShopifyStoreCreationCaptureError(400, "Shopify store creation capture can only be recorded for Shopify merch stores.");
  }

  const shopDomain = normalizeShopifyOAuthShopDomain(input.value.shopDomain);

  if (!shopDomain) {
    throw new ShopifyStoreCreationCaptureError(400, "Shopify store creation capture requires a valid *.myshopify.com shop domain.");
  }

  const evidenceShopDomain = normalizeShopifyOAuthShopDomain(input.value.browserTaskEvidence.finalShopDomain);

  if (evidenceShopDomain && evidenceShopDomain !== shopDomain) {
    throw new ShopifyStoreCreationCaptureError(400, "Shopify store creation evidence domain must match the captured shop domain.");
  }

  const browserTaskEvidence = {
    capturedAt: input.value.browserTaskEvidence.capturedAt ?? new Date().toISOString(),
    capturedFromTargetUrl: input.value.browserTaskEvidence.capturedFromTargetUrl ?? "https://dev.shopify.com/dashboard/stores",
    completedStepIds: input.value.browserTaskEvidence.completedStepIds,
    countryCode: input.value.countryCode,
    finalShopDomain: shopDomain,
    operatorOrSessionContext: input.value.browserTaskEvidence.operatorOrSessionContext ?? null,
    source: input.value.browserTaskEvidence.source,
    storeType: input.value.browserTaskEvidence.storeType ?? input.value.storeType
  };
  let oauthStart: ReturnType<typeof buildShopifyOAuthStart> | null = null;

  if (input.value.startOAuth) {
    try {
      oauthStart = buildShopifyOAuthStart({
        returnTo: input.value.returnTo,
        scopes: input.value.scopes,
        shopDomain,
        storeId: input.store.id,
        userId: input.userId
      });
    } catch (error) {
      throw new ShopifyStoreCreationCaptureError(400, error instanceof Error ? error.message : "Shopify OAuth start failed.");
    }

    if (oauthStart.missingEnvVars.length > 0) {
      throw new ShopifyStoreCreationCaptureError(400, `Shopify OAuth app credentials are missing: ${oauthStart.missingEnvVars.join(", ")}.`, {
        missingEnvVars: oauthStart.missingEnvVars
      });
    }
  }

  const requestedShopName = input.value.requestedShopName ?? input.store.businessName;
  const ownerEmail = input.value.ownerEmail ?? input.store.email;
  const continuation = oauthStart && input.value.continueAfterApproval
    ? await createShopifyOAuthContinuation({
      expiresAt: new Date(oauthStart.stateExpiresAt),
      payload: {
        connectorApproval: input.value.connectorApproval,
        countryCode: input.value.countryCode,
        dryRun: input.value.dryRun,
        includeCollections: input.value.includeCollections,
        includeProducts: input.value.includeProducts,
        includeStoreShell: input.value.includeStoreShell,
        liveUnlockPhrase: input.value.liveUnlockPhrase?.trim() || null,
        maxProducts: input.value.maxProducts,
        note: input.value.note ?? null,
        ownerEmail,
        requestedShopName,
        storeType: input.value.storeType
      },
      shopDomain,
      stateNonce: oauthStart.stateNonce,
      storeId: input.store.id,
      userId: input.userId
    })
    : null;
  const resumeJob = input.value.queueAutonomyResume
    ? await createShopifyAutonomyResumeJob({
      payload: {
        connectionWatchAttempt: 0,
        connectionWatchIntervalMinutes: input.value.connectionWatchIntervalMinutes,
        connectorApproval: input.value.connectorApproval,
        countryCode: input.value.countryCode,
        dryRun: input.value.dryRun,
        includeCollections: input.value.includeCollections,
        includeProducts: input.value.includeProducts,
        includeStoreShell: input.value.includeStoreShell,
        liveUnlockPhrase: input.value.liveUnlockPhrase,
        maxConnectionWatchAttempts: input.value.maxConnectionWatchAttempts,
        maxProducts: input.value.maxProducts,
        note: input.value.note ?? null,
        ownerEmail,
        requestedShopName,
        storeId: input.store.id,
        storeType: input.value.storeType,
        watchForConnection: true
      },
      userId: input.userId
    })
    : null;
  const capture = {
    actualExternalActionsExecuted: false,
    autonomyResumeJob: resumeJob ? {
      connectionWatch: {
        attempt: 0,
        enabled: true,
        intervalMinutes: input.value.connectionWatchIntervalMinutes,
        maxAttempts: input.value.maxConnectionWatchAttempts
      },
      id: resumeJob.id,
      scheduledAt: resumeJob.scheduledAt?.toISOString() ?? null,
      status: resumeJob.status,
      type: resumeJob.type
    } : null,
    externalExecution: false,
    browserTaskEvidence,
    mode: "Shopify Store Creation Capture",
    oauth: oauthStart ? {
      authorizeUrl: oauthStart.authorizeUrl,
      callbackUrl: oauthStart.callbackUrl,
      continuation: continuation ? {
        expiresAt: continuation.expiresAt,
        id: continuation.id,
        status: continuation.status
      } : null,
      scopes: oauthStart.scopes,
      shopDomain: oauthStart.shopDomain,
      stateExpiresAt: oauthStart.stateExpiresAt
    } : null,
    providerContacted: false,
    shopDomain,
    status: oauthStart ? "oauth_ready" : resumeJob ? "watch_queued" : "captured",
    summary: oauthStart
      ? `${input.store.businessName} Shopify store domain ${shopDomain} captured. OAuth approval link is ready and autonomy continuation is ${continuation ? "armed" : "not armed"}.`
      : resumeJob
        ? `${input.store.businessName} Shopify store domain ${shopDomain} captured. Autonomy watcher ${resumeJob.id} is queued while connection approval is completed.`
        : `${input.store.businessName} Shopify store domain ${shopDomain} captured for the next Shopify autonomy step.`
  };
  const auditLog = await recordAuditLog({
    action: input.approvalPacketId ? "shopify.store_creation.captured_from_approval" : "shopify.store_creation.captured",
    actorUserId: input.userId,
    metadata: {
      approvalPacketId: input.approvalPacketId ?? null,
      capture,
      connectionWatchQueued: Boolean(resumeJob),
      continuation: continuation ? {
        id: continuation.id,
        status: continuation.status
      } : null,
      browserTaskEvidence,
      note: input.value.note ?? null,
      oauthStarted: Boolean(oauthStart),
      requestedShopName,
      reviewStatus: input.reviewStatus ?? null,
      shopDomain,
      storeType: input.value.storeType
    },
    outcome: "success",
    severity: oauthStart || resumeJob ? "medium" : "low",
    targetId: input.store.id,
    targetType: "shopify_store_creation_capture"
  });

  if (continuation) {
    await attachShopifyOAuthContinuationAudit({
      auditLogId: auditLog.id,
      continuationId: continuation.id
    });
  }

  return {
    auditLogId: auditLog.id,
    capture
  };
}

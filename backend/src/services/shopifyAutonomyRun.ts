import type { MerchProductSnapshot, MerchStoreSnapshot } from "./merchReports.js";
import { buildShopifyStoreProvisioningPlan, type ShopifyStoreProvisioningPlan } from "./shopifyStoreProvisioning.js";
import type { ShopifyConnectionSnapshot } from "./shopifyConnections.js";
import {
  executeShopifyStorefrontDraft,
  type ShopifyFetch,
  type ShopifyStorefrontDraftCredentials,
  type ShopifyStorefrontDraftPlan,
  type ShopifyStorefrontDraftOptions
} from "./shopifyStorefrontExecutor.js";

export type ShopifyAutonomyRunStatus =
  | "blocked_owner_gates"
  | "blocked_store_creation_required"
  | "blocked_credentials"
  | "executed_shopify_draft"
  | "failed"
  | "not_applicable"
  | "preview_ready"
  | "ready_for_shopify_draft";

export type ShopifyAutonomyRunPlan = {
  actualExternalActionsExecuted: boolean;
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: boolean;
  generatedAt: string;
  guardrails: string[];
  mode: "Shopify Autonomous Store Run";
  nextAction: "connect_shopify_admin" | "owner_unlock_required" | "review_failed_actions" | "run_shopify_draft_executor" | "shopify_draft_complete" | "skip_non_shopify_store";
  ownerUnlock: {
    connectorApproval: boolean;
    dryRun: boolean;
    phraseProvided: boolean;
  };
  providerContacted: boolean;
  provisioning: ShopifyStoreProvisioningPlan;
  sourceStore: {
    businessName: string;
    storePlatform: string;
  };
  status: ShopifyAutonomyRunStatus;
  storefrontDraft: ShopifyStorefrontDraftPlan | null;
  summary: string;
  totals: {
    blockedActions: number;
    executedActions: number;
    failedActions: number;
    plannedDraftActions: number;
  };
};

function statusFrom(input: {
  dryRun: boolean;
  provisioning: ShopifyStoreProvisioningPlan;
  storefrontDraft: ShopifyStorefrontDraftPlan | null;
}): ShopifyAutonomyRunStatus {
  if (input.provisioning.status === "not_applicable") return "not_applicable";
  if (input.provisioning.status === "dev_dashboard_creation_required") return "blocked_store_creation_required";
  if (!input.storefrontDraft) return "blocked_store_creation_required";
  if (input.dryRun) return "preview_ready";
  if (input.storefrontDraft.status === "executed") return "executed_shopify_draft";
  if (input.storefrontDraft.status === "failed") return "failed";
  if (input.storefrontDraft.status === "credential_blocked") return "blocked_credentials";
  if (input.storefrontDraft.status === "ready_for_owner_unlock") return "blocked_owner_gates";

  return "ready_for_shopify_draft";
}

function nextActionFor(status: ShopifyAutonomyRunStatus): ShopifyAutonomyRunPlan["nextAction"] {
  if (status === "not_applicable") return "skip_non_shopify_store";
  if (status === "blocked_store_creation_required" || status === "blocked_credentials") return "connect_shopify_admin";
  if (status === "blocked_owner_gates") return "owner_unlock_required";
  if (status === "failed") return "review_failed_actions";
  if (status === "executed_shopify_draft") return "shopify_draft_complete";

  return "run_shopify_draft_executor";
}

function summaryFor(input: {
  provisioning: ShopifyStoreProvisioningPlan;
  status: ShopifyAutonomyRunStatus;
  storefrontDraft: ShopifyStorefrontDraftPlan | null;
  store: MerchStoreSnapshot;
}) {
  if (input.status === "blocked_store_creation_required") {
    return `${input.store.businessName} Shopify autonomy is waiting on the store creation/connection gate before draft storefront work can run.`;
  }

  if (input.storefrontDraft?.summary) {
    return `${input.store.businessName} Shopify autonomy reached storefront draft step: ${input.storefrontDraft.summary}`;
  }

  return `${input.store.businessName} Shopify autonomy status is ${input.status.replace(/_/g, " ")}.`;
}

export async function executeShopifyAutonomyRun(input: {
  connectorApproval?: boolean;
  connections?: ShopifyConnectionSnapshot[];
  countryCode?: string | null;
  credentials?: ShopifyStorefrontDraftCredentials | null;
  dryRun?: boolean;
  fetcher?: ShopifyFetch;
  generatedAt?: string;
  liveUnlockPhrase?: string | null;
  options?: Partial<ShopifyStorefrontDraftOptions>;
  ownerEmail?: string | null;
  products: MerchProductSnapshot[];
  requestedShopName?: string | null;
  store: MerchStoreSnapshot;
  storeId: string;
  storeType?: "client_transfer" | "development" | null;
}): Promise<ShopifyAutonomyRunPlan> {
  const dryRun = input.dryRun ?? true;
  const provisioning = buildShopifyStoreProvisioningPlan({
    connectedShopDomain: input.credentials?.shopDomain,
    connections: input.connections,
    countryCode: input.countryCode,
    generatedAt: input.generatedAt,
    ownerEmail: input.ownerEmail,
    requestedShopName: input.requestedShopName,
    store: input.store,
    storeId: input.storeId,
    storeType: input.storeType
  });
  const storefrontDraft = provisioning.continuation.readyForDraftExecutor
    ? await executeShopifyStorefrontDraft({
      connectorApproval: input.connectorApproval,
      credentials: input.credentials ?? undefined,
      dryRun,
      fetcher: input.fetcher,
      generatedAt: input.generatedAt,
      liveUnlockPhrase: input.liveUnlockPhrase,
      options: input.options,
      products: input.products,
      store: input.store,
      storeId: input.storeId
    })
    : null;
  const status = statusFrom({ dryRun, provisioning, storefrontDraft });
  const totals = {
    blockedActions: (storefrontDraft?.totals.blockedActions ?? 0) + (status === "blocked_store_creation_required" ? 1 : 0),
    executedActions: storefrontDraft?.totals.executedActions ?? 0,
    failedActions: storefrontDraft?.totals.failedActions ?? 0,
    plannedDraftActions: storefrontDraft?.storefrontActions.length ?? 0
  };

  return {
    actualExternalActionsExecuted: storefrontDraft?.actualExternalActionsExecuted ?? false,
    auditEvents: [
      "Shopify autonomous store run composed provisioning, connection readiness, and draft storefront execution.",
      ...provisioning.auditEvents,
      ...(storefrontDraft?.auditEvents ?? [])
    ],
    blockedExternalActions: Array.from(new Set([
      ...provisioning.blockedExternalActions,
      ...(storefrontDraft?.blockedExternalActions ?? [])
    ])),
    externalExecution: storefrontDraft?.externalExecution ?? false,
    generatedAt: input.generatedAt ?? provisioning.generatedAt,
    guardrails: Array.from(new Set([
      ...provisioning.guardrails,
      ...(storefrontDraft?.guardrails ?? [])
    ])),
    mode: "Shopify Autonomous Store Run",
    nextAction: nextActionFor(status),
    ownerUnlock: {
      connectorApproval: input.connectorApproval ?? false,
      dryRun,
      phraseProvided: Boolean(input.liveUnlockPhrase?.trim())
    },
    providerContacted: storefrontDraft?.providerContacted ?? false,
    provisioning,
    sourceStore: {
      businessName: input.store.businessName,
      storePlatform: input.store.storePlatform
    },
    status,
    storefrontDraft,
    summary: summaryFor({
      provisioning,
      status,
      storefrontDraft,
      store: input.store
    }),
    totals
  };
}

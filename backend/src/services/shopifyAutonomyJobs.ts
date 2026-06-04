import type { AutomationJob } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { recordAuditLog } from "./audit.js";
import type { GrowthApprovalAction, GrowthApprovalPacket } from "./growthPlans.js";
import { stringifySecureJson, parseSecureJson } from "./secureJson.js";
import { executeShopifyAutonomyRun, type ShopifyAutonomyRunPlan, type ShopifyAutonomyRunStatus } from "./shopifyAutonomyRun.js";
import { getShopifyConnectionCredentials, listShopifyConnections } from "./shopifyConnections.js";
import type { MerchProductSnapshot } from "./merchReports.js";

export const shopifyAutonomyResumeJobType = "shopify_autonomy_resume";

const storePlatformFromDb = {
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  OTHER: "Other"
} as const;

const podProviderFromDb = {
  PRINTIFY: "Printify",
  PRINTFUL: "Printful",
  OTHER: "Other"
} as const;

const approvalStatusFromDb = {
  NOT_STARTED: "Not Started",
  RESEARCH_APPROVED: "Research Approved",
  DESIGNS_PENDING: "Designs Pending",
  DESIGNS_APPROVED: "Designs Approved",
  LISTINGS_APPROVED: "Listings Approved",
  LAUNCH_APPROVED: "Launch Approved"
} as const;

const launchStatusFromDb = {
  LEAD: "Lead",
  DISCOVERY: "Discovery",
  RESEARCHING: "Researching",
  DESIGNING: "Designing",
  AWAITING_APPROVAL: "Awaiting Approval",
  BUILDING_STORE: "Building Store",
  LAUNCHED: "Launched",
  OPTIMIZING: "Optimizing",
  PAUSED: "Paused",
  ARCHIVED: "Archived"
} as const;

const productStatusFromDb = {
  IDEA: "Idea",
  PROMPT_READY: "Prompt Ready",
  DESIGNED: "Designed",
  MOCKUP_CREATED: "Mockup Created",
  LISTING_DRAFTED: "Listing Drafted",
  COMPLIANCE_REVIEW: "Compliance Review",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  NEEDS_REVISION: "Needs Revision",
  REJECTED: "Rejected",
  ARCHIVED: "Archived"
} as const;

export const shopifyAutonomyResumeJobPayloadSchema = z.object({
  connectionWatchAttempt: z.coerce.number().int().min(0).max(96).default(0),
  connectionWatchIntervalMinutes: z.coerce.number().int().min(1).max(1440).default(15),
  connectorApproval: z.boolean().default(false),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).default("US"),
  dryRun: z.boolean().default(false),
  includeCollections: z.boolean().default(true),
  includeProducts: z.boolean().default(true),
  includeStoreShell: z.boolean().default(true),
  liveUnlockPhrase: z.string().trim().max(120).optional(),
  maxConnectionWatchAttempts: z.coerce.number().int().min(0).max(96).default(24),
  maxProducts: z.coerce.number().int().min(1).max(25).default(5),
  note: z.string().trim().max(500).nullable().optional(),
  ownerEmail: z.string().trim().email().nullable().optional(),
  requestedShopName: z.string().trim().max(120).nullable().optional(),
  storeId: z.string().cuid(),
  storeType: z.enum(["client_transfer", "development"]).default("client_transfer"),
  watchForConnection: z.boolean().default(true)
});

export type ShopifyAutonomyResumeJobPayload = z.infer<typeof shopifyAutonomyResumeJobPayloadSchema>;

export type ShopifyConnectionWatchDecision = {
  attempt: number;
  enabled: boolean;
  intervalMinutes: number;
  maxAttempts: number;
  nextAttempt: number | null;
  reason: "disabled" | "exhausted" | "not_connection_blocked" | "scheduled";
  scheduledAt: Date | null;
  shouldSchedule: boolean;
};

export type ShopifyAutonomySupervisorDecision = {
  action:
    | "connect_shopify_admin"
    | "repair_failed_draft_actions"
    | "request_owner_unlock"
    | "review_draft_resources"
    | "run_shopify_draft_executor"
    | "skip_non_shopify_store"
    | "wait_for_connection";
  failedActionCount: number;
  followUpJobId: string | null;
  launchReadinessStatus: string | null;
  nextRunAt: string | null;
  reason: string;
  reviewResourceCount: number;
  status:
    | "blocked"
    | "complete"
    | "queued_follow_up"
    | "ready_for_next_step"
    | "requires_repair";
  summary: string;
};

export type ShopifyAutonomySupervisorApprovalPacket = GrowthApprovalPacket & {
  shopifyAutonomy: {
    action: ShopifyAutonomySupervisorDecision["action"];
    failedActionCount: number;
    launchReadinessStatus: string | null;
    nextRunAt: string | null;
    reviewResourceCount: number;
    status: ShopifyAutonomySupervisorDecision["status"];
    storefrontDraftStatus: string | null;
  };
};

export type ShopifyAutonomyReviewContinuation = {
  action: ShopifyAutonomySupervisorDecision["action"];
  approvalStatus: "approved" | "rejected";
  canResumeAutonomy: boolean;
  externalExecution: false;
  launchReadinessStatus: string | null;
  message: string;
  nextStep:
    | "connect_shopify_admin"
    | "provide_owner_unlock"
    | "public_launch_approval_required"
    | "queue_shopify_autonomy_resume"
    | "repair_failed_draft_actions"
    | "wait_for_connection"
    | "none";
  providerContacted: false;
  recommendedEndpoint: string | null;
  requiredInputs: string[];
  reviewResourceCount: number;
  storefrontDraftStatus: string | null;
};

export function buildShopifyConnectionWatchDecision(input: {
  attempt: number;
  intervalMinutes: number;
  maxAttempts: number;
  now?: Date;
  status: ShopifyAutonomyRunStatus;
  watchForConnection: boolean;
}): ShopifyConnectionWatchDecision {
  const attempt = Math.max(0, Math.floor(input.attempt));
  const intervalMinutes = Math.min(Math.max(Math.floor(input.intervalMinutes), 1), 1440);
  const maxAttempts = Math.min(Math.max(Math.floor(input.maxAttempts), 0), 96);
  const base = {
    attempt,
    enabled: input.watchForConnection,
    intervalMinutes,
    maxAttempts,
    nextAttempt: null,
    scheduledAt: null,
    shouldSchedule: false
  };

  if (!input.watchForConnection || maxAttempts === 0) {
    return {
      ...base,
      reason: "disabled"
    };
  }

  if (input.status !== "blocked_store_creation_required" && input.status !== "blocked_credentials") {
    return {
      ...base,
      reason: "not_connection_blocked"
    };
  }

  if (attempt >= maxAttempts) {
    return {
      ...base,
      reason: "exhausted"
    };
  }

  return {
    ...base,
    nextAttempt: attempt + 1,
    reason: "scheduled",
    scheduledAt: new Date((input.now ?? new Date()).getTime() + intervalMinutes * 60 * 1000),
    shouldSchedule: true
  };
}

export function buildShopifyAutonomySupervisorDecision(input: {
  connectionWatch: ShopifyConnectionWatchDecision;
  followUpJobId?: string | null;
  plan: ShopifyAutonomyRunPlan;
}): ShopifyAutonomySupervisorDecision {
  const launchReadiness = input.plan.storefrontDraft?.launchReadiness ?? null;
  const base = {
    failedActionCount: input.plan.totals.failedActions,
    followUpJobId: input.followUpJobId ?? null,
    launchReadinessStatus: launchReadiness?.status ?? null,
    nextRunAt: input.connectionWatch.scheduledAt?.toISOString() ?? null,
    reviewResourceCount: launchReadiness?.readyResourceCount ?? 0
  };

  if (input.connectionWatch.shouldSchedule) {
    return {
      ...base,
      action: "wait_for_connection",
      reason: "Shopify Admin API connection is not available yet; the watcher scheduled another autonomy resume attempt.",
      status: "queued_follow_up",
      summary: `Waiting for Shopify connection; follow-up resume attempt ${input.connectionWatch.nextAttempt}/${input.connectionWatch.maxAttempts} is scheduled.`
    };
  }

  if (input.plan.status === "blocked_store_creation_required" || input.plan.status === "blocked_credentials") {
    return {
      ...base,
      action: "connect_shopify_admin",
      reason: input.connectionWatch.reason === "exhausted"
        ? "Shopify connection watch exhausted its retry window."
        : "Shopify Admin API connection or verified credentials are still required.",
      status: "blocked",
      summary: "Shopify autonomy is blocked until a verified Shopify Admin API connection exists."
    };
  }

  if (input.plan.status === "blocked_owner_gates") {
    return {
      ...base,
      action: "request_owner_unlock",
      reason: "Connector approval or the exact Shopify draft owner phrase is missing.",
      status: "blocked",
      summary: "Shopify draft execution is waiting for owner unlock gates."
    };
  }

  if (input.plan.status === "failed") {
    return {
      ...base,
      action: "repair_failed_draft_actions",
      reason: launchReadiness?.summary ?? "At least one Shopify draft action failed.",
      status: "requires_repair",
      summary: "Shopify draft execution needs repair before another autonomous step can continue."
    };
  }

  if (input.plan.status === "executed_shopify_draft") {
    return {
      ...base,
      action: "review_draft_resources",
      reason: launchReadiness?.summary ?? "Shopify draft resources were created or matched by handle.",
      status: "ready_for_next_step",
      summary: "Shopify draft resources are ready for review and later public-launch gating."
    };
  }

  if (input.plan.status === "not_applicable") {
    return {
      ...base,
      action: "skip_non_shopify_store",
      reason: "The selected merch store is not configured for Shopify.",
      status: "complete",
      summary: "No Shopify autonomy work is needed for this store."
    };
  }

  return {
    ...base,
    action: "run_shopify_draft_executor",
    reason: "Shopify autonomy is prepared but draft execution has not completed yet.",
    status: "ready_for_next_step",
    summary: "Run the controlled Shopify draft executor when all gates are ready."
  };
}

function supervisorPacketTitle(action: ShopifyAutonomySupervisorDecision["action"]) {
  if (action === "connect_shopify_admin") return "Connect Shopify Admin API";
  if (action === "repair_failed_draft_actions") return "Repair Shopify draft actions";
  if (action === "request_owner_unlock") return "Approve Shopify draft owner gates";
  if (action === "review_draft_resources") return "Review Shopify draft resources";
  if (action === "run_shopify_draft_executor") return "Run Shopify draft executor";
  if (action === "skip_non_shopify_store") return "Skip non-Shopify store";
  return "Wait for Shopify connection";
}

function supervisorPacketControls(input: {
  decision: ShopifyAutonomySupervisorDecision;
  plan: ShopifyAutonomyRunPlan;
}) {
  if (input.decision.action === "review_draft_resources") {
    return [
      "Review every Shopify draft resource ID and Admin link captured by ENTRAL.",
      "Keep products draft, pages unpublished, collections unpublished, and navigation unattached.",
      "Do not publish the storefront until the separate public launch approval exists."
    ];
  }

  if (input.decision.action === "request_owner_unlock") {
    return [
      "Confirm connector approval is intentional.",
      "Record the exact Shopify draft owner unlock phrase.",
      "Keep billing, payouts, domains, payments, supplier charges, and public publishing locked."
    ];
  }

  if (input.decision.action === "repair_failed_draft_actions") {
    return [
      "Review failed Shopify draft action messages before retry.",
      "Use captured handles and resource IDs to avoid duplicate resources.",
      "Retry only after credentials, scopes, and payload errors are repaired."
    ];
  }

  if (input.decision.action === "connect_shopify_admin") {
    return [
      "Capture the final myshopify.com domain.",
      "Complete Shopify OAuth or save verified Admin API credentials.",
      "Keep the autonomy resume watcher queued until the connection verifies."
    ];
  }

  return input.plan.guardrails.slice(0, 3);
}

export function buildShopifyAutonomySupervisorApprovalPacket(input: {
  createdAt?: string;
  decision: ShopifyAutonomySupervisorDecision;
  note?: string | null;
  plan: ShopifyAutonomyRunPlan;
  storeId: string;
}): ShopifyAutonomySupervisorApprovalPacket | null {
  if (input.decision.action === "wait_for_connection" || input.decision.action === "skip_non_shopify_store") {
    return null;
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const packetIdValue = `shopify_autonomy_${input.storeId}_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const actionTitle = supervisorPacketTitle(input.decision.action);
  const action: GrowthApprovalAction = {
    approvalStatus: "Pending human approval",
    channel: "Shopify",
    executionState: "Locked - no external action",
    id: `${packetIdValue}_${input.decision.action}`,
    requiredControls: supervisorPacketControls({
      decision: input.decision,
      plan: input.plan
    }),
    scheduledFor: input.decision.nextRunAt,
    summary: input.decision.reason,
    title: actionTitle
  };

  return {
    actions: [action],
    auditEvents: [
      "Shopify autonomy supervisor packet queued from a background resume job.",
      "No additional Shopify request, publish action, payment setup, billing, payout, domain, supplier charge, or ad spend action was executed by this packet."
    ],
    blockedActions: input.plan.blockedExternalActions,
    businessName: input.plan.sourceStore.businessName,
    costGuardrail: "External spend remains $0; Shopify public launch, payments, billing, domains, supplier charges, and ad spend stay locked.",
    createdAt,
    humanApprovalRequired: true,
    id: packetIdValue,
    logging: "Stores the Shopify autonomy supervisor decision, launch-readiness state, and next safe review action.",
    mode: "Mock Mode",
    note: input.note ?? null,
    scheduledFor: input.decision.nextRunAt,
    shopifyAutonomy: {
      action: input.decision.action,
      failedActionCount: input.decision.failedActionCount,
      launchReadinessStatus: input.decision.launchReadinessStatus,
      nextRunAt: input.decision.nextRunAt,
      reviewResourceCount: input.decision.reviewResourceCount,
      status: input.decision.status,
      storefrontDraftStatus: input.plan.storefrontDraft?.status ?? null
    },
    status: "Pending approval",
    storeId: input.storeId,
    summary: input.decision.summary
  };
}

export function buildShopifyAutonomyReviewContinuation(input: {
  packet: GrowthApprovalPacket;
  reviewStatus: "approved" | "rejected";
  storeId: string;
}): ShopifyAutonomyReviewContinuation | null {
  const shopifyAutonomy = (input.packet as Partial<ShopifyAutonomySupervisorApprovalPacket>).shopifyAutonomy;

  if (!shopifyAutonomy) return null;

  const base = {
    action: shopifyAutonomy.action,
    approvalStatus: input.reviewStatus,
    externalExecution: false as const,
    launchReadinessStatus: shopifyAutonomy.launchReadinessStatus,
    providerContacted: false as const,
    reviewResourceCount: shopifyAutonomy.reviewResourceCount,
    storefrontDraftStatus: shopifyAutonomy.storefrontDraftStatus
  };

  if (input.reviewStatus === "rejected") {
    return {
      ...base,
      canResumeAutonomy: false,
      message: "Shopify autonomy packet rejected. Entral will keep Shopify execution locked until the draft issue is repaired.",
      nextStep: "repair_failed_draft_actions",
      recommendedEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-autonomy-resume-job`,
      requiredInputs: [
        "Review the rejection note and failed or disputed draft resources.",
        "Repair the Shopify draft plan before queuing another autonomy resume job."
      ]
    };
  }

  if (shopifyAutonomy.action === "connect_shopify_admin") {
    return {
      ...base,
      canResumeAutonomy: false,
      message: "Shopify Admin connection approval recorded. Connect OAuth or verified Admin API credentials before autonomy resumes.",
      nextStep: "connect_shopify_admin",
      recommendedEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-oauth/start`,
      requiredInputs: [
        "Final myshopify.com domain.",
        "Shopify OAuth approval or a verified Admin API token with required scopes."
      ]
    };
  }

  if (shopifyAutonomy.action === "request_owner_unlock") {
    return {
      ...base,
      canResumeAutonomy: true,
      message: "Shopify owner-gate approval recorded. Queue Shopify autonomy with connector approval and the owner unlock phrase to continue draft execution.",
      nextStep: "provide_owner_unlock",
      recommendedEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-autonomy-resume-job`,
      requiredInputs: [
        "connectorApproval=true",
        "liveUnlockPhrase=\"I APPROVE ENTRAL SHOPIFY DRAFT EXECUTION\""
      ]
    };
  }

  if (shopifyAutonomy.action === "repair_failed_draft_actions") {
    return {
      ...base,
      canResumeAutonomy: true,
      message: "Shopify repair approval recorded. Repair failed draft actions, then queue the Shopify autonomy resume job.",
      nextStep: "repair_failed_draft_actions",
      recommendedEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-autonomy-resume-job`,
      requiredInputs: [
        "Resolved Shopify validation, credential, scope, or duplicate-handle errors.",
        "Retry-safe draft resource handles from the prior receipt."
      ]
    };
  }

  if (shopifyAutonomy.action === "review_draft_resources") {
    return {
      ...base,
      canResumeAutonomy: false,
      message: "Shopify draft resources approved for internal review. Public launch still requires a separate launch approval packet; no Shopify publish action executed.",
      nextStep: "public_launch_approval_required",
      recommendedEndpoint: null,
      requiredInputs: [
        "Separate public launch approval packet.",
        "Final check that products remain draft, pages unpublished, collections unpublished, and navigation unattached."
      ]
    };
  }

  if (shopifyAutonomy.action === "run_shopify_draft_executor") {
    return {
      ...base,
      canResumeAutonomy: true,
      message: "Shopify draft executor approval recorded. Queue the Shopify autonomy resume job to continue controlled draft work.",
      nextStep: "queue_shopify_autonomy_resume",
      recommendedEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-autonomy-resume-job`,
      requiredInputs: [
        "Verified Shopify connection.",
        "Owner unlock gates if the resume run requires them."
      ]
    };
  }

  if (shopifyAutonomy.action === "wait_for_connection") {
    return {
      ...base,
      canResumeAutonomy: false,
      message: "Shopify connection-watch approval recorded. Entral will keep waiting for the verified Shopify connection.",
      nextStep: "wait_for_connection",
      recommendedEndpoint: null,
      requiredInputs: [
        "Verified Shopify connection."
      ]
    };
  }

  return {
    ...base,
    canResumeAutonomy: false,
    message: "Shopify autonomy review recorded. No further Shopify action is required for this packet.",
    nextStep: "none",
    recommendedEndpoint: null,
    requiredInputs: []
  };
}

type ClientMerchStoreWithProducts = {
  approvalStatus: keyof typeof approvalStatusFromDb;
  audience: string;
  brandStyle: string;
  businessName: string;
  clientName: string;
  email: string;
  estimatedProfit: { toString(): string };
  id: string;
  industry: string;
  launchStatus: keyof typeof launchStatusFromDb;
  notes: string | null;
  commandMarshalName: string | null;
  commandGeneralName: string | null;
  podProvider: keyof typeof podProviderFromDb;
  productTypes: string[];
  products: Array<{
    aiDisclosureNeeded: boolean;
    complianceNotes: string | null;
    designConcept: string;
    designPrompt: string;
    estimatedProfit: { toString(): string };
    listingDescription: string | null;
    listingTitle: string | null;
    productName: string;
    productType: string;
    productionPartnerDisclosureNeeded: boolean;
    retailPrice: { toString(): string };
    status: keyof typeof productStatusFromDb;
    tags: string[];
  }>;
  revenue: { toString(): string };
  storePlatform: keyof typeof storePlatformFromDb;
};

function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}

function storeSnapshot(store: ClientMerchStoreWithProducts) {
  return {
    approvalStatus: approvalStatusFromDb[store.approvalStatus],
    audience: store.audience,
    brandStyle: store.brandStyle,
    businessName: store.businessName,
    clientName: store.clientName,
    estimatedProfit: decimalToNumber(store.estimatedProfit),
    industry: store.industry,
    launchStatus: launchStatusFromDb[store.launchStatus],
    notes: store.notes,
    commandMarshalName: store.commandMarshalName,
    commandGeneralName: store.commandGeneralName,
    podProvider: podProviderFromDb[store.podProvider],
    productTypes: store.productTypes,
    revenue: decimalToNumber(store.revenue),
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

function productSnapshot(product: ClientMerchStoreWithProducts["products"][number]): MerchProductSnapshot {
  return {
    aiDisclosureNeeded: product.aiDisclosureNeeded,
    complianceNotes: product.complianceNotes,
    designConcept: product.designConcept,
    designPrompt: product.designPrompt,
    estimatedProfit: decimalToNumber(product.estimatedProfit),
    listingDescription: product.listingDescription,
    listingTitle: product.listingTitle,
    productName: product.productName,
    productType: product.productType,
    productionPartnerDisclosureNeeded: product.productionPartnerDisclosureNeeded,
    retailPrice: decimalToNumber(product.retailPrice),
    status: productStatusFromDb[product.status],
    tags: product.tags
  };
}

export async function createShopifyAutonomyResumeJob(input: {
  payload: ShopifyAutonomyResumeJobPayload;
  scheduledAt?: Date | null;
  userId: string;
}) {
  const payload = shopifyAutonomyResumeJobPayloadSchema.parse(input.payload);
  const scheduledAt = input.scheduledAt ?? null;
  const status = scheduledAt && scheduledAt.getTime() > Date.now() ? "scheduled" : "pending";
  const watchSuffix = payload.watchForConnection
    ? ` (connection watch attempt ${payload.connectionWatchAttempt}/${payload.maxConnectionWatchAttempts})`
    : "";
  const job = await prisma.automationJob.create({
    data: {
      payloadJson: stringifySecureJson(payload),
      scheduledAt,
      status,
      type: shopifyAutonomyResumeJobType,
      userId: input.userId,
      logs: {
        create: {
          message: status === "scheduled"
            ? `Shopify autonomy resume job scheduled${watchSuffix}`
            : `Shopify autonomy resume job queued${watchSuffix}`
        }
      }
    },
    include: {
      logs: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return job;
}

export async function runShopifyAutonomyResumeJob(
  job: Pick<AutomationJob, "id" | "payloadJson" | "userId">,
  logStep: (message: string, level?: "info" | "warn" | "error") => Promise<void>
) {
  const payload = parseSecureJson<ShopifyAutonomyResumeJobPayload>(job.payloadJson);

  if (!payload) {
    throw new Error("Shopify autonomy resume payload is unreadable.");
  }

  const input = shopifyAutonomyResumeJobPayloadSchema.parse(payload);
  await logStep(`Loading Shopify autonomy context for store ${input.storeId}.`);

  const store = await prisma.clientMerchStore.findFirst({
    include: {
      products: {
        orderBy: { updatedAt: "desc" }
      }
    },
    where: {
      id: input.storeId,
      userId: job.userId
    }
  }) as ClientMerchStoreWithProducts | null;

  if (!store) {
    throw new Error("Shopify autonomy resume store was not found.");
  }

  const connections = await listShopifyConnections(job.userId, store.id);
  const credentials = await getShopifyConnectionCredentials(job.userId, store.id);
  await logStep(credentials ? "Shopify connection available; running autonomy plan." : "No Shopify credentials found; building blocked autonomy plan.", credentials ? "info" : "warn");

  const plan = await executeShopifyAutonomyRun({
    connectorApproval: input.connectorApproval,
    connections,
    countryCode: input.countryCode,
    credentials,
    dryRun: input.dryRun,
    liveUnlockPhrase: input.liveUnlockPhrase,
    options: {
      includeCollections: input.includeCollections,
      includeProducts: input.includeProducts,
      includeStoreShell: input.includeStoreShell,
      maxProducts: input.maxProducts
    },
    ownerEmail: input.ownerEmail ?? store.email,
    products: store.products.map((product) => productSnapshot(product)),
    requestedShopName: input.requestedShopName ?? store.businessName,
    store: storeSnapshot(store),
    storeId: store.id,
    storeType: input.storeType
  });
  const connectionWatch = buildShopifyConnectionWatchDecision({
    attempt: input.connectionWatchAttempt,
    intervalMinutes: input.connectionWatchIntervalMinutes,
    maxAttempts: input.maxConnectionWatchAttempts,
    status: plan.status,
    watchForConnection: input.watchForConnection
  });
  const followUpJob = connectionWatch.shouldSchedule && connectionWatch.scheduledAt && connectionWatch.nextAttempt !== null
    ? await createShopifyAutonomyResumeJob({
      payload: {
        ...input,
        connectionWatchAttempt: connectionWatch.nextAttempt
      },
      scheduledAt: connectionWatch.scheduledAt,
      userId: job.userId
    })
    : null;
  const supervisorDecision = buildShopifyAutonomySupervisorDecision({
    connectionWatch,
    followUpJobId: followUpJob?.id ?? null,
    plan
  });
  const supervisorPacket = buildShopifyAutonomySupervisorApprovalPacket({
    decision: supervisorDecision,
    note: input.note ?? null,
    plan,
    storeId: store.id
  });
  const supervisorApprovalRecord = supervisorPacket
    ? await prisma.growthApprovalPacket.create({
      data: {
        mode: supervisorPacket.mode,
        packetJson: stringifySecureJson(supervisorPacket),
        scheduledFor: supervisorPacket.scheduledFor ? new Date(supervisorPacket.scheduledFor) : null,
        status: "pending",
        storeId: store.id,
        userId: job.userId
      }
    })
    : null;

  if (followUpJob && connectionWatch.scheduledAt) {
    await logStep(
      `No Shopify connection yet; scheduled connection watch attempt ${connectionWatch.nextAttempt}/${connectionWatch.maxAttempts} for ${connectionWatch.scheduledAt.toISOString()}.`,
      "warn"
    );
  } else if (connectionWatch.reason === "exhausted") {
    await logStep("Shopify connection watch exhausted its retry window; no follow-up job was scheduled.", "warn");
  }

  const auditLog = await recordAuditLog({
    action: followUpJob
      ? "shopify.autonomy_resume.connection_watch_rescheduled"
      : plan.providerContacted
      ? "shopify.autonomy_resume.executed_draft_storefront"
      : plan.status === "blocked_store_creation_required" || plan.status === "blocked_credentials"
        ? "shopify.autonomy_resume.connection_gate"
        : "shopify.autonomy_resume.completed",
    actorUserId: job.userId,
    metadata: {
      automationJobId: job.id,
      dryRun: input.dryRun,
      externalExecution: plan.externalExecution,
      connectionWatch: {
        attempt: connectionWatch.attempt,
        enabled: connectionWatch.enabled,
        followUpJobId: followUpJob?.id ?? null,
        intervalMinutes: connectionWatch.intervalMinutes,
        maxAttempts: connectionWatch.maxAttempts,
        nextAttempt: connectionWatch.nextAttempt,
        reason: connectionWatch.reason,
        scheduledAt: connectionWatch.scheduledAt?.toISOString() ?? null
      },
      note: input.note ?? null,
      providerContacted: plan.providerContacted,
      status: plan.status,
      storefrontDraftStatus: plan.storefrontDraft?.status ?? null,
      summary: plan.summary,
      supervisorApprovalPacket: supervisorApprovalRecord ? {
        id: supervisorApprovalRecord.id,
        packetId: supervisorPacket?.id ?? null,
        status: supervisorApprovalRecord.status
      } : null,
      supervisorDecision,
      totals: plan.totals
    },
    outcome: plan.status === "failed" ? "failure" : "success",
    severity: plan.externalExecution ? "high" : plan.status.startsWith("blocked") ? "medium" : "low",
    targetId: store.id,
    targetType: "shopify_autonomy_resume"
  });

  if (supervisorApprovalRecord) {
    await prisma.growthApprovalPacket.update({
      data: {
        requestAuditLogId: auditLog.id
      },
      where: {
        id: supervisorApprovalRecord.id
      }
    });
  }

  await logStep(plan.summary, plan.status === "failed" ? "error" : plan.status.startsWith("blocked") ? "warn" : "info");
  await logStep(`Shopify autonomy supervisor decision: ${supervisorDecision.action} (${supervisorDecision.status}).`);
  if (supervisorApprovalRecord) {
    await logStep(`Queued Shopify autonomy review packet ${supervisorApprovalRecord.id}.`);
  }

  return {
    auditLogId: auditLog.id,
    connectionWatch: {
      attempt: connectionWatch.attempt,
      enabled: connectionWatch.enabled,
      followUpJobId: followUpJob?.id ?? null,
      intervalMinutes: connectionWatch.intervalMinutes,
      maxAttempts: connectionWatch.maxAttempts,
      nextAttempt: connectionWatch.nextAttempt,
      reason: connectionWatch.reason,
      scheduledAt: connectionWatch.scheduledAt?.toISOString() ?? null
    },
    externalExecution: plan.externalExecution,
    providerContacted: plan.providerContacted,
    status: plan.status,
    storefrontDraftStatus: plan.storefrontDraft?.status ?? null,
    summary: plan.summary,
    supervisorApprovalPacket: supervisorApprovalRecord ? {
      id: supervisorApprovalRecord.id,
      packetId: supervisorPacket?.id ?? null,
      status: supervisorApprovalRecord.status
    } : null,
    supervisorDecision
  };
}

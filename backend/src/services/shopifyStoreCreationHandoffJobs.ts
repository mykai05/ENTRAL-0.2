import type { AutomationJob } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { recordAuditLog } from "./audit.js";
import type { GrowthApprovalAction, GrowthApprovalPacket } from "./growthPlans.js";
import type { MerchStoreSnapshot } from "./merchReports.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";
import { createShopifyAutonomyResumeJob } from "./shopifyAutonomyJobs.js";
import { createShopifyStoreCreationBrowserTaskJob } from "./shopifyStoreCreationBrowserTask.js";
import { listShopifyConnections } from "./shopifyConnections.js";
import { buildShopifyStoreProvisioningPlan, type ShopifyDevDashboardBrowserTask, type ShopifyStoreProvisioningPlan } from "./shopifyStoreProvisioning.js";

export const shopifyStoreCreationHandoffJobType = "shopify_store_creation_handoff";

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

export const shopifyStoreCreationHandoffJobPayloadSchema = z.object({
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
  queueBrowserTask: z.boolean().default(true),
  queueAutonomyResume: z.boolean().default(true),
  requestedShopName: z.string().trim().max(120).nullable().optional(),
  storeId: z.string().cuid(),
  storeType: z.enum(["client_transfer", "development"]).default("client_transfer"),
  watchForConnection: z.boolean().default(true)
});

export type ShopifyStoreCreationHandoffJobPayload = z.infer<typeof shopifyStoreCreationHandoffJobPayloadSchema>;

type ClientMerchStoreRecord = {
  approvalStatus: keyof typeof approvalStatusFromDb;
  audience: string;
  brandStyle: string;
  businessName: string;
  clientName: string;
  email: string;
  estimatedProfit: { toString(): string };
  industry: string;
  launchStatus: keyof typeof launchStatusFromDb;
  notes: string | null;
  podProvider: keyof typeof podProviderFromDb;
  productTypes: string[];
  revenue: { toString(): string };
  storePlatform: keyof typeof storePlatformFromDb;
};

export type ShopifyStoreCreationHandoffJobReceipt = {
  actualExternalActionsExecuted: false;
  automationJobId: string;
  browserTaskJob: {
    id: string;
    scheduledAt: Date | null;
    status: string;
    type: "shopify_store_creation_browser_task";
  } | null;
  browserTask: ShopifyDevDashboardBrowserTask;
  captureEndpoint: string;
  evidenceToCapture: string[];
  externalExecution: false;
  mode: "Shopify Store Creation Handoff Job";
  nextAutonomousStep: ShopifyStoreProvisioningPlan["creationHandoff"]["nextAutonomousStep"] | "capture_shopify_store_creation";
  providerContacted: false;
  resumeJob: {
    connectionWatch: {
      attempt: 0;
      enabled: boolean;
      intervalMinutes: number;
      maxAttempts: number;
    };
    id: string;
    scheduledAt: Date | null;
    status: string;
    type: "shopify_autonomy_resume";
  } | null;
  status: "waiting_for_dashboard_capture" | "connection_ready" | "not_applicable";
  summary: string;
  targetUrl: string;
};

export type ShopifyStoreCreationHandoffApprovalPacket = GrowthApprovalPacket & {
  shopifyStoreCreation: {
    automationJobId: string;
    browserTaskJobId: string | null;
    browserTaskJobStatus: string | null;
    browserTask: ShopifyDevDashboardBrowserTask;
    captureEndpoint: string;
    evidenceToCapture: string[];
    expectedShopDomain: string | null;
    nextStep: "capture_shopify_store_creation";
    resumeJobId: string | null;
    resumeJobStatus: string | null;
    status: "waiting_for_dashboard_capture";
    targetUrl: string;
  };
};

function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}

function storeSnapshot(store: ClientMerchStoreRecord): MerchStoreSnapshot {
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
    podProvider: podProviderFromDb[store.podProvider],
    productTypes: store.productTypes,
    revenue: decimalToNumber(store.revenue),
    storePlatform: storePlatformFromDb[store.storePlatform]
  };
}

function handoffStatus(plan: ShopifyStoreProvisioningPlan): ShopifyStoreCreationHandoffJobReceipt["status"] {
  if (plan.status === "connected_existing_shop") return "connection_ready";
  if (plan.status === "not_applicable") return "not_applicable";
  return "waiting_for_dashboard_capture";
}

function receiptSummary(input: {
  plan: ShopifyStoreProvisioningPlan;
  resumeJobId: string | null;
  storeName: string;
}) {
  if (input.plan.status === "connected_existing_shop") {
    return input.resumeJobId
      ? `${input.storeName} already has a Shopify connection; resume job ${input.resumeJobId} was queued for draft automation.`
      : `${input.storeName} already has a Shopify connection; no dashboard creation handoff is needed.`;
  }

  if (input.plan.status === "not_applicable") {
    return `${input.storeName} is not a Shopify store, so the store creation handoff job is not applicable.`;
  }

  return input.resumeJobId
    ? `${input.storeName} Shopify store creation handoff is waiting for dashboard domain capture; resume watcher ${input.resumeJobId} is scheduled.`
    : `${input.storeName} Shopify store creation handoff is waiting for dashboard domain capture.`;
}

export function buildShopifyStoreCreationHandoffApprovalPacket(input: {
  createdAt?: string;
  note?: string | null;
  plan: ShopifyStoreProvisioningPlan;
  receipt: ShopifyStoreCreationHandoffJobReceipt;
  storeId: string;
}): ShopifyStoreCreationHandoffApprovalPacket | null {
  if (input.receipt.status !== "waiting_for_dashboard_capture") {
    return null;
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const packetIdValue = `shopify_store_creation_${input.storeId}_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const action: GrowthApprovalAction = {
    approvalStatus: "Pending human approval",
    channel: "Shopify",
    executionState: "Locked - no external action",
    id: `${packetIdValue}_capture_domain`,
    requiredControls: [
      "Capture the final myshopify.com domain exactly as Shopify displays it.",
      "Start Shopify OAuth from Entral with continuation enabled after the domain is known.",
      "Keep billing, payouts, paid plans, domains, payment processors, and public publishing locked."
    ],
    scheduledFor: null,
    summary: `${input.plan.sourceStore.businessName} needs the Shopify dashboard-created store domain captured before OAuth and draft storefront autonomy can continue.`,
    title: "Capture Shopify store domain"
  };

  return {
    actions: [action],
    auditEvents: [
      "Shopify store creation handoff packet queued from a background handoff job.",
      "No Shopify account, store, billing, payout, domain, browser login, payment setup, or public publishing action was executed by this packet."
    ],
    blockedActions: Array.from(new Set([
      ...input.plan.blockedExternalActions,
      ...input.plan.creationHandoff.blockedBrowserActions
    ])),
    businessName: input.plan.sourceStore.businessName,
    costGuardrail: "External spend remains $0; Shopify paid plans, billing, domains, payouts, payments, supplier charges, and ad spend stay locked.",
    createdAt,
    humanApprovalRequired: true,
    id: packetIdValue,
    logging: "Stores the Shopify dashboard handoff state, required capture evidence, and next safe continuation endpoint.",
    mode: "Mock Mode",
    note: input.note ?? null,
    scheduledFor: null,
    shopifyStoreCreation: {
      automationJobId: input.receipt.automationJobId,
      browserTaskJobId: input.receipt.browserTaskJob?.id ?? null,
      browserTaskJobStatus: input.receipt.browserTaskJob?.status ?? null,
      browserTask: input.receipt.browserTask,
      captureEndpoint: input.receipt.captureEndpoint,
      evidenceToCapture: input.receipt.evidenceToCapture,
      expectedShopDomain: input.plan.creationHandoff.expectedShopDomain,
      nextStep: "capture_shopify_store_creation",
      resumeJobId: input.receipt.resumeJob?.id ?? null,
      resumeJobStatus: input.receipt.resumeJob?.status ?? null,
      status: "waiting_for_dashboard_capture",
      targetUrl: input.receipt.targetUrl
    },
    status: "Pending approval",
    storeId: input.storeId,
    summary: `${input.plan.sourceStore.businessName} is waiting for Shopify dashboard store-domain capture before OAuth and draft storefront autonomy can continue.`
  };
}

export async function createShopifyStoreCreationHandoffJob(input: {
  payload: ShopifyStoreCreationHandoffJobPayload;
  scheduledAt?: Date | null;
  userId: string;
}) {
  const payload = shopifyStoreCreationHandoffJobPayloadSchema.parse(input.payload);
  const scheduledAt = input.scheduledAt ?? null;
  const status = scheduledAt && scheduledAt.getTime() > Date.now() ? "scheduled" : "pending";

  return prisma.automationJob.create({
    data: {
      payloadJson: stringifySecureJson(payload),
      scheduledAt,
      status,
      type: shopifyStoreCreationHandoffJobType,
      userId: input.userId,
      logs: {
        create: {
          message: status === "scheduled"
            ? "Shopify store creation handoff job scheduled"
            : "Shopify store creation handoff job queued"
        }
      }
    },
    include: {
      logs: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function runShopifyStoreCreationHandoffJob(
  job: Pick<AutomationJob, "id" | "payloadJson" | "userId">,
  logStep: (message: string, level?: "info" | "warn" | "error") => Promise<void>
) {
  const payload = parseSecureJson<ShopifyStoreCreationHandoffJobPayload>(job.payloadJson);

  if (!payload) {
    throw new Error("Shopify store creation handoff payload is unreadable.");
  }

  const input = shopifyStoreCreationHandoffJobPayloadSchema.parse(payload);
  await logStep(`Loading Shopify store creation handoff for store ${input.storeId}.`);

  const store = await prisma.clientMerchStore.findFirst({
    where: {
      id: input.storeId,
      userId: job.userId
    }
  }) as ClientMerchStoreRecord | null;

  if (!store) {
    throw new Error("Shopify store creation handoff store was not found.");
  }

  const connections = await listShopifyConnections(job.userId, input.storeId);
  const plan = buildShopifyStoreProvisioningPlan({
    connections,
    countryCode: input.countryCode,
    ownerEmail: input.ownerEmail ?? store.email,
    requestedShopName: input.requestedShopName ?? store.businessName,
    store: storeSnapshot(store),
    storeId: input.storeId,
    storeType: input.storeType
  });
  const shouldQueueResume = input.queueAutonomyResume && plan.status !== "not_applicable";
  const browserTaskJob = input.queueBrowserTask && plan.status === "dev_dashboard_creation_required"
    ? await createShopifyStoreCreationBrowserTaskJob({
      payload: {
        browserTask: plan.creationHandoff.browserTask,
        countryCode: input.countryCode,
        expectedShopDomain: plan.creationHandoff.expectedShopDomain,
        requestedShopName: input.requestedShopName ?? store.businessName,
        storeId: input.storeId,
        storeType: input.storeType
      },
      userId: job.userId
    })
    : null;
  const resumeScheduledAt = shouldQueueResume && plan.status === "dev_dashboard_creation_required" && input.watchForConnection
    ? new Date(Date.now() + input.connectionWatchIntervalMinutes * 60 * 1000)
    : null;
  const resumeJob = shouldQueueResume
    ? await createShopifyAutonomyResumeJob({
      payload: {
        connectionWatchAttempt: 0,
        connectionWatchIntervalMinutes: input.connectionWatchIntervalMinutes,
        connectorApproval: input.connectorApproval,
        countryCode: input.countryCode,
        dryRun: input.dryRun,
        includeCollections: input.includeCollections,
        includeProducts: input.includeProducts,
        includeStoreShell: input.includeStoreShell,
        liveUnlockPhrase: input.liveUnlockPhrase,
        maxConnectionWatchAttempts: input.maxConnectionWatchAttempts,
        maxProducts: input.maxProducts,
        note: input.note ?? null,
        ownerEmail: input.ownerEmail ?? store.email,
        requestedShopName: input.requestedShopName ?? store.businessName,
        storeId: input.storeId,
        storeType: input.storeType,
        watchForConnection: input.watchForConnection
      },
      scheduledAt: resumeScheduledAt,
      userId: job.userId
    })
    : null;
  const receipt: ShopifyStoreCreationHandoffJobReceipt = {
    actualExternalActionsExecuted: false,
    automationJobId: job.id,
    browserTaskJob: browserTaskJob ? {
      id: browserTaskJob.id,
      scheduledAt: browserTaskJob.scheduledAt,
      status: browserTaskJob.status,
      type: "shopify_store_creation_browser_task"
    } : null,
    browserTask: plan.creationHandoff.browserTask,
    captureEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-store-creation-capture`,
    evidenceToCapture: plan.creationHandoff.evidenceToCapture,
    externalExecution: false,
    mode: "Shopify Store Creation Handoff Job",
    nextAutonomousStep: plan.status === "dev_dashboard_creation_required"
      ? "capture_shopify_store_creation"
      : plan.creationHandoff.nextAutonomousStep,
    providerContacted: false,
    resumeJob: resumeJob ? {
      connectionWatch: {
        attempt: 0,
        enabled: input.watchForConnection,
        intervalMinutes: input.connectionWatchIntervalMinutes,
        maxAttempts: input.maxConnectionWatchAttempts
      },
      id: resumeJob.id,
      scheduledAt: resumeJob.scheduledAt,
      status: resumeJob.status,
      type: "shopify_autonomy_resume"
    } : null,
    status: handoffStatus(plan),
    summary: receiptSummary({
      plan,
      resumeJobId: resumeJob?.id ?? null,
      storeName: store.businessName
    }),
    targetUrl: plan.creationHandoff.targetUrl
  };
  const handoffPacket = buildShopifyStoreCreationHandoffApprovalPacket({
    note: input.note ?? null,
    plan,
    receipt,
    storeId: input.storeId
  });
  const handoffApprovalRecord = handoffPacket
    ? await prisma.growthApprovalPacket.create({
      data: {
        mode: handoffPacket.mode,
        packetJson: stringifySecureJson(handoffPacket),
        scheduledFor: null,
        status: "pending",
        storeId: input.storeId,
        userId: job.userId
      }
    })
    : null;
  const auditLog = await recordAuditLog({
    action: plan.status === "connected_existing_shop"
      ? "shopify.store_creation_handoff.connection_ready"
      : plan.status === "not_applicable"
        ? "shopify.store_creation_handoff.not_applicable"
        : "shopify.store_creation_handoff.waiting_for_dashboard_capture",
    actorUserId: job.userId,
    metadata: {
      automationJobId: job.id,
      blockedBrowserActions: plan.creationHandoff.blockedBrowserActions,
      evidenceToCapture: receipt.evidenceToCapture,
      externalExecution: false,
      note: input.note ?? null,
      providerContacted: false,
      handoffApprovalPacket: handoffApprovalRecord ? {
        id: handoffApprovalRecord.id,
        packetId: handoffPacket?.id ?? null,
        status: handoffApprovalRecord.status
      } : null,
      browserTaskJobId: browserTaskJob?.id ?? null,
      resumeJobId: resumeJob?.id ?? null,
      status: receipt.status,
      summary: receipt.summary,
      targetUrl: receipt.targetUrl
    },
    outcome: plan.status === "not_applicable" ? "failure" : "success",
    severity: plan.status === "connected_existing_shop" ? "low" : "medium",
    targetId: input.storeId,
    targetType: "shopify_store_creation_handoff"
  });

  if (handoffApprovalRecord) {
    await prisma.growthApprovalPacket.update({
      data: {
        requestAuditLogId: auditLog.id
      },
      where: {
        id: handoffApprovalRecord.id
      }
    });
  }

  await logStep(receipt.summary, receipt.status === "not_applicable" ? "warn" : "info");
  if (receipt.resumeJob) {
    await logStep(`Queued Shopify autonomy resume job ${receipt.resumeJob.id}.`);
  }
  if (receipt.browserTaskJob) {
    await logStep(`Queued governed Shopify Dev Dashboard browser task ${receipt.browserTaskJob.id}.`);
  }
  if (handoffApprovalRecord) {
    await logStep(`Queued Shopify store creation review packet ${handoffApprovalRecord.id}.`);
  }

  return {
    auditLogId: auditLog.id,
    handoff: receipt,
    browserTaskJob: receipt.browserTaskJob,
    handoffApprovalPacket: handoffApprovalRecord ? {
      id: handoffApprovalRecord.id,
      packetId: handoffPacket?.id ?? null,
      status: handoffApprovalRecord.status
    } : null
  };
}

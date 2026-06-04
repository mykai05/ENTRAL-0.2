import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  clientMerchStoreIdParamsSchema,
  clientMerchStoreListQuerySchema,
  createClientMerchStoreSchema,
  growthApprovalPacketParamsSchema,
  merchReportParamsSchema,
  providerPayloadQuerySchema,
  requestProviderPayloadApprovalSchema,
  requestGrowthApprovalSchema,
  reviewGrowthApprovalSchema,
  shopifyAutonomyResumeJobSchema,
  shopifyAutonomyRunSchema,
  shopifyConnectionSchema,
  shopifyOAuthStartSchema,
  shopifyStoreCreationHandoffJobSchema,
  shopifyStoreCreationCaptureSchema,
  shopifyStoreProvisioningSchema,
  shopifyStorefrontDraftSchema,
  updateClientMerchStoreSchema,
  type CreateClientMerchStoreInput,
  type ShopifyAutonomyRunInput,
  type ShopifyAutonomyResumeJobInput,
  type ShopifyConnectionInput,
  type ShopifyOAuthStartInput,
  type ShopifyStoreCreationHandoffJobInput,
  type ShopifyStoreCreationCaptureInput,
  type ShopifyStoreProvisioningInput,
  type ShopifyStorefrontDraftInput,
  type UpdateClientMerchStoreInput
} from "../schemas.js";
import { buildGrowthApprovalPacket, buildGrowthOrchestrationPreview, buildGrowthPlan, type GrowthApprovalPacket } from "../services/growthPlans.js";
import { recordAuditLog } from "../services/audit.js";
import { buildLaunchPackage, buildMerchReport, type MerchProductSnapshot } from "../services/merchReports.js";
import { buildProviderHandoffBundle, buildProviderPayloadApprovalPacket, buildProviderPayloadPackage, isProviderPayloadApprovalPacket } from "../services/merchProviderPayloads.js";
import { parseSecureJson, stringifySecureJson } from "../services/secureJson.js";
import { credentialsFromShopifyConnection, getShopifyConnectionCredentials, listShopifyConnections, publicShopifyConnection, upsertShopifyConnection, verifyShopifyConnection } from "../services/shopifyConnections.js";
import { executeShopifyAutonomyRun } from "../services/shopifyAutonomyRun.js";
import { buildShopifyAutonomyReviewContinuation, createShopifyAutonomyResumeJob } from "../services/shopifyAutonomyJobs.js";
import { captureShopifyStoreCreationForStore, ShopifyStoreCreationCaptureError } from "../services/shopifyStoreCreationCapture.js";
import { createShopifyStoreCreationHandoffJob } from "../services/shopifyStoreCreationHandoffJobs.js";
import { enqueueAutomationJob } from "../services/automationQueue.js";
import { appendShopifyOAuthResultToReturnUrl, buildShopifyOAuthStart, exchangeShopifyOAuthCode, normalizeShopifyOAuthScopes, normalizeShopifyOAuthShopDomain, validateShopifyOAuthHmac, verifyShopifyOAuthState } from "../services/shopifyOAuth.js";
import { attachShopifyOAuthContinuationAudit, createShopifyOAuthContinuation, getPendingShopifyOAuthContinuation, markShopifyOAuthContinuationConsumed, markShopifyOAuthContinuationFailed } from "../services/shopifyOAuthContinuations.js";
import { buildShopifyStoreProvisioningPlan } from "../services/shopifyStoreProvisioning.js";
import { executeShopifyStorefrontDraft } from "../services/shopifyStorefrontExecutor.js";

const storePlatformToDb = {
  Etsy: "ETSY",
  Shopify: "SHOPIFY",
  Other: "OTHER"
} as const;

const storePlatformFromDb = {
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  OTHER: "Other"
} as const;

const podProviderToDb = {
  Printify: "PRINTIFY",
  Printful: "PRINTFUL",
  Other: "OTHER"
} as const;

const podProviderFromDb = {
  PRINTIFY: "Printify",
  PRINTFUL: "Printful",
  OTHER: "Other"
} as const;

const approvalStatusToDb = {
  "Not Started": "NOT_STARTED",
  "Research Approved": "RESEARCH_APPROVED",
  "Designs Pending": "DESIGNS_PENDING",
  "Designs Approved": "DESIGNS_APPROVED",
  "Listings Approved": "LISTINGS_APPROVED",
  "Launch Approved": "LAUNCH_APPROVED"
} as const;

const approvalStatusFromDb = {
  NOT_STARTED: "Not Started",
  RESEARCH_APPROVED: "Research Approved",
  DESIGNS_PENDING: "Designs Pending",
  DESIGNS_APPROVED: "Designs Approved",
  LISTINGS_APPROVED: "Listings Approved",
  LAUNCH_APPROVED: "Launch Approved"
} as const;

const launchStatusToDb = {
  Lead: "LEAD",
  Discovery: "DISCOVERY",
  Researching: "RESEARCHING",
  Designing: "DESIGNING",
  "Awaiting Approval": "AWAITING_APPROVAL",
  "Building Store": "BUILDING_STORE",
  Launched: "LAUNCHED",
  Optimizing: "OPTIMIZING",
  Paused: "PAUSED",
  Archived: "ARCHIVED"
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

type ClientMerchStoreRecord = {
  id: string;
  userId: string;
  clientName: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  industry: string;
  audience: string;
  brandStyle: string;
  storePlatform: keyof typeof storePlatformFromDb;
  podProvider: keyof typeof podProviderFromDb;
  productTypes: string[];
  designCount: number;
  setupFee: { toString(): string };
  monthlyFee: { toString(): string };
  profitShare: { toString(): string };
  approvalStatus: keyof typeof approvalStatusFromDb;
  launchStatus: keyof typeof launchStatusFromDb;
  revenue: { toString(): string };
  estimatedProfit: { toString(): string };
  notes: string | null;
  commandMarshalId: string | null;
  commandMarshalName: string | null;
  commandGeneralId: string | null;
  commandGeneralName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PodProductSnapshotRecord = {
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
};

function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}

function publicClientMerchStore(store: ClientMerchStoreRecord) {
  return {
    id: store.id,
    storeId: store.id,
    userId: store.userId,
    clientName: store.clientName,
    businessName: store.businessName,
    contactName: store.contactName,
    email: store.email,
    phone: store.phone,
    industry: store.industry,
    audience: store.audience,
    brandStyle: store.brandStyle,
    storePlatform: storePlatformFromDb[store.storePlatform],
    podProvider: podProviderFromDb[store.podProvider],
    productTypes: store.productTypes,
    designCount: store.designCount,
    setupFee: decimalToNumber(store.setupFee),
    monthlyFee: decimalToNumber(store.monthlyFee),
    profitShare: decimalToNumber(store.profitShare),
    approvalStatus: approvalStatusFromDb[store.approvalStatus],
    launchStatus: launchStatusFromDb[store.launchStatus],
    revenue: decimalToNumber(store.revenue),
    estimatedProfit: decimalToNumber(store.estimatedProfit),
    notes: store.notes,
    commandMarshalId: store.commandMarshalId,
    commandMarshalName: store.commandMarshalName,
    commandGeneralId: store.commandGeneralId,
    commandGeneralName: store.commandGeneralName,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt
  };
}

function merchStoreSnapshot(store: ClientMerchStoreRecord) {
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

function merchProductSnapshot(product: PodProductSnapshotRecord): MerchProductSnapshot {
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

class MerchRouteError extends Error {
  statusCode: number;
  payload: Record<string, unknown>;

  constructor(statusCode: number, message: string, payload: Record<string, unknown> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

function sendMerchRouteError(reply: FastifyReply, error: unknown, fallbackMessage: string) {
  if (error instanceof MerchRouteError || error instanceof ShopifyStoreCreationCaptureError) {
    return reply.code(error.statusCode).send({
      error: error.statusCode === 404 ? "Not Found" : "Bad Request",
      message: error.message,
      ...error.payload
    });
  }

  return reply.code(500).send({
    error: "Internal Server Error",
    message: fallbackMessage
  });
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type GrowthApprovalPacketRecord = {
  id: string;
  mode: string;
  packetJson: string;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewNote: string | null;
  scheduledFor: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function growthApprovalStatusLabel(status: string) {
  if (status === "approved") return "Approved - execution still locked";
  if (status === "rejected") return "Rejected";
  return "Pending approval";
}

function publicGrowthApprovalPacket(record: GrowthApprovalPacketRecord) {
  const packet = parseSecureJson<GrowthApprovalPacket>(record.packetJson);

  if (!packet) {
    throw new Error("Growth approval packet payload is unreadable.");
  }

  return {
    id: record.id,
    auditLogId: record.requestAuditLogId,
    createdAt: record.createdAt,
    executionState: "No external action executed",
    mode: record.mode,
    packet,
    requestAuditLogId: record.requestAuditLogId,
    reviewAuditLogId: record.reviewAuditLogId,
    reviewedAt: record.reviewedAt,
    reviewedById: record.reviewedById,
    reviewNote: record.reviewNote,
    scheduledFor: record.scheduledFor,
    status: record.status,
    statusLabel: growthApprovalStatusLabel(record.status),
    updatedAt: record.updatedAt
  };
}

function createMerchStoreData(userId: string, input: CreateClientMerchStoreInput): Prisma.ClientMerchStoreUncheckedCreateInput {
  return {
    userId,
    clientName: input.clientName,
    businessName: input.businessName,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    industry: input.industry,
    audience: input.audience,
    brandStyle: input.brandStyle,
    storePlatform: storePlatformToDb[input.storePlatform],
    podProvider: podProviderToDb[input.podProvider],
    productTypes: input.productTypes,
    designCount: input.designCount,
    setupFee: input.setupFee,
    monthlyFee: input.monthlyFee,
    profitShare: input.profitShare,
    approvalStatus: approvalStatusToDb[input.approvalStatus],
    launchStatus: launchStatusToDb[input.launchStatus],
    revenue: input.revenue,
    estimatedProfit: input.estimatedProfit,
    notes: input.notes,
    commandMarshalId: input.commandMarshalId,
    commandMarshalName: input.commandMarshalName,
    commandGeneralId: input.commandGeneralId,
    commandGeneralName: input.commandGeneralName
  };
}

function updateMerchStoreData(input: UpdateClientMerchStoreInput): Prisma.ClientMerchStoreUncheckedUpdateInput {
  const data: Prisma.ClientMerchStoreUncheckedUpdateInput = {};

  if (input.clientName !== undefined) data.clientName = input.clientName;
  if (input.businessName !== undefined) data.businessName = input.businessName;
  if (input.contactName !== undefined) data.contactName = input.contactName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.audience !== undefined) data.audience = input.audience;
  if (input.brandStyle !== undefined) data.brandStyle = input.brandStyle;
  if (input.storePlatform !== undefined) data.storePlatform = storePlatformToDb[input.storePlatform];
  if (input.podProvider !== undefined) data.podProvider = podProviderToDb[input.podProvider];
  if (input.productTypes !== undefined) data.productTypes = input.productTypes;
  if (input.designCount !== undefined) data.designCount = input.designCount;
  if (input.setupFee !== undefined) data.setupFee = input.setupFee;
  if (input.monthlyFee !== undefined) data.monthlyFee = input.monthlyFee;
  if (input.profitShare !== undefined) data.profitShare = input.profitShare;
  if (input.approvalStatus !== undefined) data.approvalStatus = approvalStatusToDb[input.approvalStatus];
  if (input.launchStatus !== undefined) data.launchStatus = launchStatusToDb[input.launchStatus];
  if (input.revenue !== undefined) data.revenue = input.revenue;
  if (input.estimatedProfit !== undefined) data.estimatedProfit = input.estimatedProfit;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.commandMarshalId !== undefined) data.commandMarshalId = input.commandMarshalId;
  if (input.commandMarshalName !== undefined) data.commandMarshalName = input.commandMarshalName;
  if (input.commandGeneralId !== undefined) data.commandGeneralId = input.commandGeneralId;
  if (input.commandGeneralName !== undefined) data.commandGeneralName = input.commandGeneralName;

  return data;
}

export async function merchStoreRoutes(app: FastifyInstance) {
  app.get("/merch/stores", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = clientMerchStoreListQuerySchema.parse(request.query);
    const where: Prisma.ClientMerchStoreWhereInput = {
      userId: currentUser.sub
    };

    if (query.approvalStatus) {
      where.approvalStatus = approvalStatusToDb[query.approvalStatus];
    }

    if (query.launchStatus) {
      where.launchStatus = launchStatusToDb[query.launchStatus];
    }

    if (query.search) {
      where.OR = [
        { clientName: { contains: query.search, mode: "insensitive" } },
        { businessName: { contains: query.search, mode: "insensitive" } },
        { contactName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { industry: { contains: query.search, mode: "insensitive" } }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.clientMerchStore.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.clientMerchStore.count({ where })
    ]);

    return reply.send({
      items: items.map(publicClientMerchStore),
      page: query.page,
      pageSize: query.pageSize,
      total
    });
  });

  app.post("/merch/stores", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = createClientMerchStoreSchema.parse(request.body);
    const store = await prisma.clientMerchStore.create({
      data: createMerchStoreData(currentUser.sub, input)
    });

    return reply.code(201).send({ store: publicClientMerchStore(store) });
  });

  app.get("/merch/stores/:storeId/launch-package", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    return reply.send({ package: buildLaunchPackage(merchStoreSnapshot(store), products) });
  });

  app.get("/merch/stores/:storeId/provider-payloads", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const query = providerPayloadQuerySchema.parse(request.query);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    const providerPackage = buildProviderPayloadPackage({
      options: query,
      products,
      store: merchStoreSnapshot(store),
      storeId: store.id
    });

    return reply.send({ package: providerPackage });
  });

  app.post("/merch/stores/:storeId/provider-payloads/approval-request", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input = requestProviderPayloadApprovalSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    const providerPackage = buildProviderPayloadPackage({
      options: input,
      products,
      store: merchStoreSnapshot(store),
      storeId: store.id
    });
    const packet = buildProviderPayloadApprovalPacket({
      note: input.note,
      package: providerPackage,
      scheduledFor: input.scheduledFor ?? null,
      storeId: store.id
    });
    const record = await prisma.growthApprovalPacket.create({
      data: {
        mode: packet.mode,
        packetJson: stringifySecureJson(packet),
        scheduledFor: packet.scheduledFor ? new Date(packet.scheduledFor) : null,
        status: "pending",
        storeId: store.id,
        userId: currentUser.sub
      }
    });
    const auditLog = await recordAuditLog({
      action: "provider_payload.approval.requested",
      actorUserId: currentUser.sub,
      metadata: {
        packet,
        packetId: record.id,
        providerPackage: {
          adapterCoverage: providerPackage.adapterCoverage,
          payloadCount: providerPackage.payloadCount,
          providerContacted: providerPackage.providerContacted,
          readinessScore: providerPackage.readinessScore
        },
        store: {
          businessName: store.businessName,
          platform: storePlatformFromDb[store.storePlatform],
          podProvider: podProviderFromDb[store.podProvider]
        }
      },
      outcome: "success",
      severity: providerPackage.payloadCount > 0 ? "medium" : "low",
      targetId: store.id,
      targetType: "provider_payload_package"
    });
    const approval = await prisma.growthApprovalPacket.update({
      data: {
        requestAuditLogId: auditLog.id
      },
      where: {
        id: record.id
      }
    });

    return reply.code(201).send({
      approval: publicGrowthApprovalPacket(approval),
      auditLogId: auditLog.id,
      packet,
      providerPackage
    });
  });

  app.get("/merch/stores/:storeId/shopify-connection", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const store = await prisma.clientMerchStore.findFirst({
      select: { id: true },
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    return reply.send({
      connections: await listShopifyConnections(currentUser.sub, store.id)
    });
  });

  app.post("/merch/stores/:storeId/shopify-oauth/start", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyOAuthStartInput = shopifyOAuthStartSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    if (store.storePlatform !== "SHOPIFY") {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify OAuth can only be started for Shopify merch stores." });
    }

    let start: ReturnType<typeof buildShopifyOAuthStart>;

    try {
      start = buildShopifyOAuthStart({
        returnTo: input.returnTo,
        scopes: input.scopes,
        shopDomain: input.shopDomain,
        storeId: store.id,
        userId: currentUser.sub
      });
    } catch (error) {
      return reply.code(400).send({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Shopify OAuth start failed."
      });
    }

    if (start.missingEnvVars.length > 0) {
      return reply.code(400).send({
        error: "Bad Request",
        message: `Shopify OAuth app credentials are missing: ${start.missingEnvVars.join(", ")}.`,
        missingEnvVars: start.missingEnvVars
      });
    }

    const continuation = input.continueAfterApproval
      ? await createShopifyOAuthContinuation({
        expiresAt: new Date(start.stateExpiresAt),
        payload: {
          connectorApproval: input.connectorApproval,
          countryCode: input.countryCode,
          dryRun: input.dryRun,
          includeCollections: input.includeCollections,
          includeProducts: input.includeProducts,
          includeStoreShell: input.includeStoreShell,
          liveUnlockPhrase: input.liveUnlockPhrase?.trim() || null,
          maxProducts: input.maxProducts,
          note: input.note ?? null,
          ownerEmail: input.ownerEmail ?? store.email,
          requestedShopName: input.requestedShopName ?? store.businessName,
          storeType: input.storeType
        },
        shopDomain: start.shopDomain,
        stateNonce: start.stateNonce,
        storeId: store.id,
        userId: currentUser.sub
      })
      : null;
    const auditLog = await recordAuditLog({
      action: "shopify.oauth.started",
      actorUserId: currentUser.sub,
      metadata: {
        callbackUrl: start.callbackUrl,
        continuation: continuation ? {
          id: continuation.id,
          status: continuation.status,
          dryRun: continuation.payload.dryRun,
          maxProducts: continuation.payload.maxProducts
        } : null,
        note: input.note ?? null,
        scopes: start.scopes,
        shopDomain: start.shopDomain,
        stateExpiresAt: start.stateExpiresAt,
        storeId: store.id
      },
      outcome: "success",
      severity: "medium",
      targetId: store.id,
      targetType: "shopify_oauth"
    });

    if (continuation) {
      await attachShopifyOAuthContinuationAudit({
        auditLogId: auditLog.id,
        continuationId: continuation.id
      });
    }

    return reply.send({
      auditLogId: auditLog.id,
      authorizeUrl: start.authorizeUrl,
      callbackUrl: start.callbackUrl,
      continuation: continuation ? {
        id: continuation.id,
        expiresAt: continuation.expiresAt,
        status: continuation.status
      } : null,
      scopes: start.scopes,
      shopDomain: start.shopDomain,
      stateExpiresAt: start.stateExpiresAt
    });
  });

  app.get("/merch/shopify/oauth/callback", async (request, reply) => {
    const query = request.query as Record<string, string | string[] | undefined>;
    const code = firstQueryValue(query.code)?.trim();
    const rawShop = firstQueryValue(query.shop)?.trim();
    const rawState = firstQueryValue(query.state)?.trim();
    const shopDomain = normalizeShopifyOAuthShopDomain(rawShop);

    if (!code || !rawShop || !rawState || !shopDomain) {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify OAuth callback is missing a valid code, shop, or state." });
    }

    if (!validateShopifyOAuthHmac(query)) {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify OAuth callback HMAC could not be verified." });
    }

    let state: ReturnType<typeof verifyShopifyOAuthState>;

    try {
      state = verifyShopifyOAuthState(rawState);
    } catch (error) {
      return reply.code(400).send({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Shopify OAuth state could not be verified."
      });
    }

    if (state.shopDomain !== shopDomain) {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify OAuth callback shop does not match the original request." });
    }

    const store = await prisma.clientMerchStore.findFirst({
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      },
      where: {
        id: state.storeId,
        userId: state.userId
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found for this Shopify OAuth callback." });
    }

    if (store.storePlatform !== "SHOPIFY") {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify OAuth callback can only attach to Shopify merch stores." });
    }

    const token = await exchangeShopifyOAuthCode({
      code,
      shopDomain
    });
    const scopes = token.scopes.length > 0 ? token.scopes : normalizeShopifyOAuthScopes(state.scopes);
    const verification = await verifyShopifyConnection({
      adminToken: token.accessToken,
      requiredScopes: normalizeShopifyOAuthScopes(state.scopes),
      shopDomain
    });

    if (verification.status !== "verified") {
      const continuation = await getPendingShopifyOAuthContinuation({
        shopDomain,
        stateNonce: state.nonce,
        storeId: store.id,
        userId: state.userId
      });
      const message = verification.errors[0] ?? "Shopify OAuth token could not be verified.";
      const auditLog = await recordAuditLog({
        action: "shopify.oauth.verification_failed",
        actorUserId: state.userId,
        metadata: {
          oauthCallback: true,
          requestedScopes: state.scopes,
          returnedScopes: scopes,
          shopDomain,
          storeId: store.id,
          verification: {
            errors: verification.errors,
            grantedScopes: verification.grantedScopes,
            missingScopes: verification.missingScopes,
            primaryDomain: verification.primaryDomain,
            providerContacted: verification.providerContacted,
            shopDomain: verification.shopDomain,
            shopId: verification.shopId,
            shopName: verification.shopName,
            status: verification.status
          }
        },
        outcome: "failure",
        severity: "medium",
        targetId: store.id,
        targetType: "shopify_oauth"
      });
      let continuationAuditLogId: string | null = null;

      if (continuation) {
        await markShopifyOAuthContinuationFailed({
          continuationId: continuation.id,
          resultAuditLogId: auditLog.id,
          resultSummary: message
        });
        continuationAuditLogId = auditLog.id;
      }

      const redirectUrl = new URL(appendShopifyOAuthResultToReturnUrl(state.returnTo, {
        message,
        shopDomain,
        status: "error",
        storeId: store.id
      }));
      redirectUrl.searchParams.set("auditLogId", auditLog.id);
      redirectUrl.searchParams.set("shopifyContinuation", continuation ? "failed" : "none");
      if (continuationAuditLogId) redirectUrl.searchParams.set("continuationAuditLogId", continuationAuditLogId);
      redirectUrl.searchParams.set("shopifyVerification", "failed");

      return reply.redirect(302, redirectUrl.toString());
    }

    const connection = await upsertShopifyConnection({
      adminToken: token.accessToken,
      apiVersion: undefined,
      scopes: verification.grantedScopes.length > 0 ? verification.grantedScopes : scopes,
      shopDomain: verification.shopDomain ?? shopDomain,
      storeId: store.id,
      userId: state.userId
    });
    const auditLog = await recordAuditLog({
      action: "shopify.oauth.connected",
      actorUserId: state.userId,
      metadata: {
        apiVersion: connection.apiVersion,
        expiresIn: token.expiresIn,
        oauthCallback: true,
        scopes: connection.scopes,
        shopDomain: connection.shopDomain,
        storeId: store.id,
        tokenConfigured: Boolean(connection.tokenLastFour),
        verification: {
          grantedScopes: verification.grantedScopes,
          missingScopes: verification.missingScopes,
          primaryDomain: verification.primaryDomain,
          providerContacted: verification.providerContacted,
          shopId: verification.shopId,
          shopName: verification.shopName,
          status: verification.status
        }
      },
      outcome: "success",
      severity: "medium",
      targetId: connection.id,
      targetType: "shopify_connection"
    });
    const continuation = await getPendingShopifyOAuthContinuation({
      shopDomain: connection.shopDomain,
      stateNonce: state.nonce,
      storeId: store.id,
      userId: state.userId
    });
    let continuationStatus: "none" | "consumed" | "failed" = "none";
    let continuationAuditLogId: string | null = null;
    let continuationRunStatus: string | null = null;

    if (continuation) {
      try {
        const continuationPlan = await executeShopifyAutonomyRun({
          connectorApproval: continuation.payload.connectorApproval,
          connections: [publicShopifyConnection(connection)],
          countryCode: continuation.payload.countryCode,
          credentials: credentialsFromShopifyConnection(connection),
          dryRun: continuation.payload.dryRun,
          liveUnlockPhrase: continuation.payload.liveUnlockPhrase,
          options: {
            includeCollections: continuation.payload.includeCollections,
            includeProducts: continuation.payload.includeProducts,
            includeStoreShell: continuation.payload.includeStoreShell,
            maxProducts: continuation.payload.maxProducts
          },
          ownerEmail: continuation.payload.ownerEmail ?? store.email,
          products: store.products.map((product) => merchProductSnapshot(product)),
          requestedShopName: continuation.payload.requestedShopName ?? store.businessName,
          store: merchStoreSnapshot(store),
          storeId: store.id,
          storeType: continuation.payload.storeType
        });
        const continuationAuditLog = await recordAuditLog({
          action: continuationPlan.providerContacted
            ? "shopify.oauth.continuation.executed_draft_storefront"
            : "shopify.oauth.continuation.completed",
          actorUserId: state.userId,
          metadata: {
            connectionAuditLogId: auditLog.id,
            continuationId: continuation.id,
            dryRun: continuation.payload.dryRun,
            externalExecution: continuationPlan.externalExecution,
            providerContacted: continuationPlan.providerContacted,
            status: continuationPlan.status,
            storefrontDraftStatus: continuationPlan.storefrontDraft?.status ?? null,
            summary: continuationPlan.summary,
            totals: continuationPlan.totals
          },
          outcome: continuationPlan.status === "failed" ? "failure" : "success",
          severity: continuationPlan.externalExecution ? "high" : "medium",
          targetId: continuation.id,
          targetType: "shopify_oauth_continuation"
        });

        await markShopifyOAuthContinuationConsumed({
          continuationId: continuation.id,
          resultAuditLogId: continuationAuditLog.id,
          resultSummary: continuationPlan.summary
        });
        continuationStatus = "consumed";
        continuationAuditLogId = continuationAuditLog.id;
        continuationRunStatus = continuationPlan.status;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Shopify OAuth continuation failed.";
        const continuationAuditLog = await recordAuditLog({
          action: "shopify.oauth.continuation.failed",
          actorUserId: state.userId,
          metadata: {
            connectionAuditLogId: auditLog.id,
            continuationId: continuation.id,
            error: message,
            shopDomain: connection.shopDomain
          },
          outcome: "failure",
          severity: "medium",
          targetId: continuation.id,
          targetType: "shopify_oauth_continuation"
        });

        await markShopifyOAuthContinuationFailed({
          continuationId: continuation.id,
          resultAuditLogId: continuationAuditLog.id,
          resultSummary: message
        });
        continuationStatus = "failed";
        continuationAuditLogId = continuationAuditLog.id;
      }
    }

    const redirectUrl = new URL(appendShopifyOAuthResultToReturnUrl(state.returnTo, {
      shopDomain: connection.shopDomain,
      status: "success",
      storeId: store.id
    }));
    redirectUrl.searchParams.set("auditLogId", auditLog.id);
    redirectUrl.searchParams.set("shopifyContinuation", continuationStatus);
    redirectUrl.searchParams.set("shopifyVerification", "verified");
    if (continuationAuditLogId) redirectUrl.searchParams.set("continuationAuditLogId", continuationAuditLogId);
    if (continuationRunStatus) redirectUrl.searchParams.set("shopifyAutonomyStatus", continuationRunStatus);

    return reply.redirect(302, redirectUrl.toString());
  });

  app.post("/merch/stores/:storeId/shopify-connection", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyConnectionInput = shopifyConnectionSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    if (store.storePlatform !== "SHOPIFY") {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify connections can only be attached to Shopify merch stores." });
    }

    const verification = await verifyShopifyConnection({
      adminToken: input.adminToken,
      apiVersion: input.apiVersion,
      requiredScopes: input.scopes,
      shopDomain: input.shopDomain
    });

    if (verification.status !== "verified") {
      return reply.code(400).send({
        error: "Bad Request",
        message: verification.errors[0] ?? "Shopify connection could not be verified.",
        verification
      });
    }

    const connection = await upsertShopifyConnection({
      adminToken: input.adminToken,
      apiVersion: input.apiVersion,
      scopes: verification.grantedScopes.length > 0 ? verification.grantedScopes : input.scopes,
      shopDomain: verification.shopDomain ?? input.shopDomain,
      storeId: store.id,
      userId: currentUser.sub
    });
    const auditLog = await recordAuditLog({
      action: "shopify.connection.connected",
      actorUserId: currentUser.sub,
      metadata: {
        apiVersion: connection.apiVersion,
        note: input.note ?? null,
        scopes: connection.scopes,
        shopDomain: connection.shopDomain,
        storeId: store.id,
        tokenConfigured: Boolean(connection.tokenLastFour),
        verification: {
          grantedScopes: verification.grantedScopes,
          missingScopes: verification.missingScopes,
          primaryDomain: verification.primaryDomain,
          providerContacted: verification.providerContacted,
          shopId: verification.shopId,
          shopName: verification.shopName,
          status: verification.status
        }
      },
      outcome: "success",
      severity: "medium",
      targetId: connection.id,
      targetType: "shopify_connection"
    });

    return reply.code(201).send({
      auditLogId: auditLog.id,
      connection: publicShopifyConnection(connection),
      verification
    });
  });

  app.post("/merch/stores/:storeId/shopify-store-provisioning", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyStoreProvisioningInput = shopifyStoreProvisioningSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const connections = await listShopifyConnections(currentUser.sub, store.id);
    const plan = buildShopifyStoreProvisioningPlan({
      connections,
      countryCode: input.countryCode,
      ownerEmail: input.ownerEmail ?? store.email,
      requestedShopName: input.requestedShopName ?? store.businessName,
      store: merchStoreSnapshot(store),
      storeId: store.id,
      storeType: input.storeType
    });
    const auditLog = await recordAuditLog({
      action: plan.status === "connected_existing_shop"
        ? "shopify.store_provisioning.connected_existing_shop"
        : "shopify.store_provisioning.packet_prepared",
      actorUserId: currentUser.sub,
      metadata: {
        blockedExternalActions: plan.blockedExternalActions,
        continuation: plan.continuation,
        creationCapture: plan.creationCapture,
        creationHandoff: plan.creationHandoff,
        devDashboardPacket: plan.devDashboardPacket,
        dryRun: input.dryRun,
        externalExecution: false,
        note: input.note ?? null,
        officialApiSurface: plan.officialApiSurface,
        providerContacted: false,
        status: plan.status,
        summary: plan.summary
      },
      outcome: plan.status === "not_applicable" ? "failure" : "success",
      severity: plan.status === "connected_existing_shop" ? "low" : "medium",
      targetId: store.id,
      targetType: "shopify_store_provisioning"
    });

    return reply.send({
      auditLogId: auditLog.id,
      plan
    });
  });

  app.post("/merch/stores/:storeId/shopify-store-creation-handoff-job", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyStoreCreationHandoffJobInput = shopifyStoreCreationHandoffJobSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    if (store.storePlatform !== "SHOPIFY") {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify store creation handoff jobs can only be queued for Shopify merch stores." });
    }

    const connections = await listShopifyConnections(currentUser.sub, store.id);
    const plan = buildShopifyStoreProvisioningPlan({
      connections,
      countryCode: input.countryCode,
      ownerEmail: input.ownerEmail ?? store.email,
      requestedShopName: input.requestedShopName ?? store.businessName,
      store: merchStoreSnapshot(store),
      storeId: store.id,
      storeType: input.storeType
    });
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const job = await createShopifyStoreCreationHandoffJob({
      payload: {
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
        queueBrowserTask: input.queueBrowserTask,
        queueAutonomyResume: input.queueAutonomyResume,
        requestedShopName: input.requestedShopName ?? store.businessName,
        storeId: store.id,
        storeType: input.storeType,
        watchForConnection: input.watchForConnection
      },
      scheduledAt,
      userId: currentUser.sub
    });
    const auditLog = await recordAuditLog({
      action: "shopify.store_creation_handoff_job.queued",
      actorUserId: currentUser.sub,
      metadata: {
        automationJobId: job.id,
        creationHandoff: plan.creationHandoff,
        dryRun: input.dryRun,
        externalExecution: false,
        note: input.note ?? null,
        providerContacted: false,
        queueAutonomyResume: input.queueAutonomyResume,
        scheduledAt,
        status: plan.creationHandoff.status,
        storeId: store.id
      },
      outcome: "success",
      severity: plan.status === "connected_existing_shop" ? "low" : "medium",
      targetId: job.id,
      targetType: "automation_job"
    });

    if (job.status === "pending") {
      enqueueAutomationJob(job.id, 0, request.log);
    } else if (scheduledAt) {
      enqueueAutomationJob(job.id, scheduledAt.getTime() - Date.now(), request.log);
    }

    return reply.code(202).send({
      auditLogId: auditLog.id,
      handoff: plan.creationHandoff,
      job: {
        connectionWatch: {
          attempt: 0,
          enabled: input.watchForConnection,
          intervalMinutes: input.connectionWatchIntervalMinutes,
          maxAttempts: input.maxConnectionWatchAttempts
        },
        id: job.id,
        scheduledAt: job.scheduledAt,
        status: job.status,
        type: job.type
      }
    });
  });

  app.post("/merch/stores/:storeId/shopify-store-creation-capture", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyStoreCreationCaptureInput = shopifyStoreCreationCaptureSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    try {
      const result = await captureShopifyStoreCreationForStore({
        store,
        userId: currentUser.sub,
        value: input
      });

      return reply.code(201).send(result);
    } catch (error) {
      return sendMerchRouteError(reply, error, "Shopify store creation capture failed.");
    }
  });

  app.post("/merch/stores/:storeId/shopify-autonomy-run", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyAutonomyRunInput = shopifyAutonomyRunSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const connections = await listShopifyConnections(currentUser.sub, store.id);
    const credentials = await getShopifyConnectionCredentials(currentUser.sub, store.id);
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
      products: store.products.map((product) => merchProductSnapshot(product)),
      requestedShopName: input.requestedShopName ?? store.businessName,
      store: merchStoreSnapshot(store),
      storeId: store.id,
      storeType: input.storeType
    });
    const auditLog = await recordAuditLog({
      action: plan.providerContacted
        ? "shopify.autonomy_run.executed_draft_storefront"
        : plan.status === "blocked_store_creation_required"
          ? "shopify.autonomy_run.store_creation_gate"
          : "shopify.autonomy_run.prepared",
      actorUserId: currentUser.sub,
      metadata: {
        actualExternalActionsExecuted: plan.actualExternalActionsExecuted,
        blockedExternalActions: plan.blockedExternalActions,
        dryRun: input.dryRun,
        externalExecution: plan.externalExecution,
        note: input.note ?? null,
        ownerUnlock: plan.ownerUnlock,
        persistedConnectionAvailable: Boolean(credentials),
        providerContacted: plan.providerContacted,
        provisioningStatus: plan.provisioning.status,
        status: plan.status,
        storefrontDraftStatus: plan.storefrontDraft?.status ?? null,
        summary: plan.summary,
        totals: plan.totals
      },
      outcome: plan.status === "failed" || plan.status === "not_applicable" ? "failure" : "success",
      severity: plan.externalExecution ? "high" : plan.status === "blocked_store_creation_required" || plan.status === "blocked_owner_gates" ? "medium" : "low",
      targetId: store.id,
      targetType: "shopify_autonomy_run"
    });

    return reply.send({
      auditLogId: auditLog.id,
      plan
    });
  });

  app.post("/merch/stores/:storeId/shopify-autonomy-resume-job", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyAutonomyResumeJobInput = shopifyAutonomyResumeJobSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    if (store.storePlatform !== "SHOPIFY") {
      return reply.code(400).send({ error: "Bad Request", message: "Shopify autonomy resume jobs can only be queued for Shopify merch stores." });
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const job = await createShopifyAutonomyResumeJob({
      payload: {
        connectorApproval: input.connectorApproval,
        countryCode: input.countryCode,
        dryRun: input.dryRun,
        includeCollections: input.includeCollections,
        includeProducts: input.includeProducts,
        includeStoreShell: input.includeStoreShell,
        connectionWatchAttempt: input.connectionWatchAttempt,
        connectionWatchIntervalMinutes: input.connectionWatchIntervalMinutes,
        liveUnlockPhrase: input.liveUnlockPhrase,
        maxConnectionWatchAttempts: input.maxConnectionWatchAttempts,
        maxProducts: input.maxProducts,
        note: input.note ?? null,
        ownerEmail: input.ownerEmail ?? store.email,
        requestedShopName: input.requestedShopName ?? store.businessName,
        storeId: store.id,
        storeType: input.storeType,
        watchForConnection: input.watchForConnection
      },
      scheduledAt,
      userId: currentUser.sub
    });
    const auditLog = await recordAuditLog({
      action: "shopify.autonomy_resume_job.queued",
      actorUserId: currentUser.sub,
      metadata: {
        automationJobId: job.id,
        connectionWatch: {
          attempt: input.connectionWatchAttempt,
          enabled: input.watchForConnection,
          intervalMinutes: input.connectionWatchIntervalMinutes,
          maxAttempts: input.maxConnectionWatchAttempts
        },
        dryRun: input.dryRun,
        externalExecutionRequested: !input.dryRun,
        note: input.note ?? null,
        scheduledAt,
        storeId: store.id
      },
      outcome: "success",
      severity: input.dryRun ? "medium" : "high",
      targetId: job.id,
      targetType: "automation_job"
    });

    if (job.status === "pending") {
      enqueueAutomationJob(job.id, 0, request.log);
    } else if (scheduledAt) {
      enqueueAutomationJob(job.id, scheduledAt.getTime() - Date.now(), request.log);
    }

    return reply.code(202).send({
      auditLogId: auditLog.id,
      job: {
        connectionWatch: {
          attempt: input.connectionWatchAttempt,
          enabled: input.watchForConnection,
          intervalMinutes: input.connectionWatchIntervalMinutes,
          maxAttempts: input.maxConnectionWatchAttempts
        },
        id: job.id,
        scheduledAt: job.scheduledAt,
        status: job.status,
        type: job.type
      }
    });
  });

  app.post("/merch/stores/:storeId/shopify-storefront-draft", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input: ShopifyStorefrontDraftInput = shopifyStorefrontDraftSchema.parse(request.body ?? {});
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    const credentials = await getShopifyConnectionCredentials(currentUser.sub, store.id);
    const plan = await executeShopifyStorefrontDraft({
      connectorApproval: input.connectorApproval,
      credentials: credentials ?? undefined,
      dryRun: input.dryRun,
      liveUnlockPhrase: input.liveUnlockPhrase,
      options: {
        includeCollections: input.includeCollections,
        includeProducts: input.includeProducts,
        includeStoreShell: input.includeStoreShell,
        maxProducts: input.maxProducts
      },
      products,
      store: merchStoreSnapshot(store),
      storeId: store.id
    });
    const auditLog = await recordAuditLog({
      action: input.dryRun
        ? "shopify.storefront_draft.previewed"
        : plan.providerContacted ? "shopify.storefront_draft.executed" : "shopify.storefront_draft.blocked",
      actorUserId: currentUser.sub,
      metadata: {
        actionSummary: plan.storefrontActions.map((action) => ({
          handle: action.handle,
          id: action.id,
          kind: action.kind,
          providerContacted: action.providerContacted,
          resourceId: action.result?.resourceId ?? null,
          status: action.status
        })),
        dryRun: input.dryRun,
        externalExecution: plan.externalExecution,
        note: input.note ?? null,
        persistedConnectionAvailable: Boolean(credentials),
        providerContacted: plan.providerContacted,
        shopifyAdminUrl: plan.shopifyAdminUrl,
        status: plan.status,
        summary: plan.summary,
        totals: plan.totals
      },
      outcome: plan.status === "failed" ? "failure" : "success",
      severity: plan.externalExecution ? "high" : plan.status === "credential_blocked" || plan.status === "ready_for_owner_unlock" ? "medium" : "low",
      targetId: store.id,
      targetType: "shopify_storefront_draft"
    });

    return reply.send({
      auditLogId: auditLog.id,
      plan
    });
  });

  app.get("/merch/stores/:storeId/growth-plan", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    return reply.send({ plan: buildGrowthPlan(merchStoreSnapshot(store), products) });
  });

  app.get("/merch/stores/:storeId/growth-approvals", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      select: { id: true }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const items = await prisma.growthApprovalPacket.findMany({
      where: {
        storeId: store.id,
        userId: currentUser.sub
      },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    return reply.send({
      items: items.map(publicGrowthApprovalPacket)
    });
  });

  app.post("/merch/stores/:storeId/growth-plan/approval-request", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input = requestGrowthApprovalSchema.parse(request.body);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    const packet = buildGrowthApprovalPacket({
      note: input.note,
      products,
      scheduledFor: input.scheduledFor ?? null,
      store: merchStoreSnapshot(store),
      storeId: store.id
    });
    const record = await prisma.growthApprovalPacket.create({
      data: {
        mode: packet.mode,
        packetJson: stringifySecureJson(packet),
        scheduledFor: packet.scheduledFor ? new Date(packet.scheduledFor) : null,
        status: "pending",
        storeId: store.id,
        userId: currentUser.sub
      }
    });
    const auditLog = await recordAuditLog({
      action: "growth.approval.requested",
      actorUserId: currentUser.sub,
      metadata: {
        packet,
        packetId: record.id,
        store: {
          businessName: store.businessName,
          platform: storePlatformFromDb[store.storePlatform]
        }
      },
      outcome: "success",
      severity: "medium",
      targetId: record.id,
      targetType: "growth_approval_packet"
    });
    const approval = await prisma.growthApprovalPacket.update({
      where: { id: record.id },
      data: { requestAuditLogId: auditLog.id }
    });

    return reply.code(201).send({
      approval: publicGrowthApprovalPacket(approval),
      auditLogId: auditLog.id,
      packet
    });
  });

  async function reviewGrowthApproval(request: FastifyRequest, reply: FastifyReply, status: "approved" | "rejected") {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = growthApprovalPacketParamsSchema.parse(request.params);
    const input = reviewGrowthApprovalSchema.parse(request.body);
    const existing = await prisma.growthApprovalPacket.findFirst({
      where: {
        id: params.packetId,
        storeId: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Growth approval packet was not found." });
    }

    if (existing.status !== "pending") {
      return reply.code(409).send({
        error: "Conflict",
        message: `This growth approval packet is already ${growthApprovalStatusLabel(existing.status).toLowerCase()}.`
      });
    }

    const packet = parseSecureJson<GrowthApprovalPacket>(existing.packetJson);
    const shopifyContinuation = packet
      ? buildShopifyAutonomyReviewContinuation({
        packet,
        reviewStatus: status,
        storeId: params.storeId
      })
      : null;
    const shopifyStoreCreation = packet
      ? (packet as Partial<{
        shopifyStoreCreation: {
          captureEndpoint?: string;
          expectedShopDomain?: string | null;
          nextStep?: string;
          status?: string;
        };
      }>).shopifyStoreCreation ?? null
      : null;

    if (input.shopifyAutonomyResumeJob && input.shopifyStoreCreationCapture) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Only one Shopify continuation can be run from a growth approval review."
      });
    }

    if (input.shopifyAutonomyResumeJob && (status !== "approved" || !shopifyContinuation?.canResumeAutonomy)) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "A Shopify autonomy resume job can only be queued while approving a resumable Shopify autonomy packet."
      });
    }

    if (input.shopifyStoreCreationCapture && (status !== "approved" || shopifyStoreCreation?.status !== "waiting_for_dashboard_capture")) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Shopify store creation capture can only be submitted while approving a waiting Shopify store-creation packet."
      });
    }

    let shopifyStoreCreationCapture: Awaited<ReturnType<typeof captureShopifyStoreCreationForStore>> | null = null;

    if (input.shopifyStoreCreationCapture) {
      try {
        const store = await prisma.clientMerchStore.findFirst({
          where: {
            id: params.storeId,
            userId: currentUser.sub
          }
        });

        if (!store) {
          throw new MerchRouteError(404, "Merch store was not found.");
        }

        shopifyStoreCreationCapture = await captureShopifyStoreCreationForStore({
          approvalPacketId: existing.id,
          reviewStatus: status,
          store,
          userId: currentUser.sub,
          value: input.shopifyStoreCreationCapture
        });
      } catch (error) {
        return sendMerchRouteError(reply, error, "Shopify store creation capture failed.");
      }
    }

    const reviewed = await prisma.growthApprovalPacket.update({
      where: { id: existing.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: currentUser.sub,
        reviewNote: input.note ?? null,
        status
      }
    });
    const shopifyResumeJob = input.shopifyAutonomyResumeJob
      ? await createShopifyAutonomyResumeJob({
        payload: {
          ...input.shopifyAutonomyResumeJob,
          storeId: params.storeId
        },
        scheduledAt: input.shopifyAutonomyResumeJob.scheduledAt ? new Date(input.shopifyAutonomyResumeJob.scheduledAt) : null,
        userId: currentUser.sub
      })
      : null;
    const auditLog = await recordAuditLog({
      action: status === "approved" ? "growth.approval.approved" : "growth.approval.rejected",
      actorUserId: currentUser.sub,
      metadata: {
        externalExecution: false,
        note: input.note ?? null,
        packet,
        packetId: reviewed.id,
        reviewStatus: status,
        shopifyContinuation,
        shopifyStoreCreation,
        shopifyStoreCreationCapture,
        shopifyResumeJob: shopifyResumeJob ? {
          id: shopifyResumeJob.id,
          scheduledAt: shopifyResumeJob.scheduledAt?.toISOString() ?? null,
          status: shopifyResumeJob.status,
          type: shopifyResumeJob.type
        } : null
      },
      outcome: "success",
      severity: status === "approved" ? "medium" : "low",
      targetId: reviewed.id,
      targetType: "growth_approval_packet"
    });
    const finalRecord = await prisma.growthApprovalPacket.update({
      where: { id: reviewed.id },
      data: { reviewAuditLogId: auditLog.id }
    });

    return reply.send({
      approval: publicGrowthApprovalPacket(finalRecord),
      auditLogId: auditLog.id,
      message: shopifyResumeJob
        ? `${shopifyContinuation?.message ?? "Shopify autonomy approval recorded."} Resume job ${shopifyResumeJob.id} ${shopifyResumeJob.status === "scheduled" ? "scheduled" : "queued"}.`
        : shopifyStoreCreationCapture
          ? `${shopifyStoreCreationCapture.capture.summary} Review packet approved and linked to capture audit ${shopifyStoreCreationCapture.auditLogId}.`
          : shopifyContinuation?.message ?? (status === "approved"
        ? "Growth packet approved for preparation only. No external action executed."
        : "Growth packet rejected. No external action executed."),
      shopifyContinuation,
      shopifyStoreCreationCapture,
      shopifyResumeJob: shopifyResumeJob ? {
        id: shopifyResumeJob.id,
        scheduledAt: shopifyResumeJob.scheduledAt?.toISOString() ?? null,
        status: shopifyResumeJob.status,
        type: shopifyResumeJob.type
      } : null
    });
  }

  app.post("/merch/stores/:storeId/growth-approvals/:packetId/approve", { preHandler: requireAuth }, async (request, reply) => (
    reviewGrowthApproval(request, reply, "approved")
  ));

  app.post("/merch/stores/:storeId/growth-approvals/:packetId/reject", { preHandler: requireAuth }, async (request, reply) => (
    reviewGrowthApproval(request, reply, "rejected")
  ));

  app.get("/merch/stores/:storeId/growth-approvals/:packetId/orchestration-preview", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = growthApprovalPacketParamsSchema.parse(request.params);
    const existing = await prisma.growthApprovalPacket.findFirst({
      where: {
        id: params.packetId,
        storeId: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Growth approval packet was not found." });
    }

    if (existing.status !== "approved") {
      return reply.code(409).send({
        error: "Conflict",
        message: "Approve the growth packet before previewing the locked orchestration handoff."
      });
    }

    const packet = parseSecureJson<GrowthApprovalPacket>(existing.packetJson);

    if (!packet) {
      return reply.code(500).send({ error: "Internal Server Error", message: "Growth approval packet payload is unreadable." });
    }

    const preview = buildGrowthOrchestrationPreview(packet);
    const auditLog = await recordAuditLog({
      action: "growth.orchestration.previewed",
      actorUserId: currentUser.sub,
      metadata: {
        externalExecution: false,
        packetId: existing.id,
        preview
      },
      outcome: "success",
      severity: "low",
      targetId: existing.id,
      targetType: "growth_approval_packet"
    });

    return reply.send({
      auditLogId: auditLog.id,
      preview
    });
  });

  app.get("/merch/stores/:storeId/growth-approvals/:packetId/provider-handoff", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = growthApprovalPacketParamsSchema.parse(request.params);
    const existing = await prisma.growthApprovalPacket.findFirst({
      where: {
        id: params.packetId,
        storeId: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Growth approval packet was not found." });
    }

    if (existing.status !== "approved") {
      return reply.code(409).send({
        error: "Conflict",
        message: "Approve the provider payload packet before building a handoff bundle."
      });
    }

    const packet = parseSecureJson<GrowthApprovalPacket>(existing.packetJson);

    if (!packet) {
      return reply.code(500).send({ error: "Internal Server Error", message: "Growth approval packet payload is unreadable." });
    }

    if (!isProviderPayloadApprovalPacket(packet)) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Only provider payload approval packets can produce provider handoff bundles."
      });
    }

    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    const providerPackage = buildProviderPayloadPackage({
      products,
      store: merchStoreSnapshot(store),
      storeId: store.id
    });
    const bundle = buildProviderHandoffBundle({
      approvalId: existing.id,
      package: providerPackage,
      packet,
      reviewedAt: existing.reviewedAt?.toISOString() ?? null,
      reviewAuditLogId: existing.reviewAuditLogId
    });
    const auditLog = await recordAuditLog({
      action: "provider_payload.handoff.generated",
      actorUserId: currentUser.sub,
      metadata: {
        bundle,
        externalExecution: false,
        packetId: existing.id,
        providerContacted: false
      },
      outcome: "success",
      severity: bundle.connectorReadiness.status === "Ready for manual handoff" ? "low" : "medium",
      targetId: existing.id,
      targetType: "provider_payload_handoff"
    });

    return reply.send({
      auditLogId: auditLog.id,
      bundle
    });
  });

  app.get("/merch/stores/:storeId/reports/:reportType", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = merchReportParamsSchema.parse(request.params);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      include: {
        products: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const products = store.products.map((product) => merchProductSnapshot(product));
    return reply.send({ report: buildMerchReport(params.reportType, merchStoreSnapshot(store), products) });
  });

  app.get("/merch/stores/:storeId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    return reply.send({ store: publicClientMerchStore(store) });
  });

  app.patch("/merch/stores/:storeId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const input = updateClientMerchStoreSchema.parse(request.body);
    const existing = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      select: { id: true }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const store = await prisma.clientMerchStore.update({
      where: { id: existing.id },
      data: updateMerchStoreData(input)
    });

    return reply.send({ store: publicClientMerchStore(store) });
  });

  app.delete("/merch/stores/:storeId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = clientMerchStoreIdParamsSchema.parse(request.params);
    const existing = await prisma.clientMerchStore.findFirst({
      where: {
        id: params.storeId,
        userId: currentUser.sub
      },
      select: { id: true }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    await prisma.clientMerchStore.delete({ where: { id: existing.id } });

    return reply.code(204).send();
  });
}

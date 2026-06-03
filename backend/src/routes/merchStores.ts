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
  updateClientMerchStoreSchema,
  type CreateClientMerchStoreInput,
  type UpdateClientMerchStoreInput
} from "../schemas.js";
import { buildGrowthApprovalPacket, buildGrowthOrchestrationPreview, buildGrowthPlan, type GrowthApprovalPacket } from "../services/growthPlans.js";
import { recordAuditLog } from "../services/audit.js";
import { buildLaunchPackage, buildMerchReport, type MerchProductSnapshot } from "../services/merchReports.js";
import { buildProviderHandoffBundle, buildProviderPayloadApprovalPacket, buildProviderPayloadPackage, isProviderPayloadApprovalPacket } from "../services/merchProviderPayloads.js";
import { parseSecureJson, stringifySecureJson } from "../services/secureJson.js";

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
    const reviewed = await prisma.growthApprovalPacket.update({
      where: { id: existing.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: currentUser.sub,
        reviewNote: input.note ?? null,
        status
      }
    });
    const auditLog = await recordAuditLog({
      action: status === "approved" ? "growth.approval.approved" : "growth.approval.rejected",
      actorUserId: currentUser.sub,
      metadata: {
        externalExecution: false,
        note: input.note ?? null,
        packet,
        packetId: reviewed.id,
        reviewStatus: status
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
      message: status === "approved"
        ? "Growth packet approved for preparation only. No external action executed."
        : "Growth packet rejected. No external action executed."
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

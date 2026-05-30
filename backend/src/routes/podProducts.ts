import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  complianceCheckSchema,
  createPodProductSchema,
  generateProductBatchSchema,
  podProductIdParamsSchema,
  podProductListQuerySchema,
  pricingCalculatorSchema,
  storePodProductParamsSchema,
  updatePodProductSchema,
  type CreatePodProductInput,
  type UpdatePodProductInput
} from "../schemas.js";
import { generateProductBatch } from "../services/productBatchGenerator.js";
import { analyzeCompliance, formatComplianceNotes } from "../services/complianceGuardrails.js";
import { calculatePricing, pricingPlatformPresets } from "../services/pricingCalculator.js";

const productStatusToDb = {
  Idea: "IDEA",
  "Prompt Ready": "PROMPT_READY",
  Designed: "DESIGNED",
  "Mockup Created": "MOCKUP_CREATED",
  "Listing Drafted": "LISTING_DRAFTED",
  "Compliance Review": "COMPLIANCE_REVIEW",
  "Awaiting Approval": "AWAITING_APPROVAL",
  Approved: "APPROVED",
  Published: "PUBLISHED",
  "Needs Revision": "NEEDS_REVISION",
  Rejected: "REJECTED",
  Archived: "ARCHIVED"
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

type PodProductRecord = {
  id: string;
  storeId: string;
  productName: string;
  productType: string;
  targetAudience: string;
  designTheme: string;
  designConcept: string;
  designPrompt: string;
  typographyDirection: string;
  colorDirection: string;
  mockupNotes: string | null;
  supplierCost: { toString(): string };
  shippingCost: { toString(): string };
  retailPrice: { toString(): string };
  estimatedPlatformFees: { toString(): string };
  estimatedProfit: { toString(): string };
  profitMargin: { toString(): string };
  listingTitle: string | null;
  listingDescription: string | null;
  tags: string[];
  complianceNotes: string | null;
  aiDisclosureNeeded: boolean;
  productionPartnerDisclosureNeeded: boolean;
  status: keyof typeof productStatusFromDb;
  commandMarshalId: string | null;
  commandMarshalName: string | null;
  commandGeneralId: string | null;
  commandGeneralName: string | null;
  commandCommanderId: string | null;
  commandCommanderName: string | null;
  commandSoldierId: string | null;
  commandSoldierName: string | null;
  createdAt: Date;
  updatedAt: Date;
  store?: {
    id: string;
    businessName: string;
    clientName: string;
  };
};

function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}

function publicPodProduct(product: PodProductRecord) {
  return {
    id: product.id,
    productId: product.id,
    storeId: product.storeId,
    store: product.store,
    productName: product.productName,
    productType: product.productType,
    targetAudience: product.targetAudience,
    designTheme: product.designTheme,
    designConcept: product.designConcept,
    designPrompt: product.designPrompt,
    typographyDirection: product.typographyDirection,
    colorDirection: product.colorDirection,
    mockupNotes: product.mockupNotes,
    supplierCost: decimalToNumber(product.supplierCost),
    shippingCost: decimalToNumber(product.shippingCost),
    retailPrice: decimalToNumber(product.retailPrice),
    estimatedPlatformFees: decimalToNumber(product.estimatedPlatformFees),
    estimatedProfit: decimalToNumber(product.estimatedProfit),
    profitMargin: decimalToNumber(product.profitMargin),
    listingTitle: product.listingTitle,
    listingDescription: product.listingDescription,
    tags: product.tags,
    complianceNotes: product.complianceNotes,
    aiDisclosureNeeded: product.aiDisclosureNeeded,
    productionPartnerDisclosureNeeded: product.productionPartnerDisclosureNeeded,
    status: productStatusFromDb[product.status],
    commandMarshalId: product.commandMarshalId,
    commandMarshalName: product.commandMarshalName,
    commandGeneralId: product.commandGeneralId,
    commandGeneralName: product.commandGeneralName,
    commandCommanderId: product.commandCommanderId,
    commandCommanderName: product.commandCommanderName,
    commandSoldierId: product.commandSoldierId,
    commandSoldierName: product.commandSoldierName,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function createPodProductData(input: CreatePodProductInput): Prisma.PodProductUncheckedCreateInput {
  const complianceNotes = formatComplianceNotes(input);

  return {
    storeId: input.storeId,
    productName: input.productName,
    productType: input.productType,
    targetAudience: input.targetAudience,
    designTheme: input.designTheme,
    designConcept: input.designConcept,
    designPrompt: input.designPrompt,
    typographyDirection: input.typographyDirection,
    colorDirection: input.colorDirection,
    mockupNotes: input.mockupNotes,
    supplierCost: input.supplierCost,
    shippingCost: input.shippingCost,
    retailPrice: input.retailPrice,
    estimatedPlatformFees: input.estimatedPlatformFees,
    estimatedProfit: input.estimatedProfit,
    profitMargin: input.profitMargin,
    listingTitle: input.listingTitle,
    listingDescription: input.listingDescription,
    tags: input.tags,
    complianceNotes: input.complianceNotes ? `${input.complianceNotes} ${complianceNotes}` : complianceNotes,
    aiDisclosureNeeded: input.aiDisclosureNeeded,
    productionPartnerDisclosureNeeded: input.productionPartnerDisclosureNeeded,
    status: productStatusToDb[input.status],
    commandMarshalId: input.commandMarshalId,
    commandMarshalName: input.commandMarshalName,
    commandGeneralId: input.commandGeneralId,
    commandGeneralName: input.commandGeneralName,
    commandCommanderId: input.commandCommanderId,
    commandCommanderName: input.commandCommanderName,
    commandSoldierId: input.commandSoldierId,
    commandSoldierName: input.commandSoldierName
  };
}

function updatePodProductData(input: UpdatePodProductInput): Prisma.PodProductUncheckedUpdateInput {
  const data: Prisma.PodProductUncheckedUpdateInput = {};

  if (input.storeId !== undefined) data.storeId = input.storeId;
  if (input.productName !== undefined) data.productName = input.productName;
  if (input.productType !== undefined) data.productType = input.productType;
  if (input.targetAudience !== undefined) data.targetAudience = input.targetAudience;
  if (input.designTheme !== undefined) data.designTheme = input.designTheme;
  if (input.designConcept !== undefined) data.designConcept = input.designConcept;
  if (input.designPrompt !== undefined) data.designPrompt = input.designPrompt;
  if (input.typographyDirection !== undefined) data.typographyDirection = input.typographyDirection;
  if (input.colorDirection !== undefined) data.colorDirection = input.colorDirection;
  if (input.mockupNotes !== undefined) data.mockupNotes = input.mockupNotes;
  if (input.supplierCost !== undefined) data.supplierCost = input.supplierCost;
  if (input.shippingCost !== undefined) data.shippingCost = input.shippingCost;
  if (input.retailPrice !== undefined) data.retailPrice = input.retailPrice;
  if (input.estimatedPlatformFees !== undefined) data.estimatedPlatformFees = input.estimatedPlatformFees;
  if (input.estimatedProfit !== undefined) data.estimatedProfit = input.estimatedProfit;
  if (input.profitMargin !== undefined) data.profitMargin = input.profitMargin;
  if (input.listingTitle !== undefined) data.listingTitle = input.listingTitle;
  if (input.listingDescription !== undefined) data.listingDescription = input.listingDescription;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.complianceNotes !== undefined) data.complianceNotes = input.complianceNotes;
  if (input.aiDisclosureNeeded !== undefined) data.aiDisclosureNeeded = input.aiDisclosureNeeded;
  if (input.productionPartnerDisclosureNeeded !== undefined) data.productionPartnerDisclosureNeeded = input.productionPartnerDisclosureNeeded;
  if (input.status !== undefined) data.status = productStatusToDb[input.status];
  if (input.commandMarshalId !== undefined) data.commandMarshalId = input.commandMarshalId;
  if (input.commandMarshalName !== undefined) data.commandMarshalName = input.commandMarshalName;
  if (input.commandGeneralId !== undefined) data.commandGeneralId = input.commandGeneralId;
  if (input.commandGeneralName !== undefined) data.commandGeneralName = input.commandGeneralName;
  if (input.commandCommanderId !== undefined) data.commandCommanderId = input.commandCommanderId;
  if (input.commandCommanderName !== undefined) data.commandCommanderName = input.commandCommanderName;
  if (input.commandSoldierId !== undefined) data.commandSoldierId = input.commandSoldierId;
  if (input.commandSoldierName !== undefined) data.commandSoldierName = input.commandSoldierName;

  return data;
}

async function ensureOwnedStore(storeId: string, userId: string) {
  return prisma.clientMerchStore.findFirst({
    where: {
      id: storeId,
      userId
    },
    select: { id: true }
  });
}

async function findOwnedProduct(productId: string, userId: string) {
  return prisma.podProduct.findFirst({
    where: {
      id: productId,
      store: { userId }
    },
    include: {
      store: {
        select: {
          id: true,
          businessName: true,
          clientName: true
        }
      }
    }
  });
}

function buildListWhere(userId: string, query: { search?: string; status?: keyof typeof productStatusToDb; storeId?: string }) {
  const where: Prisma.PodProductWhereInput = {
    store: { userId }
  };

  if (query.storeId) {
    where.storeId = query.storeId;
  }

  if (query.status) {
    where.status = productStatusToDb[query.status];
  }

  if (query.search) {
    where.OR = [
      { productName: { contains: query.search, mode: "insensitive" } },
      { productType: { contains: query.search, mode: "insensitive" } },
      { targetAudience: { contains: query.search, mode: "insensitive" } },
      { designTheme: { contains: query.search, mode: "insensitive" } },
      { listingTitle: { contains: query.search, mode: "insensitive" } }
    ];
  }

  return where;
}

export async function podProductRoutes(app: FastifyInstance) {
  app.post("/merch/compliance/check", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = complianceCheckSchema.parse(request.body);
    return reply.send({ compliance: analyzeCompliance(input) });
  });

  app.post("/merch/pricing/calculate", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = pricingCalculatorSchema.parse(request.body);
    const preset = pricingPlatformPresets[input.preset];
    const pricing = calculatePricing({
      adSpendEstimate: input.adSpendEstimate,
      listingFee: input.listingFee ?? preset.listingFee,
      paymentProcessingEstimate: input.paymentProcessingEstimate ?? preset.paymentProcessingEstimate,
      platformFeePercent: input.platformFeePercent ?? preset.platformFeePercent,
      retailPrice: input.retailPrice,
      shippingCost: input.shippingCost,
      supplierCost: input.supplierCost
    });

    return reply.send({
      pricing,
      preset: input.preset
    });
  });

  app.get("/merch/products", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const query = podProductListQuerySchema.parse(request.query);

    if (query.storeId && !await ensureOwnedStore(query.storeId, currentUser.sub)) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const where = buildListWhere(currentUser.sub, query);
    const [items, total] = await prisma.$transaction([
      prisma.podProduct.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          store: {
            select: {
              id: true,
              businessName: true,
              clientName: true
            }
          }
        }
      }),
      prisma.podProduct.count({ where })
    ]);

    return reply.send({
      items: items.map(publicPodProduct),
      page: query.page,
      pageSize: query.pageSize,
      total
    });
  });

  app.get("/merch/stores/:storeId/products", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = storePodProductParamsSchema.parse(request.params);
    const query = podProductListQuerySchema.omit({ storeId: true }).parse(request.query);

    if (!await ensureOwnedStore(params.storeId, currentUser.sub)) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const where = buildListWhere(currentUser.sub, { ...query, storeId: params.storeId });
    const [items, total] = await prisma.$transaction([
      prisma.podProduct.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.podProduct.count({ where })
    ]);

    return reply.send({
      items: items.map(publicPodProduct),
      page: query.page,
      pageSize: query.pageSize,
      total
    });
  });

  app.post("/merch/products", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = createPodProductSchema.parse(request.body);

    if (input.status === "Published") {
      return reply.code(400).send({ error: "Bad Request", message: "Products must be approved before publishing." });
    }

    if (input.status === "Approved" && analyzeCompliance(input).requiresApproval) {
      return reply.code(400).send({ error: "Bad Request", message: "Flagged products require explicit approval through the approval queue." });
    }

    if (!await ensureOwnedStore(input.storeId, currentUser.sub)) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const product = await prisma.podProduct.create({
      data: createPodProductData(input),
      include: {
        store: {
          select: {
            id: true,
            businessName: true,
            clientName: true
          }
        }
      }
    });

    return reply.code(201).send({ product: publicPodProduct(product) });
  });

  app.post("/merch/products/batch", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const input = generateProductBatchSchema.parse(request.body);
    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: input.storeId,
        userId: currentUser.sub
      },
      select: {
        audience: true,
        brandStyle: true,
        businessName: true,
        clientName: true,
        commandGeneralId: true,
        commandGeneralName: true,
        commandMarshalId: true,
        commandMarshalName: true,
        id: true,
        industry: true,
        productTypes: true
      }
    });

    if (!store) {
      return reply.code(404).send({ error: "Not Found", message: "Merch store was not found." });
    }

    const productsToCreate = generateProductBatch(store, input);
    const products = await prisma.$transaction(
      productsToCreate.map((product) => prisma.podProduct.create({
        data: createPodProductData(product),
        include: {
          store: {
            select: {
              id: true,
              businessName: true,
              clientName: true
            }
          }
        }
      }))
    );
    const warnings = productsToCreate
      .flatMap((product) => product.complianceNotes?.split(".").map((warning) => warning.trim()).filter(Boolean) ?? [])
      .filter((warning, index, all) => all.indexOf(warning) === index);

    return reply.code(201).send({
      batch: {
        productCount: products.length,
        riskTolerance: input.riskTolerance,
        storeId: store.id,
        warnings
      },
      products: products.map(publicPodProduct)
    });
  });

  app.get("/merch/products/:productId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = podProductIdParamsSchema.parse(request.params);
    const product = await findOwnedProduct(params.productId, currentUser.sub);

    if (!product) {
      return reply.code(404).send({ error: "Not Found", message: "POD product was not found." });
    }

    return reply.send({ product: publicPodProduct(product) });
  });

  app.patch("/merch/products/:productId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = podProductIdParamsSchema.parse(request.params);
    const input = updatePodProductSchema.parse(request.body);
    const existing = await findOwnedProduct(params.productId, currentUser.sub);

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "POD product was not found." });
    }

    if (input.status === "Published" && existing.status !== "APPROVED") {
      return reply.code(400).send({ error: "Bad Request", message: "Products must be approved before publishing." });
    }

    if (input.storeId && !await ensureOwnedStore(input.storeId, currentUser.sub)) {
      return reply.code(404).send({ error: "Not Found", message: "Target merch store was not found." });
    }

    const product = await prisma.podProduct.update({
      where: { id: existing.id },
      data: updatePodProductData(input),
      include: {
        store: {
          select: {
            id: true,
            businessName: true,
            clientName: true
          }
        }
      }
    });

    return reply.send({ product: publicPodProduct(product) });
  });

  app.delete("/merch/products/:productId", { preHandler: requireAuth }, async (request, reply) => {
    const currentUser = request.user;

    if (!currentUser) {
      return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
    }

    const params = podProductIdParamsSchema.parse(request.params);
    const existing = await findOwnedProduct(params.productId, currentUser.sub);

    if (!existing) {
      return reply.code(404).send({ error: "Not Found", message: "POD product was not found." });
    }

    await prisma.podProduct.delete({ where: { id: existing.id } });

    return reply.code(204).send();
  });
}

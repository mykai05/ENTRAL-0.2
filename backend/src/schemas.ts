import { z } from "zod";

export const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

const authTokenSchema = z.string().trim().min(32).max(256);

export const requestPasswordResetSchema = z.object({
  email: emailSchema
});

export const confirmPasswordResetSchema = z.object({
  token: authTokenSchema,
  password: z.string().min(8).max(128)
});

export const requestEmailVerificationSchema = z.object({
  email: emailSchema
});

export const confirmEmailVerificationSchema = z.object({
  token: authTokenSchema
});

export const accountDeletionConfirmation = "DELETE MY ACCOUNT";

export const deleteAccountSchema = z.object({
  confirmation: z.literal(accountDeletionConfirmation),
  password: z.string().min(1).max(128)
});

const optionalTrimmedString = (maxLength: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maxLength).optional()
);

const moneyAmountSchema = z.coerce.number().finite().min(0).max(999_999_999);
const percentAmountSchema = z.coerce.number().finite().min(0).max(100);

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional(),
  status: taskStatusSchema.default("TODO"),
  dueDate: z.string().datetime().optional(),
  teamId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional()
});

export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: taskStatusSchema.optional()
});

export const merchStorePlatformSchema = z.enum(["Etsy", "Shopify", "Other"]);
export const merchPodProviderSchema = z.enum(["Printify", "Printful", "Other"]);
export const merchApprovalStatusSchema = z.enum([
  "Not Started",
  "Research Approved",
  "Designs Pending",
  "Designs Approved",
  "Listings Approved",
  "Launch Approved"
]);
export const merchLaunchStatusSchema = z.enum([
  "Lead",
  "Discovery",
  "Researching",
  "Designing",
  "Awaiting Approval",
  "Building Store",
  "Launched",
  "Optimizing",
  "Paused",
  "Archived"
]);
export const podProductStatusSchema = z.enum([
  "Idea",
  "Prompt Ready",
  "Designed",
  "Mockup Created",
  "Listing Drafted",
  "Compliance Review",
  "Awaiting Approval",
  "Approved",
  "Published",
  "Needs Revision",
  "Rejected",
  "Archived"
]);
export const productBatchSizeSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(25)
]);
export const productBatchRiskToleranceSchema = z.enum(["Low", "Medium", "High"]);
export const pricingPlatformPresetSchema = z.enum(["Etsy", "Shopify", "Manual"]);
export const automationLevelSchema = z.enum(["manual", "assisted", "semi_automated", "automated"]);
export const merchReportTypeSchema = z.enum([
  "Store Launch Report",
  "Weekly Store Report",
  "Product Performance Report",
  "Sales Report",
  "Profit Estimate Report",
  "New Design Opportunity Report",
  "Client Update Report"
]);

const clientMerchStoreFields = {
  clientName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().min(2).max(140),
  contactName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: optionalTrimmedString(40),
  industry: z.string().trim().min(2).max(120),
  audience: z.string().trim().min(2).max(500),
  brandStyle: z.string().trim().min(2).max(500),
  storePlatform: merchStorePlatformSchema,
  podProvider: merchPodProviderSchema,
  productTypes: z.array(z.string().trim().min(1).max(80)).max(30),
  designCount: z.coerce.number().int().min(0).max(10_000),
  setupFee: moneyAmountSchema,
  monthlyFee: moneyAmountSchema,
  profitShare: percentAmountSchema,
  approvalStatus: merchApprovalStatusSchema,
  launchStatus: merchLaunchStatusSchema,
  revenue: moneyAmountSchema,
  estimatedProfit: moneyAmountSchema,
  commandMarshalId: optionalTrimmedString(120),
  commandMarshalName: optionalTrimmedString(160),
  commandGeneralId: optionalTrimmedString(120),
  commandGeneralName: optionalTrimmedString(160),
  notes: optionalTrimmedString(5000)
};

export const createClientMerchStoreSchema = z.object({
  ...clientMerchStoreFields,
  storePlatform: clientMerchStoreFields.storePlatform.default("Etsy"),
  podProvider: clientMerchStoreFields.podProvider.default("Printify"),
  productTypes: clientMerchStoreFields.productTypes.default([]),
  designCount: clientMerchStoreFields.designCount.default(0),
  setupFee: clientMerchStoreFields.setupFee.default(0),
  monthlyFee: clientMerchStoreFields.monthlyFee.default(0),
  profitShare: clientMerchStoreFields.profitShare.default(0),
  approvalStatus: clientMerchStoreFields.approvalStatus.default("Not Started"),
  launchStatus: clientMerchStoreFields.launchStatus.default("Lead"),
  revenue: clientMerchStoreFields.revenue.default(0),
  estimatedProfit: clientMerchStoreFields.estimatedProfit.default(0)
});

export const updateClientMerchStoreSchema = z.object(clientMerchStoreFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one merch store field must be provided."
);

export const clientMerchStoreIdParamsSchema = z.object({
  storeId: z.string().cuid()
});

export const clientMerchStoreListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  approvalStatus: merchApprovalStatusSchema.optional(),
  launchStatus: merchLaunchStatusSchema.optional(),
  search: optionalTrimmedString(120)
});

const podProductFields = {
  storeId: z.string().cuid(),
  productName: z.string().trim().min(2).max(160),
  productType: z.string().trim().min(2).max(120),
  targetAudience: z.string().trim().min(2).max(500),
  designTheme: z.string().trim().min(2).max(240),
  designConcept: z.string().trim().min(2).max(1000),
  designPrompt: z.string().trim().min(2).max(4000),
  typographyDirection: z.string().trim().min(2).max(500),
  colorDirection: z.string().trim().min(2).max(500),
  mockupNotes: optionalTrimmedString(2000),
  supplierCost: moneyAmountSchema,
  shippingCost: moneyAmountSchema,
  retailPrice: moneyAmountSchema,
  estimatedPlatformFees: moneyAmountSchema,
  estimatedProfit: moneyAmountSchema,
  profitMargin: z.coerce.number().finite().min(0).max(10_000),
  listingTitle: optionalTrimmedString(200),
  listingDescription: optionalTrimmedString(5000),
  tags: z.array(z.string().trim().min(1).max(80)).max(40),
  complianceNotes: optionalTrimmedString(3000),
  aiDisclosureNeeded: z.boolean(),
  productionPartnerDisclosureNeeded: z.boolean(),
  status: podProductStatusSchema,
  commandMarshalId: optionalTrimmedString(120),
  commandMarshalName: optionalTrimmedString(160),
  commandGeneralId: optionalTrimmedString(120),
  commandGeneralName: optionalTrimmedString(160),
  commandCommanderId: optionalTrimmedString(120),
  commandCommanderName: optionalTrimmedString(160),
  commandSoldierId: optionalTrimmedString(120),
  commandSoldierName: optionalTrimmedString(160)
};

export const createPodProductSchema = z.object({
  ...podProductFields,
  supplierCost: podProductFields.supplierCost.default(0),
  shippingCost: podProductFields.shippingCost.default(0),
  retailPrice: podProductFields.retailPrice.default(0),
  estimatedPlatformFees: podProductFields.estimatedPlatformFees.default(0),
  estimatedProfit: podProductFields.estimatedProfit.default(0),
  profitMargin: podProductFields.profitMargin.default(0),
  tags: podProductFields.tags.default([]),
  aiDisclosureNeeded: podProductFields.aiDisclosureNeeded.default(false),
  productionPartnerDisclosureNeeded: podProductFields.productionPartnerDisclosureNeeded.default(false),
  status: podProductFields.status.default("Idea")
});

export const updatePodProductSchema = z.object(podProductFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one POD product field must be provided."
);

export const podProductIdParamsSchema = z.object({
  productId: z.string().cuid()
});

export const storePodProductParamsSchema = z.object({
  storeId: z.string().cuid()
});

export const podProductListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: podProductStatusSchema.optional(),
  storeId: z.string().cuid().optional(),
  search: optionalTrimmedString(120)
});

export const generateProductBatchSchema = z.object({
  storeId: z.string().cuid(),
  productTypes: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  productCount: z.coerce.number().pipe(productBatchSizeSchema).default(5),
  styleDirection: z.string().trim().min(2).max(500),
  audience: z.string().trim().min(2).max(500),
  priceRange: z.object({
    min: moneyAmountSchema,
    max: moneyAmountSchema
  }).refine((range) => range.max >= range.min, "Maximum price must be greater than or equal to minimum price."),
  riskTolerance: productBatchRiskToleranceSchema.default("Medium")
});

export const complianceCheckSchema = z.object({
  aiDisclosureNeeded: z.boolean().optional(),
  colorDirection: optionalTrimmedString(500),
  complianceNotes: optionalTrimmedString(3000),
  designConcept: optionalTrimmedString(1000),
  designPrompt: optionalTrimmedString(4000),
  designTheme: optionalTrimmedString(240),
  listingDescription: optionalTrimmedString(5000),
  listingTitle: optionalTrimmedString(200),
  productName: optionalTrimmedString(160),
  productionPartnerDisclosureNeeded: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  typographyDirection: optionalTrimmedString(500)
});

export const pricingCalculatorSchema = z.object({
  preset: pricingPlatformPresetSchema.default("Etsy"),
  supplierCost: moneyAmountSchema,
  shippingCost: moneyAmountSchema,
  retailPrice: moneyAmountSchema,
  platformFeePercent: percentAmountSchema.optional(),
  listingFee: moneyAmountSchema.optional(),
  paymentProcessingEstimate: moneyAmountSchema.optional(),
  adSpendEstimate: moneyAmountSchema.default(0)
});

export const merchReportParamsSchema = z.object({
  reportType: merchReportTypeSchema,
  storeId: z.string().cuid()
});

export const requestGrowthApprovalSchema = z.object({
  note: optionalTrimmedString(500),
  scheduledFor: z.string().datetime().optional()
});

export const growthApprovalPacketParamsSchema = z.object({
  packetId: z.string().cuid(),
  storeId: z.string().cuid()
});

export const reviewGrowthApprovalSchema = z.object({
  note: optionalTrimmedString(500)
});

export const conversationIdParamsSchema = z.object({
  conversationId: z.string().cuid()
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional()
});

export const importConversationsSchema = z.object({
  conversations: z.array(z.object({
    title: z.string().trim().min(1).max(80).optional(),
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(4000)
    })).max(100).optional()
  })).min(1).max(25)
});

export const chatMessageSchema = z.object({
  conversationId: z.preprocess((value) => value === null ? undefined : value, z.string().cuid().optional()),
  message: z.string()
    .trim()
    .min(1)
    .max(4000)
    .refine((value) => !/<\/?script[\s>]/i.test(value), "Messages cannot include script tags.")
});

export const screenInsightSchema = z.object({
  conversationId: z.preprocess((value) => value === null ? undefined : value, z.string().cuid().optional()),
  message: z.string()
    .trim()
    .min(1)
    .max(1000)
    .refine((value) => !/<\/?script[\s>]/i.test(value), "Messages cannot include script tags."),
  prompt: z.string().trim().min(1).max(1000).optional(),
  screenshot: z.string()
    .max(3_000_000)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Screenshot must be a base64 image data URL.")
});

export const commandOSNodeTypeSchema = z.enum(["emperor", "marshal", "general", "commander", "soldier"]);
export const commandOSStatusSchema = z.enum(["idle", "working", "thinking", "waiting", "error", "offline"]);
export const commandOSTaskStatusSchema = z.enum(["pending", "assigned", "running", "completed", "failed"]);

const commandOSMemorySchema = z.object({
  instructions: z.string().max(5000),
  notes: z.array(z.string().max(2000)).max(100),
  recentTasks: z.array(z.string().max(500)).max(100),
  role: z.string().max(500),
  taskResults: z.array(z.string().max(2000)).max(100)
}).passthrough();

export const commandOSReportRecordSchema = z.object({
  analysis: z.string().max(10_000),
  commanderId: z.string().max(160).nullable().optional(),
  createdAt: z.string().datetime(),
  destinationEntityId: z.string().min(1).max(160),
  destinationEntityType: commandOSNodeTypeSchema,
  generalId: z.string().max(160).nullable().optional(),
  id: z.string().min(1).max(180),
  marshalId: z.string().max(160).nullable().optional(),
  nextActions: z.array(z.string().max(1000)).max(20),
  recommendation: z.string().max(10_000),
  situation: z.string().max(10_000),
  soldierId: z.string().max(160).nullable().optional(),
  sourceEntityId: z.string().min(1).max(160),
  sourceEntityType: commandOSNodeTypeSchema
}).passthrough();

const commandOSNodeSchema = z.object({
  children: z.array(z.string().max(160)).max(500).optional(),
  commandType: commandOSNodeTypeSchema,
  currentTask: z.string().max(500).nullable(),
  groupId: z.string().min(1).max(160),
  id: z.string().min(1).max(160),
  logs: z.array(z.string().max(2000)).max(200),
  memory: commandOSMemorySchema,
  name: z.string().min(1).max(200),
  parentId: z.string().max(160).nullable(),
  reportHistory: z.array(commandOSReportRecordSchema).max(50).optional(),
  reports: z.array(commandOSReportRecordSchema).max(50).optional(),
  status: commandOSStatusSchema,
  taskHistory: z.array(z.string().max(500)).max(200),
  type: z.enum(["core", "agent"])
}).passthrough();

const commandOSGroupSchema = z.object({
  collapsed: z.boolean().optional(),
  color: z.string().max(40),
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(200)
}).passthrough();

const commandOSEdgeSchema = z.object({
  id: z.string().min(1).max(220),
  label: z.string().max(200),
  source: z.string().min(1).max(160),
  target: z.string().min(1).max(160)
}).passthrough();

const commandOSTaskSchema = z.object({
  assignedEntityId: z.string().max(160).nullable(),
  assignedEntityType: commandOSNodeTypeSchema.nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  commanderId: z.string().max(160).nullable().optional(),
  commanderName: z.string().max(200).nullable().optional(),
  createdAt: z.string().datetime(),
  delegationPath: z.array(z.string().max(160)).max(20),
  description: z.string().max(5000),
  generalId: z.string().max(160).nullable().optional(),
  generalName: z.string().max(200).nullable().optional(),
  history: z.array(z.string().max(2000)).max(200),
  id: z.string().min(1).max(180),
  marshalId: z.string().max(160).nullable().optional(),
  marshalName: z.string().max(200).nullable().optional(),
  name: z.string().min(1).max(240),
  reportHistory: z.array(commandOSReportRecordSchema).max(50).optional(),
  soldierId: z.string().max(160).nullable().optional(),
  soldierName: z.string().max(200).nullable().optional(),
  status: commandOSTaskStatusSchema,
  updatedAt: z.string().datetime()
}).passthrough();

export const commandOSStateSchema = z.object({
  edges: z.array(commandOSEdgeSchema).max(2500),
  groups: z.array(commandOSGroupSchema).max(500),
  nodes: z.array(commandOSNodeSchema).min(1).max(1000),
  tasks: z.array(commandOSTaskSchema).max(2500)
}).passthrough();

export const commandOSSnapshotSchema = z.object({
  source: z.enum(["dashboard", "import", "repair"]).default("dashboard"),
  state: commandOSStateSchema
}).superRefine((input, context) => {
  const size = JSON.stringify(input.state).length;

  if (size > 2_000_000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Command OS state is too large to persist safely."
    });
  }
});

export const automationJobTypeSchema = z.enum(["scrape"]);
export const automationJobStatusSchema = z.enum(["pending", "scheduled", "running", "completed", "failed", "canceled"]);

export const scrapePayloadSchema = z.object({
  url: z.string().trim().url(),
  selector: z.string().trim().min(1).max(200).optional()
});

export const createAutomationJobSchema = z.object({
  type: automationJobTypeSchema,
  payload: scrapePayloadSchema,
  scheduledAt: z.string().datetime().optional()
});

export const automationJobIdParamsSchema = z.object({
  jobId: z.string().cuid()
});

export const agentStatusSchema = z.enum(["idle", "busy", "paused", "error"]);
export const agentTaskStatusSchema = z.enum(["queued", "running", "completed", "failed", "canceled"]);
export const agentActionSchema = z.enum([
  "research",
  "internet_research",
  "governed_deep_research",
  "business_discovery",
  "commerce_operations",
  "app_build",
  "brand_operations",
  "browser_automation",
  "external_tool_call",
  "sales_outreach",
  "automation_review",
  "chat_summary",
  "general"
]);
export const agentPayloadSourceSchema = z.enum(["chat", "automation", "manual", "schedule"]);

export const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(120),
  capabilities: z.array(z.string().trim().min(1).max(60)).min(1).max(8).default(["general"]),
  runInBackground: z.boolean().default(true),
  webhookUrl: z.string().trim().url().optional()
});

export const agentIdParamsSchema = z.object({
  agentId: z.string().cuid()
});

export const assignAgentTaskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  action: agentActionSchema.default("general"),
  payload: z.object({
    instructions: z.string().trim().min(1).max(4000),
    context: z.string().trim().max(4000).optional(),
    sourceType: agentPayloadSourceSchema.default("manual"),
    sourceId: z.string().trim().max(120).optional(),
    webhookUrl: z.string().trim().url().optional()
  })
});

export const updateAgentBackgroundSchema = z.object({
  runInBackground: z.boolean()
});

export const createAgentScheduleSchema = z.object({
  title: z.string().trim().min(2).max(140),
  action: agentActionSchema.default("general"),
  payload: z.object({
    instructions: z.string().trim().min(1).max(4000),
    context: z.string().trim().max(4000).optional(),
    sourceType: agentPayloadSourceSchema.default("schedule"),
    sourceId: z.string().trim().max(120).optional(),
    webhookUrl: z.string().trim().url().optional()
  }),
  intervalMinutes: z.coerce.number().int().min(1).max(10080),
  runImmediately: z.boolean().default(true)
});

export const agentScheduleIdParamsSchema = z.object({
  agentId: z.string().cuid(),
  scheduleId: z.string().cuid()
});

export const agentTaskIdParamsSchema = z.object({
  agentId: z.string().cuid(),
  taskId: z.string().cuid()
});

export const policyRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("blocked_keywords"),
    keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(30)
  }),
  z.object({
    kind: z.literal("blocked_domains"),
    domains: z.array(z.string().trim().min(1).max(160)).min(1).max(30)
  }),
  z.object({
    kind: z.literal("agent_quota"),
    maxTasks: z.coerce.number().int().min(1).max(500),
    windowMinutes: z.coerce.number().int().min(1).max(1440)
  }),
  z.object({
    kind: z.literal("manual_approval_required"),
    actions: z.array(agentActionSchema).min(1).max(8)
  })
]);

export const policySeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const policyEffectSchema = z.enum(["block", "warn"]);

export const createPolicySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  enabled: z.boolean().default(true),
  effect: policyEffectSchema.default("block"),
  severity: policySeveritySchema.default("medium"),
  rule: policyRuleSchema
});

export const updatePolicySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  enabled: z.boolean().optional(),
  effect: policyEffectSchema.optional(),
  severity: policySeveritySchema.optional(),
  rule: policyRuleSchema.optional()
});

export const policyIdParamsSchema = z.object({
  policyId: z.string().cuid()
});

export const auditLogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export const adminAgentTaskParamsSchema = z.object({
  taskId: z.string().cuid()
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateClientMerchStoreInput = z.infer<typeof createClientMerchStoreSchema>;
export type UpdateClientMerchStoreInput = z.infer<typeof updateClientMerchStoreSchema>;
export type CreatePodProductInput = z.infer<typeof createPodProductSchema>;
export type UpdatePodProductInput = z.infer<typeof updatePodProductSchema>;
export type GenerateProductBatchInput = z.infer<typeof generateProductBatchSchema>;
export type ComplianceCheckInput = z.infer<typeof complianceCheckSchema>;
export type PricingCalculatorInput = z.infer<typeof pricingCalculatorSchema>;
export type RequestGrowthApprovalInput = z.infer<typeof requestGrowthApprovalSchema>;
export type ReviewGrowthApprovalInput = z.infer<typeof reviewGrowthApprovalSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ScreenInsightInput = z.infer<typeof screenInsightSchema>;
export type CommandOSSnapshotInput = z.infer<typeof commandOSSnapshotSchema>;
export type CommandOSReportRecordInput = z.infer<typeof commandOSReportRecordSchema>;
export type ImportConversationsInput = z.infer<typeof importConversationsSchema>;
export type CreateAutomationJobInput = z.infer<typeof createAutomationJobSchema>;
export type ScrapePayload = z.infer<typeof scrapePayloadSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type AssignAgentTaskInput = z.infer<typeof assignAgentTaskSchema>;
export type UpdateAgentBackgroundInput = z.infer<typeof updateAgentBackgroundSchema>;
export type CreateAgentScheduleInput = z.infer<typeof createAgentScheduleSchema>;
export type PolicyRule = z.infer<typeof policyRuleSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

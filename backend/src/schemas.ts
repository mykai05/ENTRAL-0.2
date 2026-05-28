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
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ScreenInsightInput = z.infer<typeof screenInsightSchema>;
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

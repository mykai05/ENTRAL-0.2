import { z } from "zod";

function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const parts = host.split(".").map((part) => Number(part));
  const isIpv4 = parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);

  if (host === "localhost" || host.endsWith(".localhost") || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    return true;
  }

  if (!isIpv4) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function publicUrlSchema(label: string) {
  return z.string().trim().url(`Enter a valid ${label} URL.`).refine((value) => {
    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol)
        && parsed.hostname.includes(".")
        && !isPrivateOrLocalHost(parsed.hostname);
    } catch {
      return false;
    }
  }, `${label} URL must use a public HTTP(S) host.`);
}

export const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

export const signupFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters.").max(140),
  description: z.string().trim().max(2000).optional()
});

export const chatFormSchema = z.object({
  message: z.string()
    .trim()
    .min(1, "Enter a message.")
    .max(4000, "Messages must be under 4,000 characters.")
    .refine((value) => !/<\/?script[\s>]/i.test(value), "Messages cannot include script tags.")
});

export const automationFormSchema = z.object({
  url: publicUrlSchema("automation"),
  selector: z.string().trim().max(200, "Selectors must be under 200 characters.").optional(),
  scheduledAt: z.string().optional()
});

export const agentFormSchema = z.object({
  name: z.string().trim().min(2, "Agent name must be at least 2 characters.").max(80),
  role: z.string().trim().min(2, "Role must be at least 2 characters.").max(120),
  capabilities: z.string().trim().min(1, "Add at least one capability."),
  runInBackground: z.boolean().default(true),
  webhookUrl: publicUrlSchema("webhook").optional().or(z.literal(""))
});

export const agentTaskFormSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters.").max(140),
  action: z.enum(["research", "sales_outreach", "automation_review", "chat_summary", "general"]),
  instructions: z.string().trim().min(1, "Instructions are required.").max(4000),
  context: z.string().trim().max(4000).optional(),
  webhookUrl: publicUrlSchema("webhook").optional().or(z.literal(""))
});

export const agentScheduleFormSchema = agentTaskFormSchema.extend({
  intervalMinutes: z.coerce.number().int().min(1, "Use at least 1 minute.").max(10080),
  runImmediately: z.boolean().default(true)
});

export const policyFormSchema = z.object({
  name: z.string().trim().min(2, "Policy name must be at least 2 characters.").max(100),
  description: z.string().trim().max(500).optional(),
  kind: z.enum(["blocked_keywords", "blocked_domains", "agent_quota", "manual_approval_required"]),
  values: z.string().trim().min(1, "Add at least one value."),
  enabled: z.boolean().default(true),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium")
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type SignupFormInput = z.infer<typeof signupFormSchema>;
export type TaskFormInput = z.infer<typeof taskFormSchema>;
export type ChatFormInput = z.infer<typeof chatFormSchema>;
export type AutomationFormInput = z.infer<typeof automationFormSchema>;
export type AgentFormInput = z.infer<typeof agentFormSchema>;
export type AgentTaskFormInput = z.infer<typeof agentTaskFormSchema>;
export type AgentScheduleFormInput = z.infer<typeof agentScheduleFormSchema>;
export type PolicyFormInput = z.infer<typeof policyFormSchema>;

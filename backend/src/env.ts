import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "test") {
  config({ path: resolve(process.cwd(), ".env") });
  config({ path: resolve(process.cwd(), "../.env") });
}

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().trim().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().min(1).default("localhost"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  COOKIE_NAME: z.string().min(1).default("entral_token"),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  REDIS_URL: optionalTrimmedString,
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  AUTH_EMAIL_PROVIDER: z.enum(["resend", "console"]).default(process.env.NODE_ENV === "production" ? "resend" : "console"),
  AUTH_EMAIL_FROM: optionalTrimmedString,
  RESEND_API_KEY: optionalTrimmedString,
  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o"),
  GITHUB_TOKEN: optionalTrimmedString,
  GITHUB_OWNER: optionalTrimmedString,
  GITHUB_REPO: optionalTrimmedString,
  VERCEL_TOKEN: optionalTrimmedString,
  VERCEL_ORG_ID: optionalTrimmedString,
  VERCEL_PROJECT_ID: optionalTrimmedString,
  SHOPIFY_STORE_DOMAIN: optionalTrimmedString,
  SHOPIFY_CONNECTOR_ADMIN_TOKEN: optionalTrimmedString,
  SHOPIFY_API_VERSION: optionalTrimmedString.default("2026-04"),
  SHOPIFY_APP_API_KEY: optionalTrimmedString,
  SHOPIFY_APP_API_SECRET: optionalTrimmedString,
  SHOPIFY_APP_SCOPES: z.string().trim().default("read_products,write_products,read_online_store_pages,write_online_store_pages,read_online_store_navigation,write_online_store_navigation"),
  SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH: optionalTrimmedString,
  AI_FEATURE_ENABLED: booleanFromEnv.default(true),
  AI_LOCAL_FALLBACK: booleanFromEnv.default(true),
  AI_DAILY_COST_LIMIT_CENTS: z.coerce.number().int().min(0).default(250),
  AI_MONTHLY_COST_LIMIT_CENTS: z.coerce.number().int().min(0).default(2500),
  AI_DECISION_ESTIMATED_COST_CENTS: z.coerce.number().int().min(0).default(1),
  AI_CHAT_ESTIMATED_COST_CENTS: z.coerce.number().int().min(0).default(4),
  AI_SCREEN_ESTIMATED_COST_CENTS: z.coerce.number().int().min(0).default(8),
  AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS: z.coerce.number().int().min(0).default(0),
  AUTOMATION_FEATURE_ENABLED: booleanFromEnv.default(true),
  AUTOMATION_WORKER_ENABLED: booleanFromEnv.default(true),
  AUTOMATION_ALLOWED_DOMAINS: z.string().default("example.com"),
  AUTOMATION_LOCAL_FALLBACK: booleanFromEnv.default(true),
  AUTOMATION_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(5).default(2),
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: z.string().trim().optional(),
  AGENT_ORCHESTRATOR_ENABLED: booleanFromEnv.default(true),
  AGENT_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  AUTONOMY_SCHEDULER_ENABLED: booleanFromEnv.default(true),
  AUTONOMY_SCHEDULER_INTERVAL_MS: z.coerce.number().int().min(1000).max(300000).default(5000),
  AUTONOMY_MIN_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  DATA_ENCRYPTION_KEY: optionalTrimmedString,
  ADMIN_MFA_CODE: optionalTrimmedString,
  ALERT_WEBHOOK_URL: optionalTrimmedString
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.AUTH_EMAIL_PROVIDER === "console") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AUTH_EMAIL_PROVIDER"],
      message: "Production auth email delivery must use a real provider."
    });
  }

  if (value.AUTH_EMAIL_PROVIDER === "resend") {
    if (!value.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required when AUTH_EMAIL_PROVIDER is resend."
      });
    }

    if (!value.AUTH_EMAIL_FROM) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_EMAIL_FROM"],
        message: "AUTH_EMAIL_FROM is required when AUTH_EMAIL_PROVIDER is resend."
      });
    }
  }
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  API_HOST: process.env.API_HOST,
  API_PORT: process.env.API_PORT ?? process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  COOKIE_NAME: process.env.COOKIE_NAME,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
  API_PUBLIC_URL: process.env.API_PUBLIC_URL,
  REDIS_URL: process.env.REDIS_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
  AUTH_EMAIL_PROVIDER: process.env.AUTH_EMAIL_PROVIDER,
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_OWNER: process.env.GITHUB_OWNER,
  GITHUB_REPO: process.env.GITHUB_REPO,
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
  SHOPIFY_CONNECTOR_ADMIN_TOKEN: process.env.SHOPIFY_CONNECTOR_ADMIN_TOKEN,
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
  SHOPIFY_APP_API_KEY: process.env.SHOPIFY_APP_API_KEY,
  SHOPIFY_APP_API_SECRET: process.env.SHOPIFY_APP_API_SECRET,
  SHOPIFY_APP_SCOPES: process.env.SHOPIFY_APP_SCOPES,
  SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH: process.env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH,
  AI_FEATURE_ENABLED: process.env.AI_FEATURE_ENABLED,
  AI_LOCAL_FALLBACK: process.env.AI_LOCAL_FALLBACK,
  AI_DAILY_COST_LIMIT_CENTS: process.env.AI_DAILY_COST_LIMIT_CENTS,
  AI_MONTHLY_COST_LIMIT_CENTS: process.env.AI_MONTHLY_COST_LIMIT_CENTS,
  AI_DECISION_ESTIMATED_COST_CENTS: process.env.AI_DECISION_ESTIMATED_COST_CENTS,
  AI_CHAT_ESTIMATED_COST_CENTS: process.env.AI_CHAT_ESTIMATED_COST_CENTS,
  AI_SCREEN_ESTIMATED_COST_CENTS: process.env.AI_SCREEN_ESTIMATED_COST_CENTS,
  AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS: process.env.AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS,
  AUTOMATION_FEATURE_ENABLED: process.env.AUTOMATION_FEATURE_ENABLED,
  AUTOMATION_WORKER_ENABLED: process.env.AUTOMATION_WORKER_ENABLED,
  AUTOMATION_ALLOWED_DOMAINS: process.env.AUTOMATION_ALLOWED_DOMAINS,
  AUTOMATION_LOCAL_FALLBACK: process.env.AUTOMATION_LOCAL_FALLBACK,
  AUTOMATION_MAX_CONCURRENCY: process.env.AUTOMATION_MAX_CONCURRENCY,
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  AGENT_ORCHESTRATOR_ENABLED: process.env.AGENT_ORCHESTRATOR_ENABLED,
  AGENT_MAX_CONCURRENCY: process.env.AGENT_MAX_CONCURRENCY,
  AUTONOMY_SCHEDULER_ENABLED: process.env.AUTONOMY_SCHEDULER_ENABLED,
  AUTONOMY_SCHEDULER_INTERVAL_MS: process.env.AUTONOMY_SCHEDULER_INTERVAL_MS,
  AUTONOMY_MIN_INTERVAL_MINUTES: process.env.AUTONOMY_MIN_INTERVAL_MINUTES,
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY,
  ADMIN_MFA_CODE: process.env.ADMIN_MFA_CODE,
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL
});

export const isProduction = env.NODE_ENV === "production";

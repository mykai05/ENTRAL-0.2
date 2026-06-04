import { existsSync } from "node:fs";
import { z } from "zod";
import { env } from "../env.js";
import { prisma } from "../db.js";
import { shopifyStoreCreationCaptureConfirmation, shopifyStoreCreationCaptureSchema } from "../schemas.js";
import { recordAuditLog } from "./audit.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";
import { assertSafePublicHttpUrl } from "./urlSafety.js";
import type { ShopifyDevDashboardBrowserTask } from "./shopifyStoreProvisioning.js";
import { captureShopifyStoreCreationForStore } from "./shopifyStoreCreationCapture.js";

export const shopifyStoreCreationBrowserTaskJobType = "shopify_store_creation_browser_task";

const browserTaskStepSchema = z.object({
  expectedState: z.string().trim().min(1).max(500),
  id: z.string().trim().min(1).max(120),
  instruction: z.string().trim().min(1).max(500),
  selectorHints: z.array(z.string().trim().min(1).max(240)).max(12).default([])
});

const browserTaskSchema = z.object({
  allowedDomains: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  allowedSteps: z.array(browserTaskStepSchema).max(20),
  completionEvidence: z.object({
    captureEndpoint: z.string().trim().min(1).max(500),
    nextAutonomousStep: z.literal("submit_shopify_store_creation_capture"),
    requiredFields: z.array(z.string().trim().min(1).max(120)).max(20)
  }),
  currentExecution: z.literal("not_started"),
  hardStops: z.array(z.string().trim().min(1).max(500)).max(20),
  mode: z.literal("Governed Shopify Dev Dashboard Browser Task"),
  targetUrl: z.string().trim().url()
});

export const shopifyStoreCreationBrowserTaskPayloadSchema = z.object({
  browserTask: browserTaskSchema,
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).default("US"),
  expectedShopDomain: z.string().trim().min(4).max(255).nullable().optional(),
  requestedShopName: z.string().trim().min(1).max(120),
  storeId: z.string().cuid(),
  storeType: z.enum(["client_transfer", "development"]).default("client_transfer")
});

export type ShopifyStoreCreationBrowserTaskPayload = z.infer<typeof shopifyStoreCreationBrowserTaskPayloadSchema>;

export type ShopifyStoreCreationBrowserTaskReceipt = {
  actualExternalActionsExecuted: boolean;
  attemptedStepIds: string[];
  autoCapture: {
    auditLogId: string;
    autonomyResumeJobId: string | null;
    oauthStarted: boolean;
    status: string;
    summary: string;
  } | null;
  autoCaptureError: string | null;
  browserTaskEvidence: {
    capturedAt: string;
    capturedFromTargetUrl: string;
    completedStepIds: string[];
    countryCode: string;
    finalShopDomain: string | null;
    operatorOrSessionContext: string;
    source: "governed_browser_task";
    storeType: "client_transfer" | "development";
  };
  detectedDomain: string | null;
  externalExecution: boolean;
  hardStop: string | null;
  mode: "Governed Shopify Dev Dashboard Browser Task Receipt";
  providerContacted: boolean;
  status:
    | "blocked_hard_stop"
    | "blocked_operator_gate"
    | "browser_unavailable"
    | "capture_ready"
    | "no_domain_detected";
  summary: string;
  targetUrl: string;
};

type LogStep = (message: string, level?: "info" | "warn" | "error") => Promise<void>;

const operatorGatePatterns = [
  /log\s*in/i,
  /sign\s*in/i,
  /two[-\s]?factor/i,
  /\bmfa\b/i,
  /captcha/i,
  /verify\s+(your\s+)?identity/i,
  /account\s+recovery/i,
  /permission/i
];

const hardStopPatterns = [
  /billing/i,
  /paid\s+plan/i,
  /select\s+a\s+plan/i,
  /payment/i,
  /payout/i,
  /buy\s+domain/i,
  /connect\s+domain/i,
  /app\s+charge/i,
  /publish/i,
  /payments?\s+setup/i
];

function normalizeDomain(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? "";
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized) ? normalized : null;
}

function firstMatchedPattern(text: string, patterns: RegExp[]) {
  return patterns.find((pattern) => pattern.test(text))?.source ?? null;
}

function extractMyshopifyDomain(text: string, expectedShopDomain?: string | null) {
  const expected = normalizeDomain(expectedShopDomain);

  if (expected && text.toLowerCase().includes(expected)) {
    return expected;
  }

  return normalizeDomain(text.match(/\b[a-z0-9][a-z0-9-]*\.myshopify\.com\b/i)?.[0]);
}

export function shopifyDevDashboardBrowserSession() {
  const storageStatePath = env.SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH?.trim();
  const storageStateExists = storageStatePath ? existsSync(storageStatePath) : false;
  const storageStateStatus = storageStatePath
    ? storageStateExists ? "ready" : "missing"
    : "not_configured";

  return {
    contextOptions: storageStateStatus === "ready" ? { storageState: storageStatePath } : {},
    operatorOrSessionContext: storageStateStatus === "ready"
      ? "Governed Playwright task using operator-provided authenticated Shopify Dev Dashboard storage state."
      : storageStateStatus === "missing"
        ? "Governed Playwright task could not use configured Shopify Dev Dashboard storage state because the file is missing."
      : "Governed Playwright task using an ephemeral unauthenticated browser session.",
    storageStateConfigured: Boolean(storageStatePath),
    storageStateStatus
  };
}

function operatorContextForPhase(sessionContext: string, phase: string) {
  return `${sessionContext} ${phase}`;
}

export function classifyShopifyStoreCreationBrowserText(input: {
  expectedShopDomain?: string | null;
  text: string;
}) {
  const detectedDomain = extractMyshopifyDomain(input.text, input.expectedShopDomain);

  if (detectedDomain) {
    return {
      detectedDomain,
      hardStop: null,
      status: "capture_ready" as const
    };
  }

  const operatorGate = firstMatchedPattern(input.text, operatorGatePatterns);

  if (operatorGate) {
    return {
      detectedDomain: null,
      hardStop: operatorGate,
      status: "blocked_operator_gate" as const
    };
  }

  const hardStop = firstMatchedPattern(input.text, hardStopPatterns);

  if (hardStop) {
    return {
      detectedDomain: null,
      hardStop,
      status: "blocked_hard_stop" as const
    };
  }

  return {
    detectedDomain: null,
    hardStop: null,
    status: "no_domain_detected" as const
  };
}

function assertAllowedTaskTarget(task: ShopifyDevDashboardBrowserTask) {
  const parsed = assertSafePublicHttpUrl(task.targetUrl, "Shopify Dev Dashboard URL");
  const hostname = parsed.hostname.toLowerCase();
  const allowed = task.allowedDomains.map((domain) => domain.toLowerCase());

  if (!allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    throw new Error("Shopify Dev Dashboard browser task target is outside its allowed domains.");
  }

  return parsed.toString();
}

function receiptFor(input: {
  actualExternalActionsExecuted?: boolean;
  attemptedStepIds: string[];
  countryCode: string;
  detectedDomain: string | null;
  hardStop: string | null;
  operatorOrSessionContext: string;
  status: ShopifyStoreCreationBrowserTaskReceipt["status"];
  storeType: "client_transfer" | "development";
  targetUrl: string;
}): ShopifyStoreCreationBrowserTaskReceipt {
  const summary = input.status === "capture_ready"
    ? `Shopify Dev Dashboard browser task found ${input.detectedDomain}; capture can continue.`
    : input.status === "blocked_operator_gate"
      ? "Shopify Dev Dashboard browser task stopped at a login, verification, or permission gate."
      : input.status === "blocked_hard_stop"
        ? "Shopify Dev Dashboard browser task stopped at a billing, payment, domain, app-charge, or publishing gate."
        : input.status === "browser_unavailable"
          ? "Shopify Dev Dashboard browser task could not launch a browser in this environment."
          : "Shopify Dev Dashboard browser task finished without finding a final myshopify.com domain.";

  return {
    actualExternalActionsExecuted: Boolean(input.actualExternalActionsExecuted),
    attemptedStepIds: input.attemptedStepIds,
    autoCapture: null,
    autoCaptureError: null,
    browserTaskEvidence: {
      capturedAt: new Date().toISOString(),
      capturedFromTargetUrl: input.targetUrl,
      completedStepIds: input.detectedDomain ? input.attemptedStepIds : [],
      countryCode: input.countryCode,
      finalShopDomain: input.detectedDomain,
      operatorOrSessionContext: input.operatorOrSessionContext,
      source: "governed_browser_task" as const,
      storeType: input.storeType
    },
    detectedDomain: input.detectedDomain,
    externalExecution: Boolean(input.actualExternalActionsExecuted),
    hardStop: input.hardStop,
    mode: "Governed Shopify Dev Dashboard Browser Task Receipt" as const,
    providerContacted: input.status !== "browser_unavailable",
    status: input.status,
    summary,
    targetUrl: input.targetUrl
  };
}

async function withAutomaticStoreCreationCapture(input: {
  logStep: LogStep;
  payload: ShopifyStoreCreationBrowserTaskPayload;
  receipt: ShopifyStoreCreationBrowserTaskReceipt;
  userId: string;
}) {
  if (input.receipt.status !== "capture_ready" || !input.receipt.detectedDomain) {
    return input.receipt;
  }

  const store = await prisma.clientMerchStore.findFirst({
    where: {
      id: input.payload.storeId,
      userId: input.userId
    }
  });

  if (!store) {
    return {
      ...input.receipt,
      autoCaptureError: "Shopify store creation browser task store was not found."
    };
  }

  try {
    const captureInput = buildShopifyStoreCreationCaptureInputFromBrowserReceipt({
      payload: input.payload,
      receipt: input.receipt
    });
    const result = await captureShopifyStoreCreationForStore({
      store,
      userId: input.userId,
      value: captureInput
    });

    await input.logStep(`Captured Shopify store creation from browser task via audit ${result.auditLogId}.`);

    return {
      ...input.receipt,
      autoCapture: {
        auditLogId: result.auditLogId,
        autonomyResumeJobId: result.capture.autonomyResumeJob?.id ?? null,
        oauthStarted: Boolean(result.capture.oauth),
        status: result.capture.status,
        summary: result.capture.summary
      },
      autoCaptureError: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify store creation auto-capture failed.";

    await input.logStep(`Shopify store creation auto-capture could not run: ${message}`, "warn");

    return {
      ...input.receipt,
      autoCaptureError: message
    };
  }
}

export function buildShopifyStoreCreationCaptureInputFromBrowserReceipt(input: {
  payload: ShopifyStoreCreationBrowserTaskPayload;
  receipt: ShopifyStoreCreationBrowserTaskReceipt;
}) {
  if (input.receipt.status !== "capture_ready" || !input.receipt.detectedDomain) {
    throw new Error("Shopify store creation browser receipt is not ready for capture.");
  }

  return shopifyStoreCreationCaptureSchema.parse({
    browserTaskEvidence: {
      ...input.receipt.browserTaskEvidence,
      finalShopDomain: input.receipt.detectedDomain
    },
    confirm: shopifyStoreCreationCaptureConfirmation,
    countryCode: input.payload.countryCode,
    dryRun: false,
    note: "Captured automatically from the governed Shopify Dev Dashboard browser task.",
    queueAutonomyResume: true,
    requestedShopName: input.payload.requestedShopName,
    shopDomain: input.receipt.detectedDomain,
    startOAuth: true,
    storeType: input.payload.storeType
  });
}

export async function createShopifyStoreCreationBrowserTaskJob(input: {
  payload: ShopifyStoreCreationBrowserTaskPayload;
  scheduledAt?: Date | null;
  userId: string;
}) {
  const payload = shopifyStoreCreationBrowserTaskPayloadSchema.parse(input.payload);
  const scheduledAt = input.scheduledAt ?? null;
  const status = scheduledAt && scheduledAt.getTime() > Date.now() ? "scheduled" : "pending";

  return prisma.automationJob.create({
    data: {
      payloadJson: stringifySecureJson(payload),
      scheduledAt,
      status,
      type: shopifyStoreCreationBrowserTaskJobType,
      userId: input.userId,
      logs: {
        create: {
          message: status === "scheduled"
            ? "Shopify Dev Dashboard browser task scheduled"
            : "Shopify Dev Dashboard browser task queued"
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

async function attemptBrowserTask(payload: ShopifyStoreCreationBrowserTaskPayload, targetUrl: string, logStep: LogStep) {
  const attemptedStepIds: string[] = [];
  const session = shopifyDevDashboardBrowserSession();
  let actualExternalActionsExecuted = false;

  if (session.storageStateStatus === "missing") {
    await logStep("Configured Shopify Dev Dashboard browser storage state file is missing.", "warn");
    return receiptFor({
      attemptedStepIds,
      countryCode: payload.countryCode,
      detectedDomain: null,
      hardStop: null,
      operatorOrSessionContext: operatorContextForPhase(session.operatorOrSessionContext, "Browser did not launch."),
      status: "browser_unavailable",
      storeType: payload.storeType,
      targetUrl
    });
  }

  try {
    await logStep("Launching governed Shopify Dev Dashboard browser task");
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      headless: true,
      executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
    });

    try {
      if (session.storageStateConfigured) {
        await logStep("Using operator-provided authenticated Shopify Dev Dashboard browser storage state");
      }
      const context = await browser.newContext(session.contextOptions);

      try {
        const page = await context.newPage();
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        attemptedStepIds.push("open_dev_dashboard_stores");

        let text = await page.locator("body").innerText({ timeout: 8000 }).catch(() => "");
        let classification = classifyShopifyStoreCreationBrowserText({
          expectedShopDomain: payload.expectedShopDomain,
          text
        });

        if (classification.status !== "no_domain_detected") {
          return receiptFor({
            attemptedStepIds,
            countryCode: payload.countryCode,
            detectedDomain: classification.detectedDomain,
            hardStop: classification.hardStop,
            operatorOrSessionContext: operatorContextForPhase(session.operatorOrSessionContext, "Before form interaction."),
            status: classification.status,
            storeType: payload.storeType,
            targetUrl
          });
        }

        const createControl = page.getByRole("button", { name: /create store/i }).or(page.getByRole("link", { name: /create store/i })).first();
        if (await createControl.isVisible({ timeout: 3000 }).catch(() => false)) {
          await createControl.click();
          attemptedStepIds.push("open_create_store_form");
        }

        await page.getByText(payload.storeType === "client_transfer" ? /client transfer store/i : /development store/i).click({ timeout: 3000 }).then(() => {
          attemptedStepIds.push("select_store_type");
        }).catch(() => undefined);

        const storeNameInput = page.locator("input[name='name'], input[aria-label*='store name' i], input[placeholder*='store name' i]").first();
        if (await storeNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await storeNameInput.fill(payload.requestedShopName);
          attemptedStepIds.push("fill_store_name");
        }

        const countryInput = page.locator("select[name='country'], input[aria-label*='country' i]").first();
        if (await countryInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const tagName = await countryInput.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
          if (tagName === "select") {
            await countryInput.selectOption(payload.countryCode).catch(() => undefined);
          } else {
            await countryInput.fill(payload.countryCode).catch(() => undefined);
          }
          attemptedStepIds.push("select_country");
        }

        text = await page.locator("body").innerText({ timeout: 8000 }).catch(() => "");
        classification = classifyShopifyStoreCreationBrowserText({
          expectedShopDomain: payload.expectedShopDomain,
          text
        });

        if (classification.status === "blocked_operator_gate" || classification.status === "blocked_hard_stop" || classification.status === "capture_ready") {
          return receiptFor({
            attemptedStepIds,
            countryCode: payload.countryCode,
            detectedDomain: classification.detectedDomain,
            hardStop: classification.hardStop,
            operatorOrSessionContext: operatorContextForPhase(session.operatorOrSessionContext, "After form preparation."),
            status: classification.status,
            storeType: payload.storeType,
            targetUrl
          });
        }

        const finalCreate = page.getByRole("button", { name: /^create store$/i }).first();
        if (await finalCreate.isVisible({ timeout: 3000 }).catch(() => false)) {
          await finalCreate.click();
          actualExternalActionsExecuted = true;
          attemptedStepIds.push("create_store_and_capture_domain");
          await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => undefined);
        }

        text = await page.locator("body").innerText({ timeout: 8000 }).catch(() => "");
        classification = classifyShopifyStoreCreationBrowserText({
          expectedShopDomain: payload.expectedShopDomain,
          text
        });

        return receiptFor({
          actualExternalActionsExecuted,
          attemptedStepIds,
          countryCode: payload.countryCode,
          detectedDomain: classification.detectedDomain,
          hardStop: classification.hardStop,
          operatorOrSessionContext: operatorContextForPhase(session.operatorOrSessionContext, "After create-store attempt."),
          status: classification.status,
          storeType: payload.storeType,
          targetUrl
        });
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    await logStep(error instanceof Error ? error.message : "Shopify Dev Dashboard browser task could not run.", "warn");
    return receiptFor({
      attemptedStepIds,
      countryCode: payload.countryCode,
      detectedDomain: null,
      hardStop: null,
      operatorOrSessionContext: operatorContextForPhase(session.operatorOrSessionContext, "Browser unavailable or stopped before dashboard access."),
      status: "browser_unavailable",
      storeType: payload.storeType,
      targetUrl
    });
  }
}

export async function runShopifyStoreCreationBrowserTaskJob(
  job: { id: string; payloadJson: string; userId: string },
  logStep: LogStep
) {
  const payload = parseSecureJson<ShopifyStoreCreationBrowserTaskPayload>(job.payloadJson);

  if (!payload) {
    throw new Error("Shopify Dev Dashboard browser task payload is unreadable.");
  }

  const input = shopifyStoreCreationBrowserTaskPayloadSchema.parse(payload);
  const targetUrl = assertAllowedTaskTarget(input.browserTask);
  const browserReceipt = await attemptBrowserTask(input, targetUrl, logStep);
  const receipt = await withAutomaticStoreCreationCapture({
    logStep,
    payload: input,
    receipt: browserReceipt,
    userId: job.userId
  });
  const auditLog = await recordAuditLog({
    action: "shopify.store_creation_browser_task.completed",
    actorUserId: job.userId,
    metadata: {
      browserTask: input.browserTask,
      expectedShopDomain: input.expectedShopDomain ?? null,
      receipt,
      storeId: input.storeId
    },
    outcome: receipt.status === "capture_ready" ? "success" : "failure",
    severity: receipt.status === "capture_ready" ? "medium" : "low",
    targetId: input.storeId,
    targetType: "shopify_store_creation_browser_task"
  });

  await logStep(receipt.summary, receipt.status === "capture_ready" ? "info" : "warn");

  return {
    auditLogId: auditLog.id,
    receipt
  };
}

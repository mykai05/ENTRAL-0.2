import { env } from "../env.js";
import { scrapePayloadSchema, type ScrapePayload } from "../schemas.js";
import { runShopifyAutonomyResumeJob, shopifyAutonomyResumeJobType } from "./shopifyAutonomyJobs.js";
import { runShopifyStoreCreationBrowserTaskJob, shopifyStoreCreationBrowserTaskJobType } from "./shopifyStoreCreationBrowserTask.js";
import { runShopifyStoreCreationHandoffJob, shopifyStoreCreationHandoffJobType } from "./shopifyStoreCreationHandoffJobs.js";
import { safeOutboundHttpRequest } from "./safeOutboundHttp.js";
import { assertSafePublicHttpUrl } from "./urlSafety.js";

export type AutomationJobRecord = {
  authorizationVersion: number;
  id: string;
  type: string;
  payloadJson: string;
  userId: string;
};

export type AutomationResult = Record<string, unknown>;

type LogStep = (message: string, level?: "info" | "warn" | "error") => Promise<void>;

function allowedHosts() {
  return env.AUTOMATION_ALLOWED_DOMAINS
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function assertAllowedAutomationUrl(rawUrl: string) {
  const parsed = assertSafePublicHttpUrl(rawUrl, "Automation URL");

  const allowed = allowedHosts();
  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = allowed.includes("*") || allowed.some((host) => hostname === host || hostname.endsWith(`.${host}`));

  if (!isAllowed) {
    throw new Error("This domain is not allowed for automation tasks.");
  }

  return parsed;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSimpleSelector(html: string, selector?: string) {
  if (!selector) {
    return stripHtml(html);
  }

  if (/^[a-z][a-z0-9-]*$/i.test(selector)) {
    const match = html.match(new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, "i"));
    return match ? stripHtml(match[1] ?? "") : "";
  }

  return stripHtml(html);
}

async function scrapeWithHttpFallback(payload: ScrapePayload, startedAt: number): Promise<AutomationResult> {
  const response = await safeOutboundHttpRequest(payload.url, {
    maxRedirects: 0,
    maxResponseBytes: 250_000,
    timeoutMs: 15_000,
    validateUrl: (url) => assertAllowedAutomationUrl(url.toString())
  });
  const content = extractSimpleSelector(response.body.toString("utf8"), payload.selector).slice(0, 10000);

  return {
    engine: "http-fallback",
    url: payload.url,
    selector: payload.selector ?? null,
    statusCode: response.status,
    content,
    durationMs: Date.now() - startedAt
  };
}

async function runScrapeTask(payload: ScrapePayload, logStep: LogStep): Promise<AutomationResult> {
  const startedAt = Date.now();
  assertAllowedAutomationUrl(payload.url);

  try {
    await logStep("Launching browser");
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      args: [
        "--host-resolver-rules=MAP * ~NOTFOUND",
        "--proxy-server=http://127.0.0.1:9",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--webrtc-ip-handling-policy=disable_non_proxied_udp"
      ],
      headless: true,
      executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
    });

    try {
      await logStep("Creating an isolated browser context with all outbound HTTP routed through the vetted connector");
      const context = await browser.newContext({ serviceWorkers: "block" });

      await logStep("Opening target URL");

      try {
        await context.route("**/*", async (route) => {
          const request = route.request();

          try {
            const response = await safeOutboundHttpRequest(request.url(), {
              body: request.postDataBuffer(),
              headers: request.headers(),
              maxRedirects: 0,
              maxRequestBytes: 1_000_000,
              maxResponseBytes: 250_000,
              method: request.method(),
              timeoutMs: 15_000,
              validateUrl: (url) => assertAllowedAutomationUrl(url.toString())
            });
            const headers = Object.fromEntries(Object.entries(response.headers).filter(([name]) => ![
              "connection",
              "content-length",
              "transfer-encoding"
            ].includes(name.toLowerCase())));

            await route.fulfill({
              body: response.body,
              headers,
              status: response.status
            });
          } catch {
            await route.abort("blockedbyclient");
          }
        });
        await context.routeWebSocket(/.*/, async (webSocket) => {
          await webSocket.close({ code: 1008, reason: "Outbound WebSockets are disabled for automation scraping." });
        });
        const page = await context.newPage();
        await page.goto(payload.url, { waitUntil: "domcontentloaded", timeout: 15000 });

        const title = await page.title().catch(() => "");
        const content = payload.selector
          ? await page.locator(payload.selector).first().textContent({ timeout: 8000 })
          : await page.locator("body").innerText({ timeout: 8000 });

        await logStep("Scrape completed");

        return {
          engine: "playwright",
          url: payload.url,
          selector: payload.selector ?? null,
          title,
          content: (content ?? "").slice(0, 10000),
          durationMs: Date.now() - startedAt,
          isolationModel: "ephemeral-browser-context"
        };
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (!env.AUTOMATION_LOCAL_FALLBACK) {
      throw error;
    }

    await logStep("Browser unavailable; using local HTTP fallback", "warn");
    return scrapeWithHttpFallback(payload, startedAt);
  }
}

export async function executeAutomationJob(job: AutomationJobRecord, logStep: LogStep): Promise<AutomationResult> {
  if (!env.AUTOMATION_FEATURE_ENABLED) {
    throw new Error("Automation processing is disabled.");
  }

  if (job.type === shopifyAutonomyResumeJobType) {
    return runShopifyAutonomyResumeJob(job, logStep);
  }

  if (job.type === shopifyStoreCreationHandoffJobType) {
    return runShopifyStoreCreationHandoffJob(job, logStep);
  }

  if (job.type === shopifyStoreCreationBrowserTaskJobType) {
    return runShopifyStoreCreationBrowserTaskJob(job, logStep);
  }

  if (job.type !== "scrape") {
    throw new Error("Unsupported automation type.");
  }

  const payload = scrapePayloadSchema.parse(JSON.parse(job.payloadJson));
  return runScrapeTask(payload, logStep);
}

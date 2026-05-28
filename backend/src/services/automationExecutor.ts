import { env } from "../env.js";
import { scrapePayloadSchema, type ScrapePayload } from "../schemas.js";
import { assertSafePublicHttpUrl } from "./urlSafety.js";

export type AutomationJobRecord = {
  id: string;
  type: string;
  payloadJson: string;
};

export type AutomationResult = Record<string, string | number | null>;

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

async function responseTextWithLimit(response: Response, limitBytes = 250000) {
  if (!response.body) {
    return (await response.text()).slice(0, limitBytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";

  while (size < limitBytes) {
    const { done, value } = await reader.read();

    if (done || !value) {
      break;
    }

    size += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }

  await reader.cancel().catch(() => undefined);
  return `${text}${decoder.decode()}`.slice(0, limitBytes);
}

async function scrapeWithHttpFallback(payload: ScrapePayload, startedAt: number): Promise<AutomationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(payload.url, { signal: controller.signal });
    const html = await responseTextWithLimit(response);
    const content = extractSimpleSelector(html, payload.selector).slice(0, 10000);

    return {
      engine: "http-fallback",
      url: payload.url,
      selector: payload.selector ?? null,
      statusCode: response.status,
      content,
      durationMs: Date.now() - startedAt
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runScrapeTask(payload: ScrapePayload, logStep: LogStep): Promise<AutomationResult> {
  const startedAt = Date.now();
  assertAllowedAutomationUrl(payload.url);

  try {
    await logStep("Launching browser");
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      headless: true,
      executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
    });

    try {
      const page = await browser.newPage();
      await logStep("Opening target URL");
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
        durationMs: Date.now() - startedAt
      };
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

  if (job.type !== "scrape") {
    throw new Error("Unsupported automation type.");
  }

  const payload = scrapePayloadSchema.parse(JSON.parse(job.payloadJson));
  return runScrapeTask(payload, logStep);
}

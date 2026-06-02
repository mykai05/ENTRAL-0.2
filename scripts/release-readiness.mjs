import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveUrl = process.env.ENTRAL_LIVE_URL ?? "https://entral-0-2-frontend.vercel.app";
const strictLive = process.env.RELEASE_CHECK_STRICT_LIVE === "1";

const approvedPositioning =
  "An AI command center for organizing, planning, monitoring, and safely preparing business operations";

const requiredChecks = [
  {
    file: "frontend/app/page.tsx",
    label: "Public landing uses approved positioning",
    text: approvedPositioning
  },
  {
    file: "frontend/app/page.tsx",
    label: "Public landing shows real/mock/read-only promise",
    text: "Real / Mock / Read-only labels"
  },
  {
    file: "frontend/components/PublicBetaBrief.tsx",
    label: "Public beta brief explains external approval gate",
    text: "External posting, commerce updates, outreach, and ad work require human approval."
  },
  {
    file: "frontend/components/PublicBetaBrief.tsx",
    label: "Public beta brief explains permission, logging, and cost guardrails",
    text: "Sensitive actions are permission-checked, logged, and designed for cost limits."
  },
  {
    file: "frontend/components/MerchOperationsPanel.tsx",
    label: "Growth UI exposes read-only orchestration preview",
    text: "Read-only orchestration preview generated. No external systems were contacted."
  },
  {
    file: "backend/src/services/growthPlans.ts",
    label: "Growth approval packets require human approval",
    text: "humanApprovalRequired: true"
  },
  {
    file: "backend/src/services/growthPlans.ts",
    label: "Growth orchestration never contacts external systems",
    text: "No social, Shopify, ad, or analytics system was contacted."
  },
  {
    file: "backend/src/services/growthPlans.ts",
    label: "Growth orchestration keeps external spend at zero",
    text: "estimatedExternalSpendCents: 0"
  },
  {
    file: "backend/src/services/growthPlans.ts",
    label: "Growth orchestration marks external execution false",
    text: "externalExecution: false"
  },
  {
    file: "backend/src/routes/merchStores.ts",
    label: "Backend exposes locked orchestration preview route",
    text: "growth-approvals/:packetId/orchestration-preview"
  },
  {
    file: "backend/src/dev-memory-server.ts",
    label: "Local memory backend mirrors locked orchestration preview route",
    text: "growth-approvals/:packetId/orchestration-preview"
  },
  {
    file: "e2e/entral.e2e.mjs",
    label: "E2E verifies approved positioning",
    text: approvedPositioning
  },
  {
    file: "package.json",
    label: "Package exposes browser smoke test",
    text: "\"test:e2e\""
  },
  {
    file: "package.json",
    label: "Package exposes release readiness check",
    text: "\"release:check\""
  }
];

const forbiddenPatterns = [
  { label: "dark web", pattern: /\bdark web\b/i },
  { label: "Tor", pattern: /\bTor\b/ },
  { label: "full autonomy", pattern: /\bfull autonomy\b/i },
  { label: "runs your entire business", pattern: /\bruns your entire business\b/i },
  { label: "automated Shopify", pattern: /\bautomated Shopify\b/i },
  { label: "Shopify launching", pattern: /\bShopify launching\b/i },
  { label: "autonomous", pattern: /\bautonomous\b/i }
];

const scanRoots = [
  "README.md",
  "DEPLOYMENT.md",
  "frontend/app",
  "frontend/components",
  "frontend/lib",
  "backend/src",
  "e2e"
];

const skipSegments = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
  "tests"
]);

const textFileExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx"
]);

function toRelative(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

async function readProjectFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

async function walkFiles(entry) {
  const absolute = path.join(rootDir, entry);
  const files = [];

  async function walk(current) {
    const name = path.basename(current);
    if (skipSegments.has(name)) return;

    const entries = await readdir(current, { withFileTypes: true }).catch(async (error) => {
      if (error.code === "ENOTDIR") {
        const extension = path.extname(current);
        if (textFileExtensions.has(extension)) files.push(current);
        return [];
      }
      throw error;
    });

    for (const child of entries) {
      const next = path.join(current, child.name);
      if (child.isDirectory()) {
        await walk(next);
      } else if (child.isFile() && textFileExtensions.has(path.extname(child.name))) {
        files.push(next);
      }
    }
  }

  await walk(absolute);
  return files;
}

async function runRequiredChecks() {
  const failures = [];
  const passes = [];

  for (const check of requiredChecks) {
    const content = await readProjectFile(check.file);
    if (content.includes(check.text)) {
      passes.push(check.label);
    } else {
      failures.push(`${check.label} (${check.file})`);
    }
  }

  return { failures, passes };
}

async function runForbiddenCopyScan() {
  const findings = [];
  const files = (await Promise.all(scanRoots.map((entry) => walkFiles(entry)))).flat();

  for (const file of files) {
    const relative = toRelative(file);
    const content = await readFile(file, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const forbidden of forbiddenPatterns) {
        if (forbidden.pattern.test(line)) {
          findings.push({
            file: relative,
            line: index + 1,
            label: forbidden.label,
            text: line.trim()
          });
        }
      }
    });
  }

  return findings;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkLiveDeployment() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(liveUrl, {
      headers: { "user-agent": "entral-release-readiness/1.0" },
      signal: controller.signal
    });
    const html = await response.text();
    const text = stripHtml(html);
    const checks = [
      {
        label: "approved positioning",
        passed: text.includes(approvedPositioning)
      },
      {
        label: "external approval gate",
        passed: text.includes("External posting, commerce updates, outreach, and ad work require human approval.")
      },
      {
        label: "mode labels",
        passed: text.includes("Mock") && text.includes("Read-only")
      }
    ];

    return {
      checks,
      ok: response.ok && checks.every((check) => check.passed),
      status: response.status,
      url: liveUrl
    };
  } catch (error) {
    return {
      checks: [],
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      status: null,
      url: liveUrl
    };
  } finally {
    clearTimeout(timeout);
  }
}

function printHeading(title) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

const required = await runRequiredChecks();
const forbidden = await runForbiddenCopyScan();
const live = await checkLiveDeployment();

printHeading("Local release readiness");
for (const label of required.passes) {
  console.log(`PASS ${label}`);
}

if (required.failures.length) {
  for (const failure of required.failures) {
    console.log(`FAIL ${failure}`);
  }
}

printHeading("Forbidden positioning scan");
if (forbidden.length) {
  for (const finding of forbidden) {
    console.log(`FAIL ${finding.file}:${finding.line} contains "${finding.label}": ${finding.text}`);
  }
} else {
  console.log("PASS No forbidden launch-positioning phrases found in public source/docs.");
}

printHeading("Live deployment drift");
if (live.error) {
  console.log(`WARN ${live.url} could not be checked: ${live.error}`);
} else {
  console.log(`${live.ok ? "PASS" : "WARN"} ${live.url} responded with HTTP ${live.status}.`);
  for (const check of live.checks) {
    if (check.passed) {
      console.log(`PASS Live site includes ${check.label}.`);
    } else {
      console.log(`WARN Live site is missing ${check.label}.`);
    }
  }
}

const hardFailures = [...required.failures, ...forbidden.map((finding) => `${finding.file}:${finding.line}`)];
const liveFailure = !live.ok;

if (hardFailures.length || (strictLive && liveFailure)) {
  if (strictLive && liveFailure) {
    console.log("\nFAIL Strict live deployment check is enabled and the live site is not ready.");
  }
  process.exitCode = 1;
} else if (liveFailure) {
  console.log("\nWARN Local release checks passed, but the live deployment is behind or unreachable.");
} else {
  console.log("\nPASS Local release checks passed and the live deployment matches the launch gate.");
}

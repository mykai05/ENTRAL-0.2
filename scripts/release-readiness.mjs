import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findForbiddenPositioning, publicPositioningRoots } from "./release-positioning.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveUrl = process.env.ENTRAL_LIVE_URL ?? "https://entral-0-2-frontend.vercel.app";
const strictLive = process.env.RELEASE_CHECK_STRICT_LIVE === "1";

const requiredChecks = [
  {
    file: "frontend/app/page.tsx",
    label: "Root URL enters the protected member dashboard",
    text: "redirect(\"/member/dashboard\")"
  },
  {
    file: "frontend/middleware.ts",
    label: "Retired account routes fail closed into member sign-in",
    text: "url.pathname = \"/member/sign-in\""
  },
  {
    file: "frontend/components/DashboardClient.tsx",
    label: "Unauthorized dashboard sessions return to member sign-in",
    text: "router.push(memberSignInPath"
  },
  {
    file: "frontend/components/MemberCommandCenterClient.tsx",
    label: "Member command center selects restricted member chrome",
    text: "surface=\"member\""
  },
  {
    file: "frontend/components/MemberDestinationNav.tsx",
    label: "Member navigation keeps the canonical three destinations",
    text: "OPEN UNIVERSE GRAPH"
  },
  {
    file: "frontend/components/NeuronsCommandCenter.tsx",
    label: "Command center keeps visible operating-mode status",
    text: "Command center mode status"
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
    label: "E2E verifies protected member entry",
    text: "root URL opens protected member sign-in"
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
  const files = (await Promise.all(publicPositioningRoots.map((entry) => walkFiles(entry)))).flat();

  for (const file of files) {
    const relative = toRelative(file);
    const content = await readFile(file, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const forbidden of findForbiddenPositioning(line)) {
        findings.push({
          file: relative,
          line: index + 1,
          label: forbidden.label,
          text: line.trim()
        });
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
    const finalUrl = new URL(response.url);
    const checks = [
      {
        label: "protected member sign-in route",
        passed: finalUrl.pathname === "/member/sign-in"
      },
      {
        label: "secure member access shell",
        passed: text.includes("Sign in to Entral") && text.includes("Secure member access")
      },
      {
        label: "no account-creation prompt",
        passed: !/create verified account|private beta brief/i.test(text)
      }
    ];

    return {
      checks,
      ok: response.ok && checks.every((check) => check.passed),
      finalUrl: response.url,
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
  if (live.finalUrl && live.finalUrl !== live.url) {
    console.log(`${live.ok ? "PASS" : "WARN"} Live request resolved to ${live.finalUrl}.`);
  }
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

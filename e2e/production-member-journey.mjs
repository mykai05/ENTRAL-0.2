import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import process from "node:process";

const frontendUrl = process.env.E2E_FRONTEND_URL ?? "https://entral-0-2-frontend.vercel.app";
const memberToken = process.env.E2E_MEMBER_TOKEN;
const organizationId = process.env.E2E_MEMBER_ORGANIZATION_ID;
const deployedCommitSha = process.env.E2E_DEPLOYED_COMMIT_SHA;
const migratedStateReceiptSha256 = process.env.E2E_MIGRATED_STATE_RECEIPT_SHA256;
const receiptPath = process.env.E2E_PRODUCTION_JOURNEY_RECEIPT;
if (
  !memberToken || !organizationId || !deployedCommitSha
  || !/^[a-f0-9]{40}$/.test(deployedCommitSha)
  || !migratedStateReceiptSha256 || !/^[a-f0-9]{64}$/.test(migratedStateReceiptSha256)
) {
  throw new Error("Production member journey requires a short-lived member token, organization ID, exact deployed commit SHA, and migrated-state receipt hash.");
}

const require = createRequire(new URL("../backend/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const fs = require("node:fs");

function browserExecutable() {
  return [
    process.env.E2E_BROWSER_EXECUTABLE,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    `${process.env.ProgramFiles ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    "/usr/bin/google-chrome"
  ].filter(Boolean).find((candidate) => {
    try {
      fs.accessSync(candidate);
      return true;
    } catch {
      return false;
    }
  });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stableValue(value))).digest("hex");
}

async function expectVisible(locator, label, timeout = 30_000) {
  await locator.waitFor({ state: "visible", timeout }).catch((error) => {
    throw new Error(`${label} was not visible: ${error instanceof Error ? error.message : String(error)}`);
  });
}

async function assertNoCanonicalSyncError(page, label) {
  const workspaceErrors = await page.locator(".phase180-workspace-error").count();
  const blockedStatus = await page.locator(".phase180-sync-status").filter({ hasText: "Canonical sync blocked" }).count();
  if (workspaceErrors || blockedStatus) throw new Error(`${label} reported a canonical synchronization error.`);
}

async function readJson(response, label, expectedStatus = 200) {
  if (response.status() !== expectedStatus) {
    throw new Error(`${label} returned HTTP ${response.status()}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

function canonicalIds(value, label) {
  const ids = (value ?? "").split(",").filter(Boolean).sort();
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate canonical identifiers.`);
  return ids;
}

async function rendererSnapshot(renderer, label, { requireWebGl = false } = {}) {
  await expectVisible(renderer, label, 60_000);
  const entityIds = canonicalIds(await renderer.getAttribute("data-canonical-entity-ids"), `${label} entities`);
  const edgeIds = canonicalIds(await renderer.getAttribute("data-canonical-edge-ids"), `${label} edges`);
  const entityCount = Number(await renderer.getAttribute("data-canonical-entity-count"));
  const edgeCount = Number(await renderer.getAttribute("data-canonical-edge-count"));
  const eventSequence = Number(await renderer.getAttribute("data-canonical-event-sequence"));
  const selectedEntityId = await renderer.getAttribute("data-canonical-selected-entity-id");
  if (entityCount < 2 || edgeCount < 1 || entityIds.length !== entityCount || edgeIds.length !== edgeCount) {
    throw new Error(`${label} did not render a nonempty internally consistent canonical graph.`);
  }
  if (requireWebGl) {
    await expectVisible(renderer.locator('[data-graph-webgl-state="ready"]'), `${label} ready WebGL renderer`, 60_000);
    await expectVisible(renderer.getByLabel(/Canonical 3D Universe Graph with \d+ entities/i), `${label} WebGL canvas`, 60_000);
    if (await renderer.locator(".command-center-webgl-error").count()) {
      throw new Error(`${label} reported WebGL failure or a substitute renderer state.`);
    }
  }
  return {
    edge_count: edgeCount,
    edge_set_sha256: sha256(edgeIds),
    entity_count: entityCount,
    entity_set_sha256: sha256(entityIds),
    event_sequence: eventSequence,
    selected_entity_id: selectedEntityId
  };
}

function assertRendererParity(left, right, label) {
  if (
    left.entity_set_sha256 !== right.entity_set_sha256
    || left.edge_set_sha256 !== right.edge_set_sha256
    || left.event_sequence !== right.event_sequence
    || left.selected_entity_id !== right.selected_entity_id
  ) {
    throw new Error(`${label} did not preserve exact canonical node, edge, event, and selection state.`);
  }
}

const executablePath = browserExecutable();
if (!executablePath) throw new Error("A Chrome-compatible browser is required for production member acceptance.");
const browser = await chromium.launch({ executablePath, headless: process.env.E2E_HEADED !== "true" });
const origin = new URL(frontendUrl).origin;
const widths = [360, 390, 412, 430, 1440];
const observed = [];
let projection;
let portfolio;
let membershipEvidence;

try {
  const apiContext = await browser.newContext();
  await apiContext.addCookies([{
    httpOnly: true,
    name: process.env.E2E_COOKIE_NAME ?? "entral_token",
    sameSite: "Lax",
    secure: new URL(origin).protocol === "https:",
    url: origin,
    value: memberToken
  }]);
  const currentAccount = await readJson(await apiContext.request.get(`${origin}/api/v1/me`), "Current migrated member account");
  const memberOrganizations = await readJson(
    await apiContext.request.get(`${origin}/api/v1/member/organizations`),
    "Current migrated member organization inventory"
  );
  const currentTeam = currentAccount.teams?.find((team) => team.id === organizationId);
  const currentMembership = memberOrganizations.organizations?.find((organization) => organization.id === organizationId);
  if (
    !currentAccount.user?.id || !currentTeam?.tenantId || !currentTeam?.organizationId
    || !currentMembership?.joinedAt || !["OWNER", "MEMBER"].includes(currentMembership.role)
  ) {
    throw new Error("Production journey is not bound to the nominated existing migrated member organization.");
  }
  membershipEvidence = {
    joined_at: currentMembership.joinedAt,
    organization_id: currentTeam.organizationId,
    role: currentMembership.role,
    team_id: organizationId,
    tenant_id: currentTeam.tenantId,
    user_id: currentAccount.user.id
  };
  const memberBase = `${origin}/api/v1/member/organizations/${encodeURIComponent(organizationId)}`;
  portfolio = await readJson(await apiContext.request.get(`${memberBase}/portfolio/summary`), "Portfolio summary");
  const hierarchy = await readJson(await apiContext.request.get(`${memberBase}/hierarchy`), "Hierarchy");
  await readJson(await apiContext.request.get(`${memberBase}/entral/conversation`), "ENTRAL conversation");
  projection = await readJson(await apiContext.request.get(`${memberBase}/graph/projection`), "Graph projection");
  await readJson(await apiContext.request.get(`${memberBase}/graph/preferences`), "Graph preferences");
  await readJson(await apiContext.request.get(`${memberBase}/events?afterSequence=0`), "Canonical events");
  await readJson(
    await apiContext.request.get(`${memberBase}/entities/${encodeURIComponent(projection.root_id)}/full`),
    "Canonical root full record"
  );
  if (portfolio.businesses.length) {
    await readJson(
      await apiContext.request.get(`${memberBase}/businesses/${encodeURIComponent(portfolio.businesses[0].business_id)}/full`),
      "Canonical business full record"
    );
  } else {
    await readJson(
      await apiContext.request.get(`${memberBase}/businesses/00000000-0000-4000-8000-000000000000/full`),
      "Absent canonical business full record",
      404
    );
  }
  await readJson(
    await apiContext.request.get(`${memberBase}/interaction/tutorial-progress`),
    "Tutorial progress"
  );
  await readJson(await apiContext.request.post(`${memberBase}/interaction/analytics`, {
    data: {
      contract_version: "1.0.0",
      control_id: "production-member-journey",
      event_id: randomUUID(),
      event_type: "HELP_USED",
      occurred_at: new Date().toISOString(),
      reason_code: "RELEASE_ACCEPTANCE",
      route: "/member/graph",
      schema_version: 1
    }
  }), "Tenant-bound interaction analytics", 202);

  if (!Array.isArray(projection.entities) || projection.entities.length < 2) {
    throw new Error("Production projection did not contain actual canonical nodes.");
  }
  if (!Array.isArray(projection.edges) || projection.edges.length < 1) {
    throw new Error("Production projection did not contain actual canonical edges.");
  }
  const nodeIds = new Set(projection.entities.map((entity) => entity.entity_id));
  const roots = projection.entities.filter((entity) => entity.parent_id === null && entity.entity_type === "ENTRAL");
  if (roots.length !== 1 || roots[0].entity_id !== projection.root_id) {
    throw new Error("Production projection did not expose exactly one canonical ENTRAL root.");
  }
  if (projection.edges.some((edge) => !nodeIds.has(edge.source_id) || !nodeIds.has(edge.target_id))) {
    throw new Error("Production projection contains an edge outside the authorized node set.");
  }
  if (projection.projection_version !== hierarchy.event_sequence) {
    throw new Error("Production graph projection version is not aligned to the hierarchy event sequence.");
  }
  await apiContext.close();

  for (const width of widths) {
    const mobile = width < 1024;
    const context = await browser.newContext({
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      viewport: { width, height: mobile ? 844 : 1000 }
    });
    await context.addCookies([{
      httpOnly: true,
      name: process.env.E2E_COOKIE_NAME ?? "entral_token",
      sameSite: "Lax",
      secure: new URL(origin).protocol === "https:",
      url: origin,
      value: memberToken
    }]);
    const page = await context.newPage();
    try {
      await page.goto(`${origin}/member/dashboard`, { waitUntil: "domcontentloaded" });
      const navigation = page.getByRole("navigation", { name: /primary destinations/i });
      await expectVisible(navigation, `${width}px primary navigation`);
      await expectVisible(page.locator(".phase170-portfolio"), `${width}px Command canonical portfolio`);
      await assertNoCanonicalSyncError(page, `${width}px Command`);

      await navigation.getByRole("link", { name: "Businesses" }).click();
      await expectVisible(page.getByRole("heading", { name: "Canonical portfolio" }), `${width}px Businesses`);
      await assertNoCanonicalSyncError(page, `${width}px Businesses`);

      await navigation.getByRole("link", { name: "Universe" }).click();
      await page.waitForURL(/\/member\/graph/);
      const workspace = page.locator(".phase180-graph-workspace");
      await expectVisible(workspace, `${width}px Universe workspace`, 45_000);
      await page.waitForFunction(({ nodes, version }) => {
        const element = document.querySelector(".phase180-graph-workspace");
        return Number(element?.getAttribute("data-authorized-projection-entity-count")) === nodes
          && Number(element?.getAttribute("data-canonical-entity-count")) >= 1
          && Number(element?.getAttribute("data-canonical-event-sequence")) === version;
      }, { nodes: projection.entities.length, version: projection.projection_version });
      await assertNoCanonicalSyncError(page, `${width}px Universe`);
      const parityKey = await workspace.getAttribute("data-graph-parity-key");
      const eventSequence = await workspace.getAttribute("data-canonical-event-sequence");
      if (!parityKey || Number(eventSequence) !== projection.projection_version) {
        throw new Error(`${width}px Universe did not bind canonical projection parity and version.`);
      }

      const twoD = page.locator('.phase180-graph-2d[data-graph-dimension="2d"]');
      await expectVisible(twoD, `${width}px 2D projection`, 45_000);
      const twoDCanvas = page.getByLabel(/Canonical Universe Graph with \d+ entities/i);
      await expectVisible(twoDCanvas, `${width}px canonical 2D canvas`, 45_000);
      if (!await twoD.getAttribute("data-canonical-selected-entity-id")) {
        await twoDCanvas.focus();
        await page.keyboard.press("Enter");
      }
      await page.waitForFunction(() => Boolean(document.querySelector('[data-graph-dimension="2d"]')
        ?.getAttribute("data-canonical-selected-entity-id")));
      if (
        Number(await workspace.getAttribute("data-canonical-entity-count")) < 2
        || Number(await workspace.getAttribute("data-canonical-edge-count")) < 1
      ) {
        const expand = mobile
          ? page.getByRole("toolbar", { name: "Compact mobile Universe controls" }).getByRole("button", { name: "Expand" })
          : page.getByRole("button", { name: "Expand descendants" });
        await expand.click();
        await page.waitForFunction(() => {
          const element = document.querySelector(".phase180-graph-workspace");
          return Number(element?.getAttribute("data-canonical-entity-count")) >= 2
            && Number(element?.getAttribute("data-canonical-edge-count")) >= 1;
        });
      }
      const twoDSnapshot = await rendererSnapshot(twoD, `${width}px 2D projection`);

      let threeDSnapshot;
      if (mobile) {
        if (await workspace.getAttribute("data-mobile-presentation") !== "single-renderer") {
          throw new Error(`${width}px Universe did not use the mobile single-renderer presentation.`);
        }
        const toolbar = page.getByRole("toolbar", { name: "Compact mobile Universe controls" });
        await expectVisible(toolbar, `${width}px compact Universe toolbar`);
        await toolbar.getByRole("button", { name: "3D" }).click();
        const threeD = page.locator('.phase180-graph-3d[data-graph-dimension="3d"]');
        await expectVisible(threeD, `${width}px 3D projection`, 60_000);
        threeDSnapshot = await rendererSnapshot(threeD, `${width}px 3D projection`, { requireWebGl: true });
        assertRendererParity(twoDSnapshot, threeDSnapshot, `${width}px 2D to 3D switch`);
        if (
          await workspace.getAttribute("data-graph-parity-key") !== parityKey
          || threeDSnapshot.selected_entity_id !== twoDSnapshot.selected_entity_id
        ) {
          throw new Error(`${width}px 2D to 3D switch did not preserve canonical graph state.`);
        }
        await toolbar.getByRole("button", { name: "2D" }).click();
        await expectVisible(twoD, `${width}px 2D projection return`, 45_000);
        const returnedTwoD = await rendererSnapshot(twoD, `${width}px returned 2D projection`);
        assertRendererParity(twoDSnapshot, returnedTwoD, `${width}px 3D to 2D switch`);
      } else {
        if (
          await workspace.getAttribute("data-mobile-presentation") !== "desktop-dual"
          || await workspace.locator(".phase180-graph-panel").count() !== 2
        ) {
          throw new Error("Desktop Universe did not preserve the side-by-side 2D and 3D presentation.");
        }
        const threeD = page.locator('.phase180-graph-3d[data-graph-dimension="3d"]');
        threeDSnapshot = await rendererSnapshot(threeD, `${width}px desktop 3D projection`, { requireWebGl: true });
        assertRendererParity(twoDSnapshot, threeDSnapshot, `${width}px desktop 2D and 3D renderers`);
      }

      await navigation.getByRole("link", { name: "Infrastructure" }).click();
      await expectVisible(page.getByRole("heading", { name: "Infrastructure" }), `${width}px Infrastructure`);
      await assertNoCanonicalSyncError(page, `${width}px Infrastructure`);

      await page.getByRole("navigation", { name: /primary destinations/i })
        .getByRole("link", { name: "Tutorial" }).click();
      const academy = page.getByRole("dialog", { name: "ENTRAL Academy" });
      await expectVisible(academy, `${width}px Tutorial`, 30_000);
      await academy.locator(".academy-sync-status").filter({ hasText: /Server progress synced/ })
        .waitFor({ state: "visible", timeout: 30_000 });
      if ((await academy.innerText()).includes("Tutorial progress is unavailable")) {
        throw new Error(`${width}px Tutorial did not load its server-backed state.`);
      }

      observed.push({
        desktop_side_by_side: !mobile,
        edge_count: twoDSnapshot.edge_count,
        edge_set_sha256: twoDSnapshot.edge_set_sha256,
        entity_count: twoDSnapshot.entity_count,
        entity_set_sha256: twoDSnapshot.entity_set_sha256,
        event_sequence: twoDSnapshot.event_sequence,
        mobile_single_renderer: mobile,
        renderer_parity_verified: true,
        renderer_state_preserved: true,
        sync_errors: 0,
        three_d_loaded: Boolean(threeDSnapshot),
        two_d_loaded: true,
        viewport_width: width
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const receipt = {
  canonical_edge_count: projection.edges.length,
  canonical_edge_set_sha256: sha256(projection.edges.map((edge) => edge.edge_id).sort()),
  canonical_node_count: projection.entities.length,
  canonical_node_set_sha256: sha256(projection.entities.map((entity) => entity.entity_id).sort()),
  canonical_sync_errors: 0,
  contract_version: "1.0.0",
  deployed_commit_sha: deployedCommitSha,
  destinations: ["COMMAND", "BUSINESSES", "UNIVERSE_2D", "UNIVERSE_3D", "INFRASTRUCTURE", "TUTORIAL"],
  environment: "PRODUCTION",
  membership_provenance_sha256: sha256(membershipEvidence),
  migrated_state_receipt_sha256: migratedStateReceiptSha256,
  observed_at: new Date().toISOString(),
  receipt_id: "P203-PRODUCTION-MEMBER-JOURNEY-001",
  renderer_state_preserved: true,
  route_interception: false,
  schema_version: 1,
  session_scope: "MIGRATED_MEMBER",
  session_subject_sha256: sha256(membershipEvidence.user_id),
  status: "PASSED",
  tenant_scope_sha256: sha256(membershipEvidence.tenant_id),
  organization_scope_sha256: sha256(membershipEvidence.organization_id),
  viewport_observations: observed,
  viewport_widths: widths
};
const receiptWithHash = { ...receipt, receipt_sha256: sha256(receipt) };
if (receiptPath) {
  const output = resolve(receiptPath);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receiptWithHash, null, 2)}\n`, "utf8");
}
process.stdout.write(`${JSON.stringify(receiptWithHash, null, 2)}\n`);

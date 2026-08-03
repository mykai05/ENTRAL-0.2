import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const frontendUrl = process.env.E2E_FRONTEND_URL ?? "https://entral-0-2-frontend.vercel.app";
const memberToken = process.env.E2E_MEMBER_TOKEN;
const organizationId = process.env.E2E_MEMBER_ORGANIZATION_ID;
const deployedCommitSha = process.env.E2E_DEPLOYED_COMMIT_SHA;
const deploymentReadbackReceiptPath = process.env.E2E_DEPLOYMENT_READBACK_RECEIPT;
const deploymentReadbackReceiptSha256 = process.env.E2E_DEPLOYMENT_READBACK_RECEIPT_SHA256;
const migratedStateReceiptPath = process.env.E2E_MIGRATED_STATE_RECEIPT;
const migratedStateReceiptSha256 = process.env.E2E_MIGRATED_STATE_RECEIPT_SHA256;
const receiptPath = process.env.E2E_PRODUCTION_JOURNEY_RECEIPT;
const screenshotDirectory = resolve(
  process.env.E2E_PRODUCTION_SCREENSHOT_DIR
    ?? (receiptPath ? dirname(resolve(receiptPath)) : resolve("test-results", "production-member-journey")),
  "screenshots"
);
if (
  !memberToken || !organizationId || !deployedCommitSha
  || !/^[a-f0-9]{40}$/.test(deployedCommitSha)
  || !deploymentReadbackReceiptPath
  || !deploymentReadbackReceiptSha256 || !/^[a-f0-9]{64}$/.test(deploymentReadbackReceiptSha256)
  || !migratedStateReceiptPath
  || !migratedStateReceiptSha256 || !/^[a-f0-9]{64}$/.test(migratedStateReceiptSha256)
) {
  throw new Error("Production member journey requires a short-lived member token, organization ID, exact deployed commit SHA, and verified deployment and migrated-state receipt paths and hashes.");
}

const PHASE_202_MAIN_SHA = "c689176234bca8a43f6bb5665f6a8a63d8d653dd";
const PHASE_202_MIGRATION_CUTOVER_AT = "2026-08-02T19:04:46.197Z";
const PHASE_202_MIGRATED_STATE_RECEIPT_SHA256 = "67b31f7094d2b5ee1dfc5d4cdaab1646791b2a27e2ee4d3725cda649b0c3e55c";
if (migratedStateReceiptSha256 !== PHASE_202_MIGRATED_STATE_RECEIPT_SHA256) {
  throw new Error("Migrated-state evidence must be the certified Phase 202 production state readback receipt.");
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

async function verifiedReceipt(filePath, expectedSha256, label) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolve(filePath), "utf8"));
  } catch (error) {
    throw new Error(`${label} could not be loaded as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  const { receipt_sha256: recordedSha256, ...unsigned } = parsed;
  const computedSha256 = sha256(unsigned);
  if (recordedSha256 !== expectedSha256 || computedSha256 !== expectedSha256) {
    throw new Error(`${label} does not match its supplied and content-derived SHA-256 digest.`);
  }
  return parsed;
}

function validateDeploymentReadback(receipt, exactCommitSha) {
  if (receipt.status !== "PASSED" || receipt.accepted_git_commit_sha !== exactCommitSha || !Array.isArray(receipt.deployments)) {
    throw new Error("Deployment readback is not a passed exact-SHA deployment receipt.");
  }
  const required = new Map([
    ["FRONTEND", "VERCEL"],
    ["API", "RAILWAY"],
    ["WORKER", "RAILWAY"]
  ]);
  const observed = new Set();
  for (const deployment of receipt.deployments) {
    const role = deployment.deployment_role ?? deployment.role;
    if (!required.has(role)) continue;
    if (
      observed.has(role) || deployment.provider !== required.get(role)
      || deployment.status !== "READY" || deployment.deployed_commit_sha !== exactCommitSha
      || typeof deployment.deployment_id !== "string" || deployment.deployment_id.length < 3
    ) {
      throw new Error(`Deployment readback contains an invalid ${role} exact-SHA binding.`);
    }
    observed.add(role);
  }
  if (observed.size !== required.size) {
    throw new Error("Deployment readback does not contain one ready exact-SHA frontend, API, and worker deployment.");
  }
}

function memberSessionClaims(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Production journey member token is not a signed JWT.");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  const claims = {
    actorId: payload.aid,
    organizationId: payload.oid,
    session: payload.session,
    sub: payload.sub,
    tenantId: payload.tid
  };
  if (
    claims.session !== "member" || typeof claims.actorId !== "string" || typeof claims.sub !== "string"
    || typeof claims.tenantId !== "string" || typeof claims.organizationId !== "string"
  ) {
    throw new Error("Production journey token is not bound to a tenant member session.");
  }
  return claims;
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

async function canonicalScopeSnapshot(page) {
  const scope = page.getByRole("region", { name: "Inherited canonical scope" });
  await expectVisible(scope, "Inherited canonical scope");
  const organizationSelect = scope.getByLabel("Member access organization");
  const organization = await organizationSelect.count()
    ? await organizationSelect.inputValue()
    : (await scope.locator("strong").first().textContent())?.trim();
  return {
    business: await scope.getByLabel("Canonical business scope").inputValue(),
    organization
  };
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

async function rendererSnapshot(renderer, label, {
  authorizedEdgeIds,
  authorizedEntityIds,
  projectionVersion,
  requireWebGl = false
}) {
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
  if (
    entityIds.some((id) => !authorizedEntityIds.has(id))
    || edgeIds.some((id) => !authorizedEdgeIds.has(id))
    || !selectedEntityId || !authorizedEntityIds.has(selectedEntityId)
    || eventSequence !== projectionVersion
  ) {
    throw new Error(`${label} rendered identifiers or state outside the authorized canonical projection.`);
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
    rendered_subset_authorized: true,
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

function rectanglesOverlap(left, right, inset = 0) {
  return left.left + inset < right.right - inset
    && left.right - inset > right.left + inset
    && left.top + inset < right.bottom - inset
    && left.bottom - inset > right.top + inset;
}

async function captureGraphPresentation(page, workspace, { dimension, orientation, width }) {
  const scopeGeometry = await page.evaluate(() => {
    const rect = (element) => {
      if (!(element instanceof HTMLElement)) return null;
      const box = element.getBoundingClientRect();
      return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
    };
    return {
      selector: rect(document.querySelector('.phase180-scope-bar select[aria-label="Canonical business scope"]')),
      status: rect(document.querySelector(".phase180-scope-bar .phase180-sync-status"))
    };
  });
  if (!scopeGeometry.selector || !scopeGeometry.status
    || rectanglesOverlap(scopeGeometry.selector, scopeGeometry.status, 1)) {
    throw new Error(`${width}px ${orientation} canonical scope selector/status collision: ${JSON.stringify(scopeGeometry)}`);
  }
  const stage = workspace.locator(
    `[data-graph-dimension="${dimension}"] ${dimension === "2d" ? ".phase180-graph-stage" : ".phase180-graph-3d-stage"}`
  );
  await expectVisible(stage, `${width}px ${orientation} ${dimension.toUpperCase()} canonical graph stage`);
  await stage.scrollIntoViewIfNeeded();
  const assistantLauncher = page.getByRole("button", { name: "Open ENTRAL assistant" });
  await expectVisible(assistantLauncher, `${width}px ${orientation} ENTRAL assistant launcher`);
  let actual3DCameraTargetEntityId = null;
  if (dimension === "3d") {
    const canvas = stage.locator("canvas.command-center-canvas");
    await expectVisible(canvas, `${width}px ${orientation} 3D renderer canvas`);
    const box = await canvas.boundingBox();
    if (!box) throw new Error(`${width}px ${orientation} 3D renderer canvas had no measurable bounds.`);
    const expectedEntityId = await workspace.locator('.phase180-graph-3d[data-graph-dimension="3d"]')
      .getAttribute("data-canonical-selected-entity-id");
    if (!expectedEntityId) throw new Error(`${width}px ${orientation} 3D renderer had no selected entity before camera hit testing.`);
    await canvas.focus();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector('[data-graph-dimension="3d"]')
      ?.getAttribute("data-canonical-selected-entity-id"));
    await canvas.dispatchEvent("pointerup", {
      button: 0,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
      pointerId: 1,
      pointerType: "mouse"
    });
    await page.waitForFunction((expected) => document.querySelector('[data-graph-dimension="3d"]')
      ?.getAttribute("data-canonical-selected-entity-id") === expected, expectedEntityId, { timeout: 5_000 });
    actual3DCameraTargetEntityId = expectedEntityId;
  }
  const geometry = await page.evaluate(({ activeDimension, actual3DTarget, mobileViewport, viewportOrientation }) => {
    const visibleRect = (element) => {
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || box.width < 2 || box.height < 2) return null;
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width
      };
    };
    const renderer = document.querySelector(`[data-graph-dimension="${activeDimension}"]`);
    const stage = renderer?.querySelector(activeDimension === "2d" ? ".phase180-graph-stage" : ".phase180-graph-3d-stage");
    const stageBox = visibleRect(stage);
    if (!stageBox) return { error: `No visible ${activeDimension} graph stage.` };
    const protectedWidth = stageBox.width * (mobileViewport ? 0.24 : 0.34);
    const protectedHeight = stageBox.height * (mobileViewport ? 0.24 : 0.34);
    const focalCenterX = mobileViewport && viewportOrientation === "landscape" ? 0.25 : 0.5;
    const focalCenterY = mobileViewport && viewportOrientation === "portrait" ? 0.28 : 0.5;
    let protectedFocalRegion = {
      bottom: stageBox.top + (stageBox.height * focalCenterY) + (protectedHeight / 2),
      height: protectedHeight,
      left: stageBox.left + (stageBox.width * focalCenterX) - (protectedWidth / 2),
      right: stageBox.left + (stageBox.width * focalCenterX) + (protectedWidth / 2),
      top: stageBox.top + (stageBox.height * focalCenterY) - (protectedHeight / 2),
      width: protectedWidth
    };
    const selectedEntityId = renderer?.getAttribute("data-canonical-selected-entity-id") ?? null;
    const anchorXValue = renderer?.getAttribute("data-canonical-focus-anchor-x") ?? null;
    const anchorYValue = renderer?.getAttribute("data-canonical-focus-anchor-y") ?? null;
    const anchorX = anchorXValue === null ? null : Number(anchorXValue);
    const anchorY = anchorYValue === null ? null : Number(anchorYValue);
    if (activeDimension === "2d" && Number.isFinite(anchorX) && Number.isFinite(anchorY)) {
      protectedFocalRegion = {
        bottom: stageBox.top + anchorY + (protectedHeight / 2),
        height: protectedHeight,
        left: stageBox.left + anchorX - (protectedWidth / 2),
        right: stageBox.left + anchorX + (protectedWidth / 2),
        top: stageBox.top + anchorY - (protectedHeight / 2),
        width: protectedWidth
      };
    }
    return {
      assistantLauncher: visibleRect(document.querySelector(".phase180-entral-emblem")),
      inspector: visibleRect(document.querySelector(activeDimension === "2d"
        ? '.phase180-graph-drawer[data-canonical-detail-surface="2d"]'
        : '.phase110-node-drawer[data-canonical-detail-surface="3d-inspector"]')),
      legend: visibleRect(document.querySelector(".phase200-graph-legend > summary")),
      focus: activeDimension === "2d" ? {
        anchorViewportX: stageBox.left + anchorX,
        anchorViewportY: stageBox.top + anchorY,
        anchorX,
        anchorY,
        cameraTargetEntityId: renderer?.getAttribute("data-canonical-camera-target-entity-id") ?? null,
        selectedScreenX: Number(renderer?.getAttribute("data-canonical-selected-screen-x")),
        selectedScreenY: Number(renderer?.getAttribute("data-canonical-selected-screen-y")),
        selectedEntityId
      } : {
        actualCameraTargetEntityId: actual3DTarget,
        cameraTargetEntityId: renderer?.getAttribute("data-canonical-camera-target-entity-id") ?? null,
        cameraTargetSignal: Number(renderer?.getAttribute("data-canonical-camera-target-signal")),
        selectedEntityId
      },
      protectedFocalRegion,
      stage: stageBox,
      toolbar: mobileViewport
        ? visibleRect(document.querySelector('.phase200-mobile-graph-toolbar[aria-label="Compact mobile Universe controls"]'))
        : null
    };
  }, { activeDimension: dimension, actual3DTarget: actual3DCameraTargetEntityId, mobileViewport: width < 1024, viewportOrientation: orientation });
  if (geometry.error) throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} geometry failed: ${geometry.error}`);
  if (
    geometry.stage.bottom <= 0 || geometry.stage.top >= await page.evaluate(() => window.innerHeight)
    || geometry.stage.right <= 0 || geometry.stage.left >= await page.evaluate(() => window.innerWidth)
  ) {
    throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} canonical graph stage was outside the viewport during collision measurement.`);
  }
  for (const required of ["assistantLauncher", "inspector", "legend", ...(width < 1024 ? ["toolbar"] : [])]) {
    if (!geometry[required]) {
      throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} did not expose a visible ${required}.`);
    }
  }
  if (
    geometry.protectedFocalRegion.left < geometry.stage.left
    || geometry.protectedFocalRegion.right > geometry.stage.right
    || geometry.protectedFocalRegion.top < geometry.stage.top
    || geometry.protectedFocalRegion.bottom > geometry.stage.bottom
  ) {
    throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} protected focal region escaped the canonical graph stage.`);
  }
  if (dimension === "2d") {
    if (
      !geometry.focus.selectedEntityId
      || geometry.focus.cameraTargetEntityId !== geometry.focus.selectedEntityId
      || !Number.isFinite(geometry.focus.anchorX) || !Number.isFinite(geometry.focus.anchorY)
      || !Number.isFinite(geometry.focus.selectedScreenX) || !Number.isFinite(geometry.focus.selectedScreenY)
      || Math.abs(geometry.focus.selectedScreenX - geometry.focus.anchorX) > 2.5
      || Math.abs(geometry.focus.selectedScreenY - geometry.focus.anchorY) > 2.5
      || geometry.focus.anchorX < 0 || geometry.focus.anchorX > geometry.stage.width
      || geometry.focus.anchorY < 0 || geometry.focus.anchorY > geometry.stage.height
      || geometry.focus.anchorViewportX < geometry.stage.left || geometry.focus.anchorViewportX > geometry.stage.right
      || geometry.focus.anchorViewportY < geometry.stage.top || geometry.focus.anchorViewportY > geometry.stage.bottom
    ) {
      throw new Error(`${width}px ${orientation} 2D selected entity was not bound to an in-stage camera focus anchor: ${JSON.stringify(geometry.focus)}`);
    }
    const focusPoint = {
      bottom: geometry.focus.anchorViewportY + 1,
      left: geometry.focus.anchorViewportX - 1,
      right: geometry.focus.anchorViewportX + 1,
      top: geometry.focus.anchorViewportY - 1
    };
    for (const overlay of ["assistant", "assistantLauncher", "inspector", "legend", "toolbar"]) {
      if (geometry[overlay] && rectanglesOverlap(geometry[overlay], focusPoint)) {
        throw new Error(`${width}px ${orientation} 2D ${overlay} covered the selected entity camera focus anchor.`);
      }
    }
  } else if (
    !geometry.focus.selectedEntityId
    || geometry.focus.cameraTargetEntityId !== geometry.focus.selectedEntityId
    || geometry.focus.actualCameraTargetEntityId !== geometry.focus.selectedEntityId
    || !Number.isFinite(geometry.focus.cameraTargetSignal)
    || geometry.focus.cameraTargetSignal < 1
  ) {
    throw new Error(`${width}px ${orientation} 3D selected entity was not the active camera target: ${JSON.stringify(geometry.focus)}`);
  }
  const collisionPairs = [
    ["inspector", "toolbar"],
    ["legend", "assistantLauncher"],
    ["legend", "inspector"],
    ["legend", "toolbar"],
    ["assistantLauncher", "inspector"],
    ["assistantLauncher", "toolbar"]
  ];
  for (const [left, right] of collisionPairs) {
    if (geometry[left] && geometry[right] && rectanglesOverlap(geometry[left], geometry[right], 2)) {
      throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} ${left}/${right} collision: ${JSON.stringify(geometry)}`);
    }
  }
  for (const overlay of ["assistantLauncher", "inspector", "legend", "toolbar"]) {
    if (geometry[overlay] && rectanglesOverlap(geometry[overlay], geometry.protectedFocalRegion, 2)) {
      throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} ${overlay} obscured the protected graph focal region: ${JSON.stringify(geometry)}`);
    }
  }
  const screenshotName = `universe-${width}px-${orientation}-${dimension}.png`;
  const screenshotPath = resolve(screenshotDirectory, screenshotName);
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ animations: "disabled", fullPage: false, path: screenshotPath });
  await assistantLauncher.click();
  const assistantRegion = page.getByRole("region", { name: "ENTRAL assistant" });
  await expectVisible(assistantRegion, `${width}px ${orientation} expanded ENTRAL assistant`);
  const expandedGeometry = await page.evaluate((activeDimension) => {
    const documentRect = (element) => {
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || box.width < 2 || box.height < 2) return null;
      return {
        bottom: box.bottom + window.scrollY,
        left: box.left + window.scrollX,
        right: box.right + window.scrollX,
        top: box.top + window.scrollY
      };
    };
    const renderer = document.querySelector(`[data-graph-dimension="${activeDimension}"]`);
    return {
      assistant: documentRect(document.querySelector(".phase180-assistant-widget")),
      inspector: documentRect(document.querySelector(activeDimension === "2d"
        ? '.phase180-graph-drawer[data-canonical-detail-surface="2d"]'
        : '.phase110-node-drawer[data-canonical-detail-surface="3d-inspector"]')),
      legend: documentRect(document.querySelector(".phase200-graph-legend")),
      stage: documentRect(renderer?.querySelector(activeDimension === "2d" ? ".phase180-graph-stage" : ".phase180-graph-3d-stage")),
      toolbar: documentRect(document.querySelector('.phase200-mobile-graph-toolbar[aria-label="Compact mobile Universe controls"]'))
    };
  }, dimension);
  if (!expandedGeometry.assistant) throw new Error(`${width}px ${orientation} expanded ENTRAL assistant had no measurable document-flow rectangle.`);
  for (const surface of ["inspector", "legend", "stage", "toolbar"]) {
    if (expandedGeometry[surface] && rectanglesOverlap(expandedGeometry.assistant, expandedGeometry[surface], 2)) {
      throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} expanded assistant/${surface} collision: ${JSON.stringify(expandedGeometry)}`);
    }
  }
  await assistantRegion.getByRole("button", { name: "Close ENTRAL assistant" }).click();
  return {
    collision_free: true,
    dimension: dimension.toUpperCase(),
    focus_bound_to_selected_entity: true,
    orientation,
    protected_focal_region_clear: true,
    screenshot_file: `screenshots/${screenshotName}`,
    screenshot_sha256: createHash("sha256").update(await readFile(screenshotPath)).digest("hex"),
    viewport_width: width
  };
}

const executablePath = browserExecutable();
if (!executablePath) throw new Error("A Chrome-compatible browser is required for production member acceptance.");
const migratedStateReceipt = await verifiedReceipt(
  migratedStateReceiptPath,
  migratedStateReceiptSha256,
  "Migrated production state receipt"
);
const deploymentReadbackReceipt = await verifiedReceipt(
  deploymentReadbackReceiptPath,
  deploymentReadbackReceiptSha256,
  "Exact-SHA deployment readback receipt"
);
validateDeploymentReadback(deploymentReadbackReceipt, deployedCommitSha);
const browser = await chromium.launch({ executablePath, headless: process.env.E2E_HEADED !== "true" });
const origin = new URL(frontendUrl).origin;
const widths = [360, 390, 412, 430, 1440, 1920];
const observed = [];
const endpointReadback = [];
let projection;
let portfolio;
let membershipEvidence;
let migratedProvenanceEvidence;

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
  const memberOrganizations = await readJson(
    await apiContext.request.get(`${origin}/api/v1/member/organizations`),
    "Current migrated member organization inventory"
  );
  const sessionClaims = memberSessionClaims(memberToken);
  const currentMembership = memberOrganizations.organizations?.find((organization) => organization.id === organizationId);
  if (
    !memberOrganizations.user?.id || memberOrganizations.user.id !== sessionClaims.sub
    || !currentMembership?.joinedAt || !["OWNER", "MEMBER"].includes(currentMembership.role)
  ) {
    throw new Error("Production journey is not bound to the nominated existing migrated member organization.");
  }
  membershipEvidence = {
    joined_at: currentMembership.joinedAt,
    organization_id: sessionClaims.organizationId,
    role: currentMembership.role,
    team_id: organizationId,
    tenant_id: sessionClaims.tenantId,
    user_id: memberOrganizations.user.id
  };
  const joinedAt = Date.parse(currentMembership.joinedAt);
  const phase202CutoverAt = Date.parse(PHASE_202_MIGRATION_CUTOVER_AT);
  if (
    migratedStateReceipt.phase !== 202 || migratedStateReceipt.main_sha !== PHASE_202_MAIN_SHA
    || migratedStateReceipt.status !== "PASSED" || migratedStateReceipt.authenticated !== true
    || migratedStateReceipt.deployment?.exact_main_sha_parity !== true
    || migratedStateReceipt.auth_subject_sha256 !== sha256(membershipEvidence.user_id)
    || migratedStateReceipt.tenant_sha256 !== sha256(membershipEvidence.tenant_id)
    || !Number.isSafeInteger(migratedStateReceipt.identity_authority?.membership_count)
    || migratedStateReceipt.identity_authority.membership_count < 1
    || !Number.isFinite(joinedAt) || joinedAt >= phase202CutoverAt
    || !Number.isFinite(Date.parse(migratedStateReceipt.checked_at))
    || Date.parse(migratedStateReceipt.checked_at) < phase202CutoverAt
  ) {
    throw new Error("Migrated production state receipt is not bound to this pre-Phase-202 member, tenant, organization, and team.");
  }
  migratedProvenanceEvidence = {
    membership_joined_at: currentMembership.joinedAt,
    organization_scope_sha256: sha256(membershipEvidence.organization_id),
    phase_202_cutover_at: PHASE_202_MIGRATION_CUTOVER_AT,
    source_checked_at: migratedStateReceipt.checked_at,
    source_main_sha: migratedStateReceipt.main_sha,
    source_phase: migratedStateReceipt.phase,
    source_receipt_id: migratedStateReceipt.receipt_id,
    source_receipt_sha256: migratedStateReceiptSha256,
    subject_sha256: sha256(membershipEvidence.user_id),
    team_scope_sha256: sha256(membershipEvidence.team_id),
    tenant_scope_sha256: sha256(membershipEvidence.tenant_id)
  };
  const memberBase = `${origin}/api/v1/member/organizations/${encodeURIComponent(organizationId)}`;
  portfolio = await readJson(await apiContext.request.get(`${memberBase}/portfolio/summary`), "Portfolio summary");
  const hierarchy = await readJson(await apiContext.request.get(`${memberBase}/hierarchy`), "Hierarchy");
  const conversation = await readJson(await apiContext.request.get(`${memberBase}/entral/conversation`), "ENTRAL conversation");
  projection = await readJson(await apiContext.request.get(`${memberBase}/graph/projection`), "Graph projection");
  const preferences = await readJson(await apiContext.request.get(`${memberBase}/graph/preferences`), "Graph preferences");
  const events = await readJson(await apiContext.request.get(`${memberBase}/events?afterSequence=0`), "Canonical events");
  const rootFullRecord = await readJson(
    await apiContext.request.get(`${memberBase}/entities/${encodeURIComponent(projection.root_id)}/full`),
    "Canonical root full record"
  );
  let businessFullRecordResult;
  if (portfolio.businesses.length) {
    await readJson(
      await apiContext.request.get(`${memberBase}/businesses/${encodeURIComponent(portfolio.businesses[0].business_id)}/full`),
      "Canonical business full record"
    );
    businessFullRecordResult = { endpoint: "BUSINESS_FULL_RECORD", http_status: 200, result: "PASSED" };
  } else {
    const absentBusiness = await readJson(
      await apiContext.request.get(`${memberBase}/businesses/00000000-0000-4000-8000-000000000000/full`),
      "Absent canonical business full record",
      404
    );
    if (absentBusiness.error !== "Not Found") {
      throw new Error("Absent canonical business full-record readback did not fail with the bounded not-found response.");
    }
    businessFullRecordResult = {
      endpoint: "BUSINESS_FULL_RECORD",
      http_status: 404,
      result: "NOT_APPLICABLE_NO_CANONICAL_BUSINESS"
    };
  }
  // Graph preferences and the portfolio scope are both bound by
  // withCanonicalSession to entral.app_users.id. JWT sub/aid identify the
  // public User and Phase 202 IdentityActor respectively, so neither is the
  // canonical RLS owner used by graph preference storage.
  const graphPreferenceActorBound = preferences.user_id === portfolio.scope.user_id
    && preferences.user_id === hierarchy.scope.user_id;
  const graphPreferenceOrganizationBound = preferences.organization_id === organizationId;
  const projectionOrganizationBound = projection.organization_id === organizationId;
  const canonicalRootVisible = rootFullRecord.entity?.summary?.entity_id === projection.root_id;
  if (!graphPreferenceActorBound || !graphPreferenceOrganizationBound || !projectionOrganizationBound || !canonicalRootVisible) {
    throw new Error("Canonical projection or graph preferences were not owned by the authenticated actor and selected organization.");
  }
  endpointReadback.push(
    {
      business_count: portfolio.businesses.length,
      endpoint: "PORTFOLIO_SUMMARY",
      event_sequence: portfolio.event_sequence,
      http_status: 200,
      result: "PASSED"
    },
    {
      endpoint: "HIERARCHY",
      entity_count: hierarchy.entities.length,
      event_sequence: hierarchy.event_sequence,
      http_status: 200,
      result: "PASSED",
      root_count: hierarchy.entities.filter((entity) => entity.parent_id === null && entity.entity_type === "ENTRAL").length
    },
    {
      endpoint: "ENTRAL_CONVERSATION",
      event_sequence: conversation.event_sequence,
      http_status: 200,
      message_count: conversation.messages.length,
      result: "PASSED"
    },
    {
      edge_count: projection.edges.length,
      endpoint: "GRAPH_PROJECTION",
      entity_count: projection.entities.length,
      http_status: 200,
      projection_version: projection.projection_version,
      result: "PASSED"
    },
    {
      actor_bound: true,
      endpoint: "GRAPH_PREFERENCES",
      http_status: 200,
      organization_bound: true,
      preference_version: preferences.version,
      result: "PASSED"
    },
    {
      endpoint: "EVENTS",
      event_count: Array.isArray(events) ? events.length : events.events.length,
      http_status: 200,
      result: "PASSED"
    },
    businessFullRecordResult,
    {
      canonical_root_visible: canonicalRootVisible,
      endpoint: "ENTITY_FULL_RECORD",
      http_status: 200,
      result: "PASSED"
    }
  );
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
    },
    headers: {
      origin,
      "sec-fetch-site": "same-origin"
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
  const authorizedEntityIds = nodeIds;
  const authorizedEdgeIds = new Set(projection.edges.map((edge) => edge.edge_id));
  const rendererAuthorization = {
    authorizedEdgeIds,
    authorizedEntityIds,
    projectionVersion: projection.projection_version
  };
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
      const command = page.locator('[data-member-destination-view="command"]');
      await expectVisible(command, `${width}px Command operating overview`);
      await expectVisible(command.getByRole("heading", { level: 1, name: "Command overview" }), `${width}px Command heading`);
      await expectVisible(command.locator('[data-command-section="portfolio-totals"]'), `${width}px Command totals section`);
      await expectVisible(command.locator('[data-command-section="operating-priorities"]'), `${width}px Command operating priorities`);
      if (await command.locator('[data-businesses-section="portfolio-management"]').count()) {
        throw new Error(`${width}px Command exposed the Businesses management surface.`);
      }
      const commandTotals = page.locator('.phase170-summary-grid[aria-label="Portfolio totals"]');
      await expectVisible(commandTotals, `${width}px Command canonical totals`);
      const commandBusinessCount = Number(await commandTotals.locator("article").filter({ hasText: "Businesses" })
        .locator("strong").first().textContent());
      if (commandBusinessCount !== portfolio.totals.businesses || await page.locator(".phase170-error").count()) {
        throw new Error(`${width}px Command did not render the authenticated canonical portfolio totals.`);
      }
      const commandScope = await canonicalScopeSnapshot(page);
      await assertNoCanonicalSyncError(page, `${width}px Command`);

      await navigation.getByRole("link", { name: "Businesses" }).click();
      await page.waitForURL(/\/member\/dashboard\?[^#]*destination=businesses/);
      const businesses = page.locator('[data-member-destination-view="businesses"]');
      await expectVisible(businesses, `${width}px Businesses management surface`);
      await expectVisible(businesses.getByRole("heading", { level: 1, name: "Businesses" }), `${width}px Businesses heading`);
      await expectVisible(businesses.locator('[data-businesses-section="portfolio-management"]'), `${width}px Businesses management section`);
      await expectVisible(businesses.getByRole("heading", { name: "Canonical portfolio" }), `${width}px canonical business list`);
      if (
        await businesses.locator('[data-command-section="portfolio-totals"]').count()
        || await businesses.locator('[data-command-section="operating-priorities"]').count()
      ) {
        throw new Error(`${width}px Businesses exposed the Command executive-totals surface.`);
      }
      if (JSON.stringify(await canonicalScopeSnapshot(page)) !== JSON.stringify(commandScope)) {
        throw new Error(`${width}px Command to Businesses navigation did not preserve the authenticated canonical scope.`);
      }
      const visibleBusinessCards = await businesses.locator(".phase170-business-card").count();
      if (visibleBusinessCards !== portfolio.businesses.length) {
        throw new Error(`${width}px Businesses did not render the authenticated canonical business count.`);
      }
      if (portfolio.businesses.length) {
        for (const business of portfolio.businesses) {
          await expectVisible(
            businesses.locator(".phase170-business-card").filter({ hasText: business.business_name }),
            `${width}px canonical business ${business.business_name}`
          );
        }
      } else {
        await expectVisible(
          businesses.getByRole("heading", { name: "No canonical businesses are deployed." }),
          `${width}px truthful empty canonical business state`
        );
      }
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

      // Acceptance must exercise both mobile renderers without assuming which
      // synchronized dimension a member's current URL preference selects.
      if (mobile) {
        const initialToolbar = page.getByRole("toolbar", { name: "Compact mobile Universe controls" });
        await expectVisible(initialToolbar, `${width}px compact Universe toolbar`);
        await initialToolbar.getByRole("button", { name: "2D" }).click();
        await page.waitForFunction(() => document.querySelector(".phase180-graph-workspace")
          ?.getAttribute("data-mobile-dimension") === "2d");
      }
      const twoD = page.locator('.phase180-graph[data-graph-dimension="2d"]');
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
      const twoDSnapshot = await rendererSnapshot(twoD, `${width}px 2D projection`, rendererAuthorization);
      const presentationEvidence = [await captureGraphPresentation(page, workspace, {
        dimension: "2d",
        orientation: mobile ? "portrait" : "landscape",
        width
      })];

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
        threeDSnapshot = await rendererSnapshot(threeD, `${width}px 3D projection`, {
          ...rendererAuthorization,
          requireWebGl: true
        });
        assertRendererParity(twoDSnapshot, threeDSnapshot, `${width}px 2D to 3D switch`);
        presentationEvidence.push(await captureGraphPresentation(page, workspace, {
          dimension: "3d",
          orientation: "portrait",
          width
        }));
        if (
          await workspace.getAttribute("data-graph-parity-key") !== parityKey
          || threeDSnapshot.selected_entity_id !== twoDSnapshot.selected_entity_id
        ) {
          throw new Error(`${width}px 2D to 3D switch did not preserve canonical graph state.`);
        }
        await toolbar.getByRole("button", { name: "2D" }).click();
        await expectVisible(twoD, `${width}px 2D projection return`, 45_000);
        const returnedTwoD = await rendererSnapshot(twoD, `${width}px returned 2D projection`, rendererAuthorization);
        assertRendererParity(twoDSnapshot, returnedTwoD, `${width}px 3D to 2D switch`);
        await page.setViewportSize({ height: 390, width: 767 });
        await expectVisible(twoD, `${width}px landscape 2D projection`, 45_000);
        presentationEvidence.push(await captureGraphPresentation(page, workspace, {
          dimension: "2d",
          orientation: "landscape",
          width
        }));
        await toolbar.getByRole("button", { name: "3D" }).click();
        await expectVisible(threeD, `${width}px landscape 3D projection`, 60_000);
        presentationEvidence.push(await captureGraphPresentation(page, workspace, {
          dimension: "3d",
          orientation: "landscape",
          width
        }));
        await toolbar.getByRole("button", { name: "2D" }).click();
        await page.setViewportSize({ height: 844, width });
      } else {
        if (
          await workspace.getAttribute("data-mobile-presentation") !== "desktop-dual"
          || await workspace.locator(".phase180-graph-panel").count() !== 2
        ) {
          throw new Error("Desktop Universe did not preserve the side-by-side 2D and 3D presentation.");
        }
        const threeD = page.locator('.phase180-graph-3d[data-graph-dimension="3d"]');
        threeDSnapshot = await rendererSnapshot(threeD, `${width}px desktop 3D projection`, {
          ...rendererAuthorization,
          requireWebGl: true
        });
        assertRendererParity(twoDSnapshot, threeDSnapshot, `${width}px desktop 2D and 3D renderers`);
        presentationEvidence.push(await captureGraphPresentation(page, workspace, {
          dimension: "3d",
          orientation: "landscape",
          width
        }));
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
      await expectVisible(
        academy.getByRole("heading", { level: 3, name: "No published Tutorial lessons" }),
        `${width}px fail-closed Tutorial publication state`
      );
      if (await academy.getByRole("button", { name: "Navigate Universe" }).count()) {
        throw new Error(`${width}px Tutorial expanded a lesson without a SELLABLE Product Truth claim.`);
      }
      if ((await academy.innerText()).includes("Tutorial progress is unavailable")) {
        throw new Error(`${width}px Tutorial did not load its server-backed state.`);
      }
      await assertNoCanonicalSyncError(page, `${width}px Tutorial`);

      observed.push({
        business_count: portfolio.businesses.length,
        businesses_state: portfolio.businesses.length ? "REAL_RECORDS" : "EMPTY_CANONICAL",
        command_canonical_data_verified: true,
        desktop_side_by_side: !mobile,
        destination_sync_errors: {
          BUSINESSES: 0,
          COMMAND: 0,
          INFRASTRUCTURE: 0,
          TUTORIAL: 0,
          UNIVERSE_2D: 0,
          UNIVERSE_3D: 0
        },
        edge_count: twoDSnapshot.edge_count,
        edge_set_sha256: twoDSnapshot.edge_set_sha256,
        entity_count: twoDSnapshot.entity_count,
        entity_set_sha256: twoDSnapshot.entity_set_sha256,
        event_sequence: twoDSnapshot.event_sequence,
        graph_presentation_evidence: presentationEvidence,
        mobile_single_renderer: mobile,
        renderer_parity_verified: true,
        rendered_subset_authorized: twoDSnapshot.rendered_subset_authorized
          && threeDSnapshot.rendered_subset_authorized,
        renderer_state_preserved: true,
        selected_entity_authorized: authorizedEntityIds.has(twoDSnapshot.selected_entity_id),
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
  business_count: portfolio.businesses.length,
  businesses_state: portfolio.businesses.length ? "REAL_RECORDS" : "EMPTY_CANONICAL",
  canonical_edge_count: projection.edges.length,
  canonical_edge_set_sha256: sha256(projection.edges.map((edge) => edge.edge_id).sort()),
  canonical_endpoint_readback: endpointReadback,
  canonical_node_count: projection.entities.length,
  canonical_node_set_sha256: sha256(projection.entities.map((entity) => entity.entity_id).sort()),
  canonical_sync_errors: 0,
  command_canonical_data_verified: true,
  contract_version: "1.0.0",
  deployed_commit_sha: deployedCommitSha,
  deployment_readback_exact_sha_verified: true,
  deployment_readback_receipt_sha256: deploymentReadbackReceiptSha256,
  destinations: ["COMMAND", "BUSINESSES", "UNIVERSE_2D", "UNIVERSE_3D", "INFRASTRUCTURE", "TUTORIAL"],
  environment: "PRODUCTION",
  graph_preference_actor_bound: true,
  graph_preference_organization_bound: true,
  membership_provenance_sha256: sha256(membershipEvidence),
  migrated_account_provenance_sha256: sha256([
    migratedProvenanceEvidence.membership_joined_at,
    migratedProvenanceEvidence.organization_scope_sha256,
    migratedProvenanceEvidence.phase_202_cutover_at,
    migratedProvenanceEvidence.source_checked_at,
    migratedProvenanceEvidence.source_main_sha,
    migratedProvenanceEvidence.source_phase,
    migratedProvenanceEvidence.source_receipt_id,
    migratedProvenanceEvidence.source_receipt_sha256,
    migratedProvenanceEvidence.subject_sha256,
    migratedProvenanceEvidence.team_scope_sha256,
    migratedProvenanceEvidence.tenant_scope_sha256
  ]),
  migrated_membership_joined_at: migratedProvenanceEvidence.membership_joined_at,
  migrated_organization_scope_sha256: migratedProvenanceEvidence.organization_scope_sha256,
  migrated_phase_202_cutover_at: migratedProvenanceEvidence.phase_202_cutover_at,
  migrated_source_checked_at: migratedProvenanceEvidence.source_checked_at,
  migrated_source_main_sha: migratedProvenanceEvidence.source_main_sha,
  migrated_source_phase: migratedProvenanceEvidence.source_phase,
  migrated_state_receipt_id: migratedProvenanceEvidence.source_receipt_id,
  migrated_state_receipt_sha256: migratedStateReceiptSha256,
  migrated_subject_sha256: migratedProvenanceEvidence.subject_sha256,
  migrated_team_scope_sha256: migratedProvenanceEvidence.team_scope_sha256,
  migrated_tenant_scope_sha256: migratedProvenanceEvidence.tenant_scope_sha256,
  observed_at: new Date().toISOString(),
  organization_scope_sha256: sha256(membershipEvidence.organization_id),
  pre_phase_202_provenance_verified: true,
  projection_organization_bound: true,
  receipt_id: "P203-PRODUCTION-MEMBER-JOURNEY-001",
  renderer_state_preserved: true,
  screenshot_collision_evidence_verified: observed.every((viewport) =>
    Array.isArray(viewport.graph_presentation_evidence)
      && viewport.graph_presentation_evidence.every((entry) => entry.collision_free && entry.protected_focal_region_clear)),
  route_interception: false,
  schema_version: 1,
  session_scope: "MIGRATED_MEMBER",
  session_subject_sha256: sha256(membershipEvidence.user_id),
  status: "PASSED",
  team_scope_sha256: sha256(membershipEvidence.team_id),
  tenant_scope_sha256: sha256(membershipEvidence.tenant_id),
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

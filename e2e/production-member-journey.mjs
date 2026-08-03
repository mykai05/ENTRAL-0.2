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
const PHASE204_INTERNAL_BUSINESS_CODE = "SP-COMMERCE-001";
const PHASE204_ENTITY_CODES = [
  "C-SP-COMMERCE-001",
  "S-SP-COMMERCE-001-01",
  "S-SP-COMMERCE-001-02",
  "S-SP-COMMERCE-001-03"
];
const PHASE204_PRODUCT_PRICES = new Map([
  ["LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT", 2_900],
  ["SCOPE_CHANGE_ORDER_CONTROL_PACK", 4_900],
  ["BILLING_COLLECTIONS_ACCELERATOR", 4_900],
  ["WEEKLY_OWNER_COMMAND_DASHBOARD", 3_900],
  ["COMPLETE_CONTRACTOR_CONTROL_BUNDLE", 11_900]
]);
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
  requireWebGl = false,
  requiredEntityIds = new Set()
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
  const missingRequiredEntities = [...requiredEntityIds].filter((id) => !entityIds.includes(id));
  if (missingRequiredEntities.length) {
    throw new Error(`${label} did not render the complete canonical Phase 204 commerce hierarchy.`);
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
    required_entity_count: requiredEntityIds.size,
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

async function captureDestinationScreenshot(page, { destination, root, width }) {
  await root.scrollIntoViewIfNeeded();
  const geometry = await root.evaluate((element) => {
    const visible = (candidate) => {
      if (!(candidate instanceof HTMLElement)) return false;
      const style = getComputedStyle(candidate);
      const box = candidate.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 1 && box.height > 1;
    };
    const bounds = element.getBoundingClientRect();
    const obscuringSurfaceCount = [
      ...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"], .phase170-error, .phase180-error')
    ].filter((candidate) => candidate !== element && visible(candidate)).length;
    return {
      obscuringSurfaceCount,
      root: {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width
      },
      viewport: { height: window.innerHeight, scroll_y: window.scrollY, width: window.innerWidth }
    };
  });
  if (
    geometry.viewport.width !== width
    || geometry.root.width <= 1 || geometry.root.height <= 1
    || geometry.root.right <= 0 || geometry.root.left >= geometry.viewport.width
    || geometry.root.bottom <= 0 || geometry.root.top >= geometry.viewport.height
    || geometry.obscuringSurfaceCount !== 0
  ) {
    throw new Error(`${width}px ${destination} screenshot root was not visibly unobscured: ${JSON.stringify(geometry)}`);
  }
  const screenshotName = `${destination.toLowerCase()}-${width}px.png`;
  const screenshotPath = resolve(screenshotDirectory, screenshotName);
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ animations: "disabled", fullPage: false, path: screenshotPath });
  return {
    destination,
    obscuring_surface_count: geometry.obscuringSurfaceCount,
    root_bounds: geometry.root,
    screenshot_file: `screenshots/${screenshotName}`,
    screenshot_sha256: createHash("sha256").update(await readFile(screenshotPath)).digest("hex"),
    viewport_height: geometry.viewport.height,
    viewport_scroll_y: geometry.viewport.scroll_y,
    viewport_width: width
  };
}

async function selectDesktopSideBySide(workspace) {
  const panels = workspace.locator('.phase180-graph-panels[data-layout="side-by-side"]');
  if (!await panels.count()) {
    await workspace.getByLabel("Graph arrangement", { exact: true }).selectOption("side-by-side");
  }
  await workspace.locator('.phase180-graph-panels[data-layout="side-by-side"]').waitFor({ state: "attached" });
}

async function switchMobileGraphDimension(page, toolbar, dimension, width, label) {
  await toolbar.getByRole("button", { name: dimension.toUpperCase() }).click();
  await page.waitForFunction((expectedDimension) => document.querySelector(".phase180-graph-workspace")
    ?.getAttribute("data-mobile-dimension") === expectedDimension, dimension);
  await page.waitForURL((url) =>
    url.pathname === "/member/graph" && url.searchParams.get("graph") === dimension,
  { timeout: 45_000 });
  if (await toolbar.getByRole("button", { name: dimension.toUpperCase() }).getAttribute("aria-pressed") !== "true") {
    throw new Error(`${width}px ${label} did not synchronize the ${dimension.toUpperCase()} toolbar state.`);
  }
}

async function measureDesktopSideBySide(workspace, width) {
  const geometry = await workspace.locator(".phase180-graph-panels").evaluate((container) => {
    const box = (element) => {
      if (!(element instanceof HTMLElement)) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width
      };
    };
    return {
      layout: container.getAttribute("data-layout"),
      panels: box(container),
      threeD: box(container.querySelector('[data-panel="3d"] .phase180-graph-3d-stage')),
      threeDPanel: box(container.querySelector('[data-panel="3d"]')),
      twoD: box(container.querySelector('[data-panel="2d"] .phase180-graph-stage')),
      twoDPanel: box(container.querySelector('[data-panel="2d"]')),
      viewport: { height: window.innerHeight, width: window.innerWidth }
    };
  });
  const contained = (inner, outer) => inner.left >= outer.left - 2
    && inner.right <= outer.right + 2
    && inner.top >= outer.top - 2
    && inner.bottom <= outer.bottom + 2;
  const visibleInViewport = (box) => box.right > 0 && box.left < geometry.viewport.width
    && box.bottom > 0 && box.top < geometry.viewport.height;
  const rectangles = [geometry.panels, geometry.twoDPanel, geometry.threeDPanel, geometry.twoD, geometry.threeD];
  const panelGap = geometry.twoDPanel && geometry.threeDPanel
    ? geometry.threeDPanel.left - geometry.twoDPanel.right
    : Number.POSITIVE_INFINITY;
  const stageVerticalOverlap = geometry.twoD && geometry.threeD
    ? Math.min(geometry.twoD.bottom, geometry.threeD.bottom) - Math.max(geometry.twoD.top, geometry.threeD.top)
    : Number.NEGATIVE_INFINITY;
  if (
    geometry.layout !== "side-by-side"
    || rectangles.some((box) => !box || box.width <= 1 || box.height <= 1)
    || geometry.viewport.width !== width
    || Math.abs(geometry.twoDPanel.top - geometry.threeDPanel.top) > 4
    || geometry.twoDPanel.right > geometry.threeDPanel.left + 2
    || panelGap > geometry.panels.width * 0.08
    || geometry.twoDPanel.width < geometry.panels.width * 0.35
    || geometry.threeDPanel.width < geometry.panels.width * 0.35
    || stageVerticalOverlap < Math.min(geometry.twoD.height, geometry.threeD.height) * 0.5
    || !contained(geometry.twoDPanel, geometry.panels)
    || !contained(geometry.threeDPanel, geometry.panels)
    || !contained(geometry.twoD, geometry.twoDPanel)
    || !contained(geometry.threeD, geometry.threeDPanel)
    || !visibleInViewport(geometry.twoD)
    || !visibleInViewport(geometry.threeD)
  ) {
    throw new Error(`${width}px Desktop Universe panels were not measurably side by side: ${JSON.stringify(geometry)}`);
  }
  return geometry;
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
      const left = Math.max(stageBox.left, stageBox.left + anchorX - (protectedWidth / 2));
      const right = Math.min(stageBox.right, stageBox.left + anchorX + (protectedWidth / 2));
      const top = Math.max(stageBox.top, stageBox.top + anchorY - (protectedHeight / 2));
      const bottom = Math.min(stageBox.bottom, stageBox.top + anchorY + (protectedHeight / 2));
      protectedFocalRegion = {
        bottom,
        height: bottom - top,
        left,
        right,
        top,
        width: right - left
      };
    }
    const toolbarElement = document.querySelector('.phase200-mobile-graph-toolbar[aria-label="Compact mobile Universe controls"]');
    const toolbarRect = visibleRect(toolbarElement);
    const toolbarMetrics = toolbarElement instanceof HTMLElement && toolbarRect ? {
      ...toolbarRect,
      buttonsContained: [...toolbarElement.querySelectorAll("button")].every((button) => {
        const box = button.getBoundingClientRect();
        return box.left >= toolbarRect.left - 1
          && box.right <= toolbarRect.right + 1
          && box.left >= -1
          && box.right <= window.innerWidth + 1;
      }),
      clientWidth: toolbarElement.clientWidth,
      scrollWidth: toolbarElement.scrollWidth
    } : null;
    const selectedLabel = activeDimension === "2d" ? {
      bottom: Number(renderer?.getAttribute("data-canonical-selected-label-bottom")),
      left: Number(renderer?.getAttribute("data-canonical-selected-label-left")),
      right: Number(renderer?.getAttribute("data-canonical-selected-label-right")),
      top: Number(renderer?.getAttribute("data-canonical-selected-label-top"))
    } : null;
    const threeDimensionalCanvas = activeDimension === "3d"
      ? renderer?.querySelector("canvas.command-center-canvas")
      : null;
    const requiredNumericAttribute = (element, attributeName) => {
      const raw = element?.getAttribute(attributeName);
      if (raw === null || raw === undefined || raw.trim() === "") return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    };
    let renderedLabelBounds = [];
    if (activeDimension === "2d") {
      try {
        const parsed = JSON.parse(renderer?.getAttribute("data-canonical-rendered-label-bounds") ?? "[]");
        renderedLabelBounds = Array.isArray(parsed) ? parsed : [];
      } catch {
        renderedLabelBounds = [];
      }
    }
    const minimapVisible = activeDimension === "2d"
      && renderer?.getAttribute("data-canonical-minimap-visible") === "true";
    const minimapBounds = minimapVisible ? {
      bottom: requiredNumericAttribute(renderer, "data-canonical-minimap-bottom"),
      left: requiredNumericAttribute(renderer, "data-canonical-minimap-left"),
      right: requiredNumericAttribute(renderer, "data-canonical-minimap-right"),
      top: requiredNumericAttribute(renderer, "data-canonical-minimap-top")
    } : null;
    const threeDimensionalSurface = activeDimension === "3d"
      ? renderer?.querySelector('[data-graph-canonical-marker-policy="selection-only"]')
      : null;
    const keyboardTooltip = activeDimension === "2d"
      ? renderer?.querySelector(".phase195-graph-tooltip.keyboard")
      : null;
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
      presentation: activeDimension === "2d" ? {
        keyboardTooltipPresent: Boolean(keyboardTooltip),
        keyboardTooltipAssociated: Boolean(
          keyboardTooltip
          && keyboardTooltip.getAttribute("role") === "tooltip"
          && renderer?.querySelector("canvas")?.getAttribute("aria-describedby")?.includes(keyboardTooltip.id)
        ),
        keyboardTooltipClipped: keyboardTooltip instanceof HTMLElement
          ? keyboardTooltip.getBoundingClientRect().width <= 1 && keyboardTooltip.getBoundingClientRect().height <= 1
          : false,
        labelViewportRight: requiredNumericAttribute(renderer, "data-canonical-label-viewport-right"),
        minimapBounds,
        minimapLabelCollisionCount: requiredNumericAttribute(renderer, "data-canonical-minimap-label-collision-count"),
        minimapVisible,
        renderedLabelBounds,
        selectedLabel
      } : {
        compositing: threeDimensionalCanvas?.getAttribute("data-canonical-compositing") ?? null,
        labelPlacement: threeDimensionalSurface?.getAttribute("data-graph-label-placement") ?? null,
        liveLabelCount: requiredNumericAttribute(threeDimensionalCanvas, "data-canonical-live-label-count"),
        markerCount: requiredNumericAttribute(threeDimensionalCanvas, "data-canonical-marker-count"),
        markerPolicy: threeDimensionalSurface?.getAttribute("data-graph-canonical-marker-policy") ?? null,
        markerScale: threeDimensionalSurface?.getAttribute("data-graph-canonical-marker-scale") ?? null,
        pointCompositing: threeDimensionalSurface?.getAttribute("data-graph-point-compositing") ?? null
      },
      stage: stageBox,
      toolbar: mobileViewport ? toolbarMetrics : null
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
    if (width < 1024 && (
      rectanglesOverlap(geometry.inspector, geometry.stage, 0)
      || geometry.inspector.top < geometry.stage.bottom - 2
    )) {
      throw new Error(`${width}px ${orientation} 2D inspector remained over the canonical node field: ${JSON.stringify(geometry)}`);
    }
    const label = geometry.presentation.selectedLabel;
    if (
      geometry.presentation.keyboardTooltipPresent && !geometry.presentation.keyboardTooltipAssociated
      || geometry.presentation.keyboardTooltipPresent && !geometry.presentation.keyboardTooltipClipped
      || !label
      || !Object.values(label).every(Number.isFinite)
      || label.left < 8
      || label.right > geometry.stage.width - 8
      || !Number.isFinite(geometry.presentation.labelViewportRight)
      || label.right > geometry.presentation.labelViewportRight
      || width >= 1024 && label.right > geometry.inspector.left - geometry.stage.left - 8
      || label.top < 0
      || label.bottom > geometry.stage.height
    ) {
      throw new Error(`${width}px ${orientation} 2D label or tooltip presentation escaped its viewport contract: ${JSON.stringify(geometry.presentation)}`);
    }
    if (
      !Number.isFinite(geometry.presentation.minimapLabelCollisionCount)
      || geometry.presentation.minimapLabelCollisionCount !== 0
      || geometry.presentation.minimapVisible !== true
      || !geometry.presentation.minimapBounds
      || !Object.values(geometry.presentation.minimapBounds).every(Number.isFinite)
      || geometry.presentation.minimapBounds.left < 0
      || geometry.presentation.minimapBounds.top < 0
      || geometry.presentation.minimapBounds.right > geometry.stage.width
      || geometry.presentation.minimapBounds.bottom > geometry.stage.height
      || geometry.presentation.minimapBounds.right <= geometry.presentation.minimapBounds.left
      || geometry.presentation.minimapBounds.bottom <= geometry.presentation.minimapBounds.top
      || !Array.isArray(geometry.presentation.renderedLabelBounds)
      || geometry.presentation.renderedLabelBounds.length < 1
      || !geometry.presentation.renderedLabelBounds.some((bounds) =>
        bounds && Object.values(bounds).every(Number.isFinite)
        && Math.abs(bounds.left - label.left) <= 1
        && Math.abs(bounds.right - label.right) <= 1
        && Math.abs(bounds.top - label.top) <= 1
        && Math.abs(bounds.bottom - label.bottom) <= 1
      )
      || (
        !geometry.presentation.minimapBounds
        || geometry.presentation.renderedLabelBounds.some((bounds) =>
          !bounds || !Object.values(bounds).every(Number.isFinite)
          || rectanglesOverlap(bounds, geometry.presentation.minimapBounds)
        )
      )
    ) {
      throw new Error(`${width}px ${orientation} 2D minimap intersected a rendered canonical label: ${JSON.stringify(geometry.presentation)}`);
    }
  } else if (
    !geometry.focus.selectedEntityId
    || geometry.focus.cameraTargetEntityId !== geometry.focus.selectedEntityId
    || geometry.focus.actualCameraTargetEntityId !== geometry.focus.selectedEntityId
    || !Number.isFinite(geometry.focus.cameraTargetSignal)
    || geometry.focus.cameraTargetSignal < 1
  ) {
    throw new Error(`${width}px ${orientation} 3D selected entity was not the active camera target: ${JSON.stringify(geometry.focus)}`);
  } else if (
    geometry.presentation.compositing !== "depth-alpha"
    || geometry.presentation.markerPolicy !== "selection-only"
    || geometry.presentation.markerScale !== "compact"
    || geometry.presentation.pointCompositing !== "bounded-lighting-bloom"
    || geometry.presentation.labelPlacement !== "viewport-contained"
    || !Number.isFinite(geometry.presentation.markerCount)
    || geometry.presentation.markerCount > 1
    || !Number.isFinite(geometry.presentation.liveLabelCount)
    || geometry.presentation.liveLabelCount > (width < 1024 ? 24 : 200)
  ) {
    throw new Error(`${width}px ${orientation} 3D presentation policy was not bounded: ${JSON.stringify(geometry.presentation)}`);
  }
  if (width < 1024 && (
    geometry.toolbar.scrollWidth > geometry.toolbar.clientWidth + 1
    || !geometry.toolbar.buttonsContained
  )) {
    throw new Error(`${width}px ${orientation} ${dimension.toUpperCase()} compact toolbar overflowed its viewport: ${JSON.stringify(geometry.toolbar)}`);
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
    minimap_label_collision_count: dimension === "2d"
      ? geometry.presentation.minimapLabelCollisionCount
      : null,
    minimap_bounds: dimension === "2d" ? geometry.presentation.minimapBounds : null,
    minimap_visible: dimension === "2d" ? geometry.presentation.minimapVisible : null,
    orientation,
    protected_focal_region_clear: true,
    rendered_label_bounds: dimension === "2d" ? geometry.presentation.renderedLabelBounds : null,
    rendered_label_bounds_sha256: dimension === "2d"
      ? sha256(geometry.presentation.renderedLabelBounds)
      : null,
    rendered_label_count: dimension === "2d"
      ? geometry.presentation.renderedLabelBounds.length
      : null,
    stage_height: geometry.stage.height,
    stage_width: geometry.stage.width,
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
let commerceBusiness;
let commerceEntityIds;
let phase204EndpointReadback;

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
  const commerceBusinesses = portfolio.businesses.filter(
    (business) => business.stable_code === PHASE204_INTERNAL_BUSINESS_CODE
  );
  if (commerceBusinesses.length !== 1) {
    throw new Error("Production portfolio did not expose exactly one canonical SP-COMMERCE-001 business.");
  }
  commerceBusiness = commerceBusinesses[0];
  const commerceFullRecord = await readJson(
    await apiContext.request.get(`${memberBase}/businesses/${encodeURIComponent(commerceBusiness.business_id)}/full`),
    "Phase 204 canonical commerce business full record"
  );
  if (
    commerceBusiness.status !== "OPERATING"
    || commerceFullRecord.business?.summary?.business_id !== commerceBusiness.business_id
    || commerceFullRecord.business?.summary?.stable_code !== PHASE204_INTERNAL_BUSINESS_CODE
    || commerceFullRecord.business?.summary?.status !== "OPERATING"
  ) {
    throw new Error("Phase 204 full business record was not bound to the exact canonical commerce business.");
  }
  const commerceReadback = await readJson(
    await apiContext.request.get(`${memberBase}/internal-commerce`),
    "Phase 204 internal commerce readback"
  );
  const capabilityByCatalogId = new Map(
    (commerceReadback.capabilities ?? []).map((capability) => [capability.catalog_capability_id, capability])
  );
  const requiredActiveCapabilityIds = [
    "20300000-0002-4000-8000-000000000108",
    "20300000-0002-4000-8000-000000000107",
    "20300000-0002-4000-8000-000000000106"
  ];
  const etsyCapability = capabilityByCatalogId.get("20300000-0001-4000-8000-000000000012");
  if (
    commerceReadback.release_version !== "phase-204"
    || commerceReadback.business?.canonical_business_id !== commerceBusiness.business_id
    || commerceReadback.business?.internal_code !== PHASE204_INTERNAL_BUSINESS_CODE
    || commerceReadback.business?.status !== "OPERATING"
    || commerceReadback.business?.boundary_status !== "ACTIVE"
    || commerceReadback.products?.length !== PHASE204_PRODUCT_PRICES.size
    || commerceReadback.products.some((product) => (
      PHASE204_PRODUCT_PRICES.get(product.product_code) !== product.price_cents
      || product.ready !== true
      || product.asset_role_count !== 9
      || product.latest_passed_gate_count !== 6
    ))
    || capabilityByCatalogId.size !== 4
    || requiredActiveCapabilityIds.some((capabilityId) => {
      const capability = capabilityByCatalogId.get(capabilityId);
      return capability?.lifecycle_state !== "ACTIVE"
        || capability?.installation_state !== "ACTIVE"
        || capability?.public_claim_eligible !== false;
    })
    || !etsyCapability
    || etsyCapability.lifecycle_state === "ACTIVE"
    || etsyCapability.installation_state === "ACTIVE"
    || etsyCapability.public_claim_eligible !== false
    || commerceReadback.operational_metrics?.length !== 54
    || commerceReadback.operational_metrics.some((metric) => metric.is_estimate !== false)
    || commerceReadback.controls?.length !== 3
    || commerceReadback.storefront?.preferred_provider !== "ETSY"
    || commerceReadback.storefront?.external_provider_mutation_available !== false
  ) {
    throw new Error("Phase 204 internal commerce readback was incomplete or weakened a fail-closed truth boundary.");
  }
  const commerceEntities = PHASE204_ENTITY_CODES.map((stableCode) =>
    hierarchy.entities.find((entity) => entity.stable_code === stableCode)
  );
  if (
    commerceEntities.some((entity) => !entity)
    || commerceEntities.some((entity) => entity.assigned_business_id !== commerceBusiness.business_id)
    || commerceEntities.some((entity) => entity.status !== "ACTIVE")
    || commerceEntities[0].entity_type !== "COMMANDER"
    || commerceEntities[0].parent_id !== commerceReadback.business.general_id
    || commerceEntities.slice(1).some((entity) => entity.entity_type !== "SOLDIER")
    || commerceEntities.slice(1).some((entity) => entity.parent_id !== commerceEntities[0].entity_id)
  ) {
    throw new Error("Canonical hierarchy did not expose the exact Phase 204 Commander and three mission-created Soldiers.");
  }
  commerceEntityIds = commerceEntities.map((entity) => entity.entity_id);
  const projectionEntityIds = new Set(projection.entities.map((entity) => entity.entity_id));
  if (
    commerceEntityIds.some((entityId) => !projectionEntityIds.has(entityId))
    || commerceEntities.some((entity) => !projection.edges.some(
      (edge) => edge.source_id === entity.parent_id && edge.target_id === entity.entity_id
    ))
  ) {
    throw new Error("Canonical graph projection omitted the Phase 204 commerce hierarchy or an authority edge.");
  }
  const businessFullRecordResult = {
    business_code: PHASE204_INTERNAL_BUSINESS_CODE,
    endpoint: "BUSINESS_FULL_RECORD",
    http_status: 200,
    result: "PASSED"
  };
  phase204EndpointReadback = {
    active_internal_capability_count: requiredActiveCapabilityIds.length,
    business_code: PHASE204_INTERNAL_BUSINESS_CODE,
    commerce_entity_count: commerceEntityIds.length,
    endpoint: "PHASE204_INTERNAL_COMMERCE",
    external_publication_performed: commerceReadback.storefront.listings.some((listing) => (
      listing.status === "PUBLISHED" && Boolean(listing.provider_listing_id)
    )),
    http_status: 200,
    product_count: commerceReadback.products.length,
    result: "PASSED",
    storefront_provider: commerceReadback.storefront.provider,
    storefront_state: commerceReadback.storefront.state
  };
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

  for (const width of widths) {
    const mobile = width < 1024;
    const viewportHierarchy = await readJson(
      await apiContext.request.get(`${memberBase}/hierarchy`),
      `${width}px current canonical hierarchy`
    );
    const viewportProjection = await readJson(
      await apiContext.request.get(`${memberBase}/graph/projection`),
      `${width}px current graph projection`
    );
    const viewportEntityIds = new Set(viewportProjection.entities.map((entity) => entity.entity_id));
    const viewportEdgeIds = new Set(viewportProjection.edges.map((edge) => edge.edge_id));
    const viewportRoots = viewportProjection.entities.filter(
      (entity) => entity.parent_id === null && entity.entity_type === "ENTRAL"
    );
    if (
      viewportProjection.organization_id !== organizationId
      || viewportProjection.projection_version !== viewportHierarchy.event_sequence
      || viewportEntityIds.size !== authorizedEntityIds.size
      || viewportEdgeIds.size !== authorizedEdgeIds.size
      || [...viewportEntityIds].some((id) => !authorizedEntityIds.has(id))
      || [...viewportEdgeIds].some((id) => !authorizedEdgeIds.has(id))
      || viewportRoots.length !== 1
      || viewportRoots[0].entity_id !== viewportProjection.root_id
    ) {
      throw new Error(`${width}px current projection changed canonical authority, topology, root, or hierarchy alignment.`);
    }
    const rendererAuthorization = {
      authorizedEdgeIds: viewportEdgeIds,
      authorizedEntityIds: viewportEntityIds,
      projectionVersion: viewportProjection.projection_version,
      requiredEntityIds: new Set(commerceEntityIds)
    };
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
      const destinationVisualEvidence = [];
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
      await expectVisible(
        command.locator('[data-command-priority="active-work"]').filter({ hasText: commerceBusiness.business_name }),
        `${width}px Command active work for SP-COMMERCE-001`
      );
      const commandScope = await canonicalScopeSnapshot(page);
      await assertNoCanonicalSyncError(page, `${width}px Command`);
      destinationVisualEvidence.push(await captureDestinationScreenshot(page, {
        destination: "COMMAND",
        root: command,
        width
      }));

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
      destinationVisualEvidence.push(await captureDestinationScreenshot(page, {
        destination: "BUSINESSES",
        root: businesses,
        width
      }));
      if (destinationVisualEvidence[0].screenshot_sha256 === destinationVisualEvidence[1].screenshot_sha256) {
        throw new Error(`${width}px Command and Businesses screenshots were not visibly distinct.`);
      }

      const commerceCard = businesses.locator(".phase170-business-card")
        .filter({ hasText: commerceBusiness.business_name });
      await expectVisible(commerceCard, `${width}px canonical SP-COMMERCE-001 business card`);
      await commerceCard.getByRole("link", { name: "Open business" }).click();
      await page.waitForURL(new RegExp(`record=${commerceBusiness.business_id}`));
      const commerceDetail = page.locator('[data-businesses-section="business-detail"]');
      await expectVisible(commerceDetail, `${width}px canonical SP-COMMERCE-001 full record`);
      await expectVisible(
        commerceDetail.getByRole("heading", { level: 1, name: commerceBusiness.business_name }),
        `${width}px canonical SP-COMMERCE-001 record heading`
      );
      const commercePanel = commerceDetail.locator(".phase204-commerce");
      await expectVisible(commercePanel, `${width}px Phase 204 internal commerce truth`, 45_000);
      await expectVisible(
        commercePanel.getByRole("heading", { name: "Products and readiness" }),
        `${width}px Phase 204 finished product line`,
        45_000
      );
      if (
        await commercePanel.locator("[data-product-code]").count() !== PHASE204_PRODUCT_PRICES.size
        || await commercePanel.locator('.phase204-state[role="alert"]').count()
        || await commercePanel.getByText("Delivery ready", { exact: true }).count() !== PHASE204_PRODUCT_PRICES.size
      ) {
        throw new Error(`${width}px SP-COMMERCE-001 full record did not expose five verified delivery-ready products.`);
      }
      await commerceDetail.getByRole("link", { name: "Back to portfolio" }).click();
      await page.waitForURL(/\/member\/dashboard\?[^#]*destination=businesses/);
      const businessScopeSelector = page.getByLabel("Canonical business scope");
      await businessScopeSelector.selectOption(commerceBusiness.business_id);
      await page.waitForFunction(
        (businessId) => document.querySelector('select[aria-label="Canonical business scope"]')?.value === businessId,
        commerceBusiness.business_id
      );
      const commerceScope = await canonicalScopeSnapshot(page);
      if (commerceScope.business !== commerceBusiness.business_id) {
        throw new Error(`${width}px canonical SP-COMMERCE-001 scope was not preserved for the production graph journey.`);
      }

      await navigation.getByRole("link", { name: "Universe" }).click();
      await page.waitForURL(/\/member\/graph/);
      if (JSON.stringify(await canonicalScopeSnapshot(page)) !== JSON.stringify(commerceScope)) {
        throw new Error(`${width}px Businesses to Universe navigation did not preserve organization and SP-COMMERCE-001 scope.`);
      }
      const workspace = page.locator(".phase180-graph-workspace");
      await expectVisible(workspace, `${width}px Universe workspace`, 45_000);
      await page.waitForFunction(({ nodes, version }) => {
        const element = document.querySelector(".phase180-graph-workspace");
        return Number(element?.getAttribute("data-authorized-projection-entity-count")) === nodes
          && Number(element?.getAttribute("data-canonical-entity-count")) >= 1
          && Number(element?.getAttribute("data-canonical-event-sequence")) === version;
      }, { nodes: viewportProjection.entities.length, version: viewportProjection.projection_version });
      await assertNoCanonicalSyncError(page, `${width}px Universe`);
      const parityKey = await workspace.getAttribute("data-graph-parity-key");
      const eventSequence = await workspace.getAttribute("data-canonical-event-sequence");
      if (!parityKey || Number(eventSequence) !== viewportProjection.projection_version) {
        throw new Error(`${width}px Universe did not bind canonical projection parity and version.`);
      }
      let desktopLayoutEvidence = null;
      if (!mobile) await selectDesktopSideBySide(workspace);

      // Acceptance must exercise both mobile renderers without assuming which
      // synchronized dimension a member's current URL preference selects.
      if (mobile) {
        const initialToolbar = page.getByRole("toolbar", { name: "Compact mobile Universe controls" });
        await expectVisible(initialToolbar, `${width}px compact Universe toolbar`);
        await switchMobileGraphDimension(page, initialToolbar, "2d", width, "initial mobile selection");
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
        await switchMobileGraphDimension(page, toolbar, "3d", width, "portrait switch");
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
        await switchMobileGraphDimension(page, toolbar, "2d", width, "portrait return");
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
        await switchMobileGraphDimension(page, toolbar, "3d", width, "landscape switch");
        await expectVisible(threeD, `${width}px landscape 3D projection`, 60_000);
        presentationEvidence.push(await captureGraphPresentation(page, workspace, {
          dimension: "3d",
          orientation: "landscape",
          width
        }));
        await switchMobileGraphDimension(page, toolbar, "2d", width, "landscape return");
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
        desktopLayoutEvidence = await measureDesktopSideBySide(workspace, width);
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
        internal_commerce_full_record_verified: true,
        internal_commerce_graph_entity_count: commerceEntityIds.length,
        desktop_layout_evidence: desktopLayoutEvidence,
        desktop_side_by_side: !mobile && Boolean(desktopLayoutEvidence),
        destination_visual_evidence: destinationVisualEvidence,
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
  await apiContext.close();
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
  destination_visual_evidence_verified: observed.every((viewport) =>
    Array.isArray(viewport.destination_visual_evidence)
      && viewport.destination_visual_evidence.length === 2
      && viewport.destination_visual_evidence.every((entry) => /^[a-f0-9]{64}$/.test(entry.screenshot_sha256))),
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
  phase: 204,
  phase204_internal_business_code: PHASE204_INTERNAL_BUSINESS_CODE,
  phase204_internal_business_verified: true,
  phase204_internal_commerce_entity_count: commerceEntityIds.length,
  phase204_internal_commerce_endpoint_readback: phase204EndpointReadback,
  phase204_internal_commerce_readback_verified: true,
  pre_phase_202_provenance_verified: true,
  projection_organization_bound: true,
  receipt_id: "P204-INTERNAL-COMMERCE-PRODUCTION-JOURNEY-001",
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

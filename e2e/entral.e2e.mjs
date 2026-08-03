import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { generatePhase180BenchmarkFixture } from "../scripts/phase180-benchmark.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://127.0.0.1:3000";
const backendUrl = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4000";
const frontendTarget = new URL(frontendUrl);
const backendTarget = new URL(backendUrl);
const pnpm = process.env.E2E_PNPM_PATH
  ?? process.env.npm_execpath
  ?? join(repoRoot, ".corepack/v1/pnpm/9.12.3/bin/pnpm.cjs");
const backendRequire = createRequire(new URL("../backend/package.json", import.meta.url));
const { chromium } = backendRequire("playwright-core");
const spawned = [];
const phase180ScaleMeasurements = [];
let browser;

function windowsPath(value) {
  return value ? value.replace(/^\/([A-Za-z]:\/)/, "$1") : value;
}

function browserExecutable() {
  const candidates = [
    process.env.E2E_BROWSER_EXECUTABLE,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`
  ].filter(Boolean);

  return candidates.find((candidate) => {
    try {
      backendRequire("node:fs").accessSync(candidate);
      return true;
    } catch {
      return false;
    }
  });
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHttp(url, label, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await fetchOk(url)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 750));
  }

  throw new Error(`${label} did not become ready at ${url}`);
}

function spawnServer(name, args, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  spawned.push(child);
  const prefix = `[e2e:${name}]`;
  child.stdout.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) process.stdout.write(`${prefix} ${line}\n`);
    }
  });
  child.stderr.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) process.stderr.write(`${prefix} ${line}\n`);
    }
  });

  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      process.stderr.write(`${prefix} exited with code ${code}${signal ? ` (${signal})` : ""}\n`);
    }
  });

  return child;
}

async function ensureServers() {
  if (!await fetchOk(`${backendUrl}/health`)) {
    spawnServer("backend", [pnpm, "--filter", "@entral/backend", "dev:memory"], {
      API_HOST: "127.0.0.1",
      API_PORT: backendTarget.port || "4000",
      DATABASE_URL: "postgresql://entral:entral@127.0.0.1:5432/entral_e2e",
      JWT_SECRET: "entral-e2e-local-only-secret-32-characters",
      OPENAI_API_KEY: ""
    });
  }

  await waitForHttp(`${backendUrl}/health`, "Memory backend");

  if (!await fetchOk(frontendUrl)) {
    spawnServer("frontend", [
      pnpm,
      "--filter",
      "@entral/frontend",
      "exec",
      "next",
      "dev",
      "-H",
      frontendTarget.hostname,
      "-p",
      frontendTarget.port || "3000"
    ], {
      API_PROXY_URL: backendUrl,
      NEXT_PUBLIC_API_URL: ""
    });
  }

  await waitForHttp(frontendUrl, "Frontend");
}

async function stopServers() {
  if (browser) {
    await browser.close().catch(() => undefined);
    browser = undefined;
  }

  for (const child of spawned.reverse()) {
    child.stdout?.destroy();
    child.stderr?.destroy();

    if (child.killed) {
      child.unref?.();
      continue;
    }

    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }

    child.unref?.();
  }
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@entral.local`;
}

async function expectVisible(locator, label, timeout = 20_000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
  } catch (error) {
    throw new Error(`${label} was not visible. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function expectUrl(page, pattern, label) {
  try {
    await page.waitForURL(pattern, { timeout: 20_000 });
  } catch (error) {
    throw new Error(`${label} URL was not reached. Current URL: ${page.url()}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function expectStableScreenshot(locator, label, attempts = 12, intervalMs = 150) {
  let previous = await locator.screenshot();
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await locator.page().waitForTimeout(intervalMs);
    const current = await locator.screenshot();
    if (previous.equals(current)) return current;
    previous = current;
  }
  throw new Error(`${label} did not settle into two consecutive identical frames.`);
}

async function expectScreenshotChange(locator, baseline, label, attempts = 12, intervalMs = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await locator.page().waitForTimeout(intervalMs);
    const current = await locator.screenshot();
    if (!baseline.equals(current)) return current;
  }
  throw new Error(`${label} did not change the rendered frame.`);
}

async function downloadText(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function newPage(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1366, height: 900 },
    isMobile: options.isMobile ?? false,
    hasTouch: options.hasTouch ?? options.isMobile ?? false,
    deviceScaleFactor: options.deviceScaleFactor ?? 1
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

const phase170Ids = {
  business: "423e4567-e89b-42d3-a456-426614174000",
  commander: "223e4567-e89b-42d3-a456-426614174000",
  event: "e23e4567-e89b-42d3-a456-426614174000",
  general: "523e4567-e89b-42d3-a456-426614174000",
  marshal: "323e4567-e89b-42d3-a456-426614174000",
  user: "123e4567-e89b-42d3-a456-426614174000"
};

function phase170Business(version = 3) {
  return {
    active_mission_count: 1,
    active_task_count: 2,
    agent_count: 3,
    automation_count: 1,
    business_id: phase170Ids.business,
    business_name: "Atlas Software",
    capital_available: 5000,
    commander_id: phase170Ids.commander,
    currency: "USD",
    general_id: phase170Ids.general,
    general_name: "Software",
    gross_revenue: 12500,
    health_drivers: [{
      code: "verified-margin",
      direction: "POSITIVE",
      evidence_ids: [],
      explanation: "The verified contribution snapshot is positive.",
      label: "Verified margin",
      severity: "INFO",
      source_freshness: "2026-07-25T00:00:00.000Z",
      value: 0.35
    }],
    health_score: 91,
    health_state: "HEALTHY",
    integration_count: 2,
    marshal_id: phase170Ids.marshal,
    marshal_name: "Digital Businesses",
    net_contribution: 4400,
    primary_objective: "Grow verified recurring revenue.",
    revenue_period_end: "2026-07-25T00:00:00.000Z",
    revenue_period_start: "2026-07-01T00:00:00.000Z",
    source_freshness: { finance: "2026-07-25T00:00:00.000Z" },
    stable_code: "business.software.atlas",
    status: "OPERATING",
    tool_count: 4,
    top_exception: null,
    top_recommendation: "Review the next evidence-backed expansion.",
    updated_at: version === 3 ? "2026-07-25T01:00:00.000Z" : "2026-07-25T03:00:00.000Z",
    version
  };
}

function phase170Portfolio(version = 3) {
  return {
    businesses: [phase170Business(version)],
    event_sequence: version === 3 ? 9 : 10,
    generated_at: "2026-07-25T03:00:00.000Z",
    scope: {
      label: "Human portfolio / all canonical businesses",
      mode: "HUMAN_PORTFOLIO",
      user_id: phase170Ids.user,
      visible_business_ids: [phase170Ids.business]
    },
    totals: {
      active_commanders: 1,
      active_soldiers: 2,
      businesses: 1,
      financials: [{
        business_count: 1,
        businesses_with_financials: 1,
        capital_available: 5000,
        currency: "USD",
        gross_revenue: 12500,
        net_contribution: 4400
      }],
      health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 1, UNKNOWN: 0, WATCH: 0 },
      unresolved_exceptions: 0
    }
  };
}

function phase170FullBusiness(version = 3) {
  const eventSequence = version === 3 ? 9 : 10;
  return {
    business: {
      agents_and_tools: { agents: [{ name: "Support Soldier", status: "ACTIVE" }], tool_grants: [] },
      aggregate_version: version,
      decisions_and_changes: { audit_timeline: [], decisions: [], governance_actions: [] },
      evidence_ids: [],
      external_activity: { source_records: [] },
      financials: { snapshots: [{ gross_revenue: 12500, net_contribution: 4400 }] },
      issues_and_recommendations: { recommendations: [] },
      loaded_at: "2026-07-25T03:00:00.000Z",
      operations: { missions: [{ title: "Verified delivery mission" }], schedules: [], tasks: [] },
      overview: { profile: { business_model: "Software" }, state: { status: "OPERATING" } },
      performance: { experiments: [], health_assessments: [], metrics: [], outcomes: [] },
      summary: phase170Business(version),
      version_history: [{
        changed_at: "2026-07-25T03:00:00.000Z",
        reason: "Canonical event refresh",
        version
      }]
    },
    event_sequence: eventSequence
  };
}

function phase180ScaleResponses() {
  const fixture = generatePhase180BenchmarkFixture();
  const scope = {
    label: "Isolated Phase 180 acceptance portfolio",
    mode: "HUMAN_PORTFOLIO",
    user_id: phase170Ids.user,
    visible_business_ids: fixture.businesses.map((business) => business.business_id)
  };
  return {
    hierarchy: {
      entities: fixture.entities,
      event_sequence: 9,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope
    },
    portfolio: {
      businesses: fixture.businesses,
      event_sequence: 9,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope,
      totals: {
        active_commanders: 500,
        active_soldiers: 9_368,
        businesses: 500,
        financials: [],
        health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 500, UNKNOWN: 0, WATCH: 0 },
        unresolved_exceptions: 0
      }
    }
  };
}

const phase195MemoryIds = {
  business: "11111111-1111-4111-8111-111111111116",
  commander: "11111111-1111-4111-8111-111111111114",
  entral: "11111111-1111-4111-8111-111111111111",
  general: "11111111-1111-4111-8111-111111111113",
  marshal: "11111111-1111-4111-8111-111111111112",
  scopeUser: "11111111-1111-4111-8111-111111111117",
  soldier: "11111111-1111-4111-8111-111111111115"
};

function phase195MemoryEntity(
  entityId,
  stableCode,
  entityType,
  name,
  parentId,
  businessId,
  childCount,
  overrides = {}
) {
  return {
    active_alert: null,
    active_task_count: entityType === "SOLDIER" ? 1 : 0,
    assigned_business_id: businessId,
    child_count: childCount,
    compute_tier: entityType === "ENTRAL" ? "orchestration" : "standard",
    current_mission: entityType === "SOLDIER" ? "Verify Phase 195 browser operation." : null,
    entity_id: entityId,
    entity_type: entityType,
    health: "HEALTHY",
    latest_material_result: entityType === "SOLDIER" ? { status: "verified" } : null,
    model_class: "development-memory",
    name,
    parent_id: parentId,
    stable_code: stableCode,
    status: "ACTIVE",
    updated_at: "2026-07-26T19:00:00.000Z",
    version: 1,
    ...overrides
  };
}

function phase195RenderedIdSignature(entityIds) {
  const seed = "entral-phase-195-2d-render-frame-v1";
  const input = `${seed}\u0000${entityIds.join("\u0000")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function phase195MemoryHierarchy() {
  const entities = [
    phase195MemoryEntity(phase195MemoryIds.entral, "ENTRAL.DEV", "ENTRAL", "ENTRAL", null, null, 1),
    phase195MemoryEntity(phase195MemoryIds.marshal, "MARSHAL.DEV", "MARSHAL", "Digital Businesses", phase195MemoryIds.entral, null, 1),
    phase195MemoryEntity(phase195MemoryIds.general, "GENERAL.DEV", "GENERAL", "Software", phase195MemoryIds.marshal, null, 1),
    phase195MemoryEntity(phase195MemoryIds.commander, "COMMANDER.DEV", "COMMANDER", "Atlas Commander", phase195MemoryIds.general, phase195MemoryIds.business, 1),
    phase195MemoryEntity(phase195MemoryIds.soldier, "SOLDIER.DEV", "SOLDIER", "Atlas Operations", phase195MemoryIds.commander, phase195MemoryIds.business, 0)
  ];
  return {
    entities,
    event_sequence: 9,
    generated_at: "2026-07-26T19:00:00.000Z",
    scope: {
      label: "Human portfolio / all canonical businesses",
      mode: "HUMAN_PORTFOLIO",
      user_id: phase195MemoryIds.scopeUser,
      visible_business_ids: [phase195MemoryIds.business]
    }
  };
}

const phase195AcceptanceIds = {
  businessA: "19510000-0000-4000-8000-000000000010",
  businessB: "19510000-0000-4000-8000-000000000011",
  commanderA: "19510000-0000-4000-8000-000000000006",
  commanderB: "19510000-0000-4000-8000-000000000007",
  entral: "19510000-0000-4000-8000-000000000001",
  generalA: "19510000-0000-4000-8000-000000000004",
  generalB: "19510000-0000-4000-8000-000000000005",
  marshalA: "19510000-0000-4000-8000-000000000002",
  marshalB: "19510000-0000-4000-8000-000000000003",
  soldierA: "19510000-0000-4000-8000-000000000008",
  soldierB: "19510000-0000-4000-8000-000000000009"
};

function phase195AcceptanceHierarchy() {
  const entities = [
    phase195MemoryEntity(phase195AcceptanceIds.entral, "entral", "ENTRAL", "ENTRAL", null, null, 2),
    phase195MemoryEntity(phase195AcceptanceIds.marshalA, "marshal-a", "MARSHAL", "Marshal A", phase195AcceptanceIds.entral, null, 1),
    phase195MemoryEntity(phase195AcceptanceIds.marshalB, "marshal-b", "MARSHAL", "Marshal B", phase195AcceptanceIds.entral, null, 1),
    phase195MemoryEntity(phase195AcceptanceIds.generalA, "general-a", "GENERAL", "General A", phase195AcceptanceIds.marshalA, phase195AcceptanceIds.businessA, 1),
    phase195MemoryEntity(phase195AcceptanceIds.generalB, "general-b", "GENERAL", "General B", phase195AcceptanceIds.marshalB, phase195AcceptanceIds.businessB, 1),
    phase195MemoryEntity(phase195AcceptanceIds.commanderA, "commander-a", "COMMANDER", "Commander A", phase195AcceptanceIds.generalA, phase195AcceptanceIds.businessA, 1),
    phase195MemoryEntity(phase195AcceptanceIds.commanderB, "commander-b", "COMMANDER", "Commander B", phase195AcceptanceIds.generalB, phase195AcceptanceIds.businessB, 1, {
      active_alert: "Authorized Phase 195 parity alert.",
      active_task_count: 3,
      current_mission: "Coordinate authorized Phase 195 graph parity.",
      latest_material_result: { status: "phase195-parity-verified" }
    }),
    phase195MemoryEntity(phase195AcceptanceIds.soldierA, "soldier-a", "SOLDIER", "Soldier A", phase195AcceptanceIds.commanderA, phase195AcceptanceIds.businessA, 0),
    phase195MemoryEntity(phase195AcceptanceIds.soldierB, "soldier-b", "SOLDIER", "Soldier B", phase195AcceptanceIds.commanderB, phase195AcceptanceIds.businessB, 0, {
      health: "WATCH",
      status: "PAUSED"
    })
  ];
  return {
    entities,
    event_sequence: 9,
    generated_at: "2026-07-26T19:00:00.000Z",
    scope: {
      label: "Phase 195 authorized acceptance scope",
      mode: "HUMAN_PORTFOLIO",
      user_id: phase195MemoryIds.scopeUser,
      visible_business_ids: [
        phase195AcceptanceIds.businessA,
        phase195AcceptanceIds.businessB
      ]
    }
  };
}

function phase195AllMarshalAcceptanceFixture() {
  const fixtureUuid = (sequence) =>
    `19520000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
  const entralId = fixtureUuid(1);
  const marshalCases = [];
  const entities = [];
  let generalSequence = 100;

  for (let marshalIndex = 0; marshalIndex < 8; marshalIndex += 1) {
    const marshalId = fixtureUuid(marshalIndex + 2);
    const generalCount = marshalIndex < 3 ? 16 : 15;
    const generalIds = [];
    for (let generalIndex = 0; generalIndex < generalCount; generalIndex += 1) {
      const generalId = fixtureUuid(generalSequence);
      generalSequence += 1;
      generalIds.push(generalId);
      entities.push(phase195MemoryEntity(
        generalId,
        `general-${String(marshalIndex + 1).padStart(2, "0")}-${String(generalIndex + 1).padStart(3, "0")}`,
        "GENERAL",
        `General ${marshalIndex + 1}.${generalIndex + 1}`,
        marshalId,
        null,
        0
      ));
    }
    marshalCases.push({
      generalIds,
      marshalId,
      name: `Marshal ${marshalIndex + 1}`
    });
    entities.push(phase195MemoryEntity(
      marshalId,
      `marshal-${String(marshalIndex + 1).padStart(2, "0")}`,
      "MARSHAL",
      `Marshal ${marshalIndex + 1}`,
      entralId,
      null,
      generalIds.length
    ));
  }

  entities.unshift(phase195MemoryEntity(
    entralId,
    "entral",
    "ENTRAL",
    "ENTRAL",
    null,
    null,
    marshalCases.length
  ));
  entities.sort((left, right) =>
    left.entity_type === "ENTRAL"
      ? -1
      : right.entity_type === "ENTRAL"
        ? 1
        : left.stable_code.localeCompare(right.stable_code)
  );

  return {
    hierarchy: {
      entities,
      event_sequence: 9,
      generated_at: "2026-07-26T19:00:00.000Z",
      scope: {
        label: "Phase 195 all-eight-Marshal browser fixture",
        mode: "HUMAN_PORTFOLIO",
        user_id: phase195MemoryIds.scopeUser,
        visible_business_ids: []
      }
    },
    marshalCases,
    rootId: entralId
  };
}

function phase195GraphSettings() {
  return {
    advanced_2d: {
      collision_padding: 12,
      edge_routing: "CURVED",
      fit_padding: 24,
      force_iterations: 0,
      grid_size: 16,
      grid_snapping: false,
      level_spacing: 64,
      minimap_visible: true,
      ring_spacing: 160,
      sector_padding: 0.1,
      sibling_spacing: 48,
      tree_orientation: "TOP_DOWN"
    },
    advanced_3d: {
      auto_orbit_enabled: false,
      auto_orbit_speed: 0.1,
      bloom_intensity: 0.2,
      camera_field_of_view: 50,
      cluster_spread: 1,
      collision_radius: 12,
      depth_scale: 1,
      edge_depth_fade: true,
      ellipse_eccentricity: 0.25,
      far_clip: 5_000,
      focus_distance: 600,
      focus_transition_ms: 350,
      lighting_intensity: 1,
      maximum_zoom: 3,
      minimum_zoom: 0.5,
      near_clip: 0.1,
      node_billboard: true,
      orbit_direction: "CLOCKWISE",
      orbit_tilt_degrees: 15,
      ring_spacing: 220,
      vertical_spread: 0.6
    },
    advanced_shared: {
      animation_duration_ms: 300,
      authority_band_spacing: 1,
      authority_score_influence: 0.2,
      background_visible: true,
      color_mode: "AUTHORITY",
      edge_curvature: 0.15,
      edge_opacity: 0.5,
      edge_width: 1,
      frame_rate_cap: 60,
      grid_visible: true,
      label_scale: 1,
      label_threshold: 0.35,
      legend_visible: true,
      level_of_detail: "AUTO",
      lineage_emphasis: 1.4,
      maximum_live_labels: 200,
      motion_easing: "EASE_IN_OUT",
      node_scale: 1,
      performance_mode: "AUTO",
      rendering_quality: "HIGH",
      selected_node_scale: 1.35,
      stable_layout_seed: "entral-authority-v1",
      worker_usage: "AUTO"
    },
    pinned_positions: [],
    simple: {
      arrangement: "AUTO",
      connections: "RELEVANT",
      density: "BALANCED",
      labels: "RELEVANT",
      motion: "NORMAL",
      synchronized_navigation: true,
      three_d_layout: "AUTHORITY_RINGS",
      two_d_layout: "AUTHORITY_RADIAL"
    }
  };
}

function phase195GraphProjection(hierarchy, organizationId) {
  const tier = { COMMANDER: 3, ENTRAL: 0, GENERAL: 2, MARSHAL: 1, SOLDIER: 4 };
  const byId = new Map(hierarchy.entities.map((entity) => [entity.entity_id, entity]));
  const lineageById = new Map();
  function lineage(entityId, visited = new Set()) {
    if (lineageById.has(entityId)) return lineageById.get(entityId);
    const entity = byId.get(entityId);
    if (!entity || visited.has(entityId)) return [entityId];
    const nextVisited = new Set(visited).add(entityId);
    const value = entity.parent_id && byId.has(entity.parent_id)
      ? [...lineage(entity.parent_id, nextVisited), entityId]
      : [entityId];
    lineageById.set(entityId, value);
    return value;
  }
  const entities = hierarchy.entities.map((entity) => {
    const lineageIds = lineage(entity.entity_id);
    const marshalId = lineageIds
      .map((entityId) => byId.get(entityId))
      .find((candidate) => candidate?.entity_type === "MARSHAL")
      ?.entity_id ?? null;
    return {
      authority_score: entity.authority_score ?? null,
      authority_tier: tier[entity.entity_type],
      business_id: entity.assigned_business_id,
      display_name: entity.name,
      domain_id: entity.domain_id ?? marshalId,
      entity_id: entity.entity_id,
      entity_type: entity.entity_type,
      health: entity.health,
      hierarchy_level: tier[entity.entity_type],
      lineage_ids: lineageIds,
      marshal_id: marshalId,
      organization_id: organizationId,
      parent_id: entity.parent_id,
      stable_code: entity.stable_code,
      status: entity.status,
      version: entity.version
    };
  });
  return {
    contract_version: "1.0.0",
    edges: entities
      .filter((entity) => entity.parent_id)
      .map((entity) => ({
        direction: "OUTBOUND",
        edge_id: `hierarchy:${entity.parent_id}:${entity.entity_id}`,
        lineage: true,
        relation_type: "HIERARCHY",
        source_id: entity.parent_id,
        status: entity.status,
        target_id: entity.entity_id
      })),
    entities,
    evidence_version_reference: {
      event_sequence: hierarchy.event_sequence,
      source: "canonical_hierarchy"
    },
    generated_at: hierarchy.generated_at,
    organization_id: organizationId,
    projection_version: hierarchy.event_sequence,
    root_id: entities.find((entity) => entity.entity_type === "ENTRAL")?.entity_id ?? "no-authorized-root",
    schema_version: 1
  };
}

async function installPhase195GraphRoutes(page, hierarchy = phase195MemoryHierarchy()) {
  const requests = [];
  const telemetryRequests = [];
  let failureStatus = null;
  let preferenceVersion = 0;
  let settings = phase195GraphSettings();

  function organizationId(requestUrl) {
    const segments = new URL(requestUrl).pathname.split("/");
    const graphIndex = segments.lastIndexOf("graph");
    return decodeURIComponent(segments[graphIndex - 1] ?? "");
  }

  function preferences(requestUrl) {
    const saved = preferenceVersion > 0;
    return {
      contract_version: "1.0.0",
      created_at: saved ? "2026-07-26T19:00:00.000Z" : null,
      migrated_from_schema_version: null,
      organization_id: organizationId(requestUrl),
      preference_id: saved ? "19500000-0000-4000-8000-000000000003" : null,
      schema_version: 2,
      settings,
      source: saved ? "SAVED_OVERRIDE" : "CANONICAL_DEFAULTS",
      updated_at: saved ? "2026-07-26T19:00:00.000Z" : null,
      user_id: hierarchy.scope.user_id,
      version: preferenceVersion
    };
  }

  await page.route("**/member/api/v1/member/organizations/*/graph/projection", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: phase195GraphProjection(hierarchy, organizationId(route.request().url())),
      status: 200
    });
  });
  await page.route("**/member/api/v1/member/organizations/*/graph/telemetry", async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    telemetryRequests.push(body);
    await route.fulfill({
      contentType: "application/json",
      json: {
        accepted: true,
        contract_version: "1.0.0",
        organization_id: organizationId(request.url()),
        recorded_at: "2026-07-26T19:00:00.000Z",
        schema_version: 1,
        telemetry_id: body.telemetry_id
      },
      status: 202
    });
  });
  await page.route("**/member/api/v1/member/organizations/*/graph/preferences", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "GET") {
      await route.fulfill({ contentType: "application/json", json: preferences(request.url()), status: 200 });
      return;
    }
    const body = request.postDataJSON();
    requests.push({ body, method });
    if (failureStatus) {
      const status = failureStatus;
      failureStatus = null;
      await route.fulfill({
        contentType: "application/json",
        json: { error: status === 409 ? "Conflict" : "Service Unavailable", message: status === 409 ? "Graph preferences changed in another session." : "Graph preference service unavailable." },
        status
      });
      return;
    }
    if (body.expected_version !== preferenceVersion) {
      await route.fulfill({
        contentType: "application/json",
        json: { error: "Conflict", message: "Graph preferences changed in another session." },
        status: 409
      });
      return;
    }
    if (method === "PUT") {
      settings = body.settings;
      preferenceVersion += 1;
    } else if (method === "DELETE") {
      settings = phase195GraphSettings();
      preferenceVersion = 0;
    }
    await route.fulfill({
      contentType: "application/json",
      json: {
        event_ids: ["19500000-0000-4000-8000-000000000004"],
        idempotent_replay: false,
        preferences: preferences(request.url())
      },
      status: 200
    });
  });

  return {
    failNextMutation(status) {
      failureStatus = status;
    },
    preferences: () => ({ settings, version: preferenceVersion }),
    requests,
    telemetryRequests
  };
}

function rectanglesOverlap(left, right, inset = 0) {
  return left.left + inset < right.right - inset
    && left.right - inset > right.left + inset
    && left.top + inset < right.bottom - inset
    && left.bottom - inset > right.top + inset;
}

async function capturePhase200GraphPresentation(page, workspace, { dimension, orientation, width }) {
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
    throw new Error(`Phase 200 ${width}px ${orientation} canonical scope selector/status collision: ${JSON.stringify(scopeGeometry)}`);
  }
  const stage = workspace.locator(
    `[data-graph-dimension="${dimension}"] ${dimension === "2d" ? ".phase180-graph-stage" : ".phase180-graph-3d-stage"}`
  );
  await expectVisible(stage, `Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} canonical graph stage`);
  await stage.scrollIntoViewIfNeeded();
  const assistantLauncher = page.getByRole("button", { name: "Open ENTRAL assistant" });
  await expectVisible(assistantLauncher, `Phase 200 ${width}px ${orientation} ENTRAL assistant launcher`);
  let actual3DCameraTargetEntityId = null;
  if (dimension === "3d") {
    const canvas = stage.locator("canvas.command-center-canvas");
    await expectVisible(canvas, `Phase 200 ${width}px ${orientation} 3D renderer canvas`);
    const box = await canvas.boundingBox();
    if (!box) throw new Error(`Phase 200 ${width}px ${orientation} 3D renderer canvas had no measurable bounds.`);
    const expectedEntityId = await workspace.locator('.phase180-graph-3d[data-graph-dimension="3d"]')
      .getAttribute("data-canonical-selected-entity-id");
    if (!expectedEntityId) throw new Error(`Phase 200 ${width}px ${orientation} 3D renderer had no selected entity before camera hit testing.`);
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
    await page.waitForFunction((expected) => {
      const renderer = document.querySelector('[data-graph-dimension="3d"]');
      return renderer?.getAttribute("data-canonical-selected-entity-id") === expected;
    }, expectedEntityId, { timeout: 5_000 });
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
    const selectedEntityId = renderer?.getAttribute("data-canonical-selected-entity-id") ?? null;
    const anchorXValue = renderer?.getAttribute("data-canonical-focus-anchor-x") ?? null;
    const anchorYValue = renderer?.getAttribute("data-canonical-focus-anchor-y") ?? null;
    const anchorX = anchorXValue === null ? null : Number(anchorXValue);
    const anchorY = anchorYValue === null ? null : Number(anchorYValue);
    let protectedFocalRegion = {
      bottom: stageBox.top + (stageBox.height * focalCenterY) + (protectedHeight / 2),
      height: protectedHeight,
      left: stageBox.left + (stageBox.width * focalCenterX) - (protectedWidth / 2),
      right: stageBox.left + (stageBox.width * focalCenterX) + (protectedWidth / 2),
      top: stageBox.top + (stageBox.height * focalCenterY) - (protectedHeight / 2),
      width: protectedWidth
    };
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
  if (geometry.error) throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} geometry failed: ${geometry.error}`);
  if (
    geometry.stage.bottom <= 0 || geometry.stage.top >= await page.evaluate(() => window.innerHeight)
    || geometry.stage.right <= 0 || geometry.stage.left >= await page.evaluate(() => window.innerWidth)
  ) {
    throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} canonical graph stage was outside the viewport during collision measurement.`);
  }
  for (const required of ["assistantLauncher", "inspector", "legend", ...(width < 1024 ? ["toolbar"] : [])]) {
    if (!geometry[required]) {
      throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} did not expose a visible ${required}.`);
    }
  }
  if (
    geometry.protectedFocalRegion.left < geometry.stage.left
    || geometry.protectedFocalRegion.right > geometry.stage.right
    || geometry.protectedFocalRegion.top < geometry.stage.top
    || geometry.protectedFocalRegion.bottom > geometry.stage.bottom
  ) {
    throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} protected focal region escaped the canonical graph stage.`);
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
      throw new Error(`Phase 200 ${width}px ${orientation} 2D selected entity was not bound to an in-stage camera focus anchor: ${JSON.stringify(geometry.focus)}`);
    }
    const focusPoint = {
      bottom: geometry.focus.anchorViewportY + 1,
      left: geometry.focus.anchorViewportX - 1,
      right: geometry.focus.anchorViewportX + 1,
      top: geometry.focus.anchorViewportY - 1
    };
    for (const overlay of ["assistant", "assistantLauncher", "inspector", "legend", "toolbar"]) {
      if (geometry[overlay] && rectanglesOverlap(geometry[overlay], focusPoint)) {
        throw new Error(`Phase 200 ${width}px ${orientation} 2D ${overlay} covered the selected entity camera focus anchor.`);
      }
    }
    if (width < 1024 && (
      rectanglesOverlap(geometry.inspector, geometry.stage, 0)
      || geometry.inspector.top < geometry.stage.bottom - 2
    )) {
      throw new Error(`Phase 200 ${width}px ${orientation} 2D inspector remained over the canonical node field: ${JSON.stringify(geometry)}`);
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
      throw new Error(`Phase 200 ${width}px ${orientation} 2D label or tooltip presentation escaped its viewport contract: ${JSON.stringify(geometry.presentation)}`);
    }
  } else if (
    !geometry.focus.selectedEntityId
    || geometry.focus.cameraTargetEntityId !== geometry.focus.selectedEntityId
    || geometry.focus.actualCameraTargetEntityId !== geometry.focus.selectedEntityId
    || !Number.isFinite(geometry.focus.cameraTargetSignal)
    || geometry.focus.cameraTargetSignal < 1
  ) {
    throw new Error(`Phase 200 ${width}px ${orientation} 3D selected entity was not the active camera target: ${JSON.stringify(geometry.focus)}`);
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
    throw new Error(`Phase 200 ${width}px ${orientation} 3D presentation policy was not bounded: ${JSON.stringify(geometry.presentation)}`);
  }
  if (width < 1024 && (
    geometry.toolbar.scrollWidth > geometry.toolbar.clientWidth + 1
    || !geometry.toolbar.buttonsContained
  )) {
    throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} compact toolbar overflowed its viewport: ${JSON.stringify(geometry.toolbar)}`);
  }
  for (const [left, right] of [
    ["inspector", "toolbar"],
    ["legend", "assistantLauncher"],
    ["legend", "inspector"],
    ["legend", "toolbar"],
    ["assistantLauncher", "inspector"],
    ["assistantLauncher", "toolbar"]
  ]) {
    if (geometry[left] && geometry[right] && rectanglesOverlap(geometry[left], geometry[right], 2)) {
      throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} ${left}/${right} collision: ${JSON.stringify(geometry)}`);
    }
  }
  for (const overlay of ["assistantLauncher", "inspector", "legend", "toolbar"]) {
    if (geometry[overlay] && rectanglesOverlap(geometry[overlay], geometry.protectedFocalRegion, 2)) {
      throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} ${overlay} obscured the protected graph focal region: ${JSON.stringify(geometry)}`);
    }
  }
  const screenshotName = `universe-${width}px-${orientation}-${dimension}.png`;
  const screenshotPath = join(repoRoot, "test-results", "e2e", "phase200-presentation", screenshotName);
  await mkdir(join(repoRoot, "test-results", "e2e", "phase200-presentation"), { recursive: true });
  /* Capture the live graph viewport before expanding the document-flow
     assistant. Full-page Chromium tiling can smear preserved WebGL buffers and
     is not valid visual evidence for selected-node visibility. */
  const screenshot = await page.screenshot({ animations: "disabled", fullPage: false, path: screenshotPath });
  await assistantLauncher.click();
  const assistantRegion = page.getByRole("region", { name: "ENTRAL assistant" });
  await expectVisible(assistantRegion, `Phase 200 ${width}px ${orientation} expanded ENTRAL assistant`);
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
  if (!expandedGeometry.assistant) throw new Error(`Phase 200 ${width}px ${orientation} expanded ENTRAL assistant had no measurable document-flow rectangle.`);
  for (const surface of ["inspector", "legend", "stage", "toolbar"]) {
    if (expandedGeometry[surface] && rectanglesOverlap(expandedGeometry.assistant, expandedGeometry[surface], 2)) {
      throw new Error(`Phase 200 ${width}px ${orientation} ${dimension.toUpperCase()} expanded assistant/${surface} collision: ${JSON.stringify(expandedGeometry)}`);
    }
  }
  await assistantRegion.getByRole("button", { name: "Close ENTRAL assistant" }).click();
  return {
    collision_free: true,
    dimension: dimension.toUpperCase(),
    focus_bound_to_selected_entity: true,
    orientation,
    protected_focal_region_clear: true,
    screenshot_file: `phase200-presentation/${screenshotName}`,
    screenshot_sha256: createHash("sha256").update(screenshot).digest("hex"),
    viewport_width: width
  };
}

async function installPhase200InteractionRoutes(page, {
  currentAnchorId = "universe-navigation"
} = {}) {
  const analyticsRequests = [];
  const mutationRequests = [];
  const mutationReceipts = new Map();
  let revision = 1;
  let progressState = {
    business_model_context: "Software",
    commander_pack_context: "Operations",
    completed_anchor_ids: ["command-overview"],
    completed_at: null,
    contract_version: "1.0.0",
    current_anchor_id: currentAnchorId,
    first_launch_seen: true,
    mode: "beginner",
    organization_id: "pending",
    plan_context: "Owner",
    release_version: "phase-200",
    revision,
    role_context: "OWNER",
    schema_version: 1,
    started_at: "2026-08-02T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    user_id: phase170Ids.user
  };

  function organizationId(requestUrl) {
    const segments = new URL(requestUrl).pathname.split("/");
    const organizationsIndex = segments.lastIndexOf("organizations");
    return decodeURIComponent(segments[organizationsIndex + 1] ?? "");
  }

  function progress(requestUrl) {
    return { ...progressState, organization_id: organizationId(requestUrl) };
  }

  function mutationResponse(requestUrl, action, body, priorRevision, idempotentReplay = false) {
    const progressSnapshot = progress(requestUrl);
    return {
      idempotent_replay: idempotentReplay,
      progress: progressSnapshot,
      transition: {
        action,
        actor_user_id: progressSnapshot.user_id,
        authorization: "AUTHENTICATED_OWNER",
        budget: { amount_cents: 0, kind: "NO_EXTERNAL_SPEND" },
        business_id: null,
        evidence: [{ source_id: `tutorial-progress:${progressSnapshot.organization_id}:${progressSnapshot.revision}`, source_type: "TUTORIAL_PROGRESS" }],
        failure_behavior: "CONFLICT_NO_WRITE",
        idempotency_key: body.idempotency_key,
        occurred_at: progressSnapshot.updated_at,
        organization_id: progressSnapshot.organization_id,
        prior_revision: priorRevision,
        reconciliation: "OPTIMISTIC_REVISION_AND_READBACK",
        release_version: "phase-200",
        resulting_revision: progressSnapshot.revision,
        reversible: true,
        tenant_id: progressSnapshot.organization_id,
        verification: "TRANSACTIONAL_READ_AFTER_WRITE"
      }
    };
  }

  await page.route("**/member/api/v1/member/organizations/*/interaction/business-health?*", async (route) => {
    const requestUrl = route.request().url();
    const mode = new URL(requestUrl).searchParams.get("mode") === "OPERATIONAL" ? "OPERATIONAL" : "EXECUTIVE";
    await route.fulfill({
      contentType: "application/json",
      json: {
        contract_version: "1.0.0",
        evidence: [{
          evidence_id: "canonical-portfolio:9",
          freshness: "CURRENT",
          label: "Canonical portfolio event 9",
          observed_at: "2026-08-02T00:00:00.000Z",
          source_id: "portfolio:event:9",
          source_type: "CANONICAL_PORTFOLIO"
        }],
        health: {
          drivers: mode === "OPERATIONAL" ? phase170Business().health_drivers : [],
          score: 91,
          state: "HEALTHY",
          summary: "Recorded canonical health is healthy at portfolio event 9.",
          value_status: "RECORDED"
        },
        identity: {
          name: "ENTRAL",
          provider_independent: true,
          release_version: "phase-200",
          voice_version: "entral-voice-v1"
        },
        mode,
        schema_version: 1,
        truth: {
          assumptions: [],
          business_id: null,
          business_scope: "Human portfolio / all canonical businesses",
          confidence: "RECORDED",
          evidence_freshness: { observed_at: "2026-08-02T00:00:00.000Z", state: "CURRENT" },
          next_action: {
            action_id: "OPEN_CANONICAL_BUSINESS_RECORD",
            available: true,
            label: "Review the canonical business record",
            unavailable_reason: null
          },
          organization_id: organizationId(requestUrl)
        }
      },
      status: 200
    });
  });

  await page.route("**/member/api/v1/member/organizations/*/interaction/tutorial-progress", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ contentType: "application/json", json: progress(request.url()), status: 200 });
      return;
    }

    const body = request.postDataJSON();
    mutationRequests.push({ body, method: request.method() });
    const replay = mutationReceipts.get(body.idempotency_key);
    if (replay) {
      await route.fulfill({ contentType: "application/json", json: { ...replay, idempotent_replay: true }, status: 200 });
      return;
    }
    if (body.expected_revision !== revision) {
      await route.fulfill({
        contentType: "application/json",
        json: { error: "Conflict", message: "Tutorial progress changed in another session." },
        status: 409
      });
      return;
    }

    const priorRevision = revision;
    revision += 1;
    const reset = request.method() === "DELETE";
    progressState = {
      ...progressState,
      completed_anchor_ids: reset ? [] : body.completed_anchor_ids,
      current_anchor_id: reset ? "command-overview" : body.current_anchor_id,
      first_launch_seen: reset ? true : body.first_launch_seen,
      mode: reset ? "beginner" : body.mode,
      revision,
      updated_at: new Date(Date.parse(progressState.updated_at) + 1_000).toISOString()
    };
    const response = mutationResponse(request.url(), reset ? "RESET" : "UPDATE", body, priorRevision);
    mutationReceipts.set(body.idempotency_key, response);
    await route.fulfill({ contentType: "application/json", json: response, status: 200 });
  });

  await page.route("**/member/api/v1/member/organizations/*/interaction/analytics", async (route) => {
    analyticsRequests.push(route.request().postDataJSON());
    await route.fulfill({ contentType: "application/json", json: { accepted: true }, status: 202 });
  });

  return {
    analyticsRequests,
    mutationRequests,
    progress: () => ({ ...progressState })
  };
}

function phase202MfaReceipt(transition, idempotencyKey) {
  const transitionState = {
    TOTP_CONFIRM: {
      authorization: "TOTP",
      factor_status: "ACTIVE",
      one_time_material_policy: "RECOVERY_CODES_RETURNED_ONCE",
      prior_version: 1,
      recovery_action: "REGENERATE_RECOVERY_CODES",
      session_step_up_at: "2026-08-02T10:05:00.000Z",
      transition_id: "123e4567-e89b-42d3-a456-426614174202"
    },
    TOTP_ENROLL: {
      authorization: "DURABLE_SESSION",
      factor_status: "PENDING",
      one_time_material_policy: "TOTP_SECRET_RETURNED_ONCE",
      prior_version: 0,
      recovery_action: "BEGIN_NEW_ENROLLMENT",
      session_step_up_at: null,
      transition_id: "123e4567-e89b-42d3-a456-426614174201"
    }
  }[transition];
  if (!transitionState) throw new Error(`Unsupported Phase 202 MFA transition fixture: ${transition}.`);

  return {
    actor: {
      actor_id: "123e4567-e89b-42d3-a456-426614174001",
      actor_type: "HUMAN",
      agent_id: null,
      human_user_id: "phase202-e2e-owner",
      service_subject: null
    },
    authorization: transitionState.authorization,
    budget: { amount_minor_units: 0, kind: "NO_EXTERNAL_SPEND" },
    contract_version: "1.0.0",
    evidence: [`phase202-browser-fixture:${transition.toLowerCase()}`],
    factor_id: "123e4567-e89b-42d3-a456-426614174020",
    factor_status: transitionState.factor_status,
    failure_behavior: "NO_PARTIAL_WRITE",
    idempotency_key: idempotencyKey,
    occurred_at: "2026-08-02T10:05:00.000Z",
    one_time_material_policy: transitionState.one_time_material_policy,
    ownership: {
      business_id: null,
      data_residency: null,
      environment: "PRODUCTION",
      organization_id: null,
      scope_kind: "PERSONAL",
      tenant_id: null
    },
    prior_version: transitionState.prior_version,
    reconciliation: "IDEMPOTENT_RECEIPT",
    recovery_action: transitionState.recovery_action,
    release_version: "phase-202",
    request_id: `phase202-browser-${transition.toLowerCase()}`,
    resulting_version: transitionState.prior_version + 1,
    reversible: true,
    schema_version: 1,
    session_id: "123e4567-e89b-42d3-a456-426614174101",
    session_step_up_at: transitionState.session_step_up_at,
    transition,
    transition_id: transitionState.transition_id,
    verification: "TRANSACTIONAL_READBACK"
  };
}

function phase202SessionReceipt(sessionId, idempotencyKey) {
  return {
    actor: {
      actor_id: "123e4567-e89b-42d3-a456-426614174001",
      actor_type: "HUMAN",
      agent_id: null,
      human_user_id: "phase202-e2e-owner",
      service_subject: null
    },
    budget: { amount_minor_units: 0, kind: "NO_EXTERNAL_SPEND" },
    contract_version: "1.0.0",
    evidence: ["phase202-browser-fixture:session-revoke-one"],
    failure_behavior: "NO_PARTIAL_WRITE",
    idempotency_key: idempotencyKey,
    occurred_at: "2026-08-02T10:10:00.000Z",
    ownership: {
      business_id: null,
      data_residency: null,
      environment: "PRODUCTION",
      organization_id: null,
      scope_kind: "PERSONAL",
      tenant_id: null
    },
    prior_version: 1,
    reconciliation: "IDEMPOTENT_RECEIPT",
    release_version: "phase-202",
    request_id: "phase202-browser-session-revoke-one",
    resulting_version: 2,
    reversible: false,
    revoked_count: 1,
    schema_version: 1,
    subject_session_id: sessionId,
    transition: "REVOKE_ONE",
    transition_id: "123e4567-e89b-42d3-a456-426614174099",
    verification: "TRANSACTIONAL_READBACK"
  };
}

async function installPhase202AccountSecurityRoutes(page) {
  const setupSecret = "PHASE202-ONE-TIME-SETUP-KEY";
  const recoveryCodes = ["PHASE202-RECOVERY-A", "PHASE202-RECOVERY-B"];
  const requests = [];
  const factorId = "123e4567-e89b-42d3-a456-426614174020";
  let factors = [];
  let sessions = [
    {
      actor_id: "123e4567-e89b-42d3-a456-426614174001",
      current: true,
      device_label: "Chrome on Windows",
      expires_at: "2099-09-01T09:00:00.000Z",
      issued_at: "2026-08-02T09:00:00.000Z",
      last_used_at: "2026-08-02T10:00:00.000Z",
      organization_id: "123e4567-e89b-42d3-a456-426614174002",
      revoked_at: null,
      session_id: "123e4567-e89b-42d3-a456-426614174101",
      session_type: "MEMBER",
      support_grant_id: null,
      tenant_id: "123e4567-e89b-42d3-a456-426614174003"
    },
    {
      actor_id: "123e4567-e89b-42d3-a456-426614174001",
      current: false,
      device_label: "Safari on iPad",
      expires_at: "2099-09-01T09:00:00.000Z",
      issued_at: "2026-08-02T09:00:00.000Z",
      last_used_at: "2026-08-02T09:30:00.000Z",
      organization_id: "123e4567-e89b-42d3-a456-426614174002",
      revoked_at: null,
      session_id: "123e4567-e89b-42d3-a456-426614174102",
      session_type: "MEMBER",
      support_grant_id: null,
      tenant_id: "123e4567-e89b-42d3-a456-426614174003"
    }
  ];
  const memberships = [{
    email: "owner@example.com",
    joined_at: "2026-01-01T00:00:00.000Z",
    name: "Owner Example",
    removed_at: null,
    role: "OWNER",
    status: "ACTIVE",
    suspended_at: null,
    user_id: "user-owner",
    version: 3
  }];
  const grants = [
    {
      access_mode: "READ_ONLY",
      approved_by_actor_id: "123e4567-e89b-42d3-a456-426614174001",
      expires_at: "2099-08-02T11:00:00.000Z",
      grant_id: "123e4567-e89b-42d3-a456-426614174010",
      issued_at: "2026-08-02T09:00:00.000Z",
      organization_id: "123e4567-e89b-42d3-a456-426614174002",
      owner_visible: true,
      purpose: "Production incident readback",
      revoked_at: null,
      scopes: ["graph.read", "telemetry.read"],
      support_actor_id: "123e4567-e89b-42d3-a456-426614174011",
      tenant_id: "123e4567-e89b-42d3-a456-426614174003",
      write_elevation_expires_at: null,
      write_elevation_purpose: null
    },
    {
      access_mode: "WRITE_ELEVATED",
      approved_by_actor_id: "123e4567-e89b-42d3-a456-426614174004",
      expires_at: "2020-08-02T11:00:00.000Z",
      grant_id: "123e4567-e89b-42d3-a456-426614174012",
      issued_at: "2020-08-02T09:00:00.000Z",
      organization_id: "123e4567-e89b-42d3-a456-426614174002",
      owner_visible: true,
      purpose: "Expired maintenance grant",
      revoked_at: null,
      scopes: ["identity.read"],
      support_actor_id: "123e4567-e89b-42d3-a456-426614174013",
      tenant_id: "123e4567-e89b-42d3-a456-426614174003",
      write_elevation_expires_at: "2020-08-02T10:00:00.000Z",
      write_elevation_purpose: "Historical maintenance"
    }
  ];

  await page.route("**/member/api/v1/identity/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    const idempotencyKey = request.headers()["idempotency-key"] ?? "phase202-browser-fixture-key";
    requests.push({ body, idempotency_key: idempotencyKey, method, pathname: url.pathname });

    if (method === "GET" && url.pathname.endsWith("/identity/sessions")) {
      await route.fulfill({ contentType: "application/json", json: { sessions }, status: 200 });
      return;
    }
    if (method === "DELETE" && url.pathname.includes("/identity/sessions/")) {
      const sessionId = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      sessions = sessions.map((session) => session.session_id === sessionId
        ? { ...session, revoked_at: "2026-08-02T10:10:00.000Z" }
        : session);
      await route.fulfill({
        contentType: "application/json",
        json: phase202SessionReceipt(sessionId, idempotencyKey),
        status: 200
      });
      return;
    }
    if (method === "GET" && url.pathname.endsWith("/identity/mfa/factors")) {
      await route.fulfill({ contentType: "application/json", json: { factors }, status: 200 });
      return;
    }
    if (method === "POST" && url.pathname.endsWith("/identity/mfa/totp/enroll")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          one_time_material: {
            factor_id: factorId,
            otpauth_uri: `otpauth://totp/Entral?secret=${setupSecret}`,
            secret: setupSecret
          },
          receipt: phase202MfaReceipt("TOTP_ENROLL", idempotencyKey),
          replayed: false
        },
        status: 200
      });
      return;
    }
    if (method === "POST" && url.pathname.endsWith("/identity/mfa/totp/confirm")) {
      factors = [{
        created_at: "2026-08-02T10:00:00.000Z",
        factor_id: factorId,
        factor_type: "TOTP",
        status: "ACTIVE",
        verified_at: "2026-08-02T10:05:00.000Z"
      }];
      await route.fulfill({
        contentType: "application/json",
        json: {
          one_time_material: { recovery_codes: recoveryCodes },
          receipt: phase202MfaReceipt("TOTP_CONFIRM", idempotencyKey),
          replayed: false
        },
        status: 200
      });
      return;
    }
    if (method === "POST" && url.pathname.endsWith("/identity/mfa/step-up")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          contract_version: "1.0.0",
          dependency: "AUTHORITY_STORE",
          occurred_at: "2026-08-02T10:15:00.000Z",
          reason_code: "MFA_FACTOR_STORE_UNAVAILABLE",
          retryable: true,
          schema_version: 1,
          status: "BLOCKED"
        },
        status: 503
      });
      return;
    }
    if (method === "GET" && url.pathname.endsWith("/identity/memberships")) {
      await route.fulfill({ contentType: "application/json", json: { memberships }, status: 200 });
      return;
    }
    if (method === "GET" && url.pathname.endsWith("/identity/support-access")) {
      await route.fulfill({ contentType: "application/json", json: { grants }, status: 200 });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      json: { message: `Unexpected Phase 202 fixture request: ${method} ${url.pathname}` },
      status: 500
    });
  });

  return {
    factors: () => factors.map((factor) => ({ ...factor })),
    recoveryCodes,
    requests,
    sessions: () => sessions.map((session) => ({ ...session })),
    setupSecret
  };
}

async function installPhase180ScaleRoutes(page, responses) {
  await page.route("**/member/api/v1/member/organizations/*/portfolio/summary", async (route) => {
    await route.fulfill({ contentType: "application/json", json: responses.portfolio, status: 200 });
  });
  await page.route("**/member/api/v1/member/organizations/*/hierarchy", async (route) => {
    await route.fulfill({ contentType: "application/json", json: responses.hierarchy, status: 200 });
  });
  return installPhase195GraphRoutes(page, responses.hierarchy);
}

async function installPhase170Routes(page, { emitEvent = false } = {}) {
  let version = 3;
  let eventSent = false;
  await page.route("**/api/v1/control-plane/portfolio/summary", async (route) => {
    await route.fulfill({ contentType: "application/json", json: phase170Portfolio(version), status: 200 });
  });
  await page.route(`**/api/v1/control-plane/businesses/${phase170Ids.business}/full`, async (route) => {
    await route.fulfill({ contentType: "application/json", json: phase170FullBusiness(version), status: 200 });
  });
  await page.route("**/api/v1/control-plane/events?afterSequence=*", async (route) => {
    const afterSequence = Number(new URL(route.request().url()).searchParams.get("afterSequence") ?? "0");
    if (emitEvent && !eventSent && afterSequence === 9) {
      eventSent = true;
      version = 4;
      await route.fulfill({
        contentType: "application/json",
        json: {
          events: [{
            aggregate_id: phase170Ids.business,
            aggregate_type: "BUSINESS",
            aggregate_version: 4,
            business_id: phase170Ids.business,
            event_id: phase170Ids.event,
            event_type: "BUSINESS_UPDATED",
            occurred_at: "2026-07-25T03:00:00.000Z",
            sequence_number: 10
          }],
          next_sequence: 10
        },
        status: 200
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: { events: [], next_sequence: Math.max(afterSequence, version === 4 ? 10 : 9) },
      status: 200
    });
  });
}

async function enterWorkspace(page, email = uniqueEmail("operator")) {
  const response = await page.context().request.post(`${frontendUrl}/api/v1/signup`, {
    data: {
      email,
      name: "E2E Operator",
      password: "password123"
    }
  });

  if (!response.ok()) {
    throw new Error(`E2E owner-session setup failed with HTTP ${response.status()}.`);
  }

  const signup = await response.json();
  const verificationUrl = new URL(signup.verificationUrl, frontendUrl);
  const verificationToken = verificationUrl.searchParams.get("token");
  if (!verificationToken) {
    throw new Error("E2E owner-session setup did not return an email verification token.");
  }

  const verificationResponse = await page.context().request.post(`${frontendUrl}/api/v1/email-verification/confirm`, {
    data: { token: verificationToken }
  });
  if (!verificationResponse.ok()) {
    throw new Error(`E2E owner-session verification failed with HTTP ${verificationResponse.status()}.`);
  }

  await page.goto(`${frontendUrl}/dashboard`);
  await expectUrl(page, /\/dashboard$/, "Authenticated dashboard");
  await expectVisible(page.getByLabel("ENTRAL Command Center"), "Command Center");
  return email;
}

async function closeAcademyIfOpen(page) {
  const academyClose = page.getByRole("button", { name: "Close ENTRAL Academy" });
  await academyClose.waitFor({ state: "visible", timeout: 2500 }).catch(() => undefined);
  if (await academyClose.count() && await academyClose.isVisible()) {
    await academyClose.click();
  }
}

async function installPhase190LifecycleRoute(page) {
  const requests = [];
  const persistedLifecycleState = new Map();
  let pauseActionId = null;
  const receiptIds = {
    audit: {
      PAUSE: "21111111-1111-4111-8111-111111111111",
      RESUME: "21111111-1111-4111-8111-111111111112"
    },
    event: {
      PAUSE: "31111111-1111-4111-8111-111111111111",
      RESUME: "31111111-1111-4111-8111-111111111112"
    },
    message: {
      PAUSE: "41111111-1111-4111-8111-111111111111",
      RESUME: "41111111-1111-4111-8111-111111111112"
    },
    verification: {
      PAUSE: "51111111-1111-4111-8111-111111111111",
      RESUME: "51111111-1111-4111-8111-111111111112"
    }
  };

  await page.route(
    "**/member/api/v1/member/organizations/*/hierarchy",
    async (route) => {
      if (persistedLifecycleState.size === 0) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      if (!response.ok()) {
        await route.fulfill({ response });
        return;
      }
      const hierarchy = await response.json();
      if (!Array.isArray(hierarchy.entities)) {
        throw new Error("Phase 190 hierarchy response did not expose an entities array.");
      }
      const entities = hierarchy.entities.map((entity) => {
        const persisted = persistedLifecycleState.get(entity.entity_id);
        return persisted
          ? {
              ...entity,
              status: persisted.status,
              updated_at: persisted.updatedAt,
              version: persisted.version
            }
          : entity;
      });
      await route.fulfill({
        body: JSON.stringify({
          ...hierarchy,
          entities
        }),
        contentType: "application/json",
        status: response.status()
      });
    }
  );

  await page.route(
    "**/member/api/v1/member/organizations/*/entities/*/actions/*",
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      const actionType = new URL(request.url()).pathname.split("/").at(-1)?.toUpperCase();
      if (actionType !== "PAUSE" && actionType !== "RESUME") {
        await route.fulfill({ contentType: "application/json", json: { message: "Unknown lifecycle action." }, status: 404 });
        return;
      }
      requests.push(body);
      if (actionType === "PAUSE") pauseActionId = body.action_id;
      const beforeVersion = Number(body.expected_version);
      const afterVersion = beforeVersion + 1;
      const afterStatus = actionType === "PAUSE" ? "PAUSED" : "ACTIVE";
      const completedAt = new Date(Date.parse(body.requested_at) + 1_000).toISOString();
      persistedLifecycleState.set(body.target_id, {
        status: afterStatus,
        updatedAt: completedAt,
        version: afterVersion
      });
      await route.fulfill({
        contentType: "application/json",
        json: {
          action: {
            action_id: body.action_id,
            action_type: actionType,
            after: { status: afterStatus, version: afterVersion },
            audit_entry_ids: [receiptIds.audit[actionType]],
            before: {
              status: actionType === "PAUSE" ? "ACTIVE" : "PAUSED",
              version: beforeVersion
            },
            canonical_event: {
              aggregate_version: afterVersion,
              event_id: receiptIds.event[actionType],
              sequence_number: 90 + afterVersion
            },
            completed_at: completedAt,
            containment: {
              descendants_affected: 0,
              new_work_leasing: actionType === "PAUSE" ? "BLOCKED" : "ELIGIBLE",
              policy: "FINISH_IN_FLIGHT"
            },
            conversation_message_id: receiptIds.message[actionType],
            idempotency_key: body.idempotency_key,
            idempotent_replay: false,
            requested_at: body.requested_at,
            restoration_of_action_id: actionType === "RESUME"
              ? body.restores_action_id ?? null
              : null,
            rollback: {
              action_type: actionType === "PAUSE" ? "RESUME" : "PAUSE",
              available: true,
              expected_version: afterVersion,
              restores_action_id: body.action_id
            },
            status: "SUCCEEDED",
            target: {
              business_id: body.business_id,
              entity_id: body.target_id,
              entity_role: "SOLDIER",
              status: afterStatus,
              version: afterVersion
            },
            verification: {
              checked_at: completedAt,
              expected_status: afterStatus,
              expected_version: afterVersion,
              observed_status: afterStatus,
              observed_version: afterVersion,
              passed: true,
              verification_id: receiptIds.verification[actionType]
            }
          }
        },
        status: 200
      });
    }
  );

  return {
    getPauseActionId: () => pauseActionId,
    persistedState: (entityId) => persistedLifecycleState.get(entityId) ?? null,
    requests
  };
}

const tests = [
  {
    name: "root URL opens protected member sign-in",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await page.goto(frontendUrl);
        await expectUrl(page, /\/member\/sign-in(?:\?.*)?$/, "Protected member entry");
        await expectVisible(page.getByRole("heading", { name: "Sign in to Entral" }), "Member sign-in");
        await expectVisible(page.getByText("Secure member access"), "Secure member access label");

        if (await page.getByText(/create verified account|private beta brief/i).count()) {
          throw new Error("A retired public account or beta-brief control is still visible.");
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "legacy public account routes return to member sign-in",
    run: async () => {
      const { context, page } = await newPage();
      try {
        for (const pathname of ["/onboarding", "/signup", "/verify-email", "/forgot-password", "/reset-password"]) {
          await page.goto(`${frontendUrl}${pathname}`);
          await expectUrl(page, /\/member\/sign-in(?:\?.*)?$/, `${pathname} retirement redirect`);
        }

        await expectVisible(page.getByRole("heading", { name: "Sign in to Entral" }), "Member sign-in");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "owner session opens canonical Dashboard, refreshes from events, and opens business detail",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await installPhase170Routes(page, { emitEvent: true });
        await installPhase200InteractionRoutes(page);
        await enterWorkspace(page, uniqueEmail("dashboard"));
        await expectVisible(page.getByRole("heading", { name: "E2E Operator's Dashboard" }), "Canonical Dashboard");
        await expectVisible(page.getByText("Human portfolio / all canonical businesses"), "Human portfolio scope");
        const businessCard = page.locator(".phase170-business-card").filter({ hasText: "Atlas Software" });
        await expectVisible(businessCard, "Canonical business card");
        await expectVisible(businessCard.getByText("Version 4"), "Event-refreshed business version", 15_000);
        await businessCard.getByRole("link", { name: "Open business" }).click();
        await expectUrl(page, new RegExp(`/dashboard\\?business=${phase170Ids.business}$`), "Canonical business detail");
        await expectVisible(page.getByRole("heading", { name: "Atlas Software" }), "Business detail heading");
        await expectVisible(page.getByText("Agents and tools"), "Agents and tools section");
        await expectVisible(page.getByText("External activity"), "External activity section");
        await expectVisible(page.getByText("Event 10"), "Version-consistent full record");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "embedded Universe Graphs preserve document wheel scrolling",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 1440, height: 900 }
      });
      try {
        await installPhase195GraphRoutes(page);
        await installPhase200InteractionRoutes(page);
        await enterWorkspace(page, uniqueEmail("phase180-wheel-scroll"));
        await page.goto(`${frontendUrl}/member/graph`);
        await closeAcademyIfOpen(page);
        const canvases = [
          page.getByLabel(/Canonical Universe Graph with 5 entities/i),
          page.getByRole("application", {
            name: /Canonical 3D Universe Graph with 5 entities/i
          })
        ];

        for (const [index, canvas] of canvases.entries()) {
          await expectVisible(canvas, `${index === 0 ? "2D" : "3D"} embedded graph canvas`, 30_000);
          await canvas.scrollIntoViewIfNeeded();
          const box = await canvas.boundingBox();
          if (!box) throw new Error(`${index === 0 ? "2D" : "3D"} graph did not expose hover geometry.`);
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          const before = await page.evaluate(() => ({
            bodyOverflow: document.body.style.overflow,
            max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
            y: window.scrollY
          }));
          if (before.bodyOverflow === "hidden") {
            throw new Error(`${index === 0 ? "2D" : "3D"} graph locked document scrolling on hover.`);
          }
          const delta = before.y < before.max - 120 ? 360 : -360;
          await page.mouse.wheel(0, delta);
          await page.waitForTimeout(150);
          const after = await page.evaluate(() => window.scrollY);
          if ((delta > 0 && after <= before.y) || (delta < 0 && after >= before.y)) {
            throw new Error(
              `${index === 0 ? "2D" : "3D"} graph intercepted ordinary page scrolling: ${JSON.stringify({ after, before, delta })}`
            );
          }
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "Phase 195 Graph preserves canonical parity, shared state, responsive alignment, preferences, and exports",
    run: async () => {
      const hierarchy = phase195AcceptanceHierarchy();
      const browserEvidence = [];
      for (const profile of [
        { name: "desktop", viewport: { width: 1440, height: 1000 }, isMobile: false, deviceScaleFactor: 1 },
        { name: "tablet", viewport: { width: 900, height: 1100 }, isMobile: false, deviceScaleFactor: 1 }
      ]) {
        const { context, page } = await newPage(profile);
        const runtimeErrors = [];
        try {
          await page.route("**/member/api/v1/member/organizations/*/hierarchy", async (route) => {
            await route.fulfill({ contentType: "application/json", json: hierarchy, status: 200 });
          });
          const graphRoutes = await installPhase195GraphRoutes(page, hierarchy);
          await installPhase200InteractionRoutes(page);
          await enterWorkspace(page, uniqueEmail(`phase195-${profile.name}`));
          page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
          page.on("console", (message) => {
            const text = message.text();
            const location = message.location();
            const expectedPreferenceFailure = /Failed to load resource.*(?:409|503)/i.test(text);
            const expectedDashboardBootstrapMiss =
              location.url.endsWith("/api/v1/control-plane/portfolio/summary")
              && /404|Not Found/i.test(text);
            if (
              message.type() === "error"
              && !expectedPreferenceFailure
              && !expectedDashboardBootstrapMiss
            ) {
              const source = location.url
                ? ` (${location.url}${location.lineNumber ? `:${location.lineNumber}` : ""})`
                : "";
              runtimeErrors.push(`console: ${text}${source}`);
            }
          });

          const query = new URLSearchParams({
            arrangement: "side-by-side",
            business: phase195AcceptanceIds.businessB,
            domain: "19510000-0000-4000-8000-999999999999",
            entity: phase195AcceptanceIds.soldierB,
            health: "WATCH",
            scope: "organization:hidden",
            status: "PAUSED",
            type: "SOLDIER"
          });
          await page.goto(`${frontendUrl}/member/graph?${query.toString()}`);
          await expectVisible(
            page.getByRole("heading", { name: "2D + 3D Universe Graph" }),
            `${profile.name} Phase 195 workspace`,
            30_000
          );

          const workspace = page.locator(".phase195-graph-workspace");
          const twoD = workspace.locator(
            '.phase180-graph-panel > [data-graph-dimension="2d"]'
          );
          const threeD = workspace.locator(
            '.phase180-graph-panel > [data-graph-dimension="3d"]'
          );
          await expectVisible(twoD, `${profile.name} Phase 195 2D renderer`, 30_000);
          await expectVisible(threeD, `${profile.name} Phase 195 3D renderer`, 30_000);
          await expectVisible(
            twoD.locator(".phase180-graph-canvas"),
            `${profile.name} Phase 195 2D canvas`,
            30_000
          );
          await expectVisible(
            threeD.locator(".command-center-canvas"),
            `${profile.name} Phase 195 3D canvas`,
            30_000
          );
          const parity = await Promise.all([twoD, threeD].map(async (renderer) => ({
            edges: (await renderer.getAttribute("data-canonical-edge-ids") ?? "").split(",").filter(Boolean).sort(),
            entities: (await renderer.getAttribute("data-canonical-entity-ids") ?? "").split(",").filter(Boolean).sort(),
            event: await renderer.getAttribute("data-canonical-event-sequence")
          })));
          if (
            JSON.stringify(parity[0].entities) !== JSON.stringify(parity[1].entities)
            || JSON.stringify(parity[0].edges) !== JSON.stringify(parity[1].edges)
            || parity[0].event !== "9"
            || parity[1].event !== "9"
          ) {
            throw new Error(`${profile.name} Phase 195 renderer parity failed: ${JSON.stringify(parity)}`);
          }

          const rewritten = new URL(page.url()).searchParams;
          if (
            rewritten.get("entity") !== phase195AcceptanceIds.soldierB
            || rewritten.get("scope")?.includes("hidden")
            || rewritten.has("domain")
          ) {
            throw new Error(`${profile.name} Graph retained an unauthorized deep-link value: ${rewritten.toString()}`);
          }
          if (await page.getByText(/Microsoft|Copilot|SharePoint/i).count()) {
            throw new Error(`${profile.name} member Graph exposed Microsoft integration chrome.`);
          }

          const geometry = await workspace.evaluate((element) => {
            const panel2D = element.querySelector('[data-panel="2d"]');
            const panel3D = element.querySelector('[data-panel="3d"]');
            const header2D = panel2D?.querySelector(".phase180-surface-heading");
            const header3D = panel3D?.querySelector(".phase180-surface-heading");
            const stage2D = panel2D?.querySelector(".phase180-graph-stage");
            const stage3D = panel3D?.querySelector(".phase180-graph-3d-stage");
            const canvas2D = panel2D?.querySelector(".phase180-graph-canvas");
            const canvas3D = panel3D?.querySelector(".command-center-canvas");
            const sharedToolbar = element.querySelector(".phase195-shared-toolbar");
            const values = [panel2D, panel3D, header2D, header3D, stage2D, stage3D, canvas2D, canvas3D, sharedToolbar];
            if (values.some((value) => !(value instanceof HTMLElement))) return null;
            const box = (value) => {
              const rect = value.getBoundingClientRect();
              return {
                bottom: rect.bottom,
                height: rect.height,
                left: rect.left,
                right: rect.right,
                top: rect.top,
                width: rect.width
              };
            };
            return {
              canvas2D: box(canvas2D),
              canvas3D: box(canvas3D),
              documentWidth: document.documentElement.scrollWidth,
              header2D: box(header2D),
              header3D: box(header3D),
              panel2D: box(panel2D),
              panel3D: box(panel3D),
              stage2D: box(stage2D),
              stage3D: box(stage3D),
              toolbar: box(sharedToolbar),
              viewportWidth: window.innerWidth
            };
          });
          if (!geometry) throw new Error(`${profile.name} Phase 195 geometry was incomplete.`);
          const withinTwoPixels = (left, right) => Math.abs(left - right) <= 2;
          const aligned = [
            [geometry.panel2D.width, geometry.panel3D.width],
            [geometry.header2D.height, geometry.header3D.height],
            [geometry.header2D.top - geometry.panel2D.top, geometry.header3D.top - geometry.panel3D.top],
            [geometry.stage2D.height, geometry.stage3D.height],
            [geometry.canvas2D.width, geometry.canvas3D.width],
            [geometry.canvas2D.height, geometry.canvas3D.height]
          ].every(([left, right]) => withinTwoPixels(left, right));
          if (!aligned) {
            throw new Error(`${profile.name} Graph cards, headers, stages, or canvases exceeded 2px alignment: ${JSON.stringify(geometry)}`);
          }
          if (geometry.documentWidth > geometry.viewportWidth + 2) {
            throw new Error(`${profile.name} Phase 195 Graph overflowed horizontally.`);
          }
          const effectiveArrangement = await workspace.getAttribute("data-effective-arrangement");
          if (profile.name === "desktop") {
            if (
              effectiveArrangement !== "side-by-side"
              || !withinTwoPixels(geometry.panel2D.top, geometry.panel3D.top)
              || !withinTwoPixels(geometry.panel2D.bottom, geometry.panel3D.bottom)
            ) {
              throw new Error(`Desktop Phase 195 Graph cards were not aligned side by side: ${JSON.stringify(geometry)}`);
            }
          } else if (
            effectiveArrangement !== "stacked"
            || geometry.panel3D.top < geometry.panel2D.bottom - 2
          ) {
            throw new Error(`${profile.name} Phase 195 Graph did not apply its safe stacked override.`);
          }

          const authorityTierCounts = await Promise.all([
            twoD,
            threeD
          ].map((renderer) => renderer.locator(
            ".phase195-authority-rings [data-authority-tier]"
          ).count()));
          if (authorityTierCounts.some((count) => count !== 5)) {
            throw new Error(
              `${profile.name} Phase 195 Graph did not render all five authority tier labels: ${JSON.stringify(authorityTierCounts)}`
            );
          }
          await workspace.screenshot({
            animations: "disabled",
            path: join(
              repoRoot,
              "test-results",
              "e2e",
              `phase195-${profile.name}-dual-graph.png`
            )
          });

          // The 3D renderer deliberately suspends its frame loop while its
          // stacked canvas is outside the viewport. Bring that canvas into
          // view before requiring its bounded frame-telemetry sample.
          await threeD.locator(".command-center-canvas").scrollIntoViewIfNeeded();
          const observedTelemetryRenderers = () => new Set(
            graphRoutes.telemetryRequests.map((telemetry) => telemetry.renderer)
          );
          const hasRequiredTelemetryRenderers = () => {
            const renderers = observedTelemetryRenderers();
            return renderers.has("2D") && renderers.has("3D");
          };
          const telemetryDeadline = Date.now() + 10_000;
          while (
            !hasRequiredTelemetryRenderers()
            && Date.now() < telemetryDeadline
          ) {
            await new Promise((resolveWait) => setTimeout(resolveWait, 100));
          }
          const telemetryRenderers = observedTelemetryRenderers();
          if (
            !telemetryRenderers.has("2D")
            || !telemetryRenderers.has("3D")
          ) {
            throw new Error(`${profile.name} Phase 195 did not submit bounded telemetry for both renderers.`);
          }
          for (const telemetry of graphRoutes.telemetryRequests) {
            if (
              telemetry.node_count < 0
              || telemetry.node_count > 100_000
              || telemetry.edge_count < 0
              || telemetry.edge_count > 200_000
              || telemetry.frame_rate_fps < 0
              || telemetry.frame_rate_fps > 1_000
              || telemetry.dropped_frame_rate_ratio < 0
              || telemetry.dropped_frame_rate_ratio > 1
              || telemetry.sample_window_ms < 1
              || telemetry.sample_window_ms > 600_000
              || JSON.stringify(telemetry).includes(phase195AcceptanceIds.soldierB)
            ) {
              throw new Error(`${profile.name} Phase 195 renderer telemetry exceeded its bounded metadata contract.`);
            }
          }
          const sharedToolbar = page.getByRole("region", {
            name: "Shared graph navigation and filters"
          });
          await sharedToolbar.getByRole("button", { name: "Parent" }).click();
          await page.waitForFunction((entityId) =>
            new URL(window.location.href).searchParams.get("entity") === entityId,
          phase195AcceptanceIds.commanderB);
          const commanderTwoDDetails = twoD.getByRole("complementary", {
            name: "Commander B graph details"
          });
          const commanderThreeDDetails = threeD.locator(".phase110-node-drawer");
          await expectVisible(
            commanderTwoDDetails,
            `${profile.name} Commander B 2D authorized details`
          );
          await expectVisible(
            commanderThreeDDetails,
            `${profile.name} Commander B 3D authorized details`
          );
          const canonicalDetailAttributes = await Promise.all(
            [twoD, threeD].map((renderer) => renderer.evaluate((surface) => ({
              active_alert: surface.getAttribute(
                "data-canonical-selected-active-alert"
              ),
              active_task_count: surface.getAttribute(
                "data-canonical-selected-active-task-count"
              ),
              child_count: surface.getAttribute(
                "data-canonical-selected-child-count"
              ),
              current_mission: surface.getAttribute(
                "data-canonical-selected-current-mission"
              ),
              entity_id: surface.getAttribute(
                "data-canonical-selected-entity-id"
              ),
              latest_material_result: surface.getAttribute(
                "data-canonical-selected-latest-material-result"
              )
            })))
          );
          const expectedCanonicalDetails = {
            active_alert: "Authorized Phase 195 parity alert.",
            active_task_count: "3",
            child_count: "1",
            current_mission: "Coordinate authorized Phase 195 graph parity.",
            entity_id: phase195AcceptanceIds.commanderB,
            latest_material_result: '{"status":"phase195-parity-verified"}'
          };
          if (
            canonicalDetailAttributes.some(
              (details) =>
                JSON.stringify(details) !== JSON.stringify(expectedCanonicalDetails)
            )
          ) {
            throw new Error(
              `${profile.name} renderer-selected authorized detail attributes diverged: `
              + JSON.stringify(canonicalDetailAttributes)
            );
          }
          await expectVisible(
            twoD.getByText("Selected Commander B, COMMANDER. 1 direct children.", {
              exact: true
            }),
            `${profile.name} Commander B 2D live child-count detail`
          );
          const expandCommanderThreeDDetails = commanderThreeDDetails.getByRole("button", {
            name: "Expand details for Commander B"
          });
          if (await expandCommanderThreeDDetails.count()) {
            await expandCommanderThreeDDetails.click();
          }
          const [twoDDetailValues, threeDDetailValues] = await Promise.all([
            commanderTwoDDetails,
            commanderThreeDDetails
          ].map((details) => details.locator("dl").evaluate((list) =>
            Object.fromEntries(
              [...list.querySelectorAll(":scope > div")]
                .map((row) => [
                  row.querySelector("dt")?.textContent?.trim() ?? "",
                  row.querySelector("dd")?.textContent?.trim() ?? ""
                ])
                .filter(([label]) => Boolean(label))
            )
          )));
          const expectedCommanderMission = "Coordinate authorized Phase 195 graph parity.";
          if (
            twoDDetailValues.Children !== "1"
            || threeDDetailValues.Children !== "1"
            || twoDDetailValues.Mission !== expectedCommanderMission
            || threeDDetailValues["Current objective"] !== expectedCommanderMission
            || twoDDetailValues.Alert !== "Authorized Phase 195 parity alert."
            || threeDDetailValues["Latest material result"] !== '{"status":"phase195-parity-verified"}'
          ) {
            throw new Error(
              `${profile.name} Commander B 2D/3D authorized detail parity failed: `
              + JSON.stringify({ three_d: threeDDetailValues, two_d: twoDDetailValues })
            );
          }
          await page.getByRole("button", { name: "Back" }).click();
          await page.waitForFunction((entityId) =>
            new URL(window.location.href).searchParams.get("entity") === entityId,
          phase195AcceptanceIds.soldierB);

          await page.getByRole("textbox", { name: "Search both graphs" }).fill("Soldier B");
          await page.getByRole("combobox", { name: "Filter by entity type" }).selectOption("SOLDIER");
          await page.getByRole("combobox", { name: "Filter by status" }).selectOption("PAUSED");
          await page.getByRole("combobox", { name: "Filter by health" }).selectOption("WATCH");
          await page.waitForFunction(() =>
            document.querySelector(".phase195-graph-workspace")?.getAttribute("data-canonical-entity-count") === "5"
          );
          await page.getByRole("button", { name: "Isolate lineage" }).click();
          if (
            await twoD.getAttribute("data-canonical-entity-count") !== "5"
            || await threeD.getAttribute("data-canonical-entity-count") !== "5"
          ) {
            throw new Error(`${profile.name} shared Graph filters diverged between renderers.`);
          }

          await page.getByRole("button", { name: "Show all lineages" }).click();
          await page.getByRole("button", { name: "Clear graph search" }).click();
          await page.getByRole("combobox", { name: "Filter by entity type" }).selectOption("");
          await page.getByRole("combobox", { name: "Filter by status" }).selectOption("");
          await page.getByRole("combobox", { name: "Filter by health" }).selectOption("");

          const arrangement = page.getByRole("combobox", { name: "Graph arrangement" });
          const arrangementEvidence = [];
          const responsiveDualArrangement = profile.name === "desktop"
            ? "side-by-side"
            : "stacked";
          for (const [requested, effective, expectedRendererCount] of [
            ["auto", responsiveDualArrangement, 2],
            ["side-by-side", responsiveDualArrangement, 2],
            ["stacked", "stacked", 2],
            ["2d-only", "2d-only", 1],
            ["3d-only", "3d-only", 1]
          ]) {
            await arrangement.selectOption(requested);
            await page.waitForFunction(
              ({ effectiveValue, requestedValue }) => {
                const graph = document.querySelector(".phase195-graph-workspace");
                return graph?.getAttribute("data-graph-layout") === requestedValue
                  && graph?.getAttribute("data-effective-arrangement") === effectiveValue;
              },
              { effectiveValue: effective, requestedValue: requested }
            );
            const mountedRendererCount = await workspace
              .locator(".phase180-graph-panel > [data-graph-dimension]")
              .count();
            if (mountedRendererCount !== expectedRendererCount) {
              throw new Error(`${profile.name} Phase 195 arrangement ${requested} mounted the wrong renderer count.`);
            }
            arrangementEvidence.push({
              effective,
              mounted_renderer_count: mountedRendererCount,
              requested
            });
          }
          await expectVisible(
            page.getByText(/Saved settings v\d+/).first(),
            `${profile.name} saved Phase 195 arrangement`
          );
          if (
            graphRoutes.preferences().settings.simple.arrangement !== "THREE_D_ONLY"
            || !graphRoutes.requests.some((request) => request.method === "PUT")
          ) {
            throw new Error(`${profile.name} Phase 195 arrangement was not persisted through the versioned preference route.`);
          }

          await page.goto(`${frontendUrl}/member/graph`);
          await expectVisible(
            page.getByRole("heading", { name: "3D Graph" }),
            `${profile.name} reloaded saved 3D-only arrangement`
          );
          await page.waitForFunction(() => {
            const graph = document.querySelector(".phase195-graph-workspace");
            return graph?.getAttribute("data-graph-layout") === "3d-only"
              && graph?.getAttribute("data-effective-arrangement") === "3d-only";
          });
          const restoredLayout = {
            effective: await workspace.getAttribute("data-effective-arrangement"),
            requested: await workspace.getAttribute("data-graph-layout")
          };
          if (await page.getByRole("heading", { name: "2D Graph" }).count()) {
            throw new Error(`${profile.name} reload did not restore the saved 3D-only arrangement.`);
          }
          const persistedPreference = graphRoutes.preferences();
          const persistedArrangement = persistedPreference.settings.simple.arrangement;
          const persistedPreferenceVersion = persistedPreference.version;

          if (profile.name === "desktop") {
            await workspace
              .locator(":scope > .phase180-graph-control-bar")
              .getByRole("button", { name: "Settings", exact: true })
              .click();
            graphRoutes.failNextMutation(409);
            await page.getByLabel("2D layout").selectOption("HIERARCHY_TREE");
            await expectVisible(
              page.getByText(/Settings changed in another session/i).first(),
              "Phase 195 preference conflict"
            );
            graphRoutes.failNextMutation(503);
            await page.getByLabel("3D pattern").selectOption("SPHERICAL_SHELLS");
            await expectVisible(
              page.getByText(/Settings could not be saved.*remains local/i).first(),
              "Phase 195 preference error"
            );
            graphRoutes.failNextMutation(409);
            await page.getByRole("button", { name: "Delete all saved graph overrides" }).click();
            await expectVisible(
              page.getByText(/Reset conflict.*Reload the latest settings/i).first(),
              "Phase 195 reset conflict"
            );
            const resetResponsePromise = page.waitForResponse((response) =>
              response.url().includes("/graph/preferences")
              && response.request().method() === "DELETE"
            );
            await page.getByRole("button", { name: "Delete all saved graph overrides" }).click();
            const resetResponse = await resetResponsePromise;
            if (resetResponse.status() !== 200) {
              throw new Error(
                `Phase 195 preference reset returned ${resetResponse.status()}: `
                + await resetResponse.text()
              );
            }
            await expectVisible(
              page.getByText("Canonical defaults").first(),
              "Phase 195 canonical preference reset readback"
            );
            await page.waitForFunction(() =>
              document.querySelector(".phase195-graph-workspace")?.getAttribute("data-graph-layout") === "auto"
            );
            const successfulResetRequest = graphRoutes.requests.at(-1);
            if (
              graphRoutes.preferences().version !== 0
              || successfulResetRequest?.method !== "DELETE"
              || successfulResetRequest.body.reset_scope !== "ALL"
            ) {
              throw new Error(
                "Phase 195 preference reset did not return canonical defaults: "
                + JSON.stringify({
                  request: successfulResetRequest,
                  version: graphRoutes.preferences().version
                })
              );
            }

            await page.getByRole("textbox", { name: "Search both graphs" }).fill("Soldier B");
            const jsonPromise = page.waitForEvent("download");
            await page.getByRole("button", { name: "Export JSON" }).click();
            const jsonDownload = await jsonPromise;
            if (jsonDownload.suggestedFilename() !== "entral-graph-v9.json") {
              throw new Error(`Unexpected Phase 195 JSON filename ${jsonDownload.suggestedFilename()}.`);
            }
            const exportedJson = JSON.parse(await downloadText(jsonDownload));
            if (
              exportedJson.metadata.entity_count !== 5
              || !exportedJson.entities.some((entity) => entity.entity_id === phase195AcceptanceIds.soldierB)
              || exportedJson.entities.some((entity) => entity.entity_id === phase195AcceptanceIds.soldierA)
            ) {
              throw new Error(`Phase 195 JSON export escaped the active authorized projection: ${JSON.stringify(exportedJson.metadata)}`);
            }
            const csvPromise = page.waitForEvent("download");
            await page.getByRole("button", { name: "Export CSV" }).click();
            const csvDownload = await csvPromise;
            const exportedCsv = await downloadText(csvDownload);
            if (
              csvDownload.suggestedFilename() !== "entral-graph-v9.csv"
              || !exportedCsv.includes(phase195AcceptanceIds.soldierB)
              || exportedCsv.includes(phase195AcceptanceIds.soldierA)
            ) {
              throw new Error("Phase 195 CSV export escaped the active authorized projection.");
            }
            const imagePromise = page.waitForEvent("download");
            await page.getByRole("button", { name: "Export current view image" }).click();
            const imageDownload = await imagePromise;
            if (imageDownload.suggestedFilename() !== "entral-current-graph-v9.png") {
              throw new Error(`Unexpected Phase 195 image filename ${imageDownload.suggestedFilename()}.`);
            }
          }

          browserEvidence.push({
            arrangement_checks: arrangementEvidence,
            authorized_detail_parity: {
              active_alert: twoDDetailValues.Alert,
              attribute_readback: canonicalDetailAttributes,
              child_count_2d: Number(twoDDetailValues.Children),
              child_count_3d: Number(threeDDetailValues.Children),
              current_mission_2d: twoDDetailValues.Mission,
              current_mission_3d: threeDDetailValues["Current objective"],
              latest_material_result_3d: threeDDetailValues["Latest material result"],
              selected_entity_id: phase195AcceptanceIds.commanderB
            },
            geometry,
            initial_effective_arrangement: effectiveArrangement,
            persisted_arrangement: persistedArrangement,
            persisted_preference_version: persistedPreferenceVersion,
            profile: profile.name,
            restored_layout: restoredLayout,
            screenshot: `phase195-${profile.name}-dual-graph.png`,
            telemetry_renderers: [...telemetryRenderers].sort(),
            viewport: profile.viewport
          });
          if (runtimeErrors.length) {
            throw new Error(`Unexpected ${profile.name} Phase 195 browser errors:\n${runtimeErrors.join("\n")}`);
          }
        } finally {
          await context.close();
        }
      }
      await writeFile(
        join(
          repoRoot,
          "test-results",
          "e2e",
          "phase195-dual-graph-browser-fixture.json"
        ),
        `${JSON.stringify({
          accepted_production_evidence: false,
          browser_session: "LOCAL_MEMORY_AUTHENTICATED",
          evidence_class: "INTERCEPTED_BROWSER_FIXTURE",
          generated_at: new Date().toISOString(),
          profiles: browserEvidence,
          route_interception: true,
          status: "passed",
          supports_local_vectors: [
            "PHASE-195-AC-07",
            "PHASE-195-AC-08",
            "PHASE-195-AC-09",
            "PHASE-195-AC-14"
          ],
          cannot_close: ["PHASE-195-AC-18"]
        }, null, 2)}\n`,
        "utf8"
      );
    }
  },
  {
    name: "Phase 195 all-eight Marshal browser fixture preserves exact 132-entity drilldown parity",
    run: async () => {
      const {
        hierarchy,
        marshalCases,
        rootId
      } = phase195AllMarshalAcceptanceFixture();
      const expectedProjection = phase195GraphProjection(
        hierarchy,
        "19520000-0000-4000-8000-999999999999"
      );
      if (
        hierarchy.entities.length !== 132
        || expectedProjection.edges.length !== 131
        || marshalCases.length !== 8
      ) {
        throw new Error(
          `All-eight Marshal fixture lost its exact 132/131/8 contract: ${JSON.stringify({
            edges: expectedProjection.edges.length,
            entities: hierarchy.entities.length,
            marshals: marshalCases.length
          })}`
        );
      }

      const { context, page } = await newPage({
        viewport: { width: 1440, height: 1000 }
      });
      const runtimeErrors = [];
      const drilldownEvidence = [];
      try {
        await page.route(
          "**/member/api/v1/member/organizations/*/hierarchy",
          async (route) => {
            await route.fulfill({
              contentType: "application/json",
              json: hierarchy,
              status: 200
            });
          }
        );
        await installPhase195GraphRoutes(page, hierarchy);
        await installPhase200InteractionRoutes(page);
        page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          const text = message.text();
          const location = message.location();
          const expectedDashboardBootstrapMiss =
            location.url.endsWith("/api/v1/control-plane/portfolio/summary")
            && /404|Not Found/i.test(text);
          if (message.type() === "error" && !expectedDashboardBootstrapMiss) {
            runtimeErrors.push(`console: ${text}`);
          }
        });
        await enterWorkspace(page, uniqueEmail("phase195-all-marshals"));

        for (const marshalCase of marshalCases) {
          await page.goto(
            `${frontendUrl}/member/graph?arrangement=side-by-side&entity=${marshalCase.marshalId}`
          );
          const workspace = page.locator(".phase195-graph-workspace");
          await expectVisible(
            workspace,
            `${marshalCase.name} Phase 195 drilldown workspace`,
            30_000
          );
          const renderers = [
            workspace.locator('.phase180-graph-panel > [data-graph-dimension="2d"]'),
            workspace.locator('.phase180-graph-panel > [data-graph-dimension="3d"]')
          ];
          for (const [index, renderer] of renderers.entries()) {
            await expectVisible(
              renderer,
              `${marshalCase.name} ${index === 0 ? "2D" : "3D"} renderer`,
              30_000
            );
            const completeIds = (
              await renderer.getAttribute("data-canonical-entity-ids") ?? ""
            ).split(",").filter(Boolean).sort();
            if (
              completeIds.length !== 132
              || JSON.stringify(completeIds)
                !== JSON.stringify(hierarchy.entities.map((entity) => entity.entity_id).sort())
            ) {
              throw new Error(
                `${marshalCase.name} ${index === 0 ? "2D" : "3D"} did not receive the exact 132 authorized IDs.`
              );
            }
          }

          await page.getByRole("button", { name: "Isolate lineage" }).click();
          const expectedEntityIds = [
            rootId,
            marshalCase.marshalId,
            ...marshalCase.generalIds
          ].sort();
          const expectedEdgeIds = [
            `hierarchy:${rootId}:${marshalCase.marshalId}`,
            ...marshalCase.generalIds.map(
              (generalId) =>
                `hierarchy:${marshalCase.marshalId}:${generalId}`
            )
          ].sort();
          await page.waitForFunction(
            (count) =>
              document.querySelector(".phase195-graph-workspace")
                ?.getAttribute("data-canonical-entity-count") === String(count),
            expectedEntityIds.length
          );

          const parity = await Promise.all(renderers.map(async (renderer) => ({
            edgeIds: (
              await renderer.getAttribute("data-canonical-edge-ids") ?? ""
            ).split(",").filter(Boolean).sort(),
            entityIds: (
              await renderer.getAttribute("data-canonical-entity-ids") ?? ""
            ).split(",").filter(Boolean).sort()
          })));
          for (const [index, rendererEvidence] of parity.entries()) {
            if (
              JSON.stringify(rendererEvidence.entityIds)
                !== JSON.stringify(expectedEntityIds)
              || JSON.stringify(rendererEvidence.edgeIds)
                !== JSON.stringify(expectedEdgeIds)
            ) {
              throw new Error(
                `${marshalCase.name} ${index === 0 ? "2D" : "3D"} drilldown diverged from its exact authorized Generals.`
              );
            }
          }
          drilldownEvidence.push({
            edge_count: expectedEdgeIds.length,
            entity_count: expectedEntityIds.length,
            general_count: marshalCase.generalIds.length,
            marshal_id: marshalCase.marshalId
          });
        }

        await writeFile(
          join(
            repoRoot,
            "test-results",
            "e2e",
            "phase195-all-eight-marshal-browser-fixture.json"
          ),
          `${JSON.stringify({
            accepted_production_evidence: false,
            evidence_class: "INTERCEPTED_BROWSER_FIXTURE",
            generated_at: new Date().toISOString(),
            hierarchy_edge_count: 131,
            hierarchy_entity_count: 132,
            marshals: drilldownEvidence,
            status: "passed",
            vectors: ["PHASE-195-AC-15"]
          }, null, 2)}\n`,
          "utf8"
        );
        if (runtimeErrors.length) {
          throw new Error(
            `Unexpected all-eight Marshal browser errors:\n${runtimeErrors.join("\n")}`
          );
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "Phase 190 lifecycle browser fixture rehydrates pause, resume, and undo across reload",
    run: async () => {
      const { context, page } = await newPage({ viewport: { width: 1440, height: 1000 } });
      const runtimeErrors = [];
      try {
        await installPhase200InteractionRoutes(page);
        await enterWorkspace(page, uniqueEmail("phase190-lifecycle"));
        await page.waitForLoadState("networkidle");
        const lifecycle = await installPhase190LifecycleRoute(page);
        page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
        });
        await page.goto(`${frontendUrl}/member/infrastructure`);
        await closeAcademyIfOpen(page);
        await expectVisible(page.getByRole("heading", { name: "Infrastructure", exact: true }), "Phase 190 Infrastructure");
        await page.getByRole("treeitem", { name: /Atlas Operations, SOLDIER/ }).click();
        const lifecyclePanel = page.getByRole("region", { name: "Governed pause and resume" });
        const reopenPersistedTarget = async (actionName, version) => {
          await page.reload({ waitUntil: "domcontentloaded" });
          await closeAcademyIfOpen(page);
          try {
            await page.getByRole("heading", {
              name: "Infrastructure",
              exact: true
            }).waitFor({ state: "visible", timeout: 10_000 });
          } catch (error) {
            const diagnostic = await page.evaluate(() => ({
              body: document.body.innerText.slice(0, 2_000),
              title: document.title,
              url: window.location.href
            })).catch(() => ({ body: "", title: "", url: page.url() }));
            throw new Error(
              `Reloaded Phase 190 Infrastructure at version ${version} was not visible: ${JSON.stringify(diagnostic)}. ${error instanceof Error ? error.message : String(error)}`
            );
          }
          await page.getByRole("treeitem", { name: /Atlas Operations, SOLDIER/ }).click();
          await expectVisible(
            lifecyclePanel.getByRole("button", { name: actionName }),
            `Rehydrated ${actionName} control at version ${version}`
          );
          await expectVisible(
            lifecyclePanel.getByText(new RegExp(`Optimistic v${version}\\b`)),
            `Rehydrated lifecycle version ${version}`
          );
        };
        await expectVisible(lifecyclePanel, "Governed lifecycle panel");
        await lifecyclePanel.getByLabel("Operational reason").fill("Pause new work while the verified dependency is repaired.");
        await lifecyclePanel.getByRole("button", { name: "Pause entity" }).click();
        await expectVisible(lifecyclePanel.getByText("Paused and verified"), "Verified pause receipt");
        await expectVisible(lifecyclePanel.getByText(/Version 1 .* 2 .* event 92/), "Version and canonical-event convergence");
        await page.screenshot({
          fullPage: true,
          path: join(repoRoot, "test-results", "e2e", "phase190-pause-and-restore.png")
        });

        if (lifecycle.requests.length !== 1) {
          throw new Error(`Pause produced ${lifecycle.requests.length} lifecycle requests instead of exactly one.`);
        }
        const pauseRequest = lifecycle.requests[0];
        if (
          pauseRequest.action_type !== "PAUSE"
          || pauseRequest.expected_version !== 1
          || pauseRequest.proposed_changes?.containment_policy !== "FINISH_IN_FLIGHT"
          || pauseRequest.authority_basis?.explicit_confirmation_required !== true
        ) {
          throw new Error(`Pause request lost its authority, version, or containment contract: ${JSON.stringify(pauseRequest)}`);
        }
        if (
          lifecycle.persistedState(phase195MemoryIds.soldier)?.status !== "PAUSED"
          || lifecycle.persistedState(phase195MemoryIds.soldier)?.version !== 2
        ) {
          throw new Error("Pause did not update the browser fixture's durable hierarchy readback.");
        }

        await reopenPersistedTarget("Resume entity", 2);
        await lifecyclePanel.getByLabel("Operational reason").fill(
          "Resume verified work after the dependency recovery completed."
        );
        await lifecyclePanel.getByRole("button", { name: "Resume entity" }).click();
        await expectVisible(lifecyclePanel.getByText("Resumed and verified"), "Verified direct resume receipt");
        await expectVisible(lifecyclePanel.getByText(/Version 2 .* 3 .* event 93/), "Direct resume version and event convergence");
        if (lifecycle.requests.length !== 2) {
          throw new Error(`Direct resume produced ${lifecycle.requests.length} total lifecycle requests instead of two.`);
        }
        const directResumeRequest = lifecycle.requests[1];
        if (
          directResumeRequest.action_type !== "RESUME"
          || directResumeRequest.expected_version !== 2
          || directResumeRequest.restores_action_id
          || directResumeRequest.rollback_plan?.action !== "PAUSE"
        ) {
          throw new Error(`Direct resume lost its version or rollback contract: ${JSON.stringify(directResumeRequest)}`);
        }
        if (
          lifecycle.persistedState(phase195MemoryIds.soldier)?.status !== "ACTIVE"
          || lifecycle.persistedState(phase195MemoryIds.soldier)?.version !== 3
        ) {
          throw new Error("Resume did not update the browser fixture's durable hierarchy readback.");
        }

        await reopenPersistedTarget("Pause entity", 3);
        await lifecyclePanel.getByLabel("Operational reason").fill(
          "Pause once more to verify governed undo lineage."
        );
        await lifecyclePanel.getByRole("button", { name: "Pause entity" }).click();
        await expectVisible(lifecyclePanel.getByText("Paused and verified"), "Second verified pause receipt");
        await expectVisible(lifecyclePanel.getByText(/Version 3 .* 4 .* event 94/), "Second pause version and event convergence");
        if (lifecycle.requests.length !== 3) {
          throw new Error(`Second pause produced ${lifecycle.requests.length} lifecycle requests instead of three.`);
        }
        const secondPauseRequest = lifecycle.requests[2];
        if (
          secondPauseRequest.action_type !== "PAUSE"
          || secondPauseRequest.expected_version !== 3
        ) {
          throw new Error(`Second pause lost its expected version: ${JSON.stringify(secondPauseRequest)}`);
        }
        const secondPauseActionId = lifecycle.getPauseActionId();

        await lifecyclePanel.getByRole("button", { name: "Undo" }).click();
        await expectVisible(lifecyclePanel.getByText("Resumed and verified"), "Verified undo receipt");
        await expectVisible(lifecyclePanel.getByText(/Version 4 .* 5 .* event 95/), "Undo version and event convergence");
        if (lifecycle.requests.length !== 4) {
          throw new Error(`Undo produced ${lifecycle.requests.length} total lifecycle requests instead of four.`);
        }
        const undoRequest = lifecycle.requests[3];
        if (
          undoRequest.action_type !== "RESUME"
          || undoRequest.expected_version !== 4
          || undoRequest.restores_action_id !== secondPauseActionId
          || undoRequest.rollback_plan?.action !== "PAUSE"
        ) {
          throw new Error(`Undo did not preserve action lineage and next version: ${JSON.stringify(undoRequest)}`);
        }
        if (
          lifecycle.persistedState(phase195MemoryIds.soldier)?.status !== "ACTIVE"
          || lifecycle.persistedState(phase195MemoryIds.soldier)?.version !== 5
        ) {
          throw new Error("Undo did not update the browser fixture's durable hierarchy readback.");
        }

        await reopenPersistedTarget("Pause entity", 5);
        await writeFile(
          join(
            repoRoot,
            "test-results",
            "e2e",
            "phase195-ac05-lifecycle-browser-fixture.json"
          ),
          `${JSON.stringify({
            accepted_production_evidence: false,
            evidence_class: "INTERCEPTED_BROWSER_FIXTURE",
            final_status: "ACTIVE",
            final_version: 5,
            generated_at: new Date().toISOString(),
            request_actions: lifecycle.requests.map((request) => request.action_type),
            status: "passed",
            vectors: ["PHASE-195-AC-05"]
          }, null, 2)}\n`,
          "utf8"
        );
        const overlay = await page.locator(
          "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay"
        ).count();
        if (overlay) throw new Error("Phase 190 rendered with a framework error overlay.");
        if (!await page.evaluate(() => document.body.innerText.trim().length > 0)) {
          throw new Error("Phase 190 Infrastructure rendered a blank document.");
        }
        if (runtimeErrors.length) {
          throw new Error(`Unexpected Phase 190 browser errors:\n${runtimeErrors.join("\n")}`);
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "Phase 200 interaction layer preserves canonical truth, server Tutorial progress, and mobile Universe presentation",
    run: async () => {
      const desktop = await newPage({ viewport: { width: 1440, height: 1000 } });
      try {
        const interactionRoutes = await installPhase200InteractionRoutes(desktop.page);
        await installPhase195GraphRoutes(desktop.page);
        await desktop.page.route("**/member/api/v1/member/organizations/*/portfolio/summary", async (route) => {
          await route.fulfill({ contentType: "application/json", json: phase170Portfolio(), status: 200 });
        });
        await desktop.page.route("**/member/api/v1/member/organizations/*/businesses/*/full", async (route) => {
          await route.fulfill({ contentType: "application/json", json: phase170FullBusiness(), status: 200 });
        });
        await enterWorkspace(desktop.page, uniqueEmail("phase200-interaction"));
        await desktop.page.goto(`${frontendUrl}/member/dashboard`);

        const primaryNavigation = desktop.page.getByRole("navigation", { name: "Owner primary destinations" });
        await expectVisible(primaryNavigation, "Phase 200 role-aware primary navigation");
        const destinationLabels = await primaryNavigation.getByRole("link").allTextContents();
        if (JSON.stringify(destinationLabels.map((label) => label.trim())) !== JSON.stringify([
          "Command",
          "Businesses",
          "Universe",
          "Infrastructure",
          "Tutorial"
        ])) {
          throw new Error(`Phase 200 primary destinations drifted: ${JSON.stringify(destinationLabels)}`);
        }

        const command = desktop.page.locator('[data-member-destination-view="command"]');
        await expectVisible(command, "Phase 203 distinct Command destination");
        await expectVisible(command.getByRole("heading", { level: 1, name: "Command overview" }), "Phase 203 Command purpose heading");
        await expectVisible(command.locator('[data-command-section="portfolio-totals"]'), "Phase 203 Command executive totals");
        await expectVisible(command.locator('[data-command-section="operating-priorities"]'), "Phase 203 Command operating priorities");
        if (await command.locator('[data-businesses-section="portfolio-management"]').count()) {
          throw new Error("Phase 203 Command destination exposed the Businesses management section.");
        }
        const businessScope = desktop.page.getByLabel("Canonical business scope");
        await businessScope.selectOption(phase170Ids.business);
        await desktop.page.waitForURL((url) => url.searchParams.get("business") === phase170Ids.business);
        const commandBusinessScope = await businessScope.inputValue();
        await primaryNavigation.getByRole("link", { name: "Businesses" }).click();
        await expectUrl(desktop.page, /\/member\/dashboard\?[^#]*destination=businesses/, "Phase 203 Businesses destination");
        const businesses = desktop.page.locator('[data-member-destination-view="businesses"]');
        await expectVisible(businesses, "Phase 203 distinct Businesses destination");
        await expectVisible(businesses.getByRole("heading", { level: 1, name: "Businesses" }), "Phase 203 Businesses purpose heading");
        await expectVisible(businesses.locator('[data-businesses-section="portfolio-management"]'), "Phase 203 Businesses management section");
        const businessCard = businesses.locator(".phase170-business-card").filter({ hasText: "Atlas Software" });
        await expectVisible(businessCard, "Phase 203 real canonical business record");
        if (
          await businesses.locator('[data-command-section="portfolio-totals"]').count()
          || await businesses.locator('[data-command-section="operating-priorities"]').count()
          || await desktop.page.getByLabel("Canonical business scope").inputValue() !== commandBusinessScope
          || await desktop.page.locator(".phase170-error, .phase180-workspace-error").count()
        ) {
          throw new Error("Phase 203 Businesses destination exposed fallback content, Command content, or lost canonical scope.");
        }
        await businessCard.getByRole("link", { name: "Open business" }).click();
        await desktop.page.waitForURL((url) =>
          url.searchParams.get("destination") === "businesses"
          && url.searchParams.get("business") === phase170Ids.business
          && url.searchParams.get("record") === phase170Ids.business);
        const businessDetail = desktop.page.locator('[data-businesses-section="business-detail"]');
        await expectVisible(businessDetail, "Phase 203 scoped canonical business detail");
        await expectVisible(businessDetail.getByRole("heading", { level: 1, name: "Atlas Software" }), "Phase 203 business detail heading");
        await businessDetail.getByRole("link", { name: "Back to portfolio" }).click();
        await desktop.page.waitForURL((url) =>
          url.searchParams.get("destination") === "businesses"
          && url.searchParams.get("business") === phase170Ids.business
          && !url.searchParams.has("record"));
        await expectVisible(desktop.page.locator('[data-businesses-section="portfolio-management"]'), "Phase 203 scoped Businesses return journey");
        await primaryNavigation.getByRole("link", { name: "Command" }).click();
        await expectVisible(desktop.page.locator('[data-member-destination-view="command"]'), "Phase 203 Command return journey");

        const health = desktop.page.locator(".phase200-business-health");
        await expectVisible(health, "Phase 200 canonical business health");
        await expectVisible(health.getByText("91/100", { exact: true }), "Phase 200 recorded health score");
        await expectVisible(
          health.getByText("Recorded canonical health is healthy at portfolio event 9.", { exact: true }),
          "Phase 200 canonical health summary"
        );
        await health.getByRole("button", { name: "Operational" }).click();
        await expectVisible(health.getByRole("list", { name: "Canonical health drivers" }), "Phase 200 operational drivers");
        await health.getByText("Evidence and freshness").click();
        await expectVisible(health.getByText("portfolio:event:9", { exact: true }), "Phase 200 evidence source readback");

        await primaryNavigation.getByRole("link", { name: "Tutorial" }).click();
        await desktop.page.waitForURL((url) =>
          url.pathname === "/member/dashboard"
          && url.searchParams.get("destination") === "tutorial"
          && url.searchParams.get("business") === phase170Ids.business);
        const academy = desktop.page.getByRole("dialog", { name: "ENTRAL Academy" });
        await expectVisible(academy, "Phase 200 server-backed Tutorial");
        await expectVisible(academy.getByText("Server progress synced · revision 1"), "Phase 200 initial server Tutorial readback");
        await expectVisible(
          academy.getByRole("heading", { level: 3, name: "No published Tutorial lessons" }),
          "Phase 203 fail-closed Tutorial publication state"
        );
        if (await academy.getByRole("button", { name: "Navigate Universe" }).count()) {
          throw new Error("Phase 203 local acceptance exposed a Tutorial lesson without a SELLABLE Product Truth claim.");
        }
        await academy.getByRole("button", { name: "Advanced" }).click();
        await expectVisible(academy.getByText("Server progress synced · revision 2"), "Phase 200 Tutorial mode persistence");
        if (!await academy.getByRole("button", { name: "Advanced" }).evaluate((element) => element.classList.contains("active"))) {
          throw new Error("Phase 200 Tutorial did not persist its server-backed mode while publication remained fail-closed.");
        }
        await Promise.all([
          desktop.page.waitForResponse((response) => response.request().method() === "PATCH"
            && response.url().includes("/interaction/tutorial-progress")),
          academy.getByRole("button", { name: "Close ENTRAL Academy" }).click()
        ]);
        const persistedTutorialRevision = interactionRoutes.progress().revision;
        if (
          interactionRoutes.progress().current_anchor_id !== null
          || interactionRoutes.progress().mode !== "advanced"
          || !interactionRoutes.progress().first_launch_seen
        ) {
          throw new Error(`Phase 200 Tutorial did not persist fail-closed server progress: ${JSON.stringify(interactionRoutes.progress())}`);
        }

        await desktop.page.reload();
        const resumedAcademy = desktop.page.getByRole("dialog", { name: "ENTRAL Academy" });
        await expectVisible(resumedAcademy, "Phase 200 Tutorial after cross-device-style reload");
        await desktop.page.waitForTimeout(1_000);
        const resumedSyncStatus = await resumedAcademy.locator('.academy-sync-status[data-state="synced"]').innerText();
        if (!resumedSyncStatus.includes(`Server progress synced · revision ${persistedTutorialRevision}`)) {
          throw new Error(`Phase 200 persisted Tutorial revision was not restored: ${resumedSyncStatus}`);
        }
        await desktop.page.evaluate(() => window.dispatchEvent(new Event("entral:open-tutorial")));
        await expectVisible(
          resumedAcademy.getByRole("heading", { level: 3, name: "No published Tutorial lessons" }),
          "Phase 203 fail-closed Tutorial state after cross-device-style reload"
        );
        if (!await resumedAcademy.getByRole("button", { name: "Advanced" }).evaluate((element) => element.classList.contains("active"))) {
          throw new Error("Phase 200 Tutorial did not restore its server-backed mode.");
        }
        await resumedAcademy.getByRole("button", { name: "Reset Tutorial progress" }).click();
        await expectVisible(
          resumedAcademy.getByText(`Tutorial reset on the server · revision ${persistedTutorialRevision + 1}`),
          "Phase 200 Tutorial reset readback"
        );
        if (
          interactionRoutes.progress().revision !== persistedTutorialRevision + 1
          || interactionRoutes.progress().current_anchor_id !== "command-overview"
          || interactionRoutes.progress().mode !== "beginner"
        ) {
          throw new Error(`Phase 200 Tutorial reset did not persist canonical defaults: ${JSON.stringify(interactionRoutes.progress())}`);
        }
        if (!interactionRoutes.analyticsRequests.some((event) => event.event_type === "HELP_USED")) {
          throw new Error("Phase 200 Tutorial did not record its bounded Academy help-use analytics event.");
        }
        const localTutorialKeys = await desktop.page.evaluate(() => Object.keys(window.localStorage)
          .filter((key) => /academy|tutorial/i.test(key)));
        if (localTutorialKeys.length) {
          throw new Error(`Phase 200 stored server Tutorial progress locally: ${JSON.stringify(localTutorialKeys)}`);
        }
      } finally {
        await desktop.context.close();
      }

      const graphPresentationEvidence = [];
      const labelBudgets = new Map([[360, "8"], [390, "10"], [412, "12"], [430, "14"]]);
      const mobileEvidence = [];
      for (const width of [360, 390, 412, 430]) {
        const { context, page } = await newPage({
          viewport: { width, height: 844 },
          isMobile: true,
          deviceScaleFactor: 2
        });
        try {
          const hierarchy = phase195MemoryHierarchy();
          await page.route("**/member/api/v1/member/organizations/*/hierarchy", async (route) => {
            await route.fulfill({ contentType: "application/json", json: hierarchy, status: 200 });
          });
          await installPhase195GraphRoutes(page, hierarchy);
          await installPhase200InteractionRoutes(page);
          await enterWorkspace(page, uniqueEmail(`phase200-mobile-${width}`));
          await page.goto(`${frontendUrl}/member/graph`);
          await closeAcademyIfOpen(page);

          const workspace = page.locator(".phase195-graph-workspace");
          await expectVisible(workspace, `Phase 200 ${width}px mobile Universe`);
          await page.waitForFunction(() => document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-mobile-presentation") === "single-renderer");
          const initialState = await workspace.evaluate((element) => ({
            arrangement: element.getAttribute("data-effective-arrangement"),
            dimension: element.getAttribute("data-mobile-dimension"),
            documentWidth: document.documentElement.scrollWidth,
            labelBudget: element.getAttribute("data-viewport-label-budget"),
            panelCount: element.querySelectorAll(".phase180-graph-panel").length,
            viewportWidth: window.innerWidth
          }));
          if (
            initialState.arrangement !== "2d-only"
            || initialState.dimension !== "2d"
            || initialState.labelBudget !== labelBudgets.get(width)
            || initialState.panelCount !== 1
            || initialState.documentWidth > initialState.viewportWidth + 2
          ) {
            throw new Error(`Phase 200 ${width}px single-graph contract failed: ${JSON.stringify(initialState)}`);
          }

          const toolbar = page.getByRole("toolbar", { name: "Compact mobile Universe controls" });
          await expectVisible(toolbar, `Phase 200 ${width}px compact graph toolbar`);
          const legend = workspace.locator(".phase200-graph-legend");
          if (await legend.count() !== 1) throw new Error(`Phase 200 ${width}px rendered more than one graph legend.`);
          await expectVisible(legend.getByText("Universe legend"), `Phase 200 ${width}px compact legend`);
          const tierBadgeSizes = await workspace.locator(".phase195-authority-rings > li > span").evaluateAll((elements) => elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return { height: rect.height, width: rect.width };
          }));
          if (tierBadgeSizes.some((rect) => rect.height > 2 || rect.width > 2)) {
            throw new Error(`Phase 200 ${width}px left stacked tier badges on the canvas: ${JSON.stringify(tierBadgeSizes)}`);
          }

          const twoDimensionalCanvas = page.getByLabel(/Canonical Universe Graph with \d+ entities/i);
          await expectVisible(twoDimensionalCanvas, `Phase 200 ${width}px 2D renderer`);
          const collapsedEntityCount = Number(await page.locator('[data-graph-dimension="2d"]').getAttribute("data-canonical-entity-count"));
          if (!(collapsedEntityCount > 0 && collapsedEntityCount < hierarchy.entities.length)) {
            throw new Error(`Phase 200 ${width}px did not start from a progressively collapsed hierarchy: ${collapsedEntityCount}.`);
          }
          await twoDimensionalCanvas.focus();
          await page.keyboard.press("ArrowDown");
          await page.waitForFunction((rootId) => document.querySelector('[data-graph-dimension="2d"]')
            ?.getAttribute("data-canonical-selected-entity-id") === rootId, phase195MemoryIds.entral);
          await page.keyboard.press("ArrowDown");
          await page.waitForFunction((marshalId) => document.querySelector('[data-graph-dimension="2d"]')
            ?.getAttribute("data-canonical-selected-entity-id") === marshalId, phase195MemoryIds.marshal);
          const detailSheet = page.getByRole("complementary", { name: /graph details/i });
          await expectVisible(detailSheet, `Phase 200 ${width}px responsive entity inspector`);
          const selectedEntityId = await page.locator('[data-graph-dimension="2d"]').getAttribute("data-canonical-selected-entity-id");
          if (!selectedEntityId) throw new Error(`Phase 200 ${width}px did not select a canonical entity.`);
          await page.waitForFunction(() => {
            const element = document.querySelector(".phase195-graph-workspace");
            return element?.getAttribute("data-selected-lineage-emphasis") === "emphasized"
              && element?.getAttribute("data-unrelated-edge-treatment") === "dimmed";
          });
          const collisionGeometry = await page.evaluate(() => {
            const sheet = document.querySelector(".phase180-graph-drawer");
            const assistant = document.querySelector(".phase180-entral-emblem");
            const stage = document.querySelector(".phase180-graph-stage");
            if (!(sheet instanceof HTMLElement) || !(assistant instanceof HTMLElement) || !(stage instanceof HTMLElement)) return null;
            const sheetRect = sheet.getBoundingClientRect();
            const assistantRect = assistant.getBoundingClientRect();
            const stageRect = stage.getBoundingClientRect();
            return {
              assistant: { bottom: assistantRect.bottom, left: assistantRect.left, right: assistantRect.right, top: assistantRect.top },
              sheet: { bottom: sheetRect.bottom, left: sheetRect.left, right: sheetRect.right, top: sheetRect.top },
              stage: { bottom: stageRect.bottom, left: stageRect.left, right: stageRect.right, top: stageRect.top },
              sheetPosition: getComputedStyle(sheet).position,
            };
          });
          if (!collisionGeometry
            || !["relative", "static"].includes(collisionGeometry.sheetPosition)
            || collisionGeometry.sheet.top < collisionGeometry.stage.bottom - 2
            || rectanglesOverlap(collisionGeometry.sheet, collisionGeometry.stage, 0)
            || rectanglesOverlap(collisionGeometry.assistant, collisionGeometry.sheet, 2)) {
            throw new Error(`Phase 200 ${width}px inspector and assistant collided: ${JSON.stringify(collisionGeometry)}`);
          }
          graphPresentationEvidence.push(await capturePhase200GraphPresentation(page, workspace, {
            dimension: "2d",
            orientation: "portrait",
            width
          }));

          await toolbar.getByRole("button", { name: "Expand" }).click();
          await page.waitForFunction((priorCount) => Number(document.querySelector('[data-graph-dimension="2d"]')
            ?.getAttribute("data-canonical-entity-count")) > priorCount, collapsedEntityCount);
          await toolbar.getByRole("button", { name: "3D" }).click();
          await expectUrl(page, /\/member\/graph\?graph=3d(?:&.*)?$/, `Phase 200 ${width}px 3D preference`);
          const threeDimensionalRenderer = workspace.locator(
            '.phase180-graph-panel > [data-graph-dimension="3d"]'
          );
          await expectVisible(threeDimensionalRenderer, `Phase 200 ${width}px synchronized 3D renderer`, 30_000);
          const synchronized3DState = {
            arrangement: await workspace.getAttribute("data-effective-arrangement"),
            panelCount: await workspace.locator(".phase180-graph-panel").count(),
            selectedEntityId: await threeDimensionalRenderer.getAttribute("data-canonical-selected-entity-id"),
            urlDimension: new URL(page.url()).searchParams.get("graph")
          };
          if (
            synchronized3DState.arrangement !== "3d-only"
            || synchronized3DState.panelCount !== 1
            || synchronized3DState.selectedEntityId !== selectedEntityId
            || synchronized3DState.urlDimension !== "3d"
          ) {
            throw new Error(`Phase 200 ${width}px 2D/3D synchronization failed: ${JSON.stringify(synchronized3DState)}.`);
          }
          graphPresentationEvidence.push(await capturePhase200GraphPresentation(page, workspace, {
            dimension: "3d",
            orientation: "portrait",
            width
          }));
          await toolbar.getByRole("button", { name: "2D" }).click();
          await expectVisible(page.locator('[data-graph-dimension="2d"]'), `Phase 200 ${width}px return to 2D`);
          if (await page.locator('[data-graph-dimension="2d"]').getAttribute("data-canonical-selected-entity-id") !== selectedEntityId) {
            throw new Error(`Phase 200 ${width}px lost selection when returning to 2D.`);
          }

          await toolbar.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
          await toolbar.getByRole("button", { name: "Full screen" }).click();
          await page.waitForFunction(() => document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-fullscreen-dimension") === "2d");
          const portraitFullscreen = await workspace.evaluate((element) => ({
            fallback: element.getAttribute("data-fullscreen-fallback") === "true",
            native: document.fullscreenElement !== null
          }));
          if (!portraitFullscreen.native && !portraitFullscreen.fallback) {
            throw new Error(`Phase 200 ${width}px portrait full screen was not active.`);
          }
          await toolbar.getByRole("button", { name: "Full screen" }).click();
          await page.waitForFunction(() => !document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-fullscreen-dimension"));
          await page.setViewportSize({ width: 767, height: 390 });
          await page.waitForFunction(() => document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-mobile-presentation") === "single-renderer");
          await expectVisible(toolbar, `Phase 200 ${width}px landscape compact graph toolbar`);
          if (await workspace.locator(".phase180-graph-panel").count() !== 1) {
            throw new Error(`Phase 200 ${width}px landscape mounted multiple graph renderers.`);
          }
          await toolbar.getByRole("button", { name: "Full screen" }).click();
          await page.waitForFunction(() => document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-fullscreen-dimension") === "2d");
          await toolbar.getByRole("button", { name: "Full screen" }).click();
          await page.waitForFunction(() => !document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-fullscreen-dimension"));
          graphPresentationEvidence.push(await capturePhase200GraphPresentation(page, workspace, {
            dimension: "2d",
            orientation: "landscape",
            width
          }));
          await toolbar.getByRole("button", { name: "3D" }).click();
          await expectVisible(
            workspace.locator('.phase180-graph-panel > [data-graph-dimension="3d"]'),
            `Phase 200 ${width}px landscape 3D renderer`
          );
          graphPresentationEvidence.push(await capturePhase200GraphPresentation(page, workspace, {
            dimension: "3d",
            orientation: "landscape",
            width
          }));
          await toolbar.getByRole("button", { name: "2D" }).click();

          mobileEvidence.push({
            label_budget: Number(initialState.labelBudget),
            landscape_single_renderer: true,
            portrait_fullscreen: true,
            selected_entity_id: selectedEntityId,
            viewport_width: width
          });
        } finally {
          await context.close();
        }
      }

      for (const width of [1440, 1920]) {
        const desktopGraph = await newPage({ viewport: { width, height: 1000 } });
        try {
          await installPhase195GraphRoutes(desktopGraph.page);
          await installPhase200InteractionRoutes(desktopGraph.page);
          await enterWorkspace(desktopGraph.page, uniqueEmail(`phase200-desktop-graph-${width}`));
          await desktopGraph.page.goto(`${frontendUrl}/member/graph`);
          const workspace = desktopGraph.page.locator(".phase195-graph-workspace");
          await expectVisible(workspace, `Phase 200 preserved ${width}px desktop Universe`);
          await desktopGraph.page.waitForFunction(() => document.querySelector(".phase195-graph-workspace")
            ?.getAttribute("data-mobile-presentation") === "desktop-dual");
          if (
            await workspace.getAttribute("data-effective-arrangement") !== "side-by-side"
            || await workspace.locator(".phase180-graph-panel").count() !== 2
          ) {
            throw new Error(`Phase 200 did not preserve ${width}px desktop side-by-side graph behavior.`);
          }
          const canvas = desktopGraph.page.getByLabel(/Canonical Universe Graph with \d+ entities/i);
          await canvas.focus();
          await desktopGraph.page.keyboard.press("Enter");
          await expectVisible(desktopGraph.page.locator('[data-canonical-detail-surface="2d"]'), `Phase 200 ${width}px 2D inspector`);
          await expectVisible(desktopGraph.page.locator('[data-canonical-detail-surface="3d-inspector"]'), `Phase 200 ${width}px 3D inspector`);
          for (const dimension of ["2d", "3d"]) {
            graphPresentationEvidence.push(await capturePhase200GraphPresentation(desktopGraph.page, workspace, {
              dimension,
              orientation: "landscape",
              width
            }));
          }
        } finally {
          await desktopGraph.context.close();
        }
      }

      await writeFile(
        join(repoRoot, "test-results", "e2e", "phase200-interaction-browser-fixture.json"),
        `${JSON.stringify({
          accepted_production_evidence: false,
          browser_session: "LOCAL_MEMORY_AUTHENTICATED",
          evidence_class: "INTERCEPTED_BROWSER_FIXTURE",
          generated_at: new Date().toISOString(),
          graph_presentation_evidence: graphPresentationEvidence,
          mobile_profiles: mobileEvidence,
          route_interception: true,
          status: "passed"
        }, null, 2)}\n`,
        "utf8"
      );
    }
  },
  {
    name: "Phase 202 account security and invitation surfaces preserve one-time material and responsive authority readbacks",
    run: async () => {
      const desktop = await newPage({ viewport: { width: 1440, height: 1000 } });
      const invitationRequests = [];
      const consoleMessages = [];
      const pageErrors = [];
      const invitationToken = "phase202-invitation-token-abcdefghijklmnopqrstuvwxyz-0123456789";
      try {
        desktop.page.on("console", (message) => consoleMessages.push(message.text()));
        desktop.page.on("pageerror", (error) => pageErrors.push(error.message));
        const identityRoutes = await installPhase202AccountSecurityRoutes(desktop.page);
        await installPhase170Routes(desktop.page);
        await desktop.page.route("**/api/member/invitations/signup", async (route) => {
          const request = route.request();
          invitationRequests.push({
            body: request.postDataJSON(),
            method: request.method(),
            referrer: request.headers().referer ?? null
          });
          await route.fulfill({
            contentType: "application/json",
            json: {
              invitationAccepted: true,
              message: "Invitation accepted. Verify your email before signing in to Entral."
            },
            status: 200
          });
        });
        await enterWorkspace(desktop.page, uniqueEmail("phase202-security"));
        await desktop.page.goto(`${frontendUrl}/member/dashboard`);
        await expectUrl(desktop.page, /\/member\/dashboard$/, "Phase 202 member shell entry");
        await closeAcademyIfOpen(desktop.page);
        const accountSecurityEntry = desktop.page.getByRole("button", { name: "Account security", exact: true });
        await expectVisible(accountSecurityEntry, "Phase 202 member account-security navigation entry");
        await accountSecurityEntry.click();
        await expectUrl(desktop.page, /\/member\/account\/security$/, "Phase 202 account-security navigation");

        await expectVisible(desktop.page.getByRole("heading", { level: 1, name: "Account security" }), "Phase 202 account-security surface");
        const sessionsRegion = desktop.page.locator('section[aria-labelledby="active-sessions-heading"]');
        const mfaRegion = desktop.page.locator('section[aria-labelledby="mfa-heading"]');
        const membershipsRegion = desktop.page.locator('section[aria-labelledby="memberships-heading"]');
        const supportRegion = desktop.page.locator('section[aria-labelledby="support-access-heading"]');
        for (const [region, label] of [
          [sessionsRegion, "durable sessions"],
          [mfaRegion, "authenticator MFA"],
          [membershipsRegion, "tenant membership"],
          [supportRegion, "owner-visible support access"]
        ]) {
          await expectVisible(region, `Phase 202 ${label} region`);
        }

        const currentSession = sessionsRegion.locator("li").filter({ hasText: "Chrome on Windows" });
        const otherSession = sessionsRegion.locator("li").filter({ hasText: "Safari on iPad" });
        await expectVisible(currentSession.getByText("Current", { exact: true }), "Phase 202 current-session status");
        await expectVisible(currentSession.getByRole("button", { name: "Revoke current", exact: true }), "Phase 202 current-session control");
        const revokeOther = otherSession.getByRole("button", { name: "Revoke session", exact: true });
        await expectVisible(revokeOther, "Phase 202 non-current session control");
        await revokeOther.focus();
        if (!await revokeOther.evaluate((element) => document.activeElement === element)) {
          throw new Error("Phase 202 non-current session control did not accept keyboard focus.");
        }
        await desktop.page.keyboard.press("Enter");
        await expectVisible(
          desktop.page.getByRole("status").filter({ hasText: "Session revoked and verified by a fresh inventory readback." }),
          "Phase 202 session-revocation status semantics"
        );
        await expectVisible(otherSession.getByText("Revoked", { exact: true }), "Phase 202 revoked session readback");
        if (await otherSession.getByRole("button", { name: "Revoke session", exact: true }).count()) {
          throw new Error("Phase 202 retained a revocation control for a revoked session.");
        }
        const sessionRequests = identityRoutes.requests.filter((request) => request.pathname.includes("/identity/sessions"));
        if (
          !sessionRequests.some((request) => request.method === "DELETE" && request.pathname.endsWith("/123e4567-e89b-42d3-a456-426614174102"))
          || sessionRequests.filter((request) => request.method === "GET").length < 2
          || identityRoutes.sessions().find((session) => !session.current)?.revoked_at === null
        ) {
          throw new Error(`Phase 202 session revocation did not produce a fresh durable readback: ${JSON.stringify(sessionRequests)}.`);
        }

        await expectVisible(membershipsRegion.getByText("Owner Example", { exact: true }), "Phase 202 owner membership identity");
        await expectVisible(membershipsRegion.getByText("OWNER", { exact: true }), "Phase 202 owner membership authority");
        const activeSupportGrant = supportRegion.locator("li").filter({ hasText: "Production incident readback" });
        await expectVisible(activeSupportGrant.getByText("read only", { exact: true }), "Phase 202 active support-access mode");
        await expectVisible(
          activeSupportGrant.getByText("Support actor 123e4567-e89b-42d3-a456-426614174011", { exact: true }),
          "Phase 202 support actor readback"
        );
        await expectVisible(
          activeSupportGrant.getByText("Approved by 123e4567-e89b-42d3-a456-426614174001", { exact: true }),
          "Phase 202 support approver readback"
        );
        await expectVisible(activeSupportGrant.getByText(/^Expires /), "Phase 202 support expiry readback");
        const expiredSupportGrant = supportRegion.locator("li").filter({ hasText: "Expired maintenance grant" });
        await expectVisible(expiredSupportGrant.getByText("inactive", { exact: true }), "Phase 202 expired support-access state");
        await expectVisible(
          expiredSupportGrant.getByText("Support actor 123e4567-e89b-42d3-a456-426614174013", { exact: true }),
          "Phase 202 expired support actor readback"
        );
        await expectVisible(
          expiredSupportGrant.getByText("Approved by 123e4567-e89b-42d3-a456-426614174004", { exact: true }),
          "Phase 202 expired support approver readback"
        );
        await expectVisible(expiredSupportGrant.getByText(/^Expires /), "Phase 202 expired support expiry readback");

        await expectVisible(mfaRegion.getByText("No authenticator factor is active.", { exact: true }), "Phase 202 initial MFA readback");
        const enrollButton = mfaRegion.getByRole("button", { name: "Enroll authenticator", exact: true });
        await enrollButton.focus();
        if (!await enrollButton.evaluate((element) => document.activeElement === element)) {
          throw new Error("Phase 202 MFA enrollment control did not accept keyboard focus.");
        }
        await desktop.page.keyboard.press("Enter");
        await expectVisible(mfaRegion.getByText(identityRoutes.setupSecret, { exact: true }), "Phase 202 one-time setup material");
        if ((await mfaRegion.innerText()).includes("otpauth://")) {
          throw new Error("Phase 202 rendered the authenticator provisioning URI.");
        }
        await mfaRegion.getByLabel("Authenticator enrollment code").fill("123456");
        const confirmMfa = mfaRegion.getByRole("button", { name: "Confirm MFA", exact: true });
        await confirmMfa.focus();
        await desktop.page.keyboard.press("Enter");
        const recoveryRegion = mfaRegion.getByLabel("One-time recovery codes");
        await expectVisible(recoveryRegion, "Phase 202 one-time recovery material region");
        for (const code of identityRoutes.recoveryCodes) {
          await expectVisible(recoveryRegion.getByText(code, { exact: true }), `Phase 202 recovery material ${code}`);
        }
        if (await mfaRegion.getByText(identityRoutes.setupSecret, { exact: true }).count()) {
          throw new Error("Phase 202 retained setup material after MFA confirmation.");
        }
        await expectVisible(mfaRegion.getByText("active", { exact: true }), "Phase 202 active MFA factor readback");
        const confirmRequest = identityRoutes.requests.find((request) => request.pathname.endsWith("/identity/mfa/totp/confirm"));
        if (
          !confirmRequest
          || confirmRequest.method !== "POST"
          || confirmRequest.body?.code !== "123456"
          || confirmRequest.body?.factor_id !== "123e4567-e89b-42d3-a456-426614174020"
          || confirmRequest.idempotency_key.length < 12
          || identityRoutes.factors()[0]?.status !== "ACTIVE"
        ) {
          throw new Error(`Phase 202 MFA confirmation request or fresh factor readback drifted: ${JSON.stringify(confirmRequest)}.`);
        }
        await recoveryRegion.getByRole("button", { name: "I saved them; clear view", exact: true }).click();
        if (await mfaRegion.getByLabel("One-time recovery codes").count()) {
          throw new Error("Phase 202 retained one-time recovery material after explicit clearing.");
        }

        const stepUpInput = mfaRegion.getByLabel("MFA step-up code");
        await stepUpInput.fill("000000");
        await stepUpInput.press("Enter");
        await expectVisible(
          desktop.page.getByRole("alert").filter({ hasText: "AUTHORITY STORE blocked this action: MFA_FACTOR_STORE_UNAVAILABLE." }),
          "Phase 202 typed MFA dependency error semantics"
        );

        const storedSecurityValues = await desktop.page.evaluate(() => JSON.stringify({
          local: Object.entries(window.localStorage),
          session: Object.entries(window.sessionStorage)
        }));
        for (const sensitive of [identityRoutes.setupSecret, ...identityRoutes.recoveryCodes]) {
          if (storedSecurityValues.includes(sensitive)) {
            throw new Error(`Phase 202 persisted one-time MFA material in browser storage: ${sensitive}.`);
          }
        }

        await desktop.page.goto(`${frontendUrl}/member/invitations/accept?token=${encodeURIComponent(invitationToken)}`);
        await expectVisible(desktop.page.getByRole("heading", { level: 1, name: "Accept your Entral invitation" }), "Phase 202 invitation-acceptance surface");
        await expectUrl(desktop.page, /\/member\/invitations\/accept$/, "Phase 202 invitation-token scrubbing");
        if ((await desktop.page.locator("body").innerText()).includes(invitationToken)) {
          throw new Error("Phase 202 rendered the invitation token after URL scrubbing.");
        }
        await desktop.page.getByLabel("Full name").fill("Invited Owner");
        await desktop.page.getByLabel("Email address").fill("invited-owner@example.com");
        await desktop.page.getByLabel("Create password").fill("phase202-password");
        const confirmation = desktop.page.getByLabel("Confirm password");
        await confirmation.fill("phase202-mismatch");
        const createAccount = desktop.page.getByRole("button", { name: "Create account and accept", exact: true });
        await createAccount.focus();
        await desktop.page.keyboard.press("Enter");
        if (!await confirmation.evaluate((element) => document.activeElement === element)) {
          throw new Error("Phase 202 password mismatch did not move focus to confirmation.");
        }
        const passwordDescription = await confirmation.evaluate((element) => {
          const descriptionId = element.getAttribute("aria-describedby");
          return descriptionId ? document.getElementById(descriptionId)?.textContent?.trim() ?? null : null;
        });
        if (passwordDescription !== "Passwords must match.") {
          throw new Error(`Phase 202 password mismatch was not accessibly described: ${passwordDescription}.`);
        }
        await confirmation.fill("phase202-password");
        await createAccount.focus();
        await desktop.page.keyboard.press("Enter");
        await expectVisible(desktop.page.getByRole("heading", { level: 1, name: "Your Entral access is ready" }), "Phase 202 invitation success surface");
        await expectVisible(
          desktop.page.getByRole("status").filter({ hasText: "Invitation accepted. Verify your email before signing in to Entral." }),
          "Phase 202 invitation success status semantics"
        );
        if (
          invitationRequests.length !== 1
          || invitationRequests[0].method !== "POST"
          || invitationRequests[0].body?.invitation_token !== invitationToken
          || invitationRequests[0].body?.email !== "invited-owner@example.com"
          || invitationRequests[0].body?.name !== "Invited Owner"
          || invitationRequests[0].body?.password !== "phase202-password"
        ) {
          throw new Error(`Phase 202 invitation signup request drifted: ${JSON.stringify(invitationRequests)}.`);
        }

        const storedInvitationValues = await desktop.page.evaluate(() => JSON.stringify({
          local: Object.entries(window.localStorage),
          session: Object.entries(window.sessionStorage)
        }));
        const renderedInvitationBody = await desktop.page.locator("body").innerText();
        const loggedBrowserValues = [...consoleMessages, ...pageErrors].join("\n");
        for (const sensitive of [invitationToken, identityRoutes.setupSecret, ...identityRoutes.recoveryCodes]) {
          if (storedInvitationValues.includes(sensitive) || renderedInvitationBody.includes(sensitive) || loggedBrowserValues.includes(sensitive)) {
            throw new Error(`Phase 202 leaked protected browser material outside its one-time view: ${sensitive}.`);
          }
        }
        if (pageErrors.length) {
          throw new Error(`Unexpected Phase 202 desktop browser errors:\n${pageErrors.join("\n")}`);
        }
      } finally {
        await desktop.context.close();
      }

      const responsiveEvidence = [];
      for (const width of [360, 390, 412, 430]) {
        const { context, page } = await newPage({
          deviceScaleFactor: 2,
          isMobile: true,
          viewport: { height: 844, width }
        });
        const runtimeErrors = [];
        try {
          page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
          page.on("console", (message) => {
            if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
          });
          await installPhase202AccountSecurityRoutes(page);
          await installPhase170Routes(page);
          await installPhase200InteractionRoutes(page);
          await enterWorkspace(page, uniqueEmail(`phase202-responsive-${width}`));
          await page.goto(`${frontendUrl}/member/dashboard`);
          await expectUrl(page, /\/member\/dashboard$/, `Phase 202 ${width}px member shell entry`);
          await closeAcademyIfOpen(page);
          const accountSecurityEntry = page.getByRole("button", { name: "Account security", exact: true });
          await expectVisible(accountSecurityEntry, `Phase 202 ${width}px account-security navigation entry`);
          await accountSecurityEntry.click();
          await expectUrl(page, /\/member\/account\/security$/, `Phase 202 ${width}px account-security navigation`);
          await expectVisible(page.getByRole("heading", { level: 1, name: "Account security" }), `Phase 202 ${width}px account security`);
          await expectVisible(page.getByText("Safari on iPad", { exact: true }), `Phase 202 ${width}px session controls`);
          await expectVisible(page.getByText("Production incident readback", { exact: true }), `Phase 202 ${width}px support readback`);
          const securityGeometry = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth
          }));
          if (securityGeometry.documentWidth > securityGeometry.viewportWidth + 2) {
            throw new Error(`Phase 202 ${width}px account-security surface overflowed horizontally: ${JSON.stringify(securityGeometry)}.`);
          }

          const mobileInvitationToken = `${invitationToken}-${width}`;
          await page.goto(`${frontendUrl}/member/invitations/accept?token=${encodeURIComponent(mobileInvitationToken)}`);
          await expectVisible(page.getByRole("heading", { level: 1, name: "Accept your Entral invitation" }), `Phase 202 ${width}px invitation acceptance`);
          await expectUrl(page, /\/member\/invitations\/accept$/, `Phase 202 ${width}px invitation-token scrubbing`);
          const invitationGeometry = await page.evaluate((token) => ({
            documentWidth: document.documentElement.scrollWidth,
            stored: JSON.stringify({
              local: Object.entries(window.localStorage),
              session: Object.entries(window.sessionStorage)
            }).includes(token),
            tokenRendered: document.body.innerText.includes(token),
            viewportWidth: window.innerWidth
          }), mobileInvitationToken);
          if (
            invitationGeometry.documentWidth > invitationGeometry.viewportWidth + 2
            || invitationGeometry.stored
            || invitationGeometry.tokenRendered
          ) {
            throw new Error(`Phase 202 ${width}px invitation surface violated its responsive/token boundary: ${JSON.stringify(invitationGeometry)}.`);
          }
          if (runtimeErrors.length) {
            throw new Error(`Unexpected Phase 202 ${width}px browser errors:\n${runtimeErrors.join("\n")}`);
          }
          responsiveEvidence.push({
            account_security_no_horizontal_overflow: true,
            invitation_no_horizontal_overflow: true,
            invitation_token_scrubbed: true,
            viewport_width: width
          });
        } finally {
          await context.close();
        }
      }

      await writeFile(
        join(repoRoot, "test-results", "e2e", "phase202-account-security-browser-fixture.json"),
        `${JSON.stringify({
          accepted_production_evidence: false,
          browser_session: "LOCAL_MEMORY_AUTHENTICATED",
          evidence_class: "INTERCEPTED_BROWSER_FIXTURE",
          generated_at: new Date().toISOString(),
          invitation_token_scrubbed: true,
          one_time_material_not_stored_or_logged: true,
          responsive_profiles: responsiveEvidence,
          route_interception: true,
          status: "passed"
        }, null, 2)}\n`,
        "utf8"
      );
    }
  },
  {
    name: "member Phase 180 shell synchronizes Dashboard, Graph, Infrastructure, mobile rotation, and reconnect",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 2
      });
      const runtimeErrors = [];
      try {
        await installPhase195GraphRoutes(page);
        await installPhase200InteractionRoutes(page);
        await enterWorkspace(page, uniqueEmail("phase180-member"));
        await page.goto(`${frontendUrl}/member/dashboard`);
        await expectUrl(page, /\/member\/dashboard$/, "Phase 180 member Dashboard");
        await closeAcademyIfOpen(page);
        page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          const text = message.text();
          const expectedOfflineFailure = /net::ERR_INTERNET_DISCONNECTED/i.test(text);
          if (message.type() === "error" && !expectedOfflineFailure) runtimeErrors.push(`console: ${text}`);
        });
        await expectVisible(page.getByRole("heading", { name: "Command overview" }), "Phase 180 canonical Command destination");
        const destinationNav = page.getByRole("navigation", { name: "Owner primary destinations" });
        if (await destinationNav.getByRole("link").count() !== 5) {
          throw new Error("Phase 200 member shell does not expose exactly five primary destinations.");
        }
        await expectVisible(page.getByLabel("Inherited canonical scope"), "Inherited canonical scope");
        const entralEmblem = page.getByRole("button", { name: "Open ENTRAL assistant" });
        await expectVisible(entralEmblem, "Persistent ENTRAL emblem");
        await entralEmblem.click();
        const entralAssistant = page.getByRole("region", { name: "ENTRAL assistant" });
        await expectVisible(entralAssistant, "Context-aware ENTRAL assistant");
        await expectVisible(entralAssistant.getByText("Event 9", { exact: true }), "ENTRAL canonical event version");
        await expectVisible(
          entralAssistant.getByText(/Same RLS scope, selection, and canonical event as this screen/i),
          "Truthful shared canonical context"
        );
        await expectVisible(entralAssistant.getByLabel("Message ENTRAL"), "ENTRAL assistant message input");
        await entralAssistant.getByRole("button", { name: "Close ENTRAL assistant" }).click();

        await destinationNav.getByRole("link", { name: "Universe" }).click();
        await expectUrl(page, /\/member\/graph$/, "Phase 180 Universe Graph");
        const canvas = page.getByLabel(/Canonical Universe Graph with \d+ entities/i);
        await expectVisible(canvas, "Canonical 2D Graph canvas");
        const touchScroll = await context.newCDPSession(page);
        try {
          await canvas.scrollIntoViewIfNeeded();
          if (await canvas.getAttribute("data-touch-interaction") !== "page") {
            throw new Error("2D embedded graph did not default to page-touch scrolling.");
          }
          const bounds = await canvas.boundingBox();
          if (!bounds) throw new Error("2D graph did not expose touch-scroll geometry.");
          const before = await page.evaluate(() => ({
            max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
            y: window.scrollY
          }));
          const scrollDown = before.y < before.max - 120;
          const centerX = bounds.x + bounds.width / 2;
          const startY = bounds.y + bounds.height / 2;
          const endY = startY + (scrollDown ? -150 : 150);
          await touchScroll.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x: centerX, y: startY }]
          });
          for (const progress of [0.25, 0.5, 0.75, 1]) {
            await touchScroll.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x: centerX, y: startY + (endY - startY) * progress }]
            });
            await page.waitForTimeout(20);
          }
          await touchScroll.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: []
          });
          await page.waitForTimeout(200);
          const after = await page.evaluate(() => window.scrollY);
          if ((scrollDown && after <= before.y) || (!scrollDown && after >= before.y)) {
            throw new Error("2D embedded graph trapped vertical page touch scrolling.");
          }
        } finally {
          await touchScroll.detach();
        }
        const twoDimensionalSnapshot = await page.locator('[data-graph-dimension="2d"]').evaluate((element) => ({
          entities: element.getAttribute("data-canonical-entity-count"),
          event: element.getAttribute("data-canonical-event-sequence")
        }));
        if (twoDimensionalSnapshot.event !== "9") {
          throw new Error(`2D Graph did not expose the accepted canonical snapshot: ${JSON.stringify(twoDimensionalSnapshot)}`);
        }
        const graphEntralEmblem = page.getByRole("button", { name: "Open ENTRAL assistant" });
        await expectVisible(graphEntralEmblem, "Persistent ENTRAL emblem on Graph");
        await graphEntralEmblem.click();
        const graphEntralAssistant = page.getByRole("region", { name: "ENTRAL assistant" });
        await expectVisible(graphEntralAssistant, "Graph-aware ENTRAL assistant");
        await expectVisible(graphEntralAssistant.getByLabel("Message ENTRAL"), "Graph-aware ENTRAL message input");
        await graphEntralAssistant.getByRole("button", { name: "Close ENTRAL assistant" }).click();

        const graphWorkspace = page.locator(".phase180-graph-workspace");
        const mobileGraphToolbar = page.getByRole("toolbar", { name: "Compact mobile Universe controls" });
        const enter2DFullscreen = mobileGraphToolbar.getByRole("button", { name: "Full screen" });
        await expectVisible(enter2DFullscreen, "2D Graph full-screen control");

        await mobileGraphToolbar.evaluate((element) => element.scrollIntoView({ block: "center" }));
        await enter2DFullscreen.click();
        await page.waitForFunction(() => (
          document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension") === "2d"
        ));
        const twoDimensionalFullscreenState = await graphWorkspace.evaluate((element) => ({
          fallback: element.getAttribute("data-fullscreen-fallback") === "true",
          native: document.fullscreenElement !== null,
          otherPanelHidden: element.querySelector('[data-panel="3d"]') === null
        }));
        if (
          (!twoDimensionalFullscreenState.native && !twoDimensionalFullscreenState.fallback)
          || !twoDimensionalFullscreenState.otherPanelHidden
        ) {
          throw new Error(`2D Graph did not enter an isolated full-screen surface: ${JSON.stringify(twoDimensionalFullscreenState)}`);
        }
        await expectVisible(
          page.getByRole("button", { name: "Open ENTRAL assistant" }),
          "Persistent ENTRAL emblem in 2D full screen"
        );
        await page.getByRole("button", { name: "Open ENTRAL assistant" }).click();
        const twoDimensionalEntralAssistant = page.getByRole("region", { name: "ENTRAL assistant" });
        await expectVisible(twoDimensionalEntralAssistant, "ENTRAL assistant in 2D full screen");
        await twoDimensionalEntralAssistant.getByRole("button", { name: "Close ENTRAL assistant" }).click();
        await enter2DFullscreen.click();
        await page.waitForFunction(() => (
          !document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension")
        ));

        await mobileGraphToolbar.getByRole("button", { name: "3D" }).click();
        await expectUrl(page, /\/member\/graph\?graph=3d(?:&.*)?$/, "Phase 200 mobile 3D Graph");
        const original3DCanvas = page.getByRole("application", {
          name: /Canonical 3D Universe Graph with \d+ entities/i
        });
        await expectVisible(original3DCanvas, "Original full 3D Universe Graph canvas", 30_000);
        await mobileGraphToolbar.getByRole("button", { name: "Full screen" }).click();
        await page.waitForFunction(() => (
          document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension") === "3d"
        ));
        const threeDimensionalFullscreenState = await graphWorkspace.evaluate((element) => ({
          fallback: element.getAttribute("data-fullscreen-fallback") === "true",
          native: document.fullscreenElement !== null,
          otherPanelHidden: element.querySelector('[data-panel="2d"]') === null
        }));
        if (
          (!threeDimensionalFullscreenState.native && !threeDimensionalFullscreenState.fallback)
          || !threeDimensionalFullscreenState.otherPanelHidden
        ) {
          throw new Error(`3D Graph did not enter an isolated full-screen surface: ${JSON.stringify(threeDimensionalFullscreenState)}`);
        }
        await expectVisible(
          page.getByRole("button", { name: "Open ENTRAL assistant" }),
          "Persistent ENTRAL emblem in 3D full screen"
        );
        await expectVisible(page.getByRole("button", { name: "Stop movement" }), "Full-screen 3D movement control");
        await mobileGraphToolbar.getByRole("button", { name: "Full screen" }).click();
        await page.waitForFunction(() => (
          !document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension")
        ));

        await mobileGraphToolbar.getByRole("button", { name: "2D" }).click();
        await expectUrl(page, /\/member\/graph\?graph=2d(?:&.*)?$/, "Phase 200 mobile 2D Graph return");
        await expectVisible(canvas, "2D Graph after mobile renderer return");
        await page.waitForFunction(() => {
          const surface = document.querySelector('[data-graph-dimension="2d"]');
          return surface?.getAttribute("data-rendered-canonical-id-count")
            === surface?.getAttribute("data-canonical-entity-count");
        });
        await canvas.scrollIntoViewIfNeeded();
        await canvas.focus();
        await canvas.evaluate((element) => {
          if (document.activeElement !== element) {
            throw new Error("Returned 2D Graph canvas did not receive keyboard focus.");
          }
        });
        await canvas.press("Enter");
        await expectVisible(page.getByRole("complementary", { name: /graph details/i }), "Dismissible Graph detail drawer");

        await page.setViewportSize({ width: 844, height: 390 });
        await expectVisible(page.getByRole("complementary", { name: /graph details/i }), "Graph selection after landscape rotation");
        await page.setViewportSize({ width: 390, height: 844 });
        await expectVisible(page.getByRole("complementary", { name: /graph details/i }), "Graph selection after portrait recovery");

        await mobileGraphToolbar.getByRole("button", { name: "3D" }).click();
        await expectUrl(page, /\/member\/graph\?graph=3d(?:&.*)?$/, "Phase 200 retained 3D Graph focus");
        await expectVisible(original3DCanvas, "3D Graph after mobile renderer switch");
        await original3DCanvas.scrollIntoViewIfNeeded();
        await original3DCanvas.focus();
        await expectUrl(page, /\/member\/graph(?:\?.*)?$/, "Original 3D Universe Graph focus");
        const threeDimensionalSnapshot = await page.locator(".phase180-graph-3d").evaluate((element) => ({
          entities: element.getAttribute("data-canonical-entity-count"),
          event: element.getAttribute("data-canonical-event-sequence")
        }));
        if (
          threeDimensionalSnapshot.entities !== twoDimensionalSnapshot.entities
          || threeDimensionalSnapshot.event !== twoDimensionalSnapshot.event
        ) {
          throw new Error(
            `2D and 3D Graphs did not share one canonical snapshot: ${JSON.stringify({ threeDimensionalSnapshot, twoDimensionalSnapshot })}`
          );
        }
        const sharedGraphControls = mobileGraphToolbar;
        await expectVisible(sharedGraphControls, "Compact shared canonical Graph controls");
        await expectVisible(
          sharedGraphControls.getByRole("button", { name: "Fit" }),
          "Shared canonical fit control"
        );
        if (
          await page.getByRole("toolbar", { name: "Universe Graph toolbar" }).isVisible()
            .catch(() => false)
          || await page.getByRole("button", { name: "Graph settings" }).isVisible()
            .catch(() => false)
          || await page.getByRole("slider", { name: "3D formation gravity" }).isVisible()
            .catch(() => false)
        ) {
          throw new Error("Phase 195 exposed duplicate legacy 3D controls beside the shared canonical controls.");
        }
        const threeDimensionalInspector = page.getByLabel("Selected graph entity");
        await expectVisible(threeDimensionalInspector, "Original 3D Graph selected-entity drawer");
        if (await threeDimensionalInspector.getAttribute("data-collapsed") !== "true") {
          throw new Error("Original 3D Graph selected-entity drawer did not default to its compact state.");
        }
        if (await threeDimensionalInspector.locator("dl").count()) {
          throw new Error("Compact 3D Graph inspector exposed expanded entity details.");
        }
        await threeDimensionalInspector.getByRole("button", { name: /Expand details for/i }).click();
        if (await threeDimensionalInspector.getAttribute("data-collapsed") !== "false") {
          throw new Error("Original 3D Graph selected-entity drawer did not expand.");
        }
        await expectVisible(threeDimensionalInspector.locator("dl"), "Expanded 3D Graph entity details");
        await threeDimensionalInspector.getByRole("button", { name: /Collapse details for/i }).click();
        if (await threeDimensionalInspector.getAttribute("data-collapsed") !== "true") {
          throw new Error("Original 3D Graph selected-entity drawer did not return to its compact state.");
        }

        if (await page.locator(".phase180-graph-workspace").getAttribute("data-graph-motion") !== "running") {
          throw new Error("The compact mobile Graph changed lifecycle behavior while switching renderers.");
        }

        await mobileGraphToolbar.getByRole("button", { name: "2D" }).click();
        await expectUrl(page, /\/member\/graph\?graph=2d(?:&.*)?$/, "Phase 200 retained 2D Graph focus");
        await expectVisible(canvas, "2D Graph after synchronized renderer return");
        await canvas.scrollIntoViewIfNeeded();
        await canvas.focus();
        await expectUrl(page, /\/member\/graph(?:\?.*)?$/, "Retained 2D Graph focus");
        if (await graphWorkspace.locator(".phase180-graph-panel").count() !== 1) {
          throw new Error("Mobile Graph mounted more than one renderer after returning to 2D.");
        }

        await context.setOffline(true);
        await page.waitForTimeout(5_500);
        await expectVisible(page.getByText(/Disconnected · retrying canonical events/i), "Canonical disconnect state");
        await context.setOffline(false);
        await expectVisible(page.getByText(/Connected · canonical event 9/i), "Canonical reconnect recovery", 10_000);

        await page.getByRole("button", { name: "Open full record" }).click();
        await expectUrl(page, /\/member\/infrastructure$/, "Phase 180 Infrastructure");
        await expectVisible(page.getByRole("heading", { name: "Infrastructure", exact: true }), "Infrastructure heading");
        await expectVisible(page.getByRole("heading", { name: "ENTRAL" }), "Canonical full entity record");
        await expectVisible(page.getByText("Snapshot event 9"), "Version-aligned entity snapshot");
        const recordLayout = await page.locator(".phase180-record").evaluate((element) => {
          const style = getComputedStyle(element);
          return { bottom: style.bottom, position: style.position, top: style.top };
        });
        if (recordLayout.position !== "fixed" || recordLayout.top !== "0px") {
          throw new Error(`Phone Infrastructure did not open a full-screen record: ${JSON.stringify(recordLayout)}`);
        }
        await page.getByRole("button", { name: "Back" }).click();
        await expectVisible(page.getByRole("tree", { name: "Canonical hierarchy" }), "Infrastructure hierarchy after Back");
        const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
        if (!noHorizontalOverflow) {
          throw new Error("Phase 180 mobile shell has horizontal overflow.");
        }

        await page.goto(`${frontendUrl}/member/dashboard?section=entral`);
        await expectUrl(page, /\/member\/dashboard\?section=entral$/, "Member full ENTRAL room");
        await expectVisible(page.getByRole("region", { name: "Main ENTRAL chat room" }), "Member full ENTRAL room");
        if (
          await page.getByRole("button", { name: "Open ENTRAL assistant" }).count()
          || await page.getByRole("button", { name: "Close ENTRAL assistant" }).count()
        ) {
          throw new Error("The persistent ENTRAL assistant launcher was duplicated inside the main ENTRAL room.");
        }

        if (runtimeErrors.length) {
          throw new Error(`Unexpected Phase 180 browser errors:\n${runtimeErrors.join("\n")}`);
        }
      } finally {
        await context.setOffline(false).catch(() => undefined);
        await context.close();
      }
    }
  },
  {
    name: "ENTRAL workspace shows AI cost guardrails and disables unconfigured execution",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await installPhase200InteractionRoutes(page);
        await enterWorkspace(page, uniqueEmail("chat"));
        await page.goto(`${frontendUrl}/chat`);
        await expectUrl(page, /\/dashboard\?section=entral$/, "ENTRAL workspace");
        await expectVisible(page.getByRole("heading", { name: /entral communications/i }), "ENTRAL communications heading");
        await expectVisible(page.getByText("AI cost guardrails"), "AI usage guardrail");
        await expectVisible(page.getByText(/Read-only conversation history/i), "Read-only provider boundary");
        const directiveInput = page.getByLabel("Enter command directive");
        await expectVisible(directiveInput, "Directive input");
        if (await directiveInput.isEnabled()) {
          throw new Error("The directive input was enabled without a configured real AI provider.");
        }
        await expectVisible(page.getByText(/Mock provider|Real provider|Budget cap/), "Provider mode badge");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "mobile canonical Dashboard remains usable without horizontal overflow",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 2
      });
      try {
        await installPhase170Routes(page);
        await installPhase200InteractionRoutes(page);
        await enterWorkspace(page, uniqueEmail("mobile"));
        await closeAcademyIfOpen(page);

        await expectVisible(page.getByRole("heading", { name: "E2E Operator's Dashboard" }), "Mobile canonical Dashboard");
        await expectVisible(page.locator(".phase170-business-card").filter({ hasText: "Atlas Software" }), "Mobile business card");
        await expectVisible(page.getByPlaceholder("Business, Marshal, General, objective"), "Mobile portfolio search");
        await expectVisible(page.getByRole("link", { name: "Graph" }), "Manually available Graph destination");
        await expectVisible(page.getByRole("button", { name: "Academy" }), "Manually available Academy");
        const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
        if (!noHorizontalOverflow) {
          throw new Error(`Mobile viewport has horizontal overflow: ${await page.evaluate(() => document.documentElement.scrollWidth)}px`);
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "Phase 180 production Graph and Infrastructure remain usable with 500 businesses and 10000 entities",
    run: async () => {
      const responses = phase180ScaleResponses();
      for (const profile of [
        { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, deviceScaleFactor: 1 },
        { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 }
      ]) {
        const { context, page } = await newPage(profile);
        const runtimeErrors = [];
        try {
          await installPhase200InteractionRoutes(page);
          await enterWorkspace(page, uniqueEmail(`phase180-scale-${profile.name}`));
          await closeAcademyIfOpen(page);
          await installPhase180ScaleRoutes(page, responses);
          page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
          page.on("console", (message) => {
            if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
          });
          const graphStart = performance.now();
          await page.goto(`${frontendUrl}/member/graph`);
          await closeAcademyIfOpen(page);
          const canvas = page.getByRole("application", {
            name: profile.isMobile
              ? /Canonical Universe Graph with \d+ entities/i
              : /Canonical Universe Graph with 10000 entities/i
          });
          await expectVisible(canvas, `${profile.name} 10,000-entity production Graph`, 30_000);
          const original3DCanvas = page.getByRole("application", {
            name: /Canonical 3D Universe Graph with \d+ entities/i
          });
          if (!profile.isMobile) {
            await expectVisible(original3DCanvas, `${profile.name} 10,000-entity original 3D Graph`, 30_000);
          }
          const graphReadyMs = performance.now() - graphStart;
          if (graphReadyMs > 30_000) {
            throw new Error(`${profile.name} simultaneous Graph readiness exceeded 30s: ${graphReadyMs.toFixed(1)}ms.`);
          }
          const panelGeometry = await page.locator(".phase180-graph-panels").evaluate((element) => {
            const twoDimensional = element.querySelector('[data-panel="2d"]')?.getBoundingClientRect();
            const threeDimensional = element.querySelector('[data-panel="3d"]')?.getBoundingClientRect();
            return twoDimensional
              ? {
                  two: { bottom: twoDimensional.bottom, left: twoDimensional.left, top: twoDimensional.top },
                  three: threeDimensional ? { left: threeDimensional.left, top: threeDimensional.top } : null
                }
              : null;
          });
          if (!panelGeometry) throw new Error(`${profile.name} Graph panel did not expose geometry.`);
          if (profile.isMobile && panelGeometry.three !== null) {
            throw new Error("Phone Graph mounted more than one renderer by default.");
          }
          if (!profile.isMobile && (!panelGeometry.three || Math.abs(panelGeometry.three.top - panelGeometry.two.top) > 2 || panelGeometry.three.left <= panelGeometry.two.left)) {
            throw new Error("Desktop Graph panels did not render side by side.");
          }
          const mobileGraphToolbar = page.getByRole("toolbar", { name: "Compact mobile Universe controls" });
          if (profile.isMobile) await mobileGraphToolbar.getByRole("button", { name: "Fit" }).click();
          else await page.getByRole("button", { name: "Fit visible" }).click();
          const twoDGraphSurface = page.locator('[data-graph-dimension="2d"]');
          await page.waitForFunction(() => {
            const surface = document.querySelector('[data-graph-dimension="2d"]');
            return surface?.getAttribute("data-rendered-canonical-id-count")
              === surface?.getAttribute("data-canonical-entity-count");
          });
          const renderedCanonicalCoverage = await twoDGraphSurface.evaluate((surface) => ({
            algorithm: surface.getAttribute(
              "data-rendered-canonical-id-signature-algorithm"
            ),
            canonical_ids: (
              surface.getAttribute("data-canonical-entity-ids") ?? ""
            ).split(",").filter(Boolean),
            rendered_count: Number(
              surface.getAttribute("data-rendered-canonical-id-count")
            ),
            rendered_signature: surface.getAttribute(
              "data-rendered-canonical-id-signature"
            )
          }));
          const expectedRenderedSignature = phase195RenderedIdSignature(
            renderedCanonicalCoverage.canonical_ids
          );
          const canonicalProjectionCount = Number(await page.locator(".phase180-graph-workspace")
            .getAttribute("data-authorized-projection-entity-count"));
          if (
            renderedCanonicalCoverage.algorithm
              !== "fnv1a32:entral-phase-195-2d-render-frame-v1"
            || canonicalProjectionCount !== 10_000
            || renderedCanonicalCoverage.canonical_ids.length !== renderedCanonicalCoverage.rendered_count
            || (profile.isMobile
              ? !(renderedCanonicalCoverage.rendered_count > 0 && renderedCanonicalCoverage.rendered_count < 10_000)
              : renderedCanonicalCoverage.rendered_count !== 10_000)
            || renderedCanonicalCoverage.rendered_signature
              !== expectedRenderedSignature
          ) {
            throw new Error(
              `${profile.name} 2D render frame dropped or substituted canonical identities: `
              + JSON.stringify({
                algorithm: renderedCanonicalCoverage.algorithm,
                authorized_projection_count: canonicalProjectionCount,
                canonical_count: renderedCanonicalCoverage.canonical_ids.length,
                expected_signature: expectedRenderedSignature,
                rendered_count: renderedCanonicalCoverage.rendered_count,
                rendered_signature: renderedCanonicalCoverage.rendered_signature
              })
            );
          }
          if (profile.isMobile) {
            const touchInteractionControl = mobileGraphToolbar.getByRole("button", { name: "Interact" });
            await expectVisible(
              touchInteractionControl,
              "Phone compact Graph touch-interaction control"
            );
            await touchInteractionControl.click();
            if (await canvas.getAttribute("data-touch-interaction") !== "graph") {
              throw new Error("Phone Graph did not activate explicit touch interaction.");
            }
            await page.waitForTimeout(100);
            const touch = await context.newCDPSession(page);
            try {
              await canvas.scrollIntoViewIfNeeded();
              const fittedFrame = await canvas.screenshot();
              const bounds = await canvas.boundingBox();
              if (!bounds) throw new Error("Phone Graph canvas did not expose interaction bounds.");
              const center = {
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2
              };
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [{ x: center.x - 35, y: center.y - 20 }]
              });
              await page.waitForTimeout(30);
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: center.x, y: center.y }]
              });
              await page.waitForTimeout(30);
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: center.x + 35, y: center.y + 30 }]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: []
              });
              await page.waitForTimeout(500);
              const pannedFrame = await canvas.screenshot();
              if (fittedFrame.equals(pannedFrame)) {
                throw new Error("Phone Graph one-finger touch pan did not change the production canvas.");
              }

              await touch.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [
                  { x: center.x - 35, y: center.y },
                  { x: center.x + 35, y: center.y }
                ]
              });
              await page.waitForTimeout(30);
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [
                  { x: center.x - 90, y: center.y },
                  { x: center.x + 90, y: center.y }
                ]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: []
              });
              await page.waitForTimeout(500);
              const pinchedFrame = await canvas.screenshot();
              if (pannedFrame.equals(pinchedFrame)) {
                throw new Error("Phone Graph two-finger pinch did not change the production canvas zoom.");
              }
            } finally {
              await touch.detach();
            }
            const releaseTouchInteractionControl = mobileGraphToolbar.getByRole("button", { name: "Release" });
            await expectVisible(releaseTouchInteractionControl, "Phone compact Graph touch release control");
            await releaseTouchInteractionControl.click();
            if (await canvas.getAttribute("data-touch-interaction") !== "page") {
              throw new Error("Phone Graph did not restore page-touch scrolling.");
            }
          }
          await canvas.focus();
          await canvas.evaluate((element) => {
            const timing = { detailAt: null, keydownAt: null };
            window.__phase180GraphKeyboardTiming = timing;
            const observer = new MutationObserver(() => {
              if (document.querySelector('[data-canonical-detail-surface="2d"]')) {
                timing.detailAt = performance.now();
                observer.disconnect();
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            const recordKeydown = (event) => {
              if (event.key !== "ArrowDown") return;
              timing.keydownAt = performance.now();
              element.removeEventListener("keydown", recordKeydown, true);
            };
            element.addEventListener("keydown", recordKeydown, true);
          });
          await canvas.press("ArrowDown");
          const graphDetails = page.getByRole("complementary", { name: /ENTRAL graph details/i });
          await expectVisible(graphDetails, `${profile.name} graph keyboard selection`);
          const graphInteractionTiming = await page.evaluate(() => {
            const timing = window.__phase180GraphKeyboardTiming;
            delete window.__phase180GraphKeyboardTiming;
            return timing;
          });
          if (
            typeof graphInteractionTiming?.keydownAt !== "number"
            || typeof graphInteractionTiming.detailAt !== "number"
          ) {
            throw new Error(`${profile.name} Graph keyboard interaction timing evidence was incomplete.`);
          }
          const graphInteractionMs = graphInteractionTiming.detailAt - graphInteractionTiming.keydownAt;
          if (graphInteractionMs > 2_000) {
            throw new Error(`${profile.name} Graph keyboard interaction exceeded 2s: ${graphInteractionMs.toFixed(1)}ms.`);
          }
          await canvas.press("+");
          await canvas.press("Escape");
          await graphDetails.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {
            throw new Error(`${profile.name} Escape did not clear the graph selection before switching views.`);
          });

          const graph3DStart = performance.now();
          if (profile.isMobile) {
            await mobileGraphToolbar.getByRole("button", { name: "3D" }).click();
            await expectUrl(page, /\/member\/graph\?graph=3d(?:&.*)?$/, "Phone scale 3D Graph");
            await expectVisible(original3DCanvas, "Phone scale synchronized 3D Graph", 30_000);
          }
          await original3DCanvas.scrollIntoViewIfNeeded();
          await original3DCanvas.focus();
          const graph3DReadyMs = performance.now() - graph3DStart;
          const graph3DSnapshot = await page.locator(".phase180-graph-3d").evaluate((element) => ({
            entities: element.getAttribute("data-canonical-entity-count"),
            event: element.getAttribute("data-canonical-event-sequence")
          }));
          if (
            graph3DSnapshot.entities !== String(profile.isMobile ? renderedCanonicalCoverage.rendered_count : 10_000)
            || graph3DSnapshot.event !== "9"
          ) {
            throw new Error(`${profile.name} 3D Graph did not retain the 10,000-entity canonical event: ${JSON.stringify(graph3DSnapshot)}`);
          }
          if (profile.isMobile) {
            await mobileGraphToolbar.getByRole("button", { name: "Fit" }).click();
          } else {
            await page.getByRole("button", { name: "Fit visible" }).click();
            await page.getByRole("button", { name: "Stop movement" }).click();
            if (await page.locator(".phase180-graph-workspace").getAttribute("data-graph-motion") !== "paused") {
              throw new Error(`${profile.name} Stop movement did not pause both Graph views.`);
            }
            await original3DCanvas.focus();
            await page.keyboard.press("+");
            await page.getByRole("button", { name: "Resume movement" }).click();
          }
          if (profile.isMobile) {
            await mobileGraphToolbar.getByRole("button", { name: "2D" }).click();
            await expectUrl(page, /\/member\/graph\?graph=2d(?:&.*)?$/, "Phone scale 2D Graph return");
            await expectVisible(canvas, "Phone scale synchronized 2D Graph return", 30_000);
          }
          await canvas.scrollIntoViewIfNeeded();
          await canvas.focus();
          await expectVisible(canvas, `${profile.name} 2D Graph after simultaneous 3D parity verification`, 30_000);

          const infrastructureStart = performance.now();
          const infrastructureLink = page.getByRole("link", { name: "Infrastructure" });
          if (profile.isMobile) {
            await infrastructureLink.scrollIntoViewIfNeeded();
            const hitTarget = await infrastructureLink.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              const hit = document.elementFromPoint(x, y);
              return {
                contains_hit: hit ? element.contains(hit) : false,
                height: rect.height,
                hit_element: hit
                  ? `${hit.tagName.toLowerCase()}${hit.getAttribute("href") ? `[href="${hit.getAttribute("href")}"]` : ""}`
                  : null,
                width: rect.width,
                x,
                y
              };
            });
            if (!hitTarget.contains_hit) {
              throw new Error(`Phone Infrastructure destination is not the center hit target: ${JSON.stringify(hitTarget)}`);
            }
            await page.mouse.click(hitTarget.x, hitTarget.y);
          } else {
            await infrastructureLink.click();
          }
          await expectUrl(page, /\/member\/infrastructure$/, `${profile.name} Infrastructure navigation`);
          await expectVisible(page.getByRole("heading", { name: "Infrastructure", exact: true }), `${profile.name} Infrastructure`);
          const tree = page.getByRole("tree", { name: "Canonical hierarchy" });
          await expectVisible(tree, `${profile.name} virtualized hierarchy`);
          const renderedRows = await tree.getByRole("treeitem").count();
          if (renderedRows < 1 || renderedRows > 100) {
            throw new Error(`${profile.name} Infrastructure rendered ${renderedRows} tree rows instead of a virtualized window.`);
          }
          const search = page.getByPlaceholder("Search records");
          await search.fill("Soldier 9368");
          await expectVisible(page.getByText("1 matching records"), `${profile.name} exact 10k hierarchy search`);
          await expectVisible(page.getByRole("treeitem", { name: /Soldier 9368/i }), `${profile.name} searched entity with lineage`);
          const infrastructureReadyMs = performance.now() - infrastructureStart;
          if (infrastructureReadyMs > 10_000) {
            throw new Error(`${profile.name} Infrastructure search exceeded 10s: ${infrastructureReadyMs.toFixed(1)}ms.`);
          }
          const firstTreeItem = tree.getByRole("treeitem").first();
          await firstTreeItem.focus();
          await page.keyboard.press("End");
          const activeTreeItem = await page.evaluate(() => document.activeElement?.getAttribute("role"));
          if (activeTreeItem !== "treeitem") {
            throw new Error(`${profile.name} virtualized hierarchy did not preserve keyboard focus.`);
          }
          const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
          if (!noHorizontalOverflow) {
            throw new Error(`${profile.name} scale surface has horizontal overflow.`);
          }
          if (runtimeErrors.length) {
            throw new Error(`Unexpected ${profile.name} scale browser errors:\n${runtimeErrors.join("\n")}`);
          }
          process.stdout.write(
            `[e2e:phase180-scale] ${profile.name} graph_ready_ms=${graphReadyMs.toFixed(1)} `
            + `graph_interaction_ms=${graphInteractionMs.toFixed(1)} graph_3d_ready_ms=${graph3DReadyMs.toFixed(1)} `
            + `infrastructure_search_ms=${infrastructureReadyMs.toFixed(1)} `
            + `rendered_canonical_ids=${renderedCanonicalCoverage.rendered_count} `
            + `rendered_tree_rows=${renderedRows}\n`
          );
          phase180ScaleMeasurements.push({
            graph_3d_ready_ms: Number(graph3DReadyMs.toFixed(1)),
            graph_interaction_ms: Number(graphInteractionMs.toFixed(1)),
            graph_ready_ms: Number(graphReadyMs.toFixed(1)),
            infrastructure_search_ms: Number(infrastructureReadyMs.toFixed(1)),
            profile: profile.name,
            rendered_canonical_id_count: renderedCanonicalCoverage.rendered_count,
            rendered_canonical_id_signature:
              renderedCanonicalCoverage.rendered_signature,
            rendered_canonical_id_signature_algorithm:
              renderedCanonicalCoverage.algorithm,
            rendered_tree_rows: renderedRows,
            viewport: profile.viewport
          });
        } finally {
          await context.close();
        }
      }
    }
  },
  {
    name: "secondary routes remain responsive, keyboard-usable, and console-clean",
    run: async () => {
      for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
        const { context, page } = await newPage({ viewport, isMobile: viewport.width === 390, deviceScaleFactor: viewport.width === 390 ? 2 : 1 });
        const runtimeErrors = [];
        page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          const text = message.text();
          const expectedAccessOrRouteResponse = /Failed to load resource.*status of (401|403|404)/i.test(text);
          if (message.type() === "error" && !expectedAccessOrRouteResponse) runtimeErrors.push(`console: ${text}`);
        });

        try {
          await installPhase170Routes(page);
          await installPhase200InteractionRoutes(page);
          await enterWorkspace(page, uniqueEmail(`secondary-${viewport.width}`));
          await closeAcademyIfOpen(page);

          for (const pathname of ["/agents", "/automations", "/chat", "/admin", "/route-not-found"]) {
            await page.goto(`${frontendUrl}${pathname}`);
            await page.waitForLoadState("domcontentloaded");
            const dimensions = await page.evaluate(() => ({
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: window.innerWidth
            }));

            if (dimensions.documentWidth > dimensions.viewportWidth + 2) {
              throw new Error(`${pathname} overflows at ${viewport.width}px: ${dimensions.documentWidth}px document width.`);
            }

            const duplicateCommandCenterActions = await page.evaluate(() => Array.from(document.querySelectorAll("a, button"))
              .filter((element) => element.textContent?.trim() === "Command Center" && element.getBoundingClientRect().width > 0)
              .length);
            if (duplicateCommandCenterActions > 1) {
              throw new Error(`${pathname} exposes ${duplicateCommandCenterActions} visible Command Center actions at ${viewport.width}px.`);
            }
          }

          // Return to the canonical surface before exercising the shared account
          // control. Secondary workspaces retain their own scroll positions, which
          // must not turn a cross-route check into a click through another nav item.
          await page.goto(`${frontendUrl}/dashboard`);
          await page.waitForLoadState("domcontentloaded");
          const settingsTrigger = page.getByRole("button", { name: "Settings" });
          await expectVisible(settingsTrigger, "Settings trigger");
          await settingsTrigger.focus();
          await settingsTrigger.click();
          const settingsDialog = page.getByRole("dialog", { name: "ENTRAL settings" });
          await expectVisible(settingsDialog, "Settings dialog");
          await page.keyboard.press("Escape");
          await settingsDialog.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => {
            throw new Error("Escape did not close Settings.");
          });
          const focusReturned = await settingsTrigger.evaluate((element) => document.activeElement === element);
          if (!focusReturned) throw new Error("Settings did not restore focus to its trigger.");

          if (runtimeErrors.length > 0) {
            throw new Error(`Unexpected browser errors at ${viewport.width}px:\n${runtimeErrors.join("\n")}`);
          }
        } finally {
          await context.close();
        }
      }
    }
  }
];

async function run() {
  const executablePath = browserExecutable();

  if (!executablePath) {
    throw new Error("No Chromium-compatible browser found. Set E2E_BROWSER_EXECUTABLE to Edge or Chrome.");
  }

  await ensureServers();
  browser = await chromium.launch({
    executablePath: windowsPath(executablePath),
    headless: process.env.E2E_HEADED === "true" ? false : true,
    args: ["--disable-gpu", "--no-first-run"]
  });

  const resultsDir = join(repoRoot, "test-results", "e2e");
  await mkdir(resultsDir, { recursive: true });

  const requestedFilter = process.env.E2E_TEST_FILTER?.trim().toLowerCase();
  const selectedTests = requestedFilter
    ? tests.filter((test) => test.name.toLowerCase().includes(requestedFilter))
    : tests;
  if (!selectedTests.length) {
    throw new Error(`No E2E tests matched E2E_TEST_FILTER=${process.env.E2E_TEST_FILTER}.`);
  }

  for (const test of selectedTests) {
    process.stdout.write(`\n[e2e] ${test.name}\n`);
    try {
      await test.run();
      process.stdout.write(`[e2e] PASS ${test.name}\n`);
    } catch (error) {
      const safeName = test.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      process.stderr.write(`[e2e] FAIL ${test.name}\n`);
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      process.stderr.write(`[e2e] Artifacts directory: ${join(resultsDir, safeName)}\n`);
      throw error;
    }
  }

  if (phase180ScaleMeasurements.length) {
    const scaleEvidence = {
      dataset: {
        businesses: 500,
        commanders: 500,
        entities: 10_000,
        soldiers: 9_368
      },
      generated_at: new Date().toISOString(),
      measurements: phase180ScaleMeasurements,
      phase: 180,
      status: "passed"
    };
    const serializedEvidence = `${JSON.stringify(scaleEvidence, null, 2)}\n`;
    await writeFile(join(resultsDir, "phase180-scale.json"), serializedEvidence, "utf8");
    if (process.env.E2E_WRITE_PHASE180_EVIDENCE === "1") {
      const evidenceDir = join(repoRoot, "docs", "evidence");
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(join(evidenceDir, "phase180-browser-scale.json"), serializedEvidence, "utf8");
    }
  }
}

process.on("SIGINT", () => {
  void stopServers().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  void stopServers().finally(() => process.exit(143));
});

run()
  .then(async () => {
    await stopServers();
    process.exit(0);
  })
  .catch(async () => {
    await stopServers();
    process.exit(1);
  });

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));

test("Phase 200 Governor contract binds all eighteen package gates and mobile remediation", async () => {
  const contract = await readJson(".entral/governor/phases/200/PHASE_CONTRACT.v1.json");
  assert.equal(contract.phase, 200);
  assert.equal(contract.review_policy, "CONDITIONAL");
  assert.deepEqual(contract.feature_ids, Array.from({ length: 18 }, (_, index) => `P200-F${String(index + 1).padStart(3, "0")}`));
  assert.deepEqual(contract.acceptance_gate_ids, Array.from({ length: 18 }, (_, index) => `P200-F${String(index + 1).padStart(3, "0")}-A`));
  assert.deepEqual(contract.mobile_universe_contract.mobile_widths_css_px, [360, 390, 412, 430]);
  assert.equal(contract.mobile_universe_contract.desktop_side_by_side_preserved, true);
  assert.ok(contract.out_of_scope.includes("PHASE_202_OR_LATER_IMPLEMENTATION"));
  assert.ok(contract.out_of_scope.includes("PRODUCTION_SECURITY_SCAN"));
});

test("Interaction contracts define one provider-independent ENTRAL identity and complete truth context", async () => {
  const contract = await read("packages/contracts/src/interaction.ts");
  for (const binding of [
    'readonly name: "ENTRAL"',
    "provider_independent: true",
    'voice_version: "entral-voice-v1"',
    "business_scope",
    "evidence_freshness",
    "assumptions",
    "confidence",
    "next_action"
  ]) assert.ok(contract.includes(binding), `missing interaction truth binding: ${binding}`);
  assert.match(contract, /INTERACTION_MODES = \["EXECUTIVE", "OPERATIONAL"\]/);
  assert.doesNotMatch(contract, /OPENAI|ANTHROPIC|MODEL_FABRIC/i);
});

test("Tutorial state is server-backed, scoped, versioned, idempotent, and retry recoverable", async () => {
  const [schema, migration, service, tour] = await Promise.all([
    read("prisma/schema.prisma"),
    read("prisma/migrations/20260802023000_phase_200_interaction_layer/migration.sql"),
    read("backend/src/services/interactionLayer.ts"),
    read("frontend/components/OnboardingTour.tsx")
  ]);
  for (const field of ["releaseVersion", "roleContext", "planContext", "organizationId", "businessModelContext", "commanderPackContext"]) {
    assert.match(schema, new RegExp(`\\b${field}\\b`));
  }
  assert.match(schema, /model MemberTutorialMutationReceipt/);
  assert.match(migration, /progressSnapshot[\s\S]*jsonb/i);
  assert.match(migration, /idempotencyKey/);
  assert.match(service, /idempotentReplay/);
  assert.match(service, /OPTIMISTIC_REVISION_AND_READBACK/);
  assert.match(service, /TRANSACTIONAL_READ_AFTER_WRITE/);
  assert.doesNotMatch(tour, /entral-academy-state-v1|localStorage\.setItem/);
});

test("App shell has exactly five real primary destinations and keeps Command as default", async () => {
  const [navigation, shell, dashboardPage] = await Promise.all([
    read("frontend/components/Phase200InteractionNavigation.tsx"),
    read("frontend/components/CanonicalMemberShell.tsx"),
    read("frontend/app/member/dashboard/page.tsx")
  ]);
  const labels = [...navigation.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["Command", "Businesses", "Universe", "Infrastructure", "Tutorial"]);
  assert.match(navigation, /data-member-role/);
  assert.match(shell, /Phase200InteractionNavigation/);
  assert.match(dashboardPage, /initialDestination="dashboard"/);
  assert.doesNotMatch(navigation, /create|assign|model fabric/i);
});

test("Business health uses canonical portfolio facts, honest stale handling, and reusable evidence", async () => {
  const [service, panel, evidence] = await Promise.all([
    read("backend/src/services/interactionLayer.ts"),
    read("frontend/components/Phase200BusinessHealthPanel.tsx"),
    read("frontend/components/Phase200EvidenceDrawer.tsx")
  ]);
  assert.match(service, /canonical-portfolio:/);
  assert.match(service, /Current health is not asserted/);
  assert.match(service, /confidence: business\?\.health_score === null \|\| !business \|\| freshness !== "CURRENT" \? "UNAVAILABLE"/);
  assert.match(panel, /Phase200EvidenceDrawer/);
  assert.match(panel, /No score or recommendation has been substituted/);
  assert.match(evidence, /No source reference is available/);
});

test("Analytics is content-free and covers the four released interaction failures and help events", async () => {
  const [contract, route, tour, panel] = await Promise.all([
    read("packages/contracts/src/interaction.ts"),
    read("backend/src/routes/interactionLayer.ts"),
    read("frontend/components/OnboardingTour.tsx"),
    read("frontend/components/Phase200BusinessHealthPanel.tsx")
  ]);
  for (const event of ["ROUTE_FAILURE", "TUTORIAL_ABANDONED", "HELP_USED", "CONTROL_FAILED"]) {
    assert.ok(contract.includes(`"${event}"`));
    assert.ok(`${tour}\n${panel}`.includes(`"${event}"`));
  }
  assert.match(contract, /SENSITIVE_ANALYTICS_FIELD/);
  assert.match(route, /parseInteractionAnalyticsEventRequest\(request\.body\)/);
  assert.match(route, /controlId: event\.control_id/);
  assert.doesNotMatch(route, /event\.(prompt|message|customerContent|secret)/i);
});

test("Mobile Universe presents one synchronized renderer with progressive disclosure and exact width budgets", async () => {
  const [workspace, viewState, css] = await Promise.all([
    read("frontend/components/CanonicalGraphWorkspace.tsx"),
    read("frontend/lib/graph-view-state.ts"),
    read("frontend/app/phase180.css")
  ]);
  assert.match(workspace, /mobileDimension === "2d" \? "2d-only" : "3d-only"/);
  assert.match(workspace, /data-mobile-presentation=\{mobileViewport \? "single-renderer" : "desktop-dual"\}/);
  assert.match(workspace, /changeMobileDimension/);
  assert.match(workspace, /collapseGraphToTopLevel/);
  assert.match(workspace, /phase200-mobile-graph-toolbar/);
  assert.match(workspace, /phase200-graph-legend/);
  assert.match(workspace, /data-graph-overlay-contract="FOCAL_SAFE_V1"/);
  assert.match(workspace, /data-graph-overlay-role="compact-toolbar"/);
  assert.match(workspace, /data-graph-overlay-role="compact-legend"/);
  assert.match(viewState, /viewportWidth <= 360[\s\S]*viewportWidth <= 390[\s\S]*viewportWidth <= 412[\s\S]*viewportWidth <= 430/);
  assert.match(css, /\.phase195-authority-rings > li > span/);
  assert.match(css, /\.phase180-graph-drawer,[\s\S]*phase110-node-drawer/);
  assert.match(css, /orientation: landscape/);
  assert.match(css, /phase180-assistant-widget/);
});

test("Universe presentation chrome preserves a pointer-safe focal field", async () => {
  const [css, twoD, threeD] = await Promise.all([
    read("frontend/app/phase180.css"),
    read("frontend/components/CanonicalUniverseGraph.tsx"),
    read("frontend/components/CanonicalUniverse3DGraph.tsx")
  ]);
  assert.match(css, /\.phase195-graph-workspace \.phase195-authority-rings\s*\{[\s\S]*clip-path:\s*inset\(50%\)/);
  assert.match(css, /\.phase195-graph-workspace \.phase195-graph-semantics-overlay,[\s\S]*pointer-events:\s*none;/);
  assert.match(css, /\.phase195-graph-workspace \.phase200-mobile-graph-toolbar\s*\{[\s\S]*position:\s*relative;/);
  assert.match(css, /\.phase195-graph-workspace \.phase180-graph-drawer,[\s\S]*width:\s*min\(22rem, calc\(50% - 2rem\)\);/);
  assert.match(css, /max-height:\s*min\(24dvh, 16rem\);/);
  assert.match(css, /max-width:\s*calc\(50vw - 1\.5rem\);/);
  assert.match(css, /:has\(\.phase195-graph-workspace\) \.phase180-assistant-widget,[\s\S]*position:\s*relative;/);
  assert.match(css, /:has\(\.phase180-assistant-widget\) \.phase180-entral-emblem\s*\{[\s\S]*display:\s*none;/);
  assert.match(twoD, /canonical2DFocusAnchor/);
  assert.match(twoD, /dataset\.canonicalFocusAnchorX/);
  assert.match(twoD, /dataset\.canonicalCameraTargetEntityId/);
  assert.match(twoD, /dataset\.canonicalSelectedScreenX/);
  assert.match(twoD, /detailDrawerRef/);
  assert.match(threeD, /data-canonical-camera-target-entity-id=\{focusedEntityId \?\? undefined\}/);
  assert.match(threeD, /setRendererFocusSignal\(\(current\) => Math\.max\(current \+ 1, viewFocusSignal \+ 1\)\)/);
  assert.match(threeD, /canonicalViewFocusSignal=\{rendererFocusSignal\}/);
  assert.doesNotMatch(css, /\.phase200-graph-legend\s*\{[\s\S]{0,180}position:\s*(?:absolute|fixed)/);
});

test("Both graph renderers preserve collision avoidance, selected lineage emphasis, telemetry, and RLS authority", async () => {
  const [twoD, threeD, workspace] = await Promise.all([
    read("frontend/components/CanonicalUniverseGraph.tsx"),
    read("frontend/components/NeuronsCommandCenter.tsx"),
    read("frontend/components/CanonicalGraphWorkspace.tsx")
  ]);
  assert.match(twoD, /occupiedLabels/);
  assert.match(twoD, /minimapBounds \? \[minimapBounds\] : \[\]/);
  assert.match(twoD, /canonical2DLabelBoundsAccepted\(bounds, occupiedLabels\)/);
  assert.match(twoD, /canonicalRenderedLabelBounds/);
  assert.match(twoD, /canonicalMinimapLabelCollisionCount/);
  assert.match(twoD, /lineage_emphasis/);
  assert.match(twoD, /dimUnrelated && unrelated/);
  assert.match(threeD, /const occupied:/);
  assert.match(threeD, /relatedNodeIds/);
  assert.match(threeD, /unrelatedOpacity/);
  assert.match(workspace, /recordCanonicalGraphTelemetry/);
  assert.match(workspace, /RLS visibility/);
  assert.match(workspace, /side-by-side/);
});

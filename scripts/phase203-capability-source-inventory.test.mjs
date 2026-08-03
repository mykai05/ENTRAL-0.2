import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);
const inventory = JSON.parse(await readFile(new URL("docs/evidence/phase203/capability-truth/SOURCE_INVENTORY.json", root), "utf8"));

const sourcePaths = {
  backend_tool_blueprints: "backend/src/services/toolRegistry.ts",
  frontend_legacy_tool_registry: "frontend/lib/tool-registry.ts",
  backend_agent_capability_blueprints: "backend/src/services/agentCapabilities.ts",
  frontend_business_capability_blueprints: "frontend/components/NeuronsCommandCenter.tsx",
  agent_template_gallery_presets: "frontend/components/AgentTemplateGallery.tsx",
  commander_pack_like_business_templates: "frontend/components/NeuronsCommandCenter.tsx",
  local_merch_workflows: "frontend/lib/merch-workflow.ts",
  tutorial_steps: "frontend/components/OnboardingTour.tsx",
  tutorial_contract_anchors: "packages/contracts/src/interaction.ts"
};

const authorityPaths = {
  contract: "packages/contracts/src/integration.ts",
  loader: "backend/src/services/integrationRegistry.ts"
};

const sourceText = new Map(await Promise.all(
  [...new Set([...Object.values(sourcePaths), ...Object.values(authorityPaths)])]
    .map(async (path) => [path, await readFile(new URL(path, root), "utf8")])
));

function extractArray(source, declaration) {
  const declarationIndex = source.indexOf(declaration);
  assert.notEqual(declarationIndex, -1, `Missing source declaration ${declaration}`);
  const assignmentIndex = source.indexOf("=", declarationIndex + declaration.length);
  assert.notEqual(assignmentIndex, -1, `Missing assignment for ${declaration}`);
  const openIndex = source.indexOf("[", assignmentIndex + 1);
  assert.notEqual(openIndex, -1, `Missing array for ${declaration}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "[") depth += 1;
    if (character === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }

  assert.fail(`Unterminated array for ${declaration}`);
}

function topLevelObjects(arrayBody) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < arrayBody.length; index += 1) {
    const character = arrayBody[index];
    const next = arrayBody[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(arrayBody.slice(start, index + 1));
        start = -1;
      }
    }
  }

  assert.equal(depth, 0, "Source array contains an unterminated object");
  return objects;
}

function stringField(objectSource, field) {
  const match = objectSource.match(new RegExp(`\\b${field}:\\s*\"([^\"]+)\"`));
  assert.ok(match, `Missing ${field} in source object ${objectSource.slice(0, 120)}`);
  return match[1];
}

function optionalStringField(objectSource, field) {
  return objectSource.match(new RegExp(`\\b${field}:\\s*\"([^\"]+)\"`))?.[1] ?? null;
}

function normalizedStatus(status) {
  return status.toUpperCase().replaceAll(" ", "_");
}

function recordsFromObjects(path, declaration, idField, nameField) {
  return topLevelObjects(extractArray(sourceText.get(path), declaration)).map((source) => ({
    identifier: stringField(source, idField),
    displayName: stringField(source, nameField),
    source
  }));
}

function identifierRecordsFromObjects(path, declaration, idField) {
  return topLevelObjects(extractArray(sourceText.get(path), declaration)).map((source) => ({
    identifier: stringField(source, idField),
    displayName: null,
    source
  }));
}

const backendTools = recordsFromObjects(sourcePaths.backend_tool_blueprints, "const toolBlueprints", "id", "name")
  .map((record) => {
    const literal = optionalStringField(record.source, "status");
    const observedStatus = record.identifier === "openai" || record.identifier === "shopify"
      ? "RUNTIME_DERIVED"
      : record.identifier === "github" || record.identifier === "vercel"
        ? "RUNTIME_DERIVED_FROM_MOCK_MODE_DEFAULT"
        : literal ? normalizedStatus(literal) : "NOT_CONNECTED_DEFAULT";
    return { ...record, observedStatus };
  });
const legacyTools = recordsFromObjects(sourcePaths.frontend_legacy_tool_registry, "export const defaultToolRegistry", "id", "name")
  .map((record) => ({ ...record, observedStatus: normalizedStatus(stringField(record.source, "status")) }));
const backendCapabilities = recordsFromObjects(sourcePaths.backend_agent_capability_blueprints, "export const agentCapabilityBlueprints", "id", "label");
const frontendCapabilities = recordsFromObjects(sourcePaths.frontend_business_capability_blueprints, "const businessCapabilityBlueprints", "id", "label");
const agentTemplates = recordsFromObjects(sourcePaths.agent_template_gallery_presets, "const templates", "name", "name");
const commanderPacks = recordsFromObjects(sourcePaths.commander_pack_like_business_templates, "const businessTemplates", "id", "label");
const workflowSteps = recordsFromObjects(sourcePaths.local_merch_workflows, "export const merchLaunchWorkflowSteps", "id", "name")
  .map(({ identifier, displayName }) => ({ identifier, name: displayName }));
const tutorialSteps = identifierRecordsFromObjects(sourcePaths.tutorial_steps, "const academySteps", "id");
const tutorialAnchors = [...extractArray(sourceText.get(sourcePaths.tutorial_contract_anchors), "export const TUTORIAL_ANCHOR_IDS").matchAll(/\"([^\"]+)\"/g)]
  .map((match) => ({ identifier: match[1], displayName: null }));

function bindingsFor(group) {
  return inventory.entries.flatMap((entry) => entry.source_bindings
    .filter((binding) => binding.group === group)
    .map((binding) => ({ binding, entry })));
}

function assertGroupMatches(group, records, { checkDisplayName = true, checkStatus = false } = {}) {
  const bindings = bindingsFor(group);
  assert.equal(bindings.length, new Set(bindings.map(({ binding }) => binding.identifier)).size, `${group} has duplicate inventory bindings`);
  assert.deepEqual(
    bindings.map(({ binding }) => binding.identifier).sort(),
    records.map(({ identifier }) => identifier).sort(),
    `${group} additions or removals must update the committed source inventory`
  );
  const byIdentifier = new Map(records.map((record) => [record.identifier, record]));
  for (const { binding, entry } of bindings) {
    const source = byIdentifier.get(binding.identifier);
    if (checkDisplayName) assert.equal(entry.display_name, source.displayName, `${group}:${binding.identifier} display name drifted`);
    if (checkStatus) assert.equal(binding.observed_status, source.observedStatus, `${group}:${binding.identifier} source status drifted`);
    assert.equal(binding.reference, `${inventory.repository}@${inventory.source_commit}:${sourcePaths[group]}`);
  }
}

test("source-backed inventory is exact, conservative, and references immutable repository blobs", () => {
  assert.equal(inventory.schema_version, 1);
  assert.equal(inventory.inventory_id, "P203-CAPABILITY-SOURCE-INVENTORY-001");
  assert.equal(inventory.generated_for_task_packet, "P203-CAPABILITY-TRUTH-REGISTRY-001");
  assert.match(inventory.source_commit, /^[0-9a-f]{40}$/);
  assert.equal(inventory.import_policy.mode, "CONSERVATIVE_FAIL_CLOSED");
  assert.equal(inventory.import_policy.source_presence_is_verification, false);
  assert.equal(inventory.import_policy.public_claim_eligible_default, false);

  const keys = inventory.entries.map((entry) => entry.capability_key);
  assert.equal(keys.length, new Set(keys).size, "capability keys must be unique");
  assert.deepEqual([...new Set(inventory.entries.map((entry) => entry.kind))].sort(), ["AGENT", "CAPABILITY", "COMMANDER_PACK", "INTEGRATION", "WORKFLOW"]);

  const knownGroups = new Set(Object.keys(sourcePaths));
  for (const entry of inventory.entries) {
    assert.equal(entry.inventory_entry_id, entry.capability_key);
    assert.match(entry.capability_version, /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$/);
    assert.equal(entry.environment, "PRODUCTION");
    assert.equal(entry.scope, "GLOBAL");
    assert.equal(entry.owner, "UNASSIGNED");
    assert.equal(entry.lifecycle_state, "CATALOGUED");
    assert.notEqual(entry.lifecycle_state, "ACTIVE");
    assert.notEqual(entry.lifecycle_state, "SELLABLE");
    assert.equal(entry.public_claim_eligible, false);
    assert.ok(entry.rollback_path.length > 20);
    assert.ok(entry.deactivation_path.length > 20);
    assert.ok(entry.limitations.length > 0);
    assert.ok(entry.source_bindings.length > 0);
    for (const binding of entry.source_bindings) {
      assert.ok(knownGroups.has(binding.group), `Unknown source group ${binding.group}`);
      const expectedReference = `${inventory.repository}@${inventory.source_commit}:${sourcePaths[binding.group]}`;
      assert.equal(binding.reference, expectedReference);
    }
    if (["SIMULATED", "PLACEHOLDER", "LOCAL_ONLY", "UNVERIFIED", "DISABLED"].includes(entry.production_readiness)) {
      assert.equal(entry.lifecycle_state, "CATALOGUED");
    }
  }

  const uniquePaths = [...new Set([...Object.values(sourcePaths), ...Object.values(authorityPaths)])];
  for (const path of uniquePaths) {
    const result = spawnSync("git", ["cat-file", "-e", `${inventory.source_commit}:${path}`], { cwd: new URL(".", root), encoding: "utf8" });
    assert.equal(result.status, 0, `Missing immutable source reference ${inventory.source_commit}:${path}: ${result.stderr}`);
  }
});

test("legacy integration registry authority remains explicit and does not promote environment records", () => {
  const authority = inventory.legacy_registry_authority;
  assert.equal(authority.record_source, "INTEGRATION_REGISTRY_JSON");
  assert.equal(authority.committed_record_count, 0);
  assert.equal(authority.contract_reference, `${inventory.repository}@${inventory.source_commit}:${authorityPaths.contract}`);
  assert.equal(authority.loader_reference, `${inventory.repository}@${inventory.source_commit}:${authorityPaths.loader}`);
  assert.match(authority.import_behavior, /No environment-supplied legacy integration record is copied/);
  assert.match(authority.authority_boundary, /does not infer ACTIVE or SELLABLE/);

  const stages = [...extractArray(sourceText.get(authorityPaths.contract), "export const INTEGRATION_STAGES").matchAll(/\"([^\"]+)\"/g)]
    .map((match) => match[1]);
  assert.deepEqual(stages, ["CATALOGUED", "AUTHORIZED", "BUILT", "LIVE_TESTED", "ACTIVE", "RETIRED"]);

  const loader = sourceText.get(authorityPaths.loader);
  assert.match(loader, /process\.env\.INTEGRATION_REGISTRY_JSON/);
  assert.match(loader, /if \(!source\) return \[\]/);
  assert.match(loader, /record\.stage !== "ACTIVE"/);
  assert.match(loader, /assertExecutableIntegration\(record, requirement\)/);
});

test("tool blueprints and legacy static registry remain fully mapped without promotion", () => {
  assertGroupMatches("backend_tool_blueprints", backendTools, { checkStatus: true });
  assertGroupMatches("frontend_legacy_tool_registry", legacyTools, { checkStatus: true });
  assert.equal(backendTools.length, inventory.source_group_counts.backend_tool_blueprints);
  assert.equal(legacyTools.length, inventory.source_group_counts.frontend_legacy_tool_registry);

  const backendIds = new Set(backendTools.map(({ identifier }) => identifier));
  const legacyOnly = legacyTools.map(({ identifier }) => identifier).filter((identifier) => !backendIds.has(identifier));
  assert.deepEqual(legacyOnly, ["outlook-calendar"]);
  const legacyOnlyEntry = inventory.entries.find((entry) => entry.capability_key === "integration.tool.outlook-calendar");
  assert.equal(legacyOnlyEntry.source_status, "LEGACY_FRONTEND_ONLY_COMING_SOON");
  assert.equal(legacyOnlyEntry.production_readiness, "PLACEHOLDER");
});

test("capability blueprints and local agent presets cannot drift silently", () => {
  assertGroupMatches("backend_agent_capability_blueprints", backendCapabilities);
  assertGroupMatches("frontend_business_capability_blueprints", frontendCapabilities);
  assertGroupMatches("agent_template_gallery_presets", agentTemplates);
  assert.deepEqual(
    backendCapabilities.map(({ identifier }) => identifier).sort(),
    frontendCapabilities.map(({ identifier }) => identifier).sort(),
    "backend and legacy frontend capability blueprint identifiers must remain reconciled"
  );
  assert.equal(backendCapabilities.length, inventory.source_group_counts.backend_agent_capability_blueprints);
  assert.equal(frontendCapabilities.length, inventory.source_group_counts.frontend_business_capability_blueprints);
  assert.equal(agentTemplates.length, inventory.source_group_counts.agent_template_gallery_presets);
});

test("Commander-pack-like templates and the local workflow are exhaustively catalogued", () => {
  assertGroupMatches("commander_pack_like_business_templates", commanderPacks);
  assert.equal(commanderPacks.length, inventory.source_group_counts.commander_pack_like_business_templates);

  const workflowBindings = bindingsFor("local_merch_workflows");
  assert.equal(workflowBindings.length, 1);
  assert.equal(workflowBindings[0].binding.identifier, "merchLaunchWorkflowSteps");
  assert.equal(workflowBindings[0].binding.reference, `${inventory.repository}@${inventory.source_commit}:${sourcePaths.local_merch_workflows}`);
  assert.deepEqual(workflowBindings[0].entry.source_members, workflowSteps, "local workflow step additions, removals, names, or order drifted");
  assert.equal(workflowSteps.length, inventory.source_group_counts.local_merch_workflow_steps);
  assert.equal(workflowBindings[0].entry.production_readiness, "LOCAL_ONLY");
});

test("Tutorial UI steps and contract anchors remain source-aligned", () => {
  assertGroupMatches("tutorial_steps", tutorialSteps, { checkDisplayName: false });
  assertGroupMatches("tutorial_contract_anchors", tutorialAnchors, { checkDisplayName: false });
  assert.deepEqual(tutorialSteps.map(({ identifier }) => identifier), tutorialAnchors.map(({ identifier }) => identifier));
  assert.equal(tutorialSteps.length, inventory.source_group_counts.tutorial_steps);
  assert.equal(tutorialAnchors.length, inventory.source_group_counts.tutorial_contract_anchors);
});

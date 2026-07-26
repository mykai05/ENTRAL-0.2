import assert from "node:assert/strict";
import test from "node:test";
import {
  generatePhase180BenchmarkFixture,
  runPhase180Benchmark
} from "./phase180-benchmark.mjs";

test("Phase 180 generator is isolated, deterministic, and exact", () => {
  const first = generatePhase180BenchmarkFixture();
  const second = generatePhase180BenchmarkFixture();
  assert.equal(first.businesses.length, 500);
  assert.equal(first.entities.length, 10_000);
  assert.equal(first.entities.filter((entity) => entity.entity_type === "COMMANDER").length, 500);
  assert.equal(first.entities.filter((entity) => entity.entity_type === "SOLDIER").length, 9_368);
  assert.deepEqual(first, second);
  assert.equal(first.entities.filter((entity) => entity.entity_type === "ENTRAL").length, 1);
  assert.ok(first.entities.every((entity) => entity.entity_type === "ENTRAL" || entity.parent_id));
  const entitiesById = new Map(first.entities.map((entity) => [entity.entity_id, entity]));
  const assignedEntityCounts = new Map();
  for (const entity of first.entities) {
    if (!entity.assigned_business_id) continue;
    assignedEntityCounts.set(
      entity.assigned_business_id,
      (assignedEntityCounts.get(entity.assigned_business_id) ?? 0) + 1
    );
  }
  for (const business of first.businesses) {
    const general = entitiesById.get(business.general_id);
    const commander = entitiesById.get(business.commander_id);
    assert.ok(general);
    assert.ok(commander);
    assert.equal(general.parent_id, business.marshal_id);
    assert.equal(commander.parent_id, general.entity_id);
    assert.equal(commander.assigned_business_id, business.business_id);
    assert.equal(business.agent_count, assignedEntityCounts.get(business.business_id));
  }
});

test("Phase 180 isolated fixture generation, search, and serialization stay inside the release budget", () => {
  const result = runPhase180Benchmark();
  assert.ok(result.measurements.generation_ms <= result.thresholds.generation_ms);
  assert.ok(result.measurements.search_ms <= result.thresholds.search_ms);
  assert.ok(result.measurements.serialization_ms <= result.thresholds.serialization_ms);
  assert.ok(result.measurements.heap_delta_mb <= result.thresholds.heap_delta_mb);
  assert.ok(result.measurements.serialization_bytes > 0);
});

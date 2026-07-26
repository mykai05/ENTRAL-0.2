import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const idPrefixes = {
  business: "60000000",
  commander: "40000000",
  entral: "10000000",
  general: "30000000",
  marshal: "20000000",
  soldier: "50000000"
};

function id(prefix, value) {
  return `${idPrefixes[prefix]}-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
}

function entitySummary(entity, childCount) {
  return {
    ...entity,
    active_alert: null,
    active_task_count: 0,
    child_count: childCount,
    compute_tier: null,
    current_mission: null,
    health: "HEALTHY",
    latest_material_result: null,
    model_class: null,
    status: "ACTIVE",
    updated_at: "2026-07-25T00:00:00.000Z",
    version: 1
  };
}

export function generatePhase180BenchmarkFixture() {
  const entralId = id("entral", 1);
  const businessCount = 500;
  const marshals = Array.from({ length: 8 }, (_, index) => ({
    assigned_business_id: null,
    entity_id: id("marshal", index + 1),
    entity_type: "MARSHAL",
    name: `Marshal ${index + 1}`,
    parent_id: entralId,
    stable_code: `MARSHAL.${String(index + 1).padStart(2, "0")}`
  }));
  const generals = Array.from({ length: 123 }, (_, index) => ({
    assigned_business_id: null,
    entity_id: id("general", index + 1),
    entity_type: "GENERAL",
    name: `General ${index + 1}`,
    parent_id: marshals[index % marshals.length].entity_id,
    stable_code: `GENERAL.${String(index + 1).padStart(3, "0")}`
  }));
  const soldierCount = 10_000 - 1 - marshals.length - generals.length - businessCount;
  const marshalById = new Map(marshals.map((marshal) => [marshal.entity_id, marshal]));
  const businesses = Array.from({ length: businessCount }, (_, index) => {
    const general = generals[index % generals.length];
    const marshal = marshalById.get(general.parent_id);
    if (!marshal) throw new Error(`General ${general.entity_id} has no canonical Marshal parent.`);
    const assignedSoldiers = Math.floor(soldierCount / businessCount)
      + (index < soldierCount % businessCount ? 1 : 0);
    return {
      active_mission_count: 0,
      active_task_count: 0,
      agent_count: 1 + assignedSoldiers,
      automation_count: 0,
      business_id: id("business", index + 1),
      business_name: `Commander Business ${index + 1}`,
      capital_available: null,
      commander_id: id("commander", index + 1),
      currency: null,
      general_id: general.entity_id,
      general_name: general.name,
      gross_revenue: null,
      health_drivers: [],
      health_score: 100,
      health_state: "HEALTHY",
      integration_count: 0,
      marshal_id: marshal.entity_id,
      marshal_name: marshal.name,
      net_contribution: null,
      primary_objective: "Exercise the isolated Phase 180 acceptance path.",
      revenue_period_end: null,
      revenue_period_start: null,
      source_freshness: {},
      stable_code: `BUSINESS.${String(index + 1).padStart(3, "0")}`,
      status: "OPERATING",
      tool_count: 0,
      top_exception: null,
      top_recommendation: null,
      updated_at: "2026-07-25T00:00:00.000Z",
      version: 1
    };
  });
  const commanders = businesses.map((business, index) => ({
    assigned_business_id: business.business_id,
    entity_id: business.commander_id,
    entity_type: "COMMANDER",
    name: `Commander ${index + 1}`,
    parent_id: business.general_id,
    stable_code: `COMMANDER.${String(index + 1).padStart(3, "0")}`
  }));
  const soldiers = Array.from({ length: soldierCount }, (_, index) => {
    const commander = commanders[index % commanders.length];
    return {
      assigned_business_id: commander.assigned_business_id,
      entity_id: id("soldier", index + 1),
      entity_type: "SOLDIER",
      name: `Soldier ${index + 1}`,
      parent_id: commander.entity_id,
      stable_code: `SOLDIER.${String(index + 1).padStart(5, "0")}`
    };
  });
  const parentCounts = new Map();
  for (const entity of [...marshals, ...generals, ...commanders, ...soldiers]) {
    parentCounts.set(entity.parent_id, (parentCounts.get(entity.parent_id) ?? 0) + 1);
  }
  const rawEntities = [{
    assigned_business_id: null,
    entity_id: entralId,
    entity_type: "ENTRAL",
    name: "ENTRAL",
    parent_id: null,
    stable_code: "ENTRAL.CORE"
  }, ...marshals, ...generals, ...commanders, ...soldiers];
  const entities = rawEntities.map((entity) => entitySummary(entity, parentCounts.get(entity.entity_id) ?? 0));
  return { businesses, entities };
}

export function runPhase180Benchmark() {
  const heapBefore = process.memoryUsage().heapUsed;
  const generationStart = performance.now();
  const fixture = generatePhase180BenchmarkFixture();
  const generationMs = performance.now() - generationStart;
  const searchStart = performance.now();
  const searchMatches = fixture.entities.filter((entity) =>
    entity.name.toLowerCase().includes("soldier 9") || entity.stable_code.includes("009")
  ).length;
  const searchMs = performance.now() - searchStart;
  const serializationStart = performance.now();
  const serializedBytes = Buffer.byteLength(JSON.stringify(fixture));
  const serializationMs = performance.now() - serializationStart;
  const heapDeltaMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;
  return {
    fixture: {
      businesses: fixture.businesses.length,
      commanders: fixture.entities.filter((entity) => entity.entity_type === "COMMANDER").length,
      entities: fixture.entities.length,
      soldiers: fixture.entities.filter((entity) => entity.entity_type === "SOLDIER").length
    },
    measurements: {
      generation_ms: Number(generationMs.toFixed(3)),
      heap_delta_mb: Number(heapDeltaMb.toFixed(3)),
      search_matches: searchMatches,
      search_ms: Number(searchMs.toFixed(3)),
      serialization_bytes: serializedBytes,
      serialization_ms: Number(serializationMs.toFixed(3))
    },
    thresholds: {
      generation_ms: 500,
      heap_delta_mb: 128,
      search_ms: 100,
      serialization_ms: 500
    }
  };
}

function assertBenchmark(result) {
  const { fixture, measurements, thresholds } = result;
  if (fixture.businesses !== 500 || fixture.commanders !== 500 || fixture.entities !== 10_000 || fixture.soldiers !== 9_368) {
    throw new Error(`Phase 180 fixture counts are invalid: ${JSON.stringify(fixture)}`);
  }
  if (measurements.generation_ms > thresholds.generation_ms) throw new Error("Fixture generation exceeded threshold.");
  if (measurements.search_ms > thresholds.search_ms) throw new Error("Dataset search exceeded threshold.");
  if (measurements.serialization_ms > thresholds.serialization_ms) throw new Error("Fixture serialization exceeded threshold.");
  if (measurements.heap_delta_mb > thresholds.heap_delta_mb) throw new Error("Benchmark heap delta exceeded threshold.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runPhase180Benchmark();
  assertBenchmark(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

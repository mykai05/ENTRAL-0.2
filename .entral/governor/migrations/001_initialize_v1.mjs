import { CONTRACT_VERSION, EXECUTION_MODEL, PROGRAM_VERSION, SCHEMA_VERSION } from "../lib/contracts.mjs";

export const migration = Object.freeze({
  id: "001_initialize_v1",
  from_schema_version: 0,
  to_schema_version: 1,
  description: "Initialize the repository-local single-writer Governor state contract."
});

export function migrate(input, { now = new Date() } = {}) {
  if (input !== null && input !== undefined && input.schema_version !== 0) {
    throw new Error("001_initialize_v1 only accepts absent or schema_version 0 state");
  }
  return {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    program_version: PROGRAM_VERSION,
    execution_model: EXECUTION_MODEL,
    status: "ACTIVE",
    current_phase: null,
    certified_phases: [],
    current_task_packet_id: null,
    task_status: null,
    last_task_packet_id: null,
    latest_execution_result: null,
    latest_verified_main_sha: null,
    latest_production_release: null,
    blocked_reason: null,
    retry_count: 0,
    next_action: "Initialize from the latest certified production release.",
    active_write_lease: null,
    latest_checkpoint: null,
    review_state: null,
    conditional_review_triggers: [],
    task_attempts: 0,
    result_fingerprints: [],
    version: 0,
    event_count: 0,
    event_head_hash: "0".repeat(64),
    updated_at: new Date(now).toISOString()
  };
}

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CONDITIONAL_REVIEW_TRIGGERS,
  CONTRACT_VERSION,
  EXECUTION_MODEL,
  GovernorError,
  PROGRAM_VERSION,
  SCHEMA_VERSION,
  assertExecutionActor,
  isHealthyLease,
  validateExecutionResult,
  validateNamedContract,
  validateOwnerEscalation,
  validateProgramDefinition,
  validateReleaseManifest,
  validateReviewRequest,
  validateReviewVerdict,
  validatePhaseAmendment,
  validateSessionCheckpoint,
  validateTaskPacket
} from "./contracts.mjs";
import {
  EVENTS_FILE,
  appendEvent,
  canonicalJson,
  commitStateAndEvent,
  ensureGovernorLayout,
  governorPath,
  loadState,
  readEvents,
  readJson,
  readOptionalJson,
  recoverStateFromEvents,
  saveState,
  sha256,
  stateExists,
  verifyEventChain,
  verifyStoredState,
  withAdvanceLock,
  writeJsonAtomic,
  writeTextAtomic
} from "./store.mjs";
import {
  applyAcceptedPhaseAmendment,
  decideImprovementCandidate,
  improvementEvidenceView,
  loadImprovementCandidates,
  loadImprovementPolicy,
  loadImprovementTaskProposals,
  mergeImprovementCandidate,
  normalizeImprovementCandidate,
  persistImprovementCandidate,
  persistImprovementCycle,
  persistImprovementOutcome,
  planImprovementCycle,
  rankImprovementBacklog,
  readImprovementCandidate,
  recordImprovementOutcome,
  sameImprovementRootCause
} from "./improvement-queue.mjs";

const PHASE_DAG_FILE = "program/PHASE_DAG.v1.json";
const PHASE_CONTRACT = (phase) => `phases/${phase}/PHASE_CONTRACT.v1.json`;
const TASK_FILE = (taskId) => `tasks/${taskId}.json`;
const RESULT_FILE = (resultId) => `results/${resultId}.json`;
const CHECKPOINT_FILE = (checkpointId) => `checkpoints/${checkpointId}.json`;
const INCIDENT_FILE = (incidentId) => `incidents/${incidentId}.json`;
const REVIEW_DIRECTORY = (checkpointId) => `pro-review/${checkpointId}`;

function iso(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) throw new GovernorError("INVALID_TIMESTAMP", "Invalid Governor clock");
  return date.toISOString();
}

function requireMutationAuth(auth) {
  assertExecutionActor(auth?.actor);
  if (typeof auth?.sessionId !== "string" || auth.sessionId.trim().length < 3) {
    throw new GovernorError("MISSING_SESSION", "A stable session ID is required for Governor mutation");
  }
}

function requireReadAuth(auth) {
  assertExecutionActor(auth?.actor);
}

export async function loadProgram(repositoryRoot) {
  return validateProgramDefinition(await readJson(governorPath(repositoryRoot, PHASE_DAG_FILE)));
}

export async function loadTask(repositoryRoot, taskId) {
  return validateTaskPacket(await readJson(governorPath(repositoryRoot, TASK_FILE(taskId))));
}

async function mutate(repositoryRoot, auth, {
  eventType,
  subjectId,
  now = new Date(),
  transform
}) {
  requireMutationAuth(auth);
  return withAdvanceLock(repositoryRoot, {
    sessionId: auth.sessionId,
    actor: auth.actor,
    now
  }, async () => {
    const verified = await verifyStoredState(repositoryRoot);
    const transformed = await transform(structuredClone(verified.state));
    if (!transformed || !transformed.state) throw new GovernorError("INVALID_MUTATION", "Governor mutation did not return state");
    const committed = await commitStateAndEvent(repositoryRoot, transformed.state, {
      eventType: transformed.eventType ?? eventType,
      actor: auth.actor,
      subjectId: transformed.subjectId ?? subjectId,
      payload: transformed.payload ?? {},
      now
    });
    return { ...transformed, state: committed.state, event: committed.event };
  });
}

export async function initializeGovernor(repositoryRoot, auth, {
  program,
  latestVerifiedMainSha,
  latestProductionRelease,
  certifiedPhases = [195],
  now = new Date()
}) {
  requireMutationAuth(auth);
  validateProgramDefinition(program);
  if (program.program_version !== PROGRAM_VERSION) throw new GovernorError("PROGRAM_VERSION_MISMATCH", `Expected ${PROGRAM_VERSION}`);
  if (!/^[a-f0-9]{40}$/.test(latestVerifiedMainSha)) throw new GovernorError("INVALID_GIT_SHA", "latestVerifiedMainSha must be a full lowercase SHA");
  if (!latestProductionRelease || latestProductionRelease.phase !== 195 || latestProductionRelease.main_sha !== latestVerifiedMainSha || latestProductionRelease.gate_status !== "PASSED" || latestProductionRelease.blockers?.length) {
    throw new GovernorError("UNCERTIFIED_PREREQUISITE", "Phase 195 must be a zero-blocker deployed release at latestVerifiedMainSha");
  }
  await ensureGovernorLayout(repositoryRoot);
  return withAdvanceLock(repositoryRoot, { sessionId: auth.sessionId, actor: auth.actor, now }, async () => {
    if (await stateExists(repositoryRoot)) throw new GovernorError("ALREADY_INITIALIZED", "Governor state already exists");
    const priorEvents = await readEvents(repositoryRoot);
    if (priorEvents.length) throw new GovernorError("ORPHANED_EVENT_HISTORY", "Event history exists without ProgramState; run recovery instead of initialize");
    const state = {
      contract_version: CONTRACT_VERSION,
      schema_version: SCHEMA_VERSION,
      program_version: program.program_version,
      execution_model: EXECUTION_MODEL,
      status: "ACTIVE",
      current_phase: null,
      certified_phases: [...new Set(certifiedPhases)].sort((a, b) => a - b),
      current_task_packet_id: null,
      task_status: null,
      last_task_packet_id: null,
      latest_execution_result: null,
      latest_verified_main_sha: latestVerifiedMainSha,
      latest_production_release: latestProductionRelease,
      blocked_reason: null,
      retry_count: 0,
      next_action: "Activate Phase 196.",
      active_write_lease: null,
      latest_checkpoint: null,
      review_state: null,
      conditional_review_triggers: [],
      task_attempts: 0,
      result_fingerprints: [],
      version: 0,
      event_count: 0,
      event_head_hash: "0".repeat(64),
      updated_at: iso(now)
    };
    const committed = await commitStateAndEvent(repositoryRoot, state, {
      eventType: "PROGRAM_INITIALIZED",
      actor: auth.actor,
      subjectId: program.program_version,
      payload: {
        latest_verified_main_sha: latestVerifiedMainSha,
        certified_phases: state.certified_phases,
        prerequisite_release: latestProductionRelease
      },
      now
    });
    return { state: committed.state, event: committed.event };
  });
}

export async function activatePhase(repositoryRoot, auth, phase, { now = new Date() } = {}) {
  const program = await loadProgram(repositoryRoot);
  if (!program.phases.includes(phase)) throw new GovernorError("UNKNOWN_PHASE", `Phase ${phase} is not in the active program`);
  return mutate(repositoryRoot, auth, {
    eventType: "PHASE_ACTIVATED",
    subjectId: String(phase),
    now,
    transform(state) {
      if (state.status !== "ACTIVE") throw new GovernorError("PROGRAM_NOT_ACTIVE", `Cannot activate while status is ${state.status}`);
      if (state.current_phase !== null && state.current_phase !== phase) throw new GovernorError("ACTIVE_PHASE_EXISTS", `Phase ${state.current_phase} is already active`);
      if (state.current_task_packet_id) throw new GovernorError("ACTIVE_TASK_EXISTS", "Cannot change phase while a write task is active");
      if (state.certified_phases.includes(phase)) throw new GovernorError("PHASE_ALREADY_CERTIFIED", `Phase ${phase} is already certified`);
      const missing = program.dependencies[String(phase)].filter((dependency) => !state.certified_phases.includes(dependency));
      if (missing.length) throw new GovernorError("UNCERTIFIED_DEPENDENCY", `Phase ${phase} requires certified phases ${missing.join(", ")}`, { missing });
      return {
        state: {
          ...state,
          current_phase: phase,
          task_status: null,
          retry_count: 0,
          task_attempts: 0,
          result_fingerprints: [],
          conditional_review_triggers: [],
          next_action: `Create one bounded Phase ${phase} TaskPacket.`
        },
        payload: { phase, dependencies: program.dependencies[String(phase)] },
        result: { phase, activated: true }
      };
    }
  });
}

export async function createTask(repositoryRoot, auth, taskPacket, { now = new Date() } = {}) {
  validateTaskPacket(taskPacket);
  return mutate(repositoryRoot, auth, {
    eventType: "TASK_CREATED",
    subjectId: taskPacket.task_packet_id,
    now,
    async transform(state) {
      if (state.status !== "ACTIVE") throw new GovernorError("PROGRAM_NOT_ACTIVE", `Cannot create a task while status is ${state.status}`);
      if (state.current_phase !== taskPacket.phase) throw new GovernorError("TASK_PHASE_MISMATCH", "TaskPacket phase must match the one active phase");
      if (state.current_task_packet_id) throw new GovernorError("ACTIVE_TASK_EXISTS", `Task ${state.current_task_packet_id} is already active`);
      const taskPath = governorPath(repositoryRoot, TASK_FILE(taskPacket.task_packet_id));
      const existing = await readOptionalJson(taskPath);
      if (existing && canonicalJson(existing) !== canonicalJson(taskPacket)) {
        throw new GovernorError("TASK_PACKET_CONFLICT", `TaskPacket ${taskPacket.task_packet_id} already exists with different content`);
      }
      if (!existing) await writeJsonAtomic(taskPath, taskPacket);
      const deadline = new Date(new Date(now).getTime() + taskPacket.usage_budget.maximum_wall_time_minutes * 60_000);
      return {
        state: {
          ...state,
          current_task_packet_id: taskPacket.task_packet_id,
          task_status: "READY",
          task_attempts: 0,
          result_fingerprints: [],
          active_write_lease: null,
          task_deadline_at: deadline.toISOString(),
          next_action: `Claim ${taskPacket.task_packet_id} before writing.`
        },
        payload: { task_packet: taskPacket },
        result: { task_packet_id: taskPacket.task_packet_id, status: "READY" }
      };
    }
  });
}

export async function claimTask(repositoryRoot, auth, {
  taskId,
  owner,
  leaseSeconds = 1_800,
  now = new Date()
}) {
  if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 14_400) throw new GovernorError("INVALID_LEASE_TTL", "Task lease must be between 30 and 14400 seconds");
  return mutate(repositoryRoot, auth, {
    eventType: "TASK_CLAIMED",
    subjectId: taskId,
    now,
    async transform(state) {
      const task = await loadTask(repositoryRoot, taskId);
      if (state.current_task_packet_id !== taskId) throw new GovernorError("TASK_NOT_ACTIVE", `Task ${taskId} is not the active TaskPacket`);
      if (!owner || owner !== auth.sessionId) throw new GovernorError("LEASE_OWNER_MISMATCH", "Lease owner must equal the authorized session ID");
      if (state.status !== "ACTIVE") throw new GovernorError("PROGRAM_NOT_ACTIVE", `Cannot claim while status is ${state.status}`);
      if (Date.parse(state.task_deadline_at) <= new Date(now).getTime()) {
        return {
          eventType: "TASK_STOPPED",
          state: {
            ...state,
            status: "STOPPED",
            task_status: "STOPPED",
            active_write_lease: null,
            next_action: `Deterministic stop: ${taskId} exceeded its maximum wall time.`
          },
          payload: { task_packet_id: taskId, stop_reason: "MAXIMUM_WALL_TIME", deadline_at: state.task_deadline_at },
          result: { status: "STOPPED", reason: "MAXIMUM_WALL_TIME" }
        };
      }
      if (isHealthyLease(state.active_write_lease, now)) {
        if (state.active_write_lease.owner === owner && state.active_write_lease.task_packet_id === taskId) {
          throw new GovernorError("TASK_ALREADY_CLAIMED", "This session already owns the healthy write lease", state.active_write_lease);
        }
        throw new GovernorError("WRITE_LEASE_HELD", "Another writer owns the active TaskPacket", {
          owner: state.active_write_lease.owner,
          task_packet_id: state.active_write_lease.task_packet_id,
          scope: state.active_write_lease.scope,
          expires_at: state.active_write_lease.expires_at
        });
      }
      const current = new Date(now);
      const lease = {
        contract_version: CONTRACT_VERSION,
        schema_version: SCHEMA_VERSION,
        lease_id: randomUUID(),
        task_packet_id: taskId,
        owner,
        actor: auth.actor,
        scope: task.scope,
        acquired_at: current.toISOString(),
        heartbeat_at: current.toISOString(),
        expires_at: new Date(current.getTime() + leaseSeconds * 1_000).toISOString()
      };
      return {
        state: {
          ...state,
          task_status: "CLAIMED",
          active_write_lease: lease,
          next_action: `Execute only ${taskId}, then record its exact result.`
        },
        payload: { lease, replaced_expired_lease: state.active_write_lease },
        result: lease
      };
    }
  });
}

export async function heartbeatTask(repositoryRoot, auth, {
  leaseId,
  leaseSeconds = 1_800,
  now = new Date()
}) {
  if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 14_400) {
    throw new GovernorError("INVALID_LEASE_TTL", "Task lease must be between 30 and 14400 seconds");
  }
  return mutate(repositoryRoot, auth, {
    eventType: "TASK_LEASE_HEARTBEAT",
    subjectId: leaseId,
    now,
    transform(state) {
      const lease = state.active_write_lease;
      if (!lease || lease.lease_id !== leaseId || lease.owner !== auth.sessionId) throw new GovernorError("LEASE_NOT_OWNED", "Session does not own the active write lease");
      const current = new Date(now);
      if (!isHealthyLease(lease, current)) throw new GovernorError("LEASE_EXPIRED", "An expired write lease must be resumed and reclaimed rather than revived");
      if (Date.parse(state.task_deadline_at) <= current.getTime()) {
        return {
          eventType: "TASK_STOPPED",
          state: {
            ...state,
            status: "STOPPED",
            task_status: "STOPPED",
            active_write_lease: null,
            next_action: `Deterministic stop: ${lease.task_packet_id} exceeded its maximum wall time.`
          },
          payload: { task_packet_id: lease.task_packet_id, stop_reason: "MAXIMUM_WALL_TIME", deadline_at: state.task_deadline_at },
          result: { status: "STOPPED", reason: "MAXIMUM_WALL_TIME" }
        };
      }
      const requestedExpiry = current.getTime() + leaseSeconds * 1_000;
      const updated = {
        ...lease,
        heartbeat_at: current.toISOString(),
        expires_at: new Date(Math.min(requestedExpiry, Date.parse(state.task_deadline_at))).toISOString()
      };
      return {
        state: { ...state, active_write_lease: updated },
        payload: { lease_id: leaseId, expires_at: updated.expires_at },
        result: updated
      };
    }
  });
}

export function usageCheckpointRequired(taskPacket, tokensRemaining) {
  if (!Number.isFinite(tokensRemaining) || tokensRemaining < 0) throw new GovernorError("INVALID_USAGE_REMAINING", "tokensRemaining must be a non-negative number");
  const threshold = taskPacket.usage_budget.checkpoint_at_tokens_remaining + taskPacket.usage_budget.release_repair_reserve_tokens;
  return {
    required: tokensRemaining <= threshold,
    tokens_remaining: tokensRemaining,
    checkpoint_threshold: threshold,
    release_repair_reserve: taskPacket.usage_budget.release_repair_reserve_tokens
  };
}

export async function recordResult(repositoryRoot, auth, executionResult, { now = new Date() } = {}) {
  validateExecutionResult(executionResult);
  return mutate(repositoryRoot, auth, {
    eventType: "TASK_RESULT",
    subjectId: executionResult.execution_result_id,
    now,
    async transform(state) {
      if (state.current_task_packet_id !== executionResult.task_packet_id || state.current_phase !== executionResult.phase) throw new GovernorError("RESULT_TASK_MISMATCH", "ExecutionResult does not match the active task and phase");
      const task = await loadTask(repositoryRoot, executionResult.task_packet_id);
      const lease = state.active_write_lease;
      if (!lease || lease.owner !== auth.sessionId || !isHealthyLease(lease, now)) throw new GovernorError("WRITE_LEASE_REQUIRED", "A healthy owned write lease is required to record a result");
      await writeJsonAtomic(governorPath(repositoryRoot, RESULT_FILE(executionResult.execution_result_id)), executionResult);
      const fingerprints = [...state.result_fingerprints, executionResult.result_fingerprint];
      const recentFingerprints = fingerprints.slice(-task.usage_budget.stagnation_limit);
      const repeated = recentFingerprints.length === task.usage_budget.stagnation_limit
        && recentFingerprints.every((value) => value === executionResult.result_fingerprint);
      const attempts = state.task_attempts + 1;
      const retryCount = executionResult.outcome === "PASSED" ? state.retry_count : state.retry_count + 1;
      const wallTimeExceeded = Date.parse(state.task_deadline_at) <= new Date(now).getTime();
      if (executionResult.outcome === "BLOCKED") throw new GovernorError("OWNER_ESCALATION_REQUIRED", "Use block with a typed OwnerEscalation rather than a generic blocked result");
      if (executionResult.outcome === "PASSED" && !wallTimeExceeded) {
        return {
          state: {
            ...state,
            current_task_packet_id: null,
            task_status: null,
            last_task_packet_id: executionResult.task_packet_id,
            latest_execution_result: executionResult,
            task_attempts: attempts,
            result_fingerprints: fingerprints,
            active_write_lease: null,
            next_action: `Reconcile Phase ${state.current_phase} with current origin/main and run the complete phase suite.`
          },
          payload: { execution_result: executionResult, attempts },
          result: { status: "PASSED", execution_result_id: executionResult.execution_result_id }
        };
      }
      const exhausted = wallTimeExceeded || attempts >= task.usage_budget.maximum_attempts || retryCount > task.usage_budget.maximum_retries || repeated;
      return {
        state: {
          ...state,
          task_status: exhausted ? "STOPPED" : "READY",
          status: exhausted ? "STOPPED" : state.status,
          latest_execution_result: executionResult,
          task_attempts: attempts,
          retry_count: retryCount,
          result_fingerprints: fingerprints,
          active_write_lease: null,
          next_action: exhausted
            ? `Deterministic stop: inspect ${executionResult.execution_result_id} before another bounded attempt.`
            : `Repair ${executionResult.task_packet_id} from the recorded failure without restarting accepted work.`
        },
        payload: { execution_result: executionResult, attempts, retry_count: retryCount, stagnation_detected: repeated, wall_time_exceeded: wallTimeExceeded, stopped: exhausted },
        result: { status: exhausted ? "STOPPED" : "READY", execution_result_id: executionResult.execution_result_id }
      };
    }
  });
}

export async function blockProgram(repositoryRoot, auth, escalation, { now = new Date() } = {}) {
  validateOwnerEscalation(escalation);
  return mutate(repositoryRoot, auth, {
    eventType: "PROGRAM_BLOCKED",
    subjectId: escalation.escalation_id,
    now,
    transform(state) {
      if (state.status === "COMPLETE") throw new GovernorError("PROGRAM_COMPLETE", "Completed program cannot be blocked");
      return {
        state: {
          ...state,
          status: "BLOCKED",
          blocked_reason: escalation,
          task_status: state.current_task_packet_id ? "READY" : state.task_status,
          active_write_lease: null,
          next_action: escalation.requested_action
        },
        payload: { owner_escalation: escalation },
        result: escalation
      };
    }
  });
}

export async function unblockProgram(repositoryRoot, auth, reason, { now = new Date() } = {}) {
  if (typeof reason !== "string" || reason.trim().length < 3) throw new GovernorError("INVALID_UNBLOCK_REASON", "Unblock requires a durable reason");
  return mutate(repositoryRoot, auth, {
    eventType: "PROGRAM_UNBLOCKED",
    subjectId: auth.sessionId,
    now,
    transform(state) {
      if (state.status !== "BLOCKED") throw new GovernorError("PROGRAM_NOT_BLOCKED", "Program is not in BLOCKED state");
      return {
        state: {
          ...state,
          status: "ACTIVE",
          blocked_reason: null,
          next_action: state.current_task_packet_id ? `Claim ${state.current_task_packet_id} and resume from its first unmet gate.` : `Continue Phase ${state.current_phase} from its first unmet gate.`
        },
        payload: { prior_block: state.blocked_reason, unblock_reason: reason },
        result: { unblocked: true }
      };
    }
  });
}

export async function checkpointSession(repositoryRoot, auth, checkpoint, { now = new Date() } = {}) {
  validateSessionCheckpoint(checkpoint);
  return mutate(repositoryRoot, auth, {
    eventType: "CHECKPOINT_RECORDED",
    subjectId: checkpoint.checkpoint_id,
    now,
    async transform(state) {
      if (checkpoint.phase !== state.current_phase || checkpoint.task_packet_id !== state.current_task_packet_id) throw new GovernorError("CHECKPOINT_STATE_MISMATCH", "Checkpoint must identify the exact active phase and task");
      await writeJsonAtomic(governorPath(repositoryRoot, CHECKPOINT_FILE(checkpoint.checkpoint_id)), checkpoint);
      return {
        state: { ...state, latest_checkpoint: checkpoint, next_action: checkpoint.next_action },
        payload: { checkpoint },
        result: checkpoint
      };
    }
  });
}

export async function resumeGovernor(repositoryRoot, auth, { now = new Date() } = {}) {
  requireMutationAuth(auth);
  return withAdvanceLock(repositoryRoot, { sessionId: auth.sessionId, actor: auth.actor, now }, async () => {
    let state;
    let recoveredFromEvents = false;
    try {
      state = (await verifyStoredState(repositoryRoot)).state;
    } catch (error) {
      if (!(error instanceof GovernorError) || !["STATE_EVENT_DIVERGENCE", "MISSING_STATE"].includes(error.code)) throw error;
      state = await recoverStateFromEvents(repositoryRoot);
      recoveredFromEvents = true;
    }
    const expiredLease = state.active_write_lease && !isHealthyLease(state.active_write_lease, now) ? state.active_write_lease : null;
    if (expiredLease) {
      state = {
        ...state,
        active_write_lease: null,
        task_status: state.current_task_packet_id ? "READY" : state.task_status,
        next_action: state.current_task_packet_id ? `Claim ${state.current_task_packet_id}; its prior lease expired without completing the task.` : state.next_action
      };
    }
    const committed = await commitStateAndEvent(repositoryRoot, state, {
      eventType: "SESSION_RESUMED",
      actor: auth.actor,
      subjectId: auth.sessionId,
      payload: { recovered_from_events: recoveredFromEvents, expired_lease: expiredLease, checkpoint_id: state.latest_checkpoint?.checkpoint_id ?? null },
      now
    });
    return {
      state: committed.state,
      recovered_from_events: recoveredFromEvents,
      expired_lease: expiredLease,
      next_action: committed.state.next_action
    };
  });
}

function reviewRequired(program, state, phase) {
  const mandatory = program.mandatory_review_phases.includes(phase);
  const triggers = state.conditional_review_triggers.filter((trigger) => CONDITIONAL_REVIEW_TRIGGERS.includes(trigger));
  return { required: mandatory || triggers.length > 0, mandatory, triggers };
}

export async function addConditionalReviewTrigger(repositoryRoot, auth, trigger, evidence, { now = new Date() } = {}) {
  if (!CONDITIONAL_REVIEW_TRIGGERS.includes(trigger)) throw new GovernorError("INVALID_REVIEW_TRIGGER", `Unsupported trigger ${trigger}`);
  if (!Array.isArray(evidence) || !evidence.length) throw new GovernorError("MISSING_REVIEW_EVIDENCE", "Conditional review trigger requires evidence");
  return mutate(repositoryRoot, auth, {
    eventType: "REVIEW_TRIGGER_RECORDED",
    subjectId: trigger,
    now,
    transform(state) {
      const triggers = [...new Set([...state.conditional_review_triggers, trigger])];
      return {
        state: { ...state, conditional_review_triggers: triggers, next_action: `Create a GPT-5.6 Pro review packet for ${trigger}.` },
        payload: { trigger, evidence },
        result: { trigger, recorded: true }
      };
    }
  });
}

function reviewBrief(request) {
  const gateLines = request.acceptance_gates.map((gate) => `- ${gate.id}: ${gate.status}`).join("\n") || "- None recorded";
  const questionLines = request.unresolved_questions.map((question) => `- ${question}`).join("\n") || "- None";
  return `# GPT-5.6 Pro review — ${request.checkpoint_id}\n\n` +
    `Phase: ${request.phase}\n\nCommit: \`${request.source_commit_sha}\`\n\nReason: ${request.reason}\n\n` +
    `## Requested decision\n\n${request.requested_decision}\n\n` +
    `## Codex recommendation\n\n${request.recommendation}\n\n` +
    `## Acceptance gates\n\n${gateLines}\n\n` +
    `## Unresolved questions\n\n${questionLines}\n\n` +
    `Review the committed request and evidence index. Codex Sol Extra High remains the only implementation and release writer.\n`;
}

export async function createReviewPacket(repositoryRoot, auth, request, { now = new Date() } = {}) {
  const program = await loadProgram(repositoryRoot);
  validateReviewRequest(request, program);
  return mutate(repositoryRoot, auth, {
    eventType: "REVIEW_REQUESTED",
    subjectId: request.checkpoint_id,
    now,
    async transform(state) {
      if (state.current_phase !== request.phase) throw new GovernorError("REVIEW_PHASE_MISMATCH", "Review request must match the active phase");
      if (request.task_packet_id !== state.last_task_packet_id && request.task_packet_id !== state.current_task_packet_id) throw new GovernorError("REVIEW_TASK_MISMATCH", "Review request must identify the active or latest completed TaskPacket");
      if (state.latest_execution_result?.commit_sha !== request.source_commit_sha) throw new GovernorError("REVIEW_COMMIT_MISMATCH", "Review request must bind the latest verified implementation commit");
      const requirement = reviewRequired(program, state, request.phase);
      if (!requirement.required) throw new GovernorError("REVIEW_NOT_REQUIRED", "Routine phase cannot be delayed without a defined trigger");
      const relativeDirectory = REVIEW_DIRECTORY(request.checkpoint_id);
      await writeJsonAtomic(governorPath(repositoryRoot, `${relativeDirectory}/PRO_REVIEW_REQUEST.json`), request);
      await writeJsonAtomic(governorPath(repositoryRoot, `${relativeDirectory}/EVIDENCE_INDEX.json`), {
        contract_version: CONTRACT_VERSION,
        schema_version: SCHEMA_VERSION,
        checkpoint_id: request.checkpoint_id,
        source_commit_sha: request.source_commit_sha,
        request_sha256: sha256(request),
        section_sha256: {
          diffs: sha256(request.diffs),
          deployments: sha256(request.production_deployments),
          migrations: sha256(request.migrations),
          acceptance_gates: sha256(request.acceptance_gates),
          tests: sha256(request.test_results),
          alternatives: sha256(request.alternatives),
          risks: sha256(request.risks)
        },
        evidence: request.evidence
      });
      await writeTextAtomic(governorPath(repositoryRoot, `${relativeDirectory}/PRO_REVIEW_BRIEF.md`), reviewBrief(request));
      await writeTextAtomic(governorPath(repositoryRoot, `${relativeDirectory}/PRO_REVIEW_VERDICT.md`), "# GPT-5.6 Pro verdict\n\nStatus: PENDING_OWNER_INVOKED_REVIEW\n\nNo verdict has been supplied.\n");
      const reviewState = {
        contract_version: CONTRACT_VERSION,
        schema_version: SCHEMA_VERSION,
        checkpoint_id: request.checkpoint_id,
        phase: request.phase,
        policy: requirement.mandatory ? "MANDATORY" : "CONDITIONAL",
        status: "WAITING_FOR_GPT_PRO_REVIEW",
        request_commit_sha: request.source_commit_sha,
        request_path: relativeDirectory,
        verdict: null,
        binding_corrections_completed: false,
        updated_at: iso(now)
      };
      return {
        state: { ...state, status: "WAITING_FOR_GPT_PRO_REVIEW", review_state: reviewState, next_action: `Owner requests GPT-5.6 Pro review for ${request.checkpoint_id} at ${request.source_commit_sha}.` },
        payload: { review_request: request, review_policy: reviewState.policy },
        result: reviewState
      };
    }
  });
}

export async function ingestReviewVerdict(repositoryRoot, auth, verdict, { now = new Date() } = {}) {
  validateReviewVerdict(verdict);
  return mutate(repositoryRoot, auth, {
    eventType: "REVIEW_VERDICT_INGESTED",
    subjectId: verdict.checkpoint_id,
    now,
    async transform(state) {
      const review = state.review_state;
      if (!review || review.checkpoint_id !== verdict.checkpoint_id || review.phase !== verdict.phase) throw new GovernorError("REVIEW_CHECKPOINT_MISMATCH", "Verdict does not match the durable waiting checkpoint");
      if (review.request_commit_sha !== verdict.reviewed_commit_sha) throw new GovernorError("REVIEWED_COMMIT_MISMATCH", "Verdict must review the exact requested commit");
      const relativeDirectory = review.request_path;
      await writeJsonAtomic(governorPath(repositoryRoot, `${relativeDirectory}/PRO_REVIEW_VERDICT.json`), verdict);
      const corrections = verdict.binding_corrections.length ? verdict.binding_corrections.map((item) => `- ${item}`).join("\n") : "- None";
      await writeTextAtomic(governorPath(repositoryRoot, `${relativeDirectory}/PRO_REVIEW_VERDICT.md`), `# GPT-5.6 Pro verdict\n\nVerdict: ${verdict.verdict}\n\nReviewed commit: \`${verdict.reviewed_commit_sha}\`\n\nVerdict commit: \`${verdict.verdict_commit_sha}\`\n\n## Rationale\n\n${verdict.rationale}\n\n## Binding corrections\n\n${corrections}\n`);
      const passed = verdict.verdict === "PASS" || verdict.verdict === "PASS_WITH_BINDING_CORRECTIONS";
      const needsCorrections = verdict.verdict === "PASS_WITH_BINDING_CORRECTIONS";
      const ownerDecision = verdict.verdict === "OWNER_DECISION_REQUIRED";
      const nextStatus = ownerDecision ? "BLOCKED" : "ACTIVE";
      return {
        state: {
          ...state,
          status: nextStatus,
          blocked_reason: ownerDecision ? { category: "PRODUCT_DEFINING_AMBIGUITY", checkpoint_id: verdict.checkpoint_id, rationale: verdict.rationale } : null,
          review_state: { ...review, status: verdict.verdict, verdict, binding_corrections_completed: passed && !needsCorrections, updated_at: iso(now) },
          next_action: needsCorrections
            ? "Create one bounded correction TaskPacket and rerun every affected deterministic gate."
            : verdict.verdict === "REJECT_AND_REPAIR"
              ? "Repair the rejected implementation with one bounded TaskPacket."
              : ownerDecision
                ? "Wait for the exact owner decision recorded by the checkpoint."
                : "Rerun deterministic release gates and certify the phase."
        },
        payload: { review_verdict: verdict },
        result: { accepted: true, verdict: verdict.verdict }
      };
    }
  });
}

export async function markReviewCorrectionsComplete(repositoryRoot, auth, commitSha, { now = new Date() } = {}) {
  if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new GovernorError("INVALID_GIT_SHA", "Correction commit must be a full Git SHA");
  return mutate(repositoryRoot, auth, {
    eventType: "REVIEW_CORRECTIONS_COMPLETED",
    subjectId: commitSha,
    now,
    transform(state) {
      const review = state.review_state;
      if (!review || review.verdict?.verdict !== "PASS_WITH_BINDING_CORRECTIONS") throw new GovernorError("NO_BINDING_CORRECTIONS", "No binding corrections are awaiting completion");
      if (state.latest_execution_result?.outcome !== "PASSED" || state.latest_execution_result?.commit_sha !== commitSha) throw new GovernorError("CORRECTION_GATES_NOT_PASSED", "Corrections require a passed ExecutionResult at the supplied commit");
      return {
        state: { ...state, review_state: { ...review, binding_corrections_completed: true, correction_commit_sha: commitSha, updated_at: iso(now) }, next_action: "Certify the phase using exact corrected release evidence." },
        payload: { correction_commit_sha: commitSha },
        result: { completed: true, commit_sha: commitSha }
      };
    }
  });
}

export async function certifyPhase(repositoryRoot, auth, releaseManifest, { now = new Date() } = {}) {
  validateReleaseManifest(releaseManifest);
  const program = await loadProgram(repositoryRoot);
  const currentState = (await verifyStoredState(repositoryRoot)).state;
  let first = { event: { event_hash: currentState.event_head_hash } };
  if (!currentState.pending_release_manifest) first = await mutate(repositoryRoot, auth, {
    eventType: "RELEASE_RECORDED",
    subjectId: releaseManifest.release_tag,
    now,
    async transform(state) {
      if (state.current_phase !== releaseManifest.phase) throw new GovernorError("RELEASE_PHASE_MISMATCH", "ReleaseManifest must match the active phase");
      if (state.current_task_packet_id || state.active_write_lease) throw new GovernorError("ACTIVE_TASK_EXISTS", "Complete the active TaskPacket before recording release evidence");
      if (state.latest_execution_result?.outcome !== "PASSED") throw new GovernorError("PHASE_TESTS_NOT_PASSED", "A passed ExecutionResult is required before release recording");
      const requirement = reviewRequired(program, state, releaseManifest.phase);
      if (requirement.required) {
        const review = state.review_state;
        if (!review?.verdict || !["PASS", "PASS_WITH_BINDING_CORRECTIONS"].includes(review.verdict.verdict) || !review.binding_corrections_completed) {
          throw new GovernorError("GPT_PRO_REVIEW_REQUIRED", `Phase ${releaseManifest.phase} requires a resolved review packet`, requirement);
        }
      }
      await writeJsonAtomic(governorPath(repositoryRoot, `releases/phase-${releaseManifest.phase}.json`), releaseManifest);
      return {
        state: { ...state, pending_release_manifest: releaseManifest, next_action: `Certify Phase ${releaseManifest.phase} from its recorded exact-SHA release.` },
        payload: { release_manifest: releaseManifest },
        result: { release_recorded: true, phase: releaseManifest.phase }
      };
    }
  });
  else if (canonicalJson(currentState.pending_release_manifest) !== canonicalJson(releaseManifest)) {
    throw new GovernorError("RELEASE_RECORD_MISMATCH", "A different ReleaseManifest is already pending certification");
  }

  return mutate(repositoryRoot, auth, {
    eventType: "PHASE_CERTIFIED",
    subjectId: String(releaseManifest.phase),
    now: new Date(new Date(now).getTime() + 1),
    transform(state) {
      if (!state.pending_release_manifest || canonicalJson(state.pending_release_manifest) !== canonicalJson(releaseManifest)) throw new GovernorError("RELEASE_RECORD_MISMATCH", "Recorded release evidence changed before phase certification");
      const certified = [...new Set([...state.certified_phases, releaseManifest.phase])].sort((a, b) => a - b);
      const nextPhase = program.phases.find((phase) => !certified.includes(phase) && program.dependencies[String(phase)].every((dependency) => certified.includes(dependency))) ?? null;
      return {
        state: {
          ...state,
          status: nextPhase === null ? "COMPLETE" : "ACTIVE",
          current_phase: null,
          certified_phases: certified,
          latest_verified_main_sha: releaseManifest.main_sha,
          latest_production_release: releaseManifest,
          pending_release_manifest: null,
          review_state: null,
          conditional_review_triggers: [],
          retry_count: 0,
          next_action: nextPhase === null ? "Program complete." : `Activate Phase ${nextPhase}.`
        },
        payload: { phase: releaseManifest.phase, main_sha: releaseManifest.main_sha, release_tag: releaseManifest.release_tag, prior_release_event: first.event.event_hash },
        result: { phase: releaseManifest.phase, certified: true, next_phase: nextPhase }
      };
    }
  });
}

export async function recordIncident(repositoryRoot, auth, incident, { now = new Date() } = {}) {
  validateNamedContract("IncidentRecord", incident);
  return mutate(repositoryRoot, auth, {
    eventType: "INCIDENT_RECORDED",
    subjectId: incident.incident_id,
    now,
    async transform(state) {
      if (incident.phase !== state.current_phase) throw new GovernorError("INCIDENT_PHASE_MISMATCH", "Incident must match the active phase");
      await writeJsonAtomic(governorPath(repositoryRoot, INCIDENT_FILE(incident.incident_id)), incident);
      return { state, payload: { incident }, result: incident };
    }
  });
}

function assertImprovementQueueAvailable(state, auth, now) {
  if (!state.certified_phases.includes(198) && state.current_phase !== 198) {
    throw new GovernorError("IMPROVEMENT_QUEUE_NOT_ACTIVE", "The evidence-based improvement queue is available from Phase 198 onward");
  }
  if (state.active_write_lease) {
    if (!isHealthyLease(state.active_write_lease, now)) {
      throw new GovernorError("EXPIRED_WRITE_LEASE", "Resume the Governor before mutating the improvement queue under an expired write lease");
    }
    if (state.active_write_lease.owner !== auth.sessionId) {
      throw new GovernorError("WRITE_LEASE_HELD", "The active TaskPacket lease belongs to another session", {
        owner: state.active_write_lease.owner,
        task_packet_id: state.active_write_lease.task_packet_id,
        scope: state.active_write_lease.scope,
        expires_at: state.active_write_lease.expires_at
      });
    }
  }
}

export async function intakeImprovementCandidate(repositoryRoot, auth, input, { now = new Date() } = {}) {
  return mutate(repositoryRoot, auth, {
    eventType: "IMPROVEMENT_CANDIDATE_RECORDED",
    subjectId: input?.candidate_id ?? "improvement-intake",
    now,
    async transform(state) {
      assertImprovementQueueAvailable(state, auth, now);
      const incoming = normalizeImprovementCandidate(input, { releaseVersion: state.latest_verified_main_sha, now });
      const candidates = await loadImprovementCandidates(repositoryRoot);
      const existing = candidates.find((candidate) => sameImprovementRootCause(candidate, incoming));
      const candidate = existing ? mergeImprovementCandidate(existing, incoming, { now }) : incoming;
      await persistImprovementCandidate(repositoryRoot, candidate);
      return {
        eventType: existing ? "IMPROVEMENT_CANDIDATE_MERGED" : "IMPROVEMENT_CANDIDATE_RECORDED",
        subjectId: candidate.candidate_id,
        state,
        payload: {
          candidate_id: candidate.candidate_id,
          candidate_version: candidate.version,
          evidence_count: candidate.evidence.length,
          deduplicated: Boolean(existing),
          candidate_sha256: sha256(candidate)
        },
        result: candidate
      };
    }
  });
}

function closedImprovementStatus(status) {
  return ["REJECTED", "IMPLEMENTED", "CLOSED_EVIDENCE_INVALID", "CLOSED_ROOT_CAUSE_REMOVED"].includes(status);
}

export async function runImprovementCycle(repositoryRoot, auth, { now = new Date() } = {}) {
  return mutate(repositoryRoot, auth, {
    eventType: "IMPROVEMENT_CYCLE_COMPLETED",
    subjectId: "improvement-cycle",
    now,
    async transform(state) {
      assertImprovementQueueAvailable(state, auth, now);
      const candidates = await loadImprovementCandidates(repositoryRoot);
      const storedPolicy = await loadImprovementPolicy(repositoryRoot);
      const taskProposals = await loadImprovementTaskProposals(repositoryRoot);
      const candidateByIdBeforeCycle = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
      const recoveredActiveIds = [];
      for (const proposal of taskProposals) {
        const candidate = candidateByIdBeforeCycle.get(proposal.candidate_id);
        if (!candidate) throw new GovernorError("ORPHANED_TASK_PROPOSAL", `Task proposal ${proposal.proposal_id} has no durable ImprovementCandidate`);
        if (!closedImprovementStatus(candidate.status)) recoveredActiveIds.push(candidate.candidate_id);
      }
      const recoveredIds = [...new Set([...storedPolicy.active_candidate_ids, ...recoveredActiveIds])].sort();
      const recoveredBudget = recoveredIds.reduce((total, candidateId) => {
        const candidate = candidateByIdBeforeCycle.get(candidateId);
        if (!candidate) throw new GovernorError("ORPHANED_ACTIVE_IMPROVEMENT", `Active improvement ${candidateId} has no durable candidate`);
        return total + candidate.budget_units;
      }, 0);
      const policy = { ...storedPolicy, active_candidate_ids: recoveredIds, active_budget_units: recoveredBudget };
      const cycle = planImprovementCycle(candidates, policy, { now });
      const cycleId = `CYCLE-${cycle.produced_at.replace(/[^0-9]/g, "").slice(0, 17)}-${sha256({ candidates: cycle.candidates.map((candidate) => [candidate.candidate_id, candidate.version]), status: cycle.status, reason: cycle.reason }).slice(0, 12)}`;
      const candidateById = new Map(cycle.candidates.map((candidate) => [candidate.candidate_id, candidate]));
      const activeIds = policy.active_candidate_ids
        .filter((candidateId) => candidateById.has(candidateId) && !closedImprovementStatus(candidateById.get(candidateId).status));
      for (const proposal of cycle.task_proposals) activeIds.push(proposal.candidate_id);
      const nextActiveIds = [...new Set(activeIds)].sort();
      const activeBudget = nextActiveIds.reduce((total, candidateId) => total + candidateById.get(candidateId).budget_units, 0);
      const nextPolicy = {
        ...policy,
        active_candidate_ids: nextActiveIds,
        active_budget_units: activeBudget,
        last_cycle_at: cycle.reason === "QUIET_PERIOD" ? policy.last_cycle_at : cycle.produced_at,
        updated_at: cycle.produced_at
      };
      await persistImprovementCycle(repositoryRoot, cycle, cycleId);
      await writeJsonAtomic(governorPath(repositoryRoot, "improvements/POLICY.v1.json"), nextPolicy);
      return {
        subjectId: cycleId,
        state,
        payload: {
          cycle_id: cycleId,
          status: cycle.status,
          reason: cycle.reason,
          task_proposal_ids: cycle.task_proposals.map((proposal) => proposal.proposal_id),
          amendment_ids: cycle.amendments.map((amendment) => amendment.amendment_id),
          closure_ids: cycle.closures.map((candidate) => candidate.candidate_id),
          active_budget_units: activeBudget
        },
        result: { cycle_id: cycleId, cycle, policy: nextPolicy }
      };
    }
  });
}

export async function getImprovementBacklog(repositoryRoot, auth) {
  requireReadAuth(auth);
  return rankImprovementBacklog(await loadImprovementCandidates(repositoryRoot));
}

export async function getImprovementEvidence(repositoryRoot, auth, candidateId) {
  requireReadAuth(auth);
  return improvementEvidenceView(await readImprovementCandidate(repositoryRoot, candidateId));
}

export async function decideImprovement(repositoryRoot, auth, candidateId, decision, { now = new Date() } = {}) {
  return mutate(repositoryRoot, auth, {
    eventType: "IMPROVEMENT_CANDIDATE_DECIDED",
    subjectId: candidateId,
    now,
    async transform(state) {
      assertImprovementQueueAvailable(state, auth, now);
      const candidate = decideImprovementCandidate(await readImprovementCandidate(repositoryRoot, candidateId), decision, { now });
      await persistImprovementCandidate(repositoryRoot, candidate);
      return {
        state,
        payload: { candidate_id: candidateId, status: candidate.status, rationale: candidate.rationale, reevaluation_trigger: candidate.reevaluation_trigger },
        result: candidate
      };
    }
  });
}

export async function measureImprovement(repositoryRoot, auth, candidateId, measurement, { now = new Date() } = {}) {
  return mutate(repositoryRoot, auth, {
    eventType: "IMPROVEMENT_OUTCOME_RECORDED",
    subjectId: candidateId,
    now,
    async transform(state) {
      assertImprovementQueueAvailable(state, auth, now);
      const measured = recordImprovementOutcome(await readImprovementCandidate(repositoryRoot, candidateId), measurement, {
        now,
        releaseVersion: state.latest_verified_main_sha
      });
      await persistImprovementCandidate(repositoryRoot, measured.candidate);
      await persistImprovementOutcome(repositoryRoot, measured.outcome);
      return {
        state,
        payload: { candidate_id: candidateId, outcome_id: measured.outcome.outcome_id, result: measured.outcome.result, outcome_sha256: sha256(measured.outcome) },
        result: measured
      };
    }
  });
}

function amendmentImmutableView(amendment) {
  return Object.fromEntries([
    "amendment_id", "candidate_id", "tenant_id", "organization_id", "business_id", "actor",
    "request_idempotency_key", "phase", "candidate_version", "reason", "scope_delta", "evidence", "affected_contracts",
    "acceptance_criteria", "commercial_unlock", "dag_update", "supersession_record", "owner_review_topics",
    "created_at", "release_version"
  ].map((field) => [field, amendment[field]]));
}

function assertRepositoryRecordId(value, field) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,199}$/.test(value)) {
    throw new GovernorError("UNSAFE_IMPROVEMENT_ID", `${field} must be safe for repository-local persistence`);
  }
}

export async function applyImprovementAmendment(repositoryRoot, auth, amendment, { now = new Date() } = {}) {
  validatePhaseAmendment(amendment);
  assertRepositoryRecordId(amendment.amendment_id, "amendment_id");
  return mutate(repositoryRoot, auth, {
    eventType: "PHASE_AMENDMENT_APPLIED",
    subjectId: amendment.amendment_id,
    now,
    async transform(state) {
      assertImprovementQueueAvailable(state, auth, now);
      const storedPath = governorPath(repositoryRoot, `improvements/amendments/${amendment.amendment_id}.json`);
      const stored = await readOptionalJson(storedPath);
      if (!stored) throw new GovernorError("PHASE_AMENDMENT_NOT_FOUND", `PhaseAmendment ${amendment.amendment_id} does not exist`);
      validatePhaseAmendment(stored);
      if (canonicalJson(amendmentImmutableView(stored)) !== canonicalJson(amendmentImmutableView(amendment))) {
        throw new GovernorError("PHASE_AMENDMENT_CONTENT_CHANGED", "Owner acceptance cannot alter the proposed scope, evidence, DAG, contracts, acceptance, commercial, or supersession record");
      }
      if (amendment.version !== stored.version + 1) throw new GovernorError("PHASE_AMENDMENT_VERSION_MISMATCH", "Accepted PhaseAmendment must advance the stored proposal by exactly one version");
      const candidate = await readImprovementCandidate(repositoryRoot, amendment.candidate_id);
      if (candidate.status !== "AMENDMENT_PROPOSED" || candidate.version !== amendment.candidate_version + 1) {
        throw new GovernorError("STALE_PHASE_AMENDMENT", "Owner acceptance must bind the unchanged candidate version that produced the pending PhaseAmendment");
      }
      const phaseDag = await loadProgram(repositoryRoot);
      const contractPath = governorPath(repositoryRoot, PHASE_CONTRACT(amendment.dag_update.target_phase));
      const phaseContract = await readJson(contractPath);
      const applied = applyAcceptedPhaseAmendment(amendment, phaseDag, phaseContract);
      validateProgramDefinition(applied.phase_dag);
      await writeJsonAtomic(governorPath(repositoryRoot, PHASE_DAG_FILE), applied.phase_dag);
      await writeJsonAtomic(contractPath, applied.phase_contract);
      await writeJsonAtomic(storedPath, amendment);
      await writeJsonAtomic(governorPath(repositoryRoot, `improvements/applied/${amendment.amendment_id}.json`), {
        contract_version: CONTRACT_VERSION,
        schema_version: SCHEMA_VERSION,
        amendment,
        applied_changes: applied.applied_changes,
        phase_dag_sha256: sha256(applied.phase_dag),
        phase_contract_sha256: sha256(applied.phase_contract),
        applied_at: iso(now)
      });
      await persistImprovementCandidate(repositoryRoot, {
        ...candidate,
        version: candidate.version + 1,
        status: "AMENDMENT_ACCEPTED",
        rationale: `Owner accepted ${amendment.amendment_id}; schedule the amended phase through normal TaskPacket and release gates.`,
        reevaluation_trigger: null,
        updated_at: iso(now)
      });
      return {
        state: {
          ...state,
          conditional_review_triggers: [...new Set([...state.conditional_review_triggers, "MATERIAL_PHASE_AMENDMENT"])],
          next_action: `Create a commit-bound GPT-5.6 Pro review packet for accepted material amendment ${amendment.amendment_id}.`
        },
        payload: {
          amendment_id: amendment.amendment_id,
          owner_decision_id: amendment.owner_approval.decision_id,
          phase_dag_sha256: sha256(applied.phase_dag),
          phase_contract_sha256: sha256(applied.phase_contract)
        },
        result: applied.applied_changes
      };
    }
  });
}

export async function verifyGovernor(repositoryRoot, auth) {
  requireReadAuth(auth);
  const program = await loadProgram(repositoryRoot);
  const verified = await verifyStoredState(repositoryRoot);
  if (verified.state.program_version !== program.program_version || verified.state.execution_model !== EXECUTION_MODEL) throw new GovernorError("PROGRAM_STATE_MISMATCH", "ProgramState does not match the repository program definition");
  if (verified.state.current_task_packet_id) await loadTask(repositoryRoot, verified.state.current_task_packet_id);
  return {
    valid: true,
    state_version: verified.state.version,
    event_count: verified.chain.event_count,
    event_head_hash: verified.chain.head_hash,
    current_phase: verified.state.current_phase,
    current_task_packet_id: verified.state.current_task_packet_id
  };
}

export async function getStatus(repositoryRoot, auth, { tokensRemaining = null } = {}) {
  requireReadAuth(auth);
  const { state } = await verifyStoredState(repositoryRoot);
  let usage_boundary = null;
  if (tokensRemaining !== null && state.current_task_packet_id) usage_boundary = usageCheckpointRequired(await loadTask(repositoryRoot, state.current_task_packet_id), tokensRemaining);
  const lines = [
    `Program: ${state.program_version}`,
    `Status: ${state.status}`,
    `Execution model: ${state.execution_model}`,
    `Current phase: ${state.current_phase ?? "none"}`,
    `Current write task: ${state.current_task_packet_id ?? "none"}${state.task_status ? ` (${state.task_status})` : ""}`,
    `Latest verified main: ${state.latest_verified_main_sha}`,
    `Latest production release: Phase ${state.latest_production_release?.phase ?? "unavailable"}`,
    `Blocked reason: ${state.blocked_reason?.reason ?? state.blocked_reason?.rationale ?? "none"}`,
    `Retry count: ${state.retry_count}`,
    `Next action: ${state.next_action}`
  ];
  return { state, usage_boundary, human_report: lines.join("\n") };
}

export async function nextAction(repositoryRoot, auth) {
  requireReadAuth(auth);
  const program = await loadProgram(repositoryRoot);
  const { state } = await verifyStoredState(repositoryRoot);
  if (state.status === "WAITING_FOR_GPT_PRO_REVIEW") return { action: "WAIT_FOR_GPT_PRO_REVIEW", checkpoint_id: state.review_state?.checkpoint_id, commit_sha: state.review_state?.request_commit_sha, instruction: state.next_action };
  if (state.status === "BLOCKED") return { action: "WAIT_FOR_OWNER", blocker: state.blocked_reason, instruction: state.next_action };
  if (state.status === "STOPPED") return { action: "DETERMINISTIC_STOP", instruction: state.next_action, latest_execution_result: state.latest_execution_result };
  if (state.current_task_packet_id) {
    if (state.task_status === "CLAIMED" && !isHealthyLease(state.active_write_lease)) {
      return { action: "RESUME_EXPIRED_LEASE", task_packet: await loadTask(repositoryRoot, state.current_task_packet_id), lease: state.active_write_lease, instruction: "Run Governor resume to expire stale ownership before reclaiming the same TaskPacket." };
    }
    return { action: state.task_status === "CLAIMED" ? "EXECUTE_TASK" : "CLAIM_TASK", task_packet: await loadTask(repositoryRoot, state.current_task_packet_id), lease: state.active_write_lease, instruction: state.next_action };
  }
  if (state.current_phase !== null) return { action: "CREATE_TASK", phase: state.current_phase, phase_contract: PHASE_CONTRACT(state.current_phase), instruction: state.next_action };
  const phase = program.phases.find((candidate) => !state.certified_phases.includes(candidate) && program.dependencies[String(candidate)].every((dependency) => state.certified_phases.includes(dependency))) ?? null;
  return phase === null ? { action: "PROGRAM_COMPLETE", instruction: "No uncertified eligible phase remains." } : { action: "ACTIVATE_PHASE", phase, instruction: `Activate Phase ${phase}.` };
}

async function readContextPath(repositoryRoot, relativePath) {
  const absolute = path.resolve(repositoryRoot, relativePath);
  if (!absolute.startsWith(`${path.resolve(repositoryRoot)}${path.sep}`)) throw new GovernorError("UNSAFE_CONTEXT_PATH", `Context path escapes repository: ${relativePath}`);
  let content;
  try {
    content = await readFile(absolute, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { path: relativePath, status: "UNAVAILABLE", content_sha256: null, content: null };
    throw error;
  }
  if (Buffer.byteLength(content, "utf8") > 100_000) return { path: relativePath, status: "TOO_LARGE", content_sha256: sha256(content), content: null };
  return { path: relativePath, status: "SELECTED", content_sha256: sha256(content), content };
}

export async function compileContext(repositoryRoot, auth) {
  requireReadAuth(auth);
  const { state } = await verifyStoredState(repositoryRoot);
  if (state.current_phase === null) throw new GovernorError("NO_ACTIVE_PHASE", "Context compilation requires one active phase");
  const phase_contract = await readJson(governorPath(repositoryRoot, PHASE_CONTRACT(state.current_phase)));
  const task_packet = state.current_task_packet_id ? await loadTask(repositoryRoot, state.current_task_packet_id) : null;
  const selected = task_packet ? [...new Set([...task_packet.relevant_adrs, ...task_packet.relevant_source_paths])] : [];
  const source_context = [];
  for (const relativePath of selected) source_context.push(await readContextPath(repositoryRoot, relativePath));
  return {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    compiled_at: state.updated_at,
    program_version: state.program_version,
    execution_model: state.execution_model,
    current_phase: state.current_phase,
    task_packet,
    phase_contract,
    selected_source_context: source_context,
    recent_release_state: state.latest_production_release,
    latest_checkpoint: state.latest_checkpoint,
    excluded_context: ["future phase packages", "consumer chat transcripts", "hidden model memory", "unrelated repository paths"]
  };
}

export async function eventLogSummary(repositoryRoot, auth) {
  requireReadAuth(auth);
  const events = await readEvents(repositoryRoot);
  const chain = verifyEventChain(events);
  return { file: governorPath(repositoryRoot, EVENTS_FILE), ...chain, event_types: events.map((event) => event.event_type) };
}

export async function forceRecoveryForTest(repositoryRoot) {
  return recoverStateFromEvents(repositoryRoot);
}

import {
  appendFile,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { GovernorError, validateGovernorEvent, validateProgramState } from "./contracts.mjs";

export const GOVERNOR_RELATIVE_ROOT = ".entral/governor";
export const STATE_FILE = "PROGRAM_STATE.json";
export const EVENTS_FILE = "events/EVENTS.jsonl";
export const LOCK_FILE = "runtime/advance.lock";

export function governorPath(repositoryRoot, relative = "") {
  const base = path.resolve(repositoryRoot, GOVERNOR_RELATIVE_ROOT);
  const target = path.resolve(base, relative);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new GovernorError("UNSAFE_GOVERNOR_PATH", `Path escapes ${GOVERNOR_RELATIVE_ROOT}`);
  }
  return target;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const input = typeof value === "string" || Buffer.isBuffer(value) ? value : canonicalJson(value);
  return createHash("sha256").update(input).digest("hex");
}

export async function ensureGovernorLayout(repositoryRoot) {
  for (const relative of ["events", "runtime", "checkpoints", "pro-review", "releases", "tasks"]) {
    await mkdir(governorPath(repositoryRoot, relative), { recursive: true });
  }
}

export async function readJson(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") throw new GovernorError("MISSING_STATE", `Missing required file ${filePath}`);
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new GovernorError("INVALID_JSON", `Invalid JSON in ${filePath}: ${error.message}`);
  }
}

export async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error instanceof GovernorError && error.code === "MISSING_STATE") return null;
    throw error;
  }
}

export async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function loadState(repositoryRoot) {
  return readJson(governorPath(repositoryRoot, STATE_FILE));
}

export async function stateExists(repositoryRoot) {
  try {
    await stat(governorPath(repositoryRoot, STATE_FILE));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function saveState(repositoryRoot, state) {
  await writeJsonAtomic(governorPath(repositoryRoot, STATE_FILE), state);
}

function normalizeNow(now) {
  const date = now instanceof Date ? now : new Date(now ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new GovernorError("INVALID_TIMESTAMP", "Clock returned an invalid timestamp");
  return date;
}

export async function acquireAdvanceLock(repositoryRoot, {
  sessionId,
  actor,
  ttlSeconds = 120,
  now = new Date()
}) {
  if (!sessionId || typeof sessionId !== "string") throw new GovernorError("MISSING_SESSION", "A stable session ID is required");
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 5 || ttlSeconds > 3_600) {
    throw new GovernorError("INVALID_LOCK_TTL", "Lock TTL must be between 5 and 3600 seconds");
  }
  await ensureGovernorLayout(repositoryRoot);
  const lockPath = governorPath(repositoryRoot, LOCK_FILE);
  const current = normalizeNow(now);
  const lockRecord = {
    contract_version: "1.0.0",
    schema_version: 1,
    lock_id: randomUUID(),
    session_id: sessionId,
    actor,
    process_id: process.pid,
    acquired_at: current.toISOString(),
    heartbeat_at: current.toISOString(),
    expires_at: new Date(current.getTime() + ttlSeconds * 1_000).toISOString()
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(lockRecord, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      let released = false;
      return {
        record: lockRecord,
        async release() {
          if (released) return;
          const existing = await readOptionalJson(lockPath);
          if (!existing || existing.lock_id !== lockRecord.lock_id || existing.session_id !== sessionId) {
            throw new GovernorError("LOCK_OWNERSHIP_LOST", "Cannot release a lock owned by another session");
          }
          await rm(lockPath, { force: true });
          released = true;
        }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await readOptionalJson(lockPath);
      if (!existing || typeof existing.expires_at !== "string") {
        throw new GovernorError("CORRUPT_ADVANCE_LOCK", "Existing Governor lock is malformed and must be inspected");
      }
      if (Date.parse(existing.expires_at) > current.getTime()) {
        throw new GovernorError("ADVANCE_LOCK_HELD", "Another Governor session currently owns advancement", {
          session_id: existing.session_id,
          actor: existing.actor,
          expires_at: existing.expires_at
        });
      }
      const stalePath = `${lockPath}.stale.${existing.lock_id ?? randomUUID()}`;
      try {
        await rename(lockPath, stalePath);
        await rm(stalePath, { force: true });
      } catch (staleError) {
        if (staleError?.code !== "ENOENT") throw staleError;
      }
    }
  }
  throw new GovernorError("ADVANCE_LOCK_RETRY_EXHAUSTED", "Could not acquire Governor lock after expiring stale ownership");
}

export async function readEvents(repositoryRoot) {
  let raw;
  try {
    raw = await readFile(governorPath(repositoryRoot, EVENTS_FILE), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const events = [];
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      throw new GovernorError("CORRUPT_EVENT_LOG", `Event line ${index + 1} is invalid JSON: ${error.message}`);
    }
  }
  return events;
}

function eventHashInput(event) {
  const { event_hash: ignored, ...input } = event;
  return input;
}

export function verifyEventChain(events) {
  let previous = "0".repeat(64);
  let previousTimestamp = 0;
  events.forEach((event, index) => {
    validateGovernorEvent(event);
    const sequence = index + 1;
    if (event.sequence !== sequence) throw new GovernorError("EVENT_SEQUENCE_BROKEN", `Expected event sequence ${sequence}`);
    if (event.previous_hash !== previous) throw new GovernorError("EVENT_CHAIN_BROKEN", `Event ${sequence} has the wrong previous hash`);
    const timestamp = Date.parse(event.created_at);
    if (timestamp < previousTimestamp) throw new GovernorError("EVENT_TIME_REGRESSION", `Event ${sequence} predates the prior transition`);
    const { state_after: stateAfter, ...requestPayload } = event.payload;
    if (!stateAfter || stateAfter.version !== event.resulting_version) throw new GovernorError("EVENT_STATE_VERSION_MISMATCH", `Event ${sequence} state snapshot does not match its resulting version`);
    if (stateAfter.updated_at !== event.created_at) throw new GovernorError("EVENT_STATE_TIME_MISMATCH", `Event ${sequence} state snapshot does not match its transition timestamp`);
    if (stateAfter.latest_verified_main_sha !== event.release_version) throw new GovernorError("EVENT_RELEASE_VERSION_MISMATCH", `Event ${sequence} does not bind the active release version`);
    if (event.transition_evidence_sha256 !== sha256(requestPayload)) throw new GovernorError("EVENT_EVIDENCE_TAMPERED", `Event ${sequence} transition evidence digest is invalid`);
    const expectedIdempotencyKey = sha256({
      event_type: event.event_type,
      subject_id: event.subject_id,
      prior_version: event.prior_version,
      request_payload: requestPayload
    });
    if (event.request_idempotency_key !== expectedIdempotencyKey) throw new GovernorError("EVENT_IDEMPOTENCY_TAMPERED", `Event ${sequence} idempotency key is invalid`);
    if (event.payload_sha256 !== sha256(event.payload)) throw new GovernorError("EVENT_PAYLOAD_TAMPERED", `Event ${sequence} payload digest is invalid`);
    const expected = sha256(eventHashInput(event));
    if (event.event_hash !== expected) throw new GovernorError("EVENT_HASH_TAMPERED", `Event ${sequence} hash is invalid`);
    previous = event.event_hash;
    previousTimestamp = timestamp;
  });
  return { valid: true, event_count: events.length, head_hash: previous };
}

export async function appendEvent(repositoryRoot, {
  eventType,
  actor,
  subjectId,
  payload,
  priorVersion,
  resultingVersion,
  requestIdempotencyKey,
  transitionEvidenceSha256,
  releaseVersion,
  now = new Date()
}) {
  await ensureGovernorLayout(repositoryRoot);
  const events = await readEvents(repositoryRoot);
  const verification = verifyEventChain(events);
  const current = normalizeNow(now);
  const event = {
    contract_version: "1.0.0",
    schema_version: 1,
    sequence: events.length + 1,
    event_id: randomUUID(),
    event_type: eventType,
    actor,
    subject_id: subjectId,
    tenant_id: null,
    organization_id: null,
    business_id: null,
    request_idempotency_key: requestIdempotencyKey,
    prior_version: priorVersion,
    resulting_version: resultingVersion,
    transition_evidence_sha256: transitionEvidenceSha256,
    release_version: releaseVersion,
    payload,
    payload_sha256: sha256(payload),
    previous_hash: verification.head_hash,
    created_at: current.toISOString()
  };
  event.event_hash = sha256(eventHashInput(event));
  const filePath = governorPath(repositoryRoot, EVENTS_FILE);
  const handle = await open(filePath, "a", 0o600);
  try {
    await handle.write(`${JSON.stringify(event)}\n`, null, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return event;
}

export async function verifyStoredState(repositoryRoot) {
  const state = validateProgramState(await loadState(repositoryRoot));
  const events = await readEvents(repositoryRoot);
  const chain = verifyEventChain(events);
  if (!events.length) throw new GovernorError("MISSING_EVENT_HISTORY", "Initialized Governor state requires at least one event");
  if (state.event_head_hash !== chain.head_hash || state.event_count !== chain.event_count) {
    throw new GovernorError("STATE_EVENT_DIVERGENCE", "Program state does not match the append-only event head");
  }
  return { state, events, chain };
}

export async function commitStateAndEvent(repositoryRoot, state, eventInput) {
  const eventTime = normalizeNow(eventInput.now);
  const priorVersion = state.version ?? 0;
  const requestPayload = eventInput.payload ?? {};
  const stateAfter = {
    ...state,
    version: priorVersion + 1,
    updated_at: eventTime.toISOString()
  };
  delete stateAfter.event_count;
  delete stateAfter.event_head_hash;
  const event = await appendEvent(repositoryRoot, {
    ...eventInput,
    now: eventTime,
    priorVersion,
    resultingVersion: stateAfter.version,
    requestIdempotencyKey: sha256({
      event_type: eventInput.eventType,
      subject_id: eventInput.subjectId,
      prior_version: priorVersion,
      request_payload: requestPayload
    }),
    transitionEvidenceSha256: sha256(requestPayload),
    releaseVersion: stateAfter.latest_verified_main_sha,
    payload: {
      ...requestPayload,
      state_after: stateAfter
    }
  });
  const nextState = {
    ...stateAfter,
    event_count: event.sequence,
    event_head_hash: event.event_hash
  };
  validateProgramState(nextState);
  await saveState(repositoryRoot, nextState);
  return { state: nextState, event };
}

export async function recoverStateFromEvents(repositoryRoot) {
  const events = await readEvents(repositoryRoot);
  const chain = verifyEventChain(events);
  if (!events.length) throw new GovernorError("MISSING_EVENT_HISTORY", "No Governor events are available for recovery");
  const stateAfter = events.at(-1)?.payload?.state_after;
  if (!stateAfter || typeof stateAfter !== "object" || Array.isArray(stateAfter)) {
    throw new GovernorError("UNRECOVERABLE_EVENT_HISTORY", "Latest Governor event does not contain a durable state snapshot");
  }
  const recovered = {
    ...stateAfter,
    event_count: chain.event_count,
    event_head_hash: chain.head_hash
  };
  validateProgramState(recovered);
  await saveState(repositoryRoot, recovered);
  return recovered;
}

export async function withAdvanceLock(repositoryRoot, options, operation) {
  const lock = await acquireAdvanceLock(repositoryRoot, options);
  try {
    return await operation(lock.record);
  } finally {
    await lock.release();
  }
}

export async function writeTextAtomic(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  try {
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

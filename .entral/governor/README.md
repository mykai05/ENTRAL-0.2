# ENTRAL Development Governor

This directory is the durable, repository-owned control plane for the remaining ENTRAL implementation program. It is intentionally a single-process Node.js CLI backed by versioned JSON contracts, Git-tracked state, atomic file replacement, an expiring local lock, one active write lease, and a SHA-256-chained append-only event log.

It is not an application runtime service, model router, distributed scheduler, consumer-chat integration, or replacement engineering platform.

## Manual Codex startup instruction

1. Open the ENTRAL repository in Codex 5.6 Sol at Extra High reasoning.
2. Run `pnpm governor status` and then `pnpm governor next`.
3. Execute only the emitted `TaskPacket`; claim it first with `pnpm governor claim-task --task-id <id> --session-id <stable-session-id>`.

No consumer chat transcript or hidden model memory is needed. `PROGRAM_STATE.json`, the current TaskPacket, checkpoints, release records, and `events/EVENTS.jsonl` reconstruct the exact next action.

## Mutation authorization

All mutating commands require `--session-id <stable-session-id>`. The only accepted actor is `CODEX_5_6_SOL_XHIGH`. Supplying any other `--actor` fails closed. Local filesystem and Git permissions remain the outer authorization boundary; production credentials are never stored here.

## Commands

```text
initialize
status
activate-phase
create-task
claim-task
heartbeat
record-result
fail-task
block
unblock
checkpoint
resume
certify-phase
next
context
verify
events
validate-contract
create-review
ingest-review
complete-review-corrections
add-review-trigger
record-incident
release-inspect
release-create-worktree
release-reconcile
release-evaluate
release-bundle
release-merge
release-rollback
release-select-tests
```

Run `pnpm governor help` for the compact command reference. JSON inputs must be committed inside the repository, typed with contract `1.0.0`, and validated before state changes.

## Durable layout

- `PROGRAM_STATE.json` — machine source of current phase, task, release, block, retry, review, and next-action truth.
- `program/PHASE_DAG.v1.json` — exact sequential DAG and sparse review checkpoints.
- `phases/<phase>/PHASE_CONTRACT.v1.json` — only the active phase contract.
- `schemas/v1/governor.schema.json` — versioned contracts.
- `migrations/` — deterministic state migrations; migration 001 initializes schema v1.
- `tasks/`, `results/`, `checkpoints/`, `incidents/`, `releases/` — immutable or versioned program records.
- `events/EVENTS.jsonl` — append-only event chain. Every event includes the prior hash, payload digest, event digest, and restart state snapshot.
- `runtime/advance.lock` — short-lived local advancement lock. It is ignored by Git and can be replaced only after its declared expiry.
- `pro-review/<checkpoint-id>/` — owner-invoked GPT-5.6 Pro review packets. The Governor never invokes or automates the review conversation.

## One-writer and recovery behavior

Governor events explicitly mark tenant, organization, and business as `null` for this repository-global control plane. Each transition also binds the declared Sol Extra High actor, a deterministic request/idempotency key, prior and resulting state versions, a transition-evidence digest, timestamp, and exact active release SHA. These fields distinguish global development governance from product-runtime tenant data without inventing tenant identifiers.

Each mutation first acquires `runtime/advance.lock` with atomic create semantics. A claimed TaskPacket also records its module/file scope in a durable lease. A second writer receives the current owner, scope, and expiry. When a process disappears, `resume` verifies the complete event chain, reconstructs state from the last event if a crash separated event and state writes, expires stale ownership, and returns the same TaskPacket without duplicating it.

Before usage or context limits, create a `SessionCheckpoint` containing branch, worktree, commit, changed files, tests, unresolved failures, deployment state, blockers, rollback point, and the exact next action. TaskPacket usage budgets reserve release-repair capacity and expose a deterministic checkpoint threshold through `status --tokens-remaining <n>`.

## Review boundary

Only Phases 199, 212, 275, 420, 580, and 590 wait by default. A routine phase proceeds without review unless one of the six declared conditional triggers is durably recorded with evidence. Review packets contain committed source, test, deployment, migration, risk, alternative, and requested-decision evidence. Verdicts are owner-attested and commit-bound. They cannot override a failed deterministic test, deployment, migration, authenticated smoke, or production readback gate.

Each review request also binds per-path diff evidence to its exact base and head commits. `EVIDENCE_INDEX.json` fingerprints the request and each review section so a restart or later review cannot silently substitute different evidence.

## Verification

Run `pnpm test:phase196`. The suite covers initialization, DAG enforcement, authorization, dual-writer contention, lease expiry, checkpoints, restart reconstruction, event tampering, retry and stagnation stops, context selection, sparse review policy, verdict gate supremacy, CLI recovery without external model credentials, and routine phase advancement.

Run `pnpm test:phase197` for the deterministic release-controller gates. Phase 197 adds explicit `PRODUCT` and `CONTROL_WEBSITE` repository adapters, exact-origin/main worktree creation, coherent-commit and protected-check enforcement, low/medium/high/critical release paths, migration/backup policy, exact-SHA deployment evidence, authenticated smoke and state reconciliation, production health thresholds, hashed evidence bundles, and bounded provider rollback with incident containment. The controller calls existing Git, GitHub, Vercel, Railway, database, and CI boundaries; it does not store credentials or replace those providers.

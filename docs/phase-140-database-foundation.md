# Phase 140 database foundation

## Scope

Phase 140 installs only canonical migrations 040 through 042. Later AI memory,
evidence, metrics, immutable audit/outbox, row-level security, grants, and
canonical taxonomy seed work remains behind its numbered phase gate.

The repository-native migration order is:

1. `20260725004000_phase_140_extensions_and_types`
2. `20260725004100_phase_140_identity_hierarchy_and_business`
3. `20260725004200_phase_140_missions_governance_and_tools`

Each migration is transaction-wrapped so interrupted DDL rolls back before a
forward correction or retry.

## Canonical state boundary

PostgreSQL schema `entral` is the system of record for:

- application identities and scope grants;
- ENTRAL, Marshal, General, Commander, and Soldier hierarchy;
- one-to-one Commander/business ownership and inherited Soldier business scope;
- business profile, state, and financial snapshots;
- model, prompt, policy, authority, tool, credential-reference, and tool-grant
  records;
- missions, tasks, schedules, idempotency keys, operational messages, and
  governance actions.

Redis, browser state, process memory, files, and the existing Command OS snapshot
are not canonical stores for these Phase 140 records.

## Repository and API integration

`CanonicalControlPlaneRepository` performs PostgreSQL reads and writes through
Prisma transactions and raw parameterized SQL. It provides:

- hierarchy reads;
- business list and single-record reads;
- idempotent governance-action proposal creation with authenticated Human or
  internal ENTRAL identity, exact target/business scope, action-policy
  compatibility, and expected-version checks;
- a non-HTTP optimistic entity-status update primitive used to verify
  concurrent conflict behavior.

The internal Admin API exposes:

- `GET /api/v1/control-plane/hierarchy`
- `GET /api/v1/control-plane/businesses`
- `GET /api/v1/control-plane/businesses/{businessId}`
- `POST /api/v1/control-plane/governance-actions`

The POST endpoint accepts authenticated Human actions only. ENTRAL-originated
actions must enter through the internal action service; a request body cannot
assert ENTRAL authority.

## Package corrections proved by execution

The repository copies preserve the supplied schema while correcting defects
found during PostgreSQL and integration execution:

- credential metadata stores `secret_reference`, never a secret value;
- `current_actor_kind()` resolves its enum under an explicit safe search path;
- only active Human-authority users participate in the Human/ENTRAL message
  boundary;
- SYSTEM cannot initiate a sovereign governance action;
- General reparenting cannot leave governed businesses under a different
  Marshal;
- governance proposals persist `expected_version` for deterministic conflict
  evidence.

## Gate verification

Run with a disposable PostgreSQL 16+ server:

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres:<password>@127.0.0.1:<port>/<database>"
$env:RUN_POSTGRES_INTEGRATION = "1"
corepack pnpm --filter @entral/backend exec vitest run tests/canonicalControlPlanePostgres.integration.test.ts
```

The integration test creates and drops its own database and verifies clean
migration, every parent-role combination, the one-ENTRAL invariant,
Commander/business ownership, Soldier inheritance, all adjacent and rejected
operational routes, all governance target categories, lifecycle transitions,
idempotent replay, stale and concurrent expected-version conflicts, canonical
read APIs, and persistence after a new client process boundary.

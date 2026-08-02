# Phase 202 ownership reconciliation

This runbook is the committed repair-plan authority for the Phase 202 migration of legacy user-scoped customer records. It records, but does not guess or silently rewrite, ownership. The schema migration and its source-specific triggers perform the approved mapping; this runner independently measures the live result and persists an append-only, server-hashed receipt.

## Release invariant

Customer release remains blocked until all of the following are true for one unchanged live source inventory hash:

1. a clean `APPLY` receipt exists;
2. a later, separately invoked `AUDIT` binds the exact retained APPLY receipt hash;
3. both receipts have `sourceRows == mappedRows` and zero duplicate, ambiguous, and missing rows;
4. the live ownership blocker function reports no source-side, sidecar, reverse-orphan, unknown-source, or canonical-boundary issue; and
5. the database release-blocker view is empty after the other Phase 202 credential gates pass.

`scripts/phase202-ownership-reconcile.mjs` uses a serializable database transaction. It reads `entral.phase202_live_source_inventory_hash()` before and after measurement, derives exact counts independently, compares clean/failing status with `entral.phase202_live_ownership_blockers()`, and creates `OwnershipReconciliationRun.receiptHash` only through the server function `entral.phase202_reconciliation_hash(...)`.

## Count definitions

- `sourceRows`: every applicable row in the 41 committed customer source models derived from the exact 74-model ledger in `docs/PHASE_202_MODEL_SCOPE_LEDGER.json`. For mixed-scope `AuditLog`, only `TENANT` and release-blocking `UNRESOLVED` rows are applicable; personal and platform evidence remains explicitly classified outside the tenant sidecar.
- `mappedRows`: source rows with complete organization, tenant, actor, creator, and owner authority plus exactly one sidecar row whose complete ownership tuple matches. Nullable business ownership is compared with null-safe equality.
- `missingRows`: source rows with an incomplete required authority tuple or no sidecar row. A source row is counted once even if more than one required value is absent.
- `duplicateRows`: excess source-key rows plus excess sidecar rows for the same `(sourceTable, sourceRecordId)`. Database uniqueness should make this zero; the independent check remains fail closed.
- `ambiguousRows`: source rows whose sidecar exists but does not resolve to exactly one matching tuple, every `UNRESOLVED` AuditLog row, plus reverse-orphan sidecars, sidecars naming an unknown source table, and invalid canonical business-boundary mappings.

The machine receipt also exposes the ambiguity components as `ambiguousSourceRows`, `reverseOrphanRows`, `unknownSourceRows`, and `invalidCanonicalBoundaryRows`, along with per-table reverse-orphan counts. These fields contain counts and identifiers only; source payloads, credentials, connection strings, and secrets are never emitted.

Special mappings are deliberately explicit: `TeamMember` uses the composite `userId:teamId` record key; Tutorial rows resolve their legacy team identifier to the Team organization; Task uses `createdByActorId`; and member/Tutorial surfaces require a null business in the ownership sidecar.

## Production procedure

Run with the repository-required Node.js 20.19.0 binary. Use an approved migration/release database identity with access to the release-only functions and append-only reconciliation table. Do not use an API, worker, or audit-reader credential; runtime roles are intentionally denied this authority.

Set references from the exact accepted main commit. References must use lowercase `repository@40-character-commit:path` form. The rollback reference for this release is the certified Phase 198 manifest at `5c2f9d58c25dec82d4c3102f3b48a76797801594`.

```powershell
$acceptedSha = git rev-parse origin/main
$env:PHASE202_OWNERSHIP_DATABASE_URL = '<approved release-reconciliation PostgreSQL URL>'
$env:PHASE202_REPAIR_PLAN_REFERENCE = "mykai05/ENTRAL-0.2@$acceptedSha`:docs/PHASE_202_OWNERSHIP_RECONCILIATION.md"
$env:PHASE202_ROLLBACK_REFERENCE = 'mykai05/ENTRAL-0.2@5c2f9d58c25dec82d4c3102f3b48a76797801594:.entral/governor/releases/phase-198.json'
$env:PHASE202_OWNERSHIP_MODE = 'APPLY'
& 'C:\Users\malac\.cache\entral-node-v20.19.0\node-v20.19.0-win-x64\node.exe' scripts\phase202-ownership-reconcile.mjs > phase202-ownership-apply.json
```

The APPLY process must exit successfully and its JSON receipt must say `PASS`. Retain both `sourceInventoryHash` and `receiptHash`. End that process. Start a fresh command invocation for AUDIT and bind the retained APPLY hash:

```powershell
$apply = Get-Content -Raw phase202-ownership-apply.json | ConvertFrom-Json
$env:PHASE202_OWNERSHIP_MODE = 'AUDIT'
$env:PHASE202_PRIOR_APPLY_RECEIPT_HASH = $apply.receiptHash
& 'C:\Users\malac\.cache\entral-node-v20.19.0\node-v20.19.0-win-x64\node.exe' scripts\phase202-ownership-reconcile.mjs > phase202-ownership-audit.json
```

The AUDIT process refuses a missing, failing, different-inventory, or incorrectly supplied APPLY receipt. It must produce its own `PASS` receipt and a distinct `receiptHash`. Retain both committed release-evidence JSON files, then verify `SELECT * FROM entral.phase202_release_blockers;` through the approved release verifier. Remove the database URL from the process environment after evidence collection.

## Failure and repair behavior

A measured inconsistency is persisted as a server-hashed `FAIL` receipt and the process exits nonzero. An input, permission, schema, inventory-race, server-function disagreement, missing APPLY prerequisite, or database error produces a sanitized `ERROR` record and no certification claim. Database URLs and credential-shaped values are redacted from operational errors.

Do not edit a receipt, delete sidecar rows speculatively, assign a customer record to the only convenient tenant, or rerun AUDIT until the cause is understood. Repair source mappings only with a reviewed, source-backed migration or bounded repair packet that preserves the source identifiers and exact organization/tenant/business/actor tuple. Re-run APPLY after the repair and retain the old failing receipt as evidence; then start a fresh AUDIT.

Rollback means deploying the certified Phase 198 release and following its manifest. Because ownership receipts and authority records are append-only evidence, application rollback does not authorize destructive deletion of Phase 202 records. Any database reversal must be a separately approved, source-backed migration that proves customer records remain correctly attributable and recoverable.

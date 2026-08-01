# Phase 199 verification checkpoint

## Status

- Phase: 199 — Baseline Re-Certification, Legacy Isolation, and Production Truth Audit
- Current result: `WAITING_FOR_GPT_PRO_REVIEW` after the review packet is committed
- Certification: not yet permitted
- Phase 200: blocked
- Starting and current certified production main: `5c2f9d58c25dec82d4c3102f3b48a76797801594`
- Rollback release: Phase 197 at `fdabaea99400ed1e1dfcada2cd41a336ed0a193b`

## Bounded implementation

Phase 199 preserves the existing canonical architecture and closes three evidence-proven defects:

1. Production now requires `DATA_ENCRYPTION_KEY`, and secure JSON writes independently fail closed.
2. Production API startup now requires `ADMIN_MFA_CODE` for administrative step-up.
3. The in-memory development server now refuses to start under `NODE_ENV=production`.

The credential reconciliation command audits and atomically re-encrypts only the two credential-bearing columns wholly owned by the secure JSON layer: `ShopifyConnection.credentialJson` and `ShopifyOAuthContinuation.payloadJson`. It hashes row identities in receipts, emits no secret values, requires an explicit production-only apply mode, blocks invalid legacy JSON, and does not touch legacy plain-JSON columns.

## Candidate evidence

- `docs/evidence/phase199/PRECHANGE_REPOSITORY_AUDIT.json`
- `docs/evidence/phase199/TENANT_SCOPE_INVENTORY.json`
- `docs/evidence/phase199/PRODUCT_TRUTH_AUDIT.json`
- `docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json`
- `docs/evidence/phase199/TEST_RECEIPTS.json`

The candidate manifest binds the exact Phase 198 production release:

- Product main: `5c2f9d58c25dec82d4c3102f3b48a76797801594`
- Control website main: `8f1923fcec20a11dc0aef304c0e05827fe2cb5c5`
- Vercel frontend: `dpl_2mp6yMxeeFpSUTsRW9UbUnB6ai8u`
- Railway API: `43f98e05-af77-44f2-826c-5976fc738e4b`
- Railway worker: `b477d5c8-2a55-4e74-84b8-168e5f938fd8`
- Migration readback: 42 applied, zero pending, unfinished, or rolled back
- Authenticated smoke receipt: `f73e366e727ef7846f79f3757ae439c25de7249823c43805b478c2c38069c036`
- State readback receipt: `0986e544923576128fcd1fc04b9243f3310862a1b71e4fe36d2d76330b13b2d4`

## Deterministic verification

All commands used Node 20.19.0 and pnpm 9.12.3:

- `pnpm test:phase199` — passed 9 Node gates and 5 backend tests
- `pnpm test:phase198` — passed 15 tests
- `pnpm test:phase197` — passed 25 tests
- `pnpm test:phase196` — passed 27 tests
- `pnpm test:phase195` — passed 24 tests
- `pnpm contracts:verify` — passed 33 tests and reproducible build
- `pnpm prisma:generate` — passed
- `pnpm --filter @entral/backend build` — passed
- `pnpm lint` — passed
- `pnpm test` — passed the complete workspace suite, including 33 contract and 418 frontend tests
- `pnpm build` — passed the complete production build
- `pnpm release:check` — passed local readiness and current-production drift checks
- `git diff --check` — passed
- `governor verify` — passed

No security scan was run because the owner explicitly prohibited it. This does not bypass authorization, tenant, malformed-input, secret-isolation, or fail-closed acceptance tests.

## Mandatory review and remaining release gates

Checkpoint `P199-BASELINE-RECERTIFICATION-REVIEW` is mandatory before certification. The review must determine whether the requirement re-certification, legacy boundary, tenant Phase 202 inventory, production-truth conclusions, and bounded credential reconciliation are acceptable.

After an owner-attested commit-bound verdict, Codex must apply any binding corrections and rerun affected verification. Only then may it integrate to protected main, deploy the exact main SHA, run production credential reconciliation, verify migrations, perform authenticated production smoke and state readback, record the final ReleaseManifest and rollback point, certify Phase 199, and activate Phase 200.

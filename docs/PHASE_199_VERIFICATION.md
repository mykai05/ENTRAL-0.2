# Phase 199 binding-correction verification

## Status

- Phase: 199 - Baseline Re-Certification, Legacy Isolation, and Production Truth Audit
- Current result: owner-attested `PASS_WITH_BINDING_CORRECTIONS`; one bounded correction TaskPacket is active
- Certification: not yet permitted
- Phase 200: blocked
- Current certified production main: `5c2f9d58c25dec82d4c3102f3b48a76797801594`
- Required immediate rollback release for the final manifest: Phase 198 at `5c2f9d58c25dec82d4c3102f3b48a76797801594`
- Review checkpoint: `P199-BASELINE-RECERTIFICATION-REVIEW`
- Reviewed implementation commit: `f9bba0b275798664374b96630cc2c34a8d8ffe33`
- Complete review packet commit: `9331b6e37d5e8db114ffc5fc211df04482cfcb67`

## Bounded implementation

Phase 199 preserves the existing canonical architecture and closes three evidence-proven defects:

1. Production requires `DATA_ENCRYPTION_KEY`, and secure JSON writes independently fail closed.
2. Production API startup requires `ADMIN_MFA_CODE` for administrative step-up.
3. The in-memory development server refuses to start under `NODE_ENV=production`.

The committed source inventory accounts for all 60 Prisma JSON-string columns. It proves that the credential-bearing subset is exactly `ShopifyConnection.credentialJson` and `ShopifyOAuthContinuation.payloadJson`. The reconciliation command hashes row identities, emits no secret values, requires an explicit production-only APPLY mode, blocks invalid legacy JSON, and excludes unrelated generic, operational, scope-name, environment-variable-name, and legacy plain-JSON columns. Certification requires a retained APPLY receipt followed by a separate fresh AUDIT receipt showing zero plaintext and zero invalid rows for both targets.

`CERTIFIED` validation rejects `IMPLEMENTED_UNVERIFIED` and `PARTIAL` in addition to all previously blocking requirement states. Explicit negative tests cover both states.

## Evidence

- `docs/evidence/phase199/PRECHANGE_REPOSITORY_AUDIT.json`
- `docs/evidence/phase199/TENANT_SCOPE_INVENTORY.json`
- `docs/evidence/phase199/PRODUCT_TRUTH_AUDIT.json`
- `docs/evidence/phase199/BASELINE_CERTIFICATION_CANDIDATE.json`
- `docs/evidence/phase199/SECURE_JSON_COLUMN_INVENTORY.json`
- `docs/evidence/phase199/TEST_RECEIPTS.json`

The candidate manifest binds the exact certified Phase 198 production release:

- Product main: `5c2f9d58c25dec82d4c3102f3b48a76797801594`
- Control website main: `8f1923fcec20a11dc0aef304c0e05827fe2cb5c5`
- Vercel frontend: `dpl_2mp6yMxeeFpSUTsRW9UbUnB6ai8u`
- Railway API: `43f98e05-af77-44f2-826c-5976fc738e4b`
- Railway worker: `b477d5c8-2a55-4e74-84b8-168e5f938fd8`
- Migration readback: 42 applied, zero pending, unfinished, or rolled back
- Authenticated smoke receipt: `f73e366e727ef7846f79f3757ae439c25de7249823c43805b478c2c38069c036`
- State readback receipt: `0986e544923576128fcd1fc04b9243f3310862a1b71e4fe36d2d76330b13b2d4`

Every Phase 100-190 aggregate names its original completion gate and binds immutable `repository@commit:path` source, test, and release evidence. Machine-local paths are not certification evidence.

## Known limitations

1. Phase 202 owns explicit organization and business ownership migration for currently user-scoped customer records.
2. Tutorial and Academy progress is user-local browser state.
3. The embedded multipurpose 3D renderer remains a migration boundary behind canonical projection and shared view state.
4. Mobile Universe Graph refinement remains Phase 200 UX debt.
5. Administrative step-up temporarily uses static production `ADMIN_MFA_CODE`.
6. Checkout remains fail-closed and unavailable.

## Verification and release sequence

All commands use Node 20.19.0 and pnpm 9.12.3. The prior checkpoint suite passed `test:phase199`, Phases 198 through 195, contracts, Prisma generation, backend build, lint, the complete workspace tests and build, `release:check`, `git diff --check`, and Governor verification. Binding-correction rerun results are recorded in `TEST_RECEIPTS.json`.

No security scan is run because the owner explicitly prohibited it. This does not bypass the deterministic authorization, tenant, malformed-input, secret-isolation, or fail-closed tests.

The Governor ingested the owner-attested verdict and activated exactly one correction TaskPacket: `P199-BINDING-CORRECTIONS-001`. The four corrections may be marked complete only at their exact passed commit.

After the complete deterministic suite passes, Codex must reconcile and integrate protected main, push immediately, deploy the exact main SHA to Vercel frontend plus Railway API and worker, verify migrations, run credential APPLY and then a separate fresh AUDIT, perform authenticated production smoke and state readback, bind the release tag and verified Phase 198 rollback point, record the final ReleaseManifest, and certify Phase 199. Only after certification may the Governor activate Phase 200; this phase performs no Phase 200 implementation.

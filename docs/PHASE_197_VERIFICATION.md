# Phase 197 verification

Phase 197 extends the repository-local Governor with a deterministic release controller. It changes no customer product behavior. It formalizes the path from one bounded TaskPacket to protected main, exact-main-SHA production, authenticated state readback, a hashed evidence bundle, and a verified rollback point.

## Repository roles

- `PRODUCT`: `mykai05/ENTRAL-0.2`, the product source, database migrations, Vercel frontend, Railway API, and Railway worker.
- `CONTROL_WEBSITE`: `SovereignProtocol/sovereign-protocol-agent`, the Sovereign Protocol control and public-website repository.

Every Phase 197-or-later `ReleaseManifest` binds the exact main SHA and compatibility contract for both roles. A changed or incompatible counterpart blocks integration; an unchanged counterpart is still recorded at its observed main SHA.

## Controller sequence

1. Validate a versioned `ReleaseControlPlan` with both repositories, the coherent task commit, change profile, migrations, health thresholds, and rollback point.
2. Fetch each `origin/main`; create an isolated `codex/phase-<phase>` worktree only from the exact latest verified SHA.
3. Select targeted tests from changed paths while retaining the complete mandatory phase suite at the integration boundary.
4. Classify the release as low, medium, high, or critical. Medium requires staging; high adds backup/checkpoint and migration compatibility; critical adds failure injection or rollback rehearsal.
5. Reconcile with current main in a clean worktree and rerun affected checks.
6. Read required protected-main checks and merge only when every binding integration gate passes and the PR head equals the coherent task commit. The controller never uses admin bypass.
7. Apply and verify ordered migration fingerprints and the declared rollback, restore, or forward-repair strategy. High and critical data paths require backup/checkpoint evidence.
8. Verify frontend, API, and worker deployment IDs identify the exact pushed main SHA.
9. Run authenticated production smoke for every applicable changed surface, followed by state readback and side-effect reconciliation.
10. Enforce availability, error-rate, latency, worker, failed-job, and dead-letter thresholds.
11. Hash repositories, tests, status checks, migration evidence, deployments, live smoke, state reconciliation, health, rollback, and intentionally broken-deployment proof into one evidence bundle.
12. Certify only a zero-blocker `PASS`. A bounded failed release returns `ROLLBACK_REQUIRED`; uncertain integrity or failed rollback returns `INCIDENT_REQUIRED`. Neither path advances the phase.

Credentials remain in existing GitHub, Vercel, Railway, and database environments. Plans, evidence, logs, and bundles contain identifiers and hashes only.

## Mandatory local gate

Use Node `20.19.0` and pnpm `9.12.3`:

```powershell
pnpm test:phase197
pnpm test:phase196
pnpm test:phase195
pnpm contracts:verify
pnpm lint
pnpm test
pnpm build
pnpm release:check
```

After current `origin/main` reconciliation, rerun the complete list. From a clean detached checkout also run `pnpm install --frozen-lockfile`, `pnpm prisma:generate`, `pnpm test:phase197`, and `pnpm build`; fail if tracked sources change.

## Acceptance mapping

- F001-F003: explicit cross-repository adapters, exact verified-main worktrees, and coherent-commit integration gates.
- F004-F008: deterministic targeted/full-suite selection, risk classification, current-main reconciliation, required protected checks, and exact-head automatic merge.
- F009-F012: dual-repository manifest bindings, ordered migration fingerprints and compatibility, high-risk backup evidence, and exact-main-SHA deployments.
- F013-F019: applicable authenticated production smoke, state reconciliation, health thresholds, bounded rollback, incident containment, external secret boundaries, and hashed evidence bundles.
- F020-F023: low, medium, high, and critical release paths without unconditional ceremony.
- F024: deterministic broken-deployment tests prove rejection or rollback with `phase_advanced: false`.

## Live release gate

1. Push the bounded branch and merge through protected main after required checks pass.
2. Push main immediately and retain the exact accepted main SHA.
3. Deploy that exact main SHA to Vercel frontend and Railway API/worker.
4. Apply migrations or prove `NO_SCHEMA_CHANGE`; read production migration state back.
5. Run authenticated production smoke and state reconciliation; verify health thresholds.
6. Record deployment IDs, live URLs, cross-repository SHAs, bundle hash, and Phase 196 rollback point in the Phase 197 `ReleaseManifest`.
7. Certify Phase 197 only after production readback returns no blockers.
8. Activate Phase 198 only after Phase 197 is certified. Phase 197 has conditional GPT-5.6 Pro review policy and no trigger by default.

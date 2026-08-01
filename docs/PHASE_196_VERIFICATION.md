# Phase 196 verification

Phase 196 adds the lean repository-local ENTRAL Development Governor and sparse owner-invoked GPT-5.6 Pro review-packet gateway. It does not change user-visible application behavior or implement Phase 197.

## Prerequisite

Phase 195 is certified at `11058bffef238c1c7f917b2ea5bb3ff93800d35e`, tag `phase-195`, immutable manifest SHA-256 `26a1e81bc99b8f6f1f2edb925e55474d78533f343d7726e07d33d8ba83917138`, production gate `PASSED`, and zero blockers. `.entral/governor/releases/phase-195.json` retains the repository-owned prerequisite reference.

## Mandatory local gate

```powershell
pnpm test:phase196
pnpm test:phase195
pnpm contracts:verify
pnpm lint
pnpm test
pnpm build
pnpm release:check
```

After reconciling the candidate with current `origin/main`, rerun the complete list. Phase 196 cannot close on a branch, preview, open pull request, or undeployed commit.

## Clean-checkout gate

From a detached clean checkout, use Node `20.19.0` and pnpm `9.12.3`, then run:

```powershell
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm test:phase196
pnpm build
```

Prisma generation is an explicit build prerequisite and is also ordered before lint, tests, and build in protected-main CI. The clean-checkout gate fails if any tracked file changes.

## Acceptance mapping

- F001–F006: `.entral/governor/` owns schemas, migration, documentation, state, and the deterministic CLI command set.
- F007–F012: atomic advancement locks, durable scoped leases, one active phase/task, Git-owned state, event reconstruction, and single-process architecture. Every transition carries repository-global null tenancy fields plus actor, idempotency, before/after version, evidence digest, timestamp, and release SHA.
- F013–F019: bounded context compilation, no-overengineering validation, usage-aware checkpoints, retry/wall-time/attempt/stagnation stops, typed owner escalation, chained events, and generated status.
- F020–F022: no external coding model or chat automation dependency, process-loss recovery without duplicate work, and exact startup instructions.
- F023–F027: versioned review request/verdict contracts with exact per-path diff fingerprints, sparse checkpoint policy, evidence-triggered review, durable waiting, deterministic-gate supremacy, and operation without an always-on GPT manager.

## Release gate

1. Merge through protected main and push immediately.
2. Wait for the exact main CI SHA to pass.
3. Deploy the exact main SHA to Vercel and both Railway roles.
4. Run `pnpm prisma:deploy` against production and retain the no-change or applied-migration readback.
5. Run authenticated production smoke and exact state readback without request interception.
6. Record `.entral/governor/releases/phase-196.json` with the exact CI, deployments, migration readback, authenticated smoke, production SHA, and rollback reference.
7. Run `pnpm governor certify-phase --manifest .entral/governor/releases/phase-196.json --session-id <stable-session-id>` and commit the resulting event/state update.
8. Activate Phase 197 only after the certified release record is on main and production.

Phase 196 review policy is conditional. No checkpoint is required unless a declared trigger is recorded with evidence.

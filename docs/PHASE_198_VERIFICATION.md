# Phase 198 verification

Phase 198 adds a repository-owned evidence queue to the existing Development Governor. It does not add a product runtime, project-management suite, model router, background agent, or customer-facing placeholder.

## Acceptance behavior

- Candidate intake normalizes all eleven declared evidence sources and six work categories into strict `ImprovementCandidate` records.
- Signals sharing a root cause, capability, and affected scope merge into one durable candidate while retaining each evidence lineage record.
- Ranking uses value, confidence, urgency, customer, security, revenue, and cost impact, effort, and risk.
- Automatic task proposals require low risk, full reversibility, deterministic tests, available active budget, preserved emergency reserve, no owner-review topic, no product definition, and no Governor-control scope.
- Material changes create versioned `PhaseAmendment` proposals. Only an owner-attested accepted version can update the target phase DAG and contract ledger; applying it records affected contracts, acceptance criteria, commercial unlock, supersession, and a mandatory conditional-review trigger.
- Quiet periods, stop conditions, value thresholds, active-count limits, rejected/deferred states, invalid-evidence closure, removed-root-cause closure, concise backlog output, full evidence output, and exact-production-SHA outcome measurement are deterministic and persisted.

## Required local and CI suite

Run these commands from a clean checkout after reconciliation with current `origin/main`:

```text
pnpm test:phase198
pnpm test:phase197
pnpm test:phase196
pnpm test:phase195
pnpm contracts:verify
pnpm lint
pnpm test
pnpm build
pnpm release:check
```

CI retains `test-results/phase198/**`. A phase is not complete from local test success: protected-main checks, immediate main push, exact-main-SHA production deployments, migration verification, authenticated smoke, state readback, health evidence, rollback point, and the committed ReleaseManifest remain mandatory.

## Operator commands

Use `improvement-intake`, `improvement-cycle`, `improvement-backlog`, `improvement-show`, `improvement-decide`, `improvement-measure`, and `improvement-apply-amendment` through `pnpm governor`. Mutations require the sole execution actor `CODEX_5_6_SOL_XHIGH`, a stable session ID, and compatibility with any active write lease. JSON input documents remain repository-bound and secret-scanned by the Governor contract validator.

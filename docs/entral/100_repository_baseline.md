# Phase 100 repository baseline

**Gate:** 100
**Baseline date:** 2026-07-25
**Repository:** `mykai05/ENTRAL-0.2`
**Reference revision:** `62f4cc4167583e6e0a87cd209a6f63dd5ca0e891` (`origin/main` before this record was added)
**Record status:** Retrospective completion record. It describes the repository after Phases 100-160 were implemented and identifies the boundaries that the ordered later phases still own.

## Evidence scope

This baseline was produced from the connected repository, not from assumed paths. The review covered:

- Git status, branch history, and the Phase 100-160 merge chain;
- root, frontend, backend, contracts, Prisma, scripts, tests, CI, and deployment configuration;
- current internal and member routes;
- environment-variable and secret-reference handling;
- PostgreSQL, Redis, Vercel, and Railway deployment boundaries;
- the legacy Command OS snapshot/browser-recovery path and the canonical `entral` schema;
- the six committed Phase 110 desktop and phone captures.

The phase packets are instruction material only. They are not copied into the product tree.

## Repository and branch state

The repository is a pnpm workspace with one deployable frontend and one backend package. The backend supplies both API and worker entry points.

| Area | Current path | Current responsibility |
|---|---|---|
| Workspace orchestration | `package.json`, `pnpm-workspace.yaml`, `scripts/` | Install, build, test, release, migration, seed, and invariant commands |
| Web application | `frontend/` | Next.js UI, member boundary, server-side member session loading, same-origin production API proxy |
| API/control service | `backend/src/index.ts`, `backend/src/server.ts`, `backend/src/routes/` | Fastify API, authentication, legacy product routes, canonical control-plane routes |
| Worker | `backend/src/worker.ts`, `backend/src/services/canonicalOutboxWorker.ts` | Canonical outbox dispatch and background work |
| Shared contracts | `packages/contracts/` | Versioned domain, validation, member, integration, personality, OpenAPI, and policy contracts |
| Canonical database | `prisma/migrations/20260725004000_*` through `20260725004500_*` | PostgreSQL `entral` schema, constraints, RLS, audit, events, and outbox |
| Deterministic taxonomy | `prisma/seeds/047_canonical_taxonomy.v1.json`, `prisma/seeds/048_canonical_hierarchy.sql` | One ENTRAL, eight Marshals, and 123 General templates |
| Acceptance evidence | `backend/tests/`, `frontend/tests/`, `scripts/`, `prisma/acceptance/`, `docs/` | Unit, integration, invariant, build, release, and operational runbooks |
| CI/CD | `.github/workflows/ci-cd.yml` | PostgreSQL-backed verification and optional Vercel deployment |
| Hosting configuration | `vercel.json`, `railway.json`, `railway.worker.json` | Vercel frontend; separate Railway API and worker processes |

The Phase 100-160 merge chain on `main` is:

- PR 18 and PR 19: reconciled Phase 100/110 release;
- PR 20: Phase 130 shared contracts;
- PR 21: Phase 140 database foundation;
- PR 22 and PR 23: Phase 150 intelligence, integrity, access, and member API proxy correction;
- PR 24: Phase 160 deterministic canonical taxonomy.

The original primary local checkout contains preserved user-owned commits and untracked screenshots. Remediation work therefore uses an isolated worktree and does not reset, delete, or absorb those unrelated files.

## Viable stack

| Layer | Technology | Locked use |
|---|---|---|
| Runtime | Node.js 20.19.0, TypeScript 5.6 | Shared runtime for frontend tooling, API, worker, contracts, and scripts |
| Package management | pnpm 9.12.3 | One frozen workspace lockfile |
| Web | Next.js 15.5, React 19 | Responsive server/client UI and production proxy |
| API | Fastify 5 | Typed HTTP boundary, cookies, CORS, rate limits, and security headers |
| Database | PostgreSQL 18, Prisma 5.22 | PostgreSQL is canonical; Prisma manages the legacy public schema and migration execution |
| Queue/cache | Redis, BullMQ | Ephemeral queue, leases, rate limits, and cache only |
| Contracts | TypeScript plus runtime validators and OpenAPI | One importable contract package |
| Test | Vitest, Node test runner, Testing Library, Playwright-core | Unit, component, PostgreSQL integration, invariant, and browser smoke coverage |
| Frontend hosting | Vercel | Production Next.js deployment |
| API/worker hosting | Railway | Separately configured API and worker services |

There is no Dockerfile or Compose file in this repository. Railway uses RAILPACK. Local PostgreSQL and Redis are environment inputs.

## Startup and command list

All commands run from the repository root unless noted.

| Purpose | Exact command |
|---|---|
| Install | `pnpm install --frozen-lockfile` |
| Generate Prisma client | `pnpm prisma:generate` |
| Start local combined development stack | `pnpm dev` |
| Start frontend only | `pnpm dev:frontend` |
| Start in-memory development API | `pnpm dev:backend` |
| Start database-backed API | `pnpm dev:backend:real` |
| Build all workspaces | `pnpm build` |
| Type/lint all workspaces | `pnpm lint` |
| Run all workspace tests | `pnpm test` |
| Verify shared contracts | `pnpm contracts:verify` |
| Run browser smoke suite | `pnpm test:e2e` |
| Run release-positioning checks | `pnpm test:release-positioning` |
| Run Phase 160 deterministic tests | `pnpm test:phase160` |
| Run release-readiness checks | `pnpm release:check` |
| Deploy migrations | `pnpm prisma:deploy` |
| Apply database roles/grants | `pnpm prisma:roles` |
| Seed canonical taxonomy | `pnpm prisma:seed` |
| Verify canonical invariants | `pnpm prisma:invariants` |
| Rebuild disposable canonical database | `pnpm prisma:reset:seed` |

PostgreSQL integration tests require `RUN_POSTGRES_INTEGRATION=1` and an isolated `TEST_DATABASE_URL`. Destructive reset/seed commands are for an explicitly selected disposable or approved target only.

## Current route map

### Web destinations

Internal routes include `/dashboard`, `/graph`, and `/infrastructure`, plus bounded administrative and operational sections. Authenticated member routes include:

- `/member/dashboard`;
- `/member/graph`;
- `/member/infrastructure`;
- `/member/sign-in`;
- `/member/verify-email`;
- `/member/password-reset`.

The member pages load the authenticated organization list on the server before rendering. Production member API calls are proxied through the `/member/api/v1` namespace.

### API entry points

`backend/src/server.ts` registers:

- authentication and account routes;
- member organization and approved workspace routes;
- tasks, agents, automations, conversations, AI, commerce, and operations routes;
- legacy Command OS snapshot routes;
- canonical control-plane hierarchy, business, and governance-action routes;
- health and operational-monitoring routes.

Canonical control-plane requests pass through `backend/src/db.ts` and `backend/src/services/canonicalControlPlane.ts`. Member tokens are not accepted by internal administrative routes.

## State and source-of-truth inventory

### Accepted canonical state

PostgreSQL tables in the `entral` schema are the only accepted source of truth for new hierarchy, business, mission, governance, tool, AI, memory, evidence, metric, audit, event, outbox, snapshot, and read-model work. Material canonical writes must use a bound database session and the governed transaction boundary.

### Existing transitional state

The repository still contains pre-canonical `public`-schema Prisma models, including `CommandOSSnapshot`, `MemberWorkspaceSnapshot`, users, teams, tasks, conversations, agents, automations, and commerce records. The current consolidated command-center client can also recover presentation state from user-scoped browser storage.

These stores are documented transitional inputs, not alternative canonical authorities:

- browser storage is recovery/presentation state only;
- `CommandOSSnapshot` is a legacy per-user snapshot and cannot become the Phase 130+ hierarchy owner;
- `MemberWorkspaceSnapshot` is an explicitly published, encrypted member projection;
- the in-memory development server is test/development infrastructure only;
- Redis is disposable and cannot own business or command state.

Phase 170 owns the typed canonical UI clients and read-model connection. This Phase 100 record does not pre-implement that later gate.

## Environment, credentials, and deployment boundaries

- `.env.example` contains names and safe placeholders only.
- Database logins are separated by API, worker, verifier, and audit purpose in the production database role model.
- Secrets are referenced through environment variables; secret values do not belong in source, canonical payloads, events, prompts, or client bundles.
- External providers remain non-executable until credential owner, business scope, adapter/API version, exact operations, and live acceptance evidence exist.
- Microsoft services are not required for core login, state, memory, missions, scheduling, audit, database, queue, or deployment.

## Baseline findings

1. The viable stack is a modular TypeScript monorepo and should be preserved.
2. PostgreSQL and the `entral` schema are the canonical foundation. Redis, browser storage, semantic indexes, and development memory are non-authoritative.
3. The legacy Command OS and public-schema product models coexist with the new canonical schema. New code must not extend them as a second hierarchy or business system of record.
4. The Phase 110 UI is consolidated and honestly displays empty/unavailable states, but its canonical data client is deliberately assigned to Phase 170.
5. No core Microsoft dependency was found. Outlook entries in the tool registry are inactive placeholders and are not a core runtime requirement.
6. Production is split across Vercel and Railway. Repository publication, CI success, provider deployment, and live health are separate evidence gates.

## Blocker ledger

Only genuine external boundaries or architecture conflicts are listed.

| Boundary | Type | Current disposition |
|---|---|---|
| Consolidated member UI still reads the legacy Command OS snapshot/browser recovery path rather than canonical Phase 140-160 read models | Ordered architecture boundary | Must be resolved by Phase 170; it does not invalidate the database gates, but canonical UI synchronization cannot be claimed before that phase |
| External provider credentials and per-operation live acceptance evidence are not present for broad catalog integrations | External credential/account boundary | Providers remain catalogued or inactive; no Soldier grant or live capability may be claimed |
| Production backup/PITR, object-storage retention, and clean-environment release evidence are provider controls outside the current code-only gates | External infrastructure/release boundary | Must be demonstrated in the later deployment and final-acceptance phases |
| Canonical production data currently contains taxonomy records but no fabricated business/Commander records | Honest data boundary | Not a defect; UI and APIs must preserve an explicit empty business state until a real governed business is created |

No blocker in this ledger authorizes bypassing a phase gate or weakening authentication, RLS, evidence, transaction, or provider controls.

## Gate 100 conclusion

The repository baseline, exact command list, stack map, source-of-truth inventory, and blocker ledger are now recorded. The permanent architecture lock is in `docs/entral/101_architecture_lock.md`.

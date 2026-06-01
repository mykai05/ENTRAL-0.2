# ENTRAL Tomorrow Start Here

Date: 2026-05-31

## Current Project Status

ENTRAL is in a clean v0.3 checkpoint state with the v0.4 AI Brain / Connection Layer foundation now being added on top.

The official hierarchy remains:

`ENTRAL -> Marshal -> General -> Commander -> Soldier`

The current working tree contains completed step 6-9 work from the v0.3 plan:

- Step 6: simplification/access audits and safe clarity fixes.
- Step 7: hierarchy integrity, terminology, inspector/report, backend persistence, and docs polish.
- Step 8: validation, documentation, and checkpoint update.
- Step 9: cleanup and final verification gate, since the written plan only numbers steps 1-8.

Current v0.4 state:

- AI Brain classifiers now create intent, risk, tool, entity, authorization, and audit metadata.
- v0.4.1 adds a backend-only OpenAI provider interface for real AI routing.
- `OPENAI_API_KEY` stays server-side only; missing keys produce `AI Provider Not Connected` and continue in Mock Mode.
- Provider JSON classification/action plans are validated and merged with deterministic safety checks.
- AI chat and screen routes now write provider-aware audit metadata.
- Dashboard command console shows the latest AI Brain interpretation.
- External/high-risk requests are routed to authorization before mock execution.
- Connection Center is available in the dashboard `Tools` tab.
- Backend exposes authenticated connection registry/test/mock routes; OpenAI tests can verify the provider when a backend key exists.
- v0.4.2 adds backend-only GitHub and Vercel read-only status checks.
- GitHub status uses `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO`.
- Vercel status uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
- GitHub/Vercel write actions are explicitly refused: no push, commit, merge, branch deletion, deployment trigger, rollback, or Vercel setting mutation.
- Connection Center now includes a Development Status panel for GitHub, Vercel, and overall pipeline health.
- GitHub/Vercel status checks create low-risk audit records.
- Real external actions are still not implemented. Mock mode and approval gates are the intended safety boundary.

## What Was Completed

- Added backend Command OS persistence with `CommandOSSnapshot` and `CommandOSReport`.
- Added `/api/v1/command-os/state` GET/PUT routes for authenticated snapshot sync.
- Added memory-backend support for Command OS state sync during local development.
- Added Command OS snapshot/report Zod schemas and focused persistence tests.
- Added Prisma migration for Command OS snapshot/report tables.
- Updated dashboard persistence so signed-in users sync validated Command OS state to the backend while keeping local-first behavior.
- Deduplicated report records extracted from entities and tasks before backend storage.
- Updated ENTRAL/OpenAI command persona context to include the Marshal layer and ENTRAL-only first state.
- Cleaned remaining user-facing wording where "local Command Center" implied a less durable system.
- Reorganized the right-side ENTRAL Command panel into clearer `Talk`, `Build`, `Graph`, and `Tools` sections.
- Made the command panel wider and more usable on desktop.
- Made the mobile command panel full-height enough for its content, with reachable tabs and sticky command input.
- Updated architecture/protocol/entity docs to describe backend-backed Command OS snapshot/report sync.
- Updated v0.3 audit docs to reflect the current persistence and access state.

## Files Changed

- `COMMAND_OS_ARCHITECTURE.md`
- `COMMAND_PROTOCOL.md`
- `ENTITY_SCHEMA.md`
- `ENTRAL_TOMORROW_START_HERE.md`
- `ENTRAL_V0_3_AUDIT.md`
- `ENTRAL_V0_3_EXECUTION_PLAN.md`
- `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`
- `backend/src/dev-memory-server.ts`
- `backend/src/schemas.ts`
- `backend/src/server.ts`
- `backend/src/services/openaiService.ts`
- `backend/tests/schemas.test.ts`
- `frontend/app/globals.css`
- `frontend/components/NeuronsCommandCenter.tsx`
- `frontend/lib/command-authorization.ts`
- `frontend/lib/command-os.ts`
- `frontend/tests/CommandAuthorization.test.ts`
- `frontend/lib/ai-brain.ts`
- `frontend/lib/tool-registry.ts`
- `frontend/components/ConnectionCenter.tsx`
- `frontend/tests/AiBrain.test.ts`
- `frontend/tests/ToolRegistry.test.ts`
- `backend/src/routes/connections.ts`
- `backend/src/services/aiBrain.ts`
- `backend/src/services/toolRegistry.ts`
- `backend/src/services/aiProvider.ts`
- `backend/tests/aiBrain.test.ts`
- `backend/tests/aiProvider.test.ts`
- `backend/tests/toolRegistry.test.ts`
- `backend/src/services/developmentConnections.ts`
- `backend/tests/developmentConnections.test.ts`
- `ENTRAL_AI_ARCHITECTURE.md`
- `ENTRAL_CONNECTIONS.md`
- `ENTRAL_TOOL_REGISTRY.md`
- `ENTRAL_SECURITY_AND_AUTHORIZATION.md`
- `prisma/schema.prisma`

## Files Created

- `backend/src/routes/commandOS.ts`
- `backend/src/services/aiProvider.ts`
- `backend/src/services/developmentConnections.ts`
- `backend/src/services/commandOSPersistence.ts`
- `backend/tests/aiProvider.test.ts`
- `backend/tests/developmentConnections.test.ts`
- `backend/tests/commandOSPersistence.test.ts`
- `prisma/migrations/20260530093000_add_command_os_persistence/migration.sql`

## Checks Passed

- Prisma generate: passed.
- Frontend lint/typecheck: passed.
- Backend lint/typecheck: passed.
- Frontend tests: 18 files, 70 tests passed.
- Backend tests: 10 files, 37 tests passed.
- Frontend production build: passed.
- Backend production build: passed.
- `git diff --check`: passed.
- v0.4 frontend lint/typecheck: passed.
- v0.4 backend lint/typecheck: passed.
- v0.4 frontend tests: 22 files, 100 tests passed.
- v0.4 backend tests: 12 files, 43 tests passed.
- v0.4 frontend production build: passed.
- v0.4 backend production build: passed.
- Local smoke check: `/dashboard` redirects unauthenticated users to `/login`, `/login` returns `200`, and memory backend `/health` returns `{"mode":"memory","ok":true}`.

v0.4.1 checks should be rerun after the provider integration commit:

- Backend lint/typecheck
- Frontend lint/typecheck
- Backend tests
- Frontend tests
- Backend and frontend production build

v0.4.2 checks run during implementation:

- Backend lint/typecheck: passed.
- Backend tests: 14 files, 55 tests passed.
- Frontend lint/typecheck: passed.
- Frontend tests: 22 files, 100 tests passed.

Known warning:

- Local shell is running Node `v22.20.0`; the project target remains Node `20.19.0`. All checks passed despite the local version warning.

## Current Known Risks

- `NeuronsCommandCenter.tsx` is still a large integration component. It should be split carefully later, not during a stability pass.
- Command execution routing is still mostly inside the dashboard component, although helpers now cover intent, action planning, creation, suggestions, authorization, reports, and recovery.
- Command OS backend persistence is snapshot-based. This is durable enough for v0.3 state sync, but not yet a normalized entity/task/report database model.
- The right command panel now fits better statically and builds cleanly, but browser automation for final screenshots was blocked by the local browser-control layer. Manual mobile/browser QA should still happen before a release claim.
- Existing user localStorage is intentionally preserved, so returning users may still see older saved structures.
- External execution, publishing, client contact, and real autonomous business operations remain intentionally out of scope.
- OpenAI is the only real provider target in v0.4.1. All other tools remain mock/future integrations.
- GitHub and Vercel are read-only status integrations only. They intentionally cannot perform writes.

## Recommended Next Step

Run the full v0.4.2 recursive build, commit the GitHub/Vercel read-only integration, push, and redeploy frontend/backend so the public app receives development pipeline visibility.

Suggested next Codex prompt:

`Run the v0.4.2 verification checks, commit and push the GitHub/Vercel read-only development connection integration, then verify Connection Center and deployment health.`

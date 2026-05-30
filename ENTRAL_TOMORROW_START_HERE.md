# ENTRAL Tomorrow Start Here

Date: 2026-05-29

## 1. Current Project Status

ENTRAL is in a working, buildable state after the nightly maintenance pass.

The active Command OS direction is:

ENTRAL -> Marshal -> General -> Commander -> Soldier

The dashboard uses a local Command OS state layer with validation, hydration repair, hierarchy migration, task repair, and local persistence. The UI currently seeds Merch Marshal -> ENTRAL General -> Merch Commanders -> Merch Soldiers.

The working tree is intentionally not clean. There are many uncommitted source changes and many generated `frontend/.next-dev` changes from local dev runs. Nothing was discarded.

## 2. What Was Cleaned Tonight

- Added `.next-dev` to `.gitignore` so future Next dev-server output is ignored.
- Removed visible stale "Emperor" wording from docs, dashboard labels, fallback group names, and AI system prompts.
- Kept the internal `emperor` node type intact to avoid a risky broad state migration tonight.
- Updated command-center wording to "ENTRAL / Central Command" and "ENTRAL Overview."
- Tightened Command OS state validation so node ancestry fields are refreshed after repair or reassignment:
  - `parentMarshalId`
  - `parentMarshalName`
  - `parentGeneralId`
  - `parentGeneralName`
  - `parentCommanderId`
  - `parentCommanderName`
- Added a focused test assertion to verify moved Soldiers keep correct Commander, General, and Marshal ancestry.
- Re-scanned for stale terms:
  - No `Enterprise`
  - No old ARIS/VANTA/MERCURY/ORION/HELIX defaults
  - No visible `Emperor` wording
  - No `Mock General`, `Mock Commander`, or `Mock Soldier`
- Confirmed no OpenAI API key is committed.

## 3. Checks Passed

- `pnpm --recursive lint`
  - Backend TypeScript passed.
  - Frontend TypeScript passed.
- `pnpm --recursive test`
  - Backend: 9 files, 34 tests passed.
  - Frontend: 10 files, 38 tests passed.
- `pnpm --recursive build`
  - Backend build passed.
  - Frontend Next production build passed.
  - Dashboard route built successfully.

## 4. Checks Failed

No lint, test, or build command failed.

Known warning:

- The repo expects Node `20.19.0`, but the current shell is using Node `v22.20.0`. The checks still passed, but use Node 20.19.0 for the cleanest release validation.

## 5. Known Issues

- `frontend/.next-dev` has many tracked generated files. `.gitignore` now ignores future `.next-dev` output, but 348 files under `frontend/.next-dev` are already tracked by Git and still need a deliberate cleanup decision.
- [frontend/components/NeuronsGraph.tsx](</C:/Users/malac/Documents/ENTRAL 2/frontend/components/NeuronsGraph.tsx>) is deleted and no active import was found. Review before committing.
- There are duplicate-ish launch scripts:
  - `wake-entral.cmd`
  - `Wake ENTRAL.cmd`
  - `start-entral.cmd`
  - `start-entral-full.cmd`
  - `scripts/wake-entral.ps1`
  - `scripts/run-frontend-dev.cmd`
  Keep them for now until the preferred startup path is confirmed.
- The dashboard Command OS state is still browser-local persistence. That is acceptable for the current structural stage, but not final production persistence.
- The internal node type is still named `emperor`. It is intentionally preserved for stability. User-facing language now says ENTRAL or Central Command.

## 6. Next Recommended Step

Start tomorrow by deciding how to clean tracked generated output:

1. Confirm whether `frontend/.next-dev` should be removed from source control.
2. If yes, remove it from the index in a dedicated cleanup commit without touching user source changes.
3. Then continue the Marshal Command Layer persistence work.

## 7. Files That Need Review

- [frontend/components/NeuronsCommandCenter.tsx](</C:/Users/malac/Documents/ENTRAL 2/frontend/components/NeuronsCommandCenter.tsx>)
- [frontend/lib/command-os.ts](</C:/Users/malac/Documents/ENTRAL 2/frontend/lib/command-os.ts>)
- [frontend/lib/command-os-store.ts](</C:/Users/malac/Documents/ENTRAL 2/frontend/lib/command-os-store.ts>)
- [frontend/lib/merch-store.ts](</C:/Users/malac/Documents/ENTRAL 2/frontend/lib/merch-store.ts>)
- [frontend/lib/merch-workflow.ts](</C:/Users/malac/Documents/ENTRAL 2/frontend/lib/merch-workflow.ts>)
- [backend/src/dev-memory-server.ts](</C:/Users/malac/Documents/ENTRAL 2/backend/src/dev-memory-server.ts>)
- [backend/src/routes/merchStores.ts](</C:/Users/malac/Documents/ENTRAL 2/backend/src/routes/merchStores.ts>)
- [backend/src/routes/podProducts.ts](</C:/Users/malac/Documents/ENTRAL 2/backend/src/routes/podProducts.ts>)
- [prisma/schema.prisma](</C:/Users/malac/Documents/ENTRAL 2/prisma/schema.prisma>)
- `frontend/.next-dev` tracked generated files

## 8. Unfinished Marshal Hierarchy Work

- Marshal layer is implemented in local Command OS state and dashboard behavior.
- Hydration can migrate old four-level local state into a Marshal-backed hierarchy.
- Tests cover Marshal creation, movement, migration, deletion repair, task ownership repair, persistence recovery, and interrupted task handling.
- Database-backed Command OS entity persistence is not complete.
- Recovery queue UI for unrepairable local state is not a dedicated user-facing panel yet.
- Archive/delete impact summaries exist conceptually but need final UX hardening before real business data is stored.

## 9. Unfinished POD / Merch Command Work

- Merch/POD data models, schemas, services, tests, and UI panels are present.
- Merch workflow tasks route through Merch Marshal -> business General -> Commander -> Soldier.
- Client Merch Stores and POD Products include Marshal/General command path fields.
- Product generation, compliance warnings, pricing calculator, approval queue, launch package, and reports are present in the current codebase.
- The module still needs end-to-end review against real database-backed persistence and dashboard UX polish.
- Publishing/contacting/deleting/launch-status changes should remain approval-gated.

## 10. Suggested First Codex Prompt For Tomorrow

"Start with a safe repo hygiene pass. Review tracked generated files, especially `frontend/.next-dev`, and propose the smallest non-destructive cleanup plan. Then verify the Marshal Command Layer is ready for database-backed persistence without changing UI behavior."

# ENTRAL v0.3 Execution Plan

Source of truth: `ENTRAL_V0_3_GOAL_SPEC.md`

## Implementation Order

1. Audit first.
   - Inspect routes, components, command logic, hierarchy store, persistence, mobile UI, onboarding, voice, Merch/POD, tests, and build scripts.
   - Create `ENTRAL_V0_3_AUDIT.md` with current state, gaps, risks, and safe implementation order.

2. Stabilize command intelligence.
   - Improve message classification for help, commands, entity creation, reports, templates, tutorials, navigation, voice, and conversation.
   - Ensure `help` returns a real ENTRAL Command Help menu.
   - Add authorization previews for structural changes before execution.

3. Improve first-time clarity.
   - Ensure first login starts with only ENTRAL unless the user opts into demo data.
   - Add clean empty states for Marshals, Generals, Commanders, Soldiers, Tasks, Reports, Tutorial, and Voice.

4. Add guided business creation and templates.
   - Reuse existing Command OS and Merch/POD structures where possible.
   - Add a simple business wizard and templates without duplicating existing systems.
   - Require approval before creating full structures.

5. Make mobile usable.
   - Avoid desktop sidebars as required mobile navigation.
   - Add mobile command, hierarchy, task, and report access paths.
   - Verify graph touch controls are touch-native where feasible.

6. Audit simplification and feature access.
   - Create `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`.
   - Create `ENTRAL_V0_3_ACCESS_AUDIT.md`.
   - Fix safe clarity issues; document risky removals instead of deleting.

7. Polish data integrity, terminology, inspector, reports, and docs.
   - Validate the official hierarchy: ENTRAL -> Marshal -> General -> Commander -> Soldier.
   - Remove old user-facing terminology where safe.
   - Improve report structure and entity inspector usefulness.

8. Validate and document.
   - Run available lint/test/typecheck/build commands.
   - Update `ENTRAL_TOMORROW_START_HERE.md`.
   - Document deployment readiness and remaining risks.

## Safe Scope For This Session

Focus first on phases 0 through 5 and any low-risk fixes that directly improve command clarity, first-time guidance, and mobile usability. Defer large rewrites, risky deletions, and full deployment changes unless required to restore a broken build.

## Completed Subset In This Pass

- Audit docs created.
- First-time fallback changed to ENTRAL-only while preserving saved user state.
- Help command, authorization preview, command-intent classification, and intent tests added.
- Hierarchy creation naming and parent-blocking logic extracted into a tested helper.
- Context-aware command suggestions extracted into a tested helper.
- Mobile Command / Hierarchy / Tasks / Reports / More access path added to the dashboard.
- Opt-in demo environment path added with authorization before any demo data is created.
- Move/archive/workflow commands now request authorization before execution.
- Business-template Modify reopens the guided setup form; other preview types clearly require cancel/reissue.
- First-contact and inspector empty states were strengthened for new users.
- Business wizard templates now cover the seven required v0.3 categories.
- Template internals now use the v0.3 Marshal/Commander/Soldier naming plan, including the full POD/Merch roster.
- Business wizard context fields now cover industry, audience, preferred Marshal, brand style, initial services/products, notes, and initial goal; context is stored in local entity memory notes.
- Structured Command OS report generation now covers System, Marshal, General, Commander, and Soldier reports, with tests.
- Dashboard report commands now route to structured reports, and the mobile Reports tab filters to report transmissions.
- Entity inspector now shows operational summary counts and context-aware suggested actions.
- Academy modules now match the v0.3 tutorial requirements, and walkthrough target preparation opens hidden command surfaces before highlighting them.
- Visible hierarchy add controls now require authorization, and create-node approval uses the parent ID shown in the preview.
- Report generation now writes local report-history records to the source entity, upward command path, destination entity, and related tasks.
- Command OS hydration now preserves valid report history and removes records with dangling source/destination references.
- Frontend and backend lint/test/build checks passed under the local shell, with the known Node version warning.
- Step 6 access/simplification audit is complete, including `ENTRAL_V0_3_ACCESS_AUDIT.md` and `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`.
- Step 7 persistence/report polish is complete for v0.3: authenticated dashboards sync Command OS snapshots to the backend and deduplicated report records are stored separately.
- Step 7 terminology/access polish includes the reorganized right-side ENTRAL Command panel with `Talk`, `Build`, `Graph`, and `Tools` sections.
- Step 8 documentation is current in `ENTRAL_TOMORROW_START_HERE.md`, `COMMAND_OS_ARCHITECTURE.md`, `COMMAND_PROTOCOL.md`, and `ENTITY_SCHEMA.md`.
- Step 9 cleanup/check gate passed: Prisma generate, frontend/backend lint, frontend/backend tests, frontend/backend builds, and `git diff --check`.

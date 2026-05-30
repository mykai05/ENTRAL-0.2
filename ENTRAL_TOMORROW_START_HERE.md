# ENTRAL Tomorrow Start Here

Date: 2026-05-30

## Checkpoint: v0.3 Command Intelligence Checkpoint

Commit target: `v0.3 command intelligence checkpoint`

Checkpoint purpose: preserve the current overnight v0.3 implementation session before continuing additional work.

Current safety state:

- Implementation is intentionally paused.
- No push has been performed.
- No new features should be added until this checkpoint is reviewed.
- No obvious leaked OpenAI/API secrets were found in the current worktree. Secret search only matched placeholders or normal code text.
- The repo is expected to have many v0.3 changes staged/committed together after this checkpoint update.

Implemented in the current v0.3 work session:

- Extracted the full v0.3 PDF plan into `ENTRAL_V0_3_GOAL_SPEC.md`.
- Created execution/audit docs for v0.3 planning, simplification, access, and mobile UX.
- Changed first-time fallback state to ENTRAL-only while preserving existing saved localStorage state.
- Added real command help behavior with `ENTRAL Command Help`.
- Added reusable command intent classification.
- Added reusable command action planning for common user commands like `show tasks`, `open reports`, `show my businesses`, `show hierarchy`, `show active`, `show failing`, `show mobile guide`, and authorization replies.
- Added authorization previews for structural creation, business template creation, move, archive, and Merch/POD workflow generation.
- Routed visible Add Marshal / Add General / Add Commander / Add Soldier controls through authorization.
- Preserved intended parent IDs through create-node authorization approval.
- Tightened ambiguous parent selection so Commanders/Soldiers are not silently created under arbitrary parents.
- Expanded business wizard templates for POD/Merch, Website Agency, Content Agency, E-commerce Brand, SaaS Startup, Local Service Business, and Custom Blank Structure.
- Added business wizard context fields for industry, audience, preferred Marshal, brand style, products/services, notes, and initial goal.
- Stored guided setup context as local Command OS memory notes.
- Added structured Command OS report generation and local report-history persistence.
- Added mobile Command OS tabs for Command, Hierarchy, Tasks, Reports, and More.
- Added mobile hierarchy, task, report, and action panels.
- Updated ENTRAL Academy lessons for v0.3 and improved spotlight preparation.
- Added tests for command intent, command action planning, command creation, command reports, command suggestions, Command OS defaults/store behavior, onboarding, and Merch workflow fixtures.

Changed files at checkpoint:

- `COMMAND_OS_ARCHITECTURE.md`
- `COMMAND_PROTOCOL.md`
- `ENTITY_SCHEMA.md`
- `ENTRAL_TOMORROW_START_HERE.md`
- `UI_HIERARCHY.md`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/components/NeuronsCommandCenter.tsx`
- `frontend/components/OnboardingTour.tsx`
- `frontend/lib/command-os-store.ts`
- `frontend/lib/command-os.ts`
- `frontend/tests/CommandOSDefaults.test.ts`
- `frontend/tests/CommandOSStore.test.ts`
- `frontend/tests/MerchWorkflow.test.ts`
- `frontend/tests/OnboardingTour.test.tsx`

Created files at checkpoint:

- `ENTRAL_V0_3_ACCESS_AUDIT.md`
- `ENTRAL_V0_3_AUDIT.md`
- `ENTRAL_V0_3_EXECUTION_PLAN.md`
- `ENTRAL_V0_3_GOAL_SPEC.md`
- `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`
- `MOBILE_UX_AUDIT.md`
- `frontend/lib/command-action-plan.ts`
- `frontend/lib/command-creation.ts`
- `frontend/lib/command-intent.ts`
- `frontend/lib/command-reports.ts`
- `frontend/lib/command-suggestions.ts`
- `frontend/tests/CommandActionPlan.test.ts`
- `frontend/tests/CommandCreation.test.ts`
- `frontend/tests/CommandIntent.test.ts`
- `frontend/tests/CommandReports.test.ts`
- `frontend/tests/CommandSuggestions.test.ts`

Checks passed before checkpoint:

- Frontend typecheck/lint: passed.
- Frontend tests: 15 files, 58 tests passed.
- Frontend production build: passed.
- Backend typecheck/lint: passed.
- Backend tests: 9 files, 34 tests passed.
- Backend build: passed.
- `git diff --check`: passed with Windows line-ending warnings only.

Incomplete work at checkpoint:

- v0.3 is not complete yet.
- `NeuronsCommandCenter.tsx` remains large and should be split carefully over time.
- Command execution still mostly lives inside the dashboard, though classification/action-planning/creation/report/suggestion helpers have been extracted.
- Move/archive/workflow authorization Modify still requires canceling and reissuing a corrected command.
- Mobile tabs and Academy spotlights need live device/browser QA.
- Command OS reports and guided business context are still local-state based, not database-backed.
- Recovery queue UI for unrepairable local hierarchy state is not complete.
- Delete/archive impact summaries should be hardened before real business data is trusted.
- Merch/POD readiness exists as a simulation layer, but external publishing/integration remains intentionally out of scope for v0.3.

Remaining v0.3 work in priority order:

1. Real-device QA for mobile Command, Hierarchy, Tasks, Reports, More tabs, graph gestures, and chat fit.
2. Continue extracting command execution from `NeuronsCommandCenter.tsx` into tested handlers.
3. Add approval-path tests for creation, move, archive, and workflow execution.
4. Harden delete/archive impact summaries and recovery queue UX.
5. Add editable Modify flows for move/archive/workflow previews if needed.
6. Persist Command OS reports/business setup context to backend records when ready.
7. Finish terminology cleanup and remove remaining internal/user-visible `Atom` wording where inappropriate.
8. Run a manual first-time-user walkthrough: account signup, ENTRAL-only start, create first business, issue command, generate report, use mobile tabs.

## 1. Current Project Status

ENTRAL is buildable after the first v0.3 pass.

The official hierarchy remains:

`ENTRAL -> Marshal -> General -> Commander -> Soldier`

The v0.3 PDF was extracted into `ENTRAL_V0_3_GOAL_SPEC.md` and the short execution plan is in `ENTRAL_V0_3_EXECUTION_PLAN.md`.

The dashboard now starts first-time users with only ENTRAL as the default fallback state. Existing saved localStorage command structures are preserved so current users do not lose data.

## 2. What v0.3 Implemented In This Pass

- Created source-of-truth v0.3 spec doc from the 39-page PDF.
- Created short v0.3 execution plan.
- Created `ENTRAL_V0_3_AUDIT.md`.
- Created `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`.
- Created `ENTRAL_V0_3_ACCESS_AUDIT.md`.
- Created `MOBILE_UX_AUDIT.md`.
- Changed first-time Command OS fallback from preloaded Merch hierarchy to ENTRAL-only.
- Added real `help` / `show commands` / `what can you do` behavior in the dashboard command console.
- Added authorization previews for command-console structural creation:
  - Marshal
  - General
  - Commander
  - Soldier
  - Business template structures
- Added visible Approve / Modify / Cancel authorization card.
- Added authorization previews for entity moves, archive commands, and Merch/POD workflow generation.
- Restored mobile command suggestion chips as a compact horizontal strip.
- Extracted first-pass command intent classification into `frontend/lib/command-intent.ts`.
- Extracted hierarchy creation naming and parent-blocking copy into `frontend/lib/command-creation.ts` with focused tests.
- Added command intent tests for help, authorization, business creation, reports, task commands, and navigation.
- Added a tested command action planner so `show tasks`, `open reports`, `show my businesses`, guide commands, active/failing status commands, and authorization replies route to the correct Command OS action.
- Extracted context-aware command suggestions into `frontend/lib/command-suggestions.ts` with focused tests.
- Added mobile command tabs for Command, Hierarchy, Tasks, Reports, and More.
- Added a mobile hierarchy tree, mobile task center, mobile report feed, and compact mobile action menu.
- Added opt-in `Load demo environment` flow that still requires authorization before creating demo hierarchy data.
- Added first-contact actions for Help, Start Tutorial, Create First Marshal, Guided Setup, Templates, Voice Introduction, and Load Demo Environment.
- Added empty inspector states for missing Marshals, business Generals, Commanders, Soldiers, and Tasks.
- Added command routing for mobile guide and voice guide requests.
- Expanded the business wizard to the seven required v0.3 templates: POD / Merch Business, Website Agency, Content Agency, E-commerce Brand, SaaS Startup, Local Service Business, and Custom Blank Structure.
- Realigned template Marshal/Commander/Soldier names to the v0.3 plan, including the full POD/Merch Soldier roster.
- Improved natural-language business setup routing for website agency, website operation, ecommerce, SaaS, local service, and custom blank requests.
- Expanded guided business setup fields for industry, audience, preferred Marshal, brand style, initial services/products, notes, and initial goal.
- Preferred Marshal now controls where guided business structures are created instead of only displaying the template default Marshal.
- Guided setup context is stored into created Marshal/General/Commander/Soldier memory notes and appears in the authorization preview.
- Added a tested Command OS report builder for System, Marshal, General, Commander, and Soldier reports.
- Routed `report on ...`, `ENTRAL report`, readiness, and attention report commands into structured local reports instead of generic chat fallback.
- Mobile Reports now shows structured report transmissions only.
- Added inspector operational summary and context-aware suggested actions for each hierarchy level.
- Report generation now writes local report-history records to the source entity, upward command path, destination entity, and related tasks.
- Hydration validation now removes report-history records with dangling source/destination references.
- Entity inspector now displays persisted local report history.
- ENTRAL Academy now uses v0.3-specific modules: Quick Start, Command Guide, Hierarchy Guide, Business Creation, Mobile Guide, Voice Guide, Merch/POD Guide, and Advanced Tools.
- Academy live walkthrough preparation now opens the command console, controls, inspector, voice controls, or business wizard before highlighting them.
- Command OS manual creation now validates state immediately after adding a hierarchy node.
- Visible Add Marshal / Add General / Add Commander / Add Soldier controls now request authorization instead of creating hierarchy entities directly.
- Create-node authorizations now store the intended parent ID so approval cannot accidentally create the entity under a different selected parent.
- Task/report/business list commands now open mobile Command OS tabs on small screens without hiding the desktop command console.
- Reduced user-facing `Atom` wording where it referred to command hierarchy.
- Updated Command OS default tests for ENTRAL-only boot.
- Updated Merch workflow tests to use an explicit Merch fixture instead of relying on default seeded hierarchy.

## 3. What Was Intentionally Not Implemented

- No new hierarchy layer was added.
- No full dashboard redesign was attempted.
- Existing user localStorage state was not destroyed or reset.
- The large `NeuronsCommandCenter` component was not split yet.
- Dedicated mobile task/report/hierarchy panels and v0.3 Academy lessons now exist in the dashboard, but they still need real-device QA.
- Full command execution is still mostly inside `executeCommand`; only classification has been extracted so far.
- `Modify` now reopens business-template previews for editing; other authorization types return clear guidance to cancel and reissue the corrected command.
- Business wizard now exposes the required template categories and the main optional context fields from the PDF. Those fields are stored as memory notes for now rather than normalized database columns.
- No new backend architecture was added.

## 4. Checks Passed

- Frontend typecheck: passed.
- Frontend tests: 15 files, 58 tests passed.
- Frontend production build: passed.
- Backend typecheck: passed.
- Backend tests: 9 files, 34 tests passed.
- Backend build: passed.

## 5. Checks Failed

No final check is failing.

Known warning:

- The repo expects Node `20.19.0`; this shell is using Node `v22.20.0`. All checks still passed, but Node 20.19.0 is still the target runtime.

## 6. Known Issues

- `NeuronsCommandCenter` is still dense and risky to modify casually.
- Mobile now has bottom tabs and a collapsible hierarchy tree, but it still needs live phone/browser QA before calling it final.
- Authorization preview supports Approve, Cancel, and business-template Modify. Create-node approvals preserve the previewed parent. Move/archive/workflow Modify still requires canceling and reissuing the corrected directive.
- Command classification now has a reusable helper, but execution routing is still implemented as local conditionals.
- Command OS report generation is now structured, tested, and persisted in local Command OS state. Report records are not yet database-backed.
- Guided business setup context and report history are local Command OS memory/history only; they are not yet database-backed.
- Existing users with saved localStorage may still see older preloaded structures because data preservation is intentional.
- Some internal function names still say `Atom`, but visible terminology was reduced.

## 7. Recommended Next Step

Continue v0.3 with the smallest high-impact usability work:

1. Continue extracting execution routing from `executeCommand` into tested command handlers.
2. Add tests for no-Marshal blocking and approval execution paths beyond the command-intent classifier.
3. Real-device QA the new mobile Command / Hierarchy / Tasks / Reports / More tabs and Academy spotlights.
4. Add editable Modify flows for move/archive/workflow previews if needed.
5. Persist local report history as backend Command OS report records once the backend model is ready.
6. Normalize guided business setup context into persistent records once the backend Command OS model is ready.
7. Decide whether to keep or remove the older mobile `Navigate` details component after tutorial targets are updated.

## 8. Files That Need Review

- `frontend/components/NeuronsCommandCenter.tsx`
- `frontend/lib/command-intent.ts`
- `frontend/lib/command-action-plan.ts`
- `frontend/lib/command-creation.ts`
- `frontend/lib/command-reports.ts`
- `frontend/lib/command-suggestions.ts`
- `frontend/lib/command-os.ts`
- `frontend/lib/command-os-store.ts`
- `frontend/lib/merch-workflow.ts`
- `frontend/tests/CommandOSDefaults.test.ts`
- `frontend/tests/CommandIntent.test.ts`
- `frontend/tests/CommandActionPlan.test.ts`
- `frontend/tests/CommandCreation.test.ts`
- `frontend/tests/CommandReports.test.ts`
- `frontend/tests/CommandSuggestions.test.ts`
- `frontend/tests/MerchWorkflow.test.ts`
- `COMMAND_PROTOCOL.md`
- `ENTRAL_V0_3_GOAL_SPEC.md`
- `ENTRAL_V0_3_AUDIT.md`
- `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`
- `ENTRAL_V0_3_ACCESS_AUDIT.md`
- `MOBILE_UX_AUDIT.md`

## 9. Unfinished Marshal Hierarchy Work

- Marshal layer is supported in local Command OS state and validation.
- ENTRAL-only default now aligns with v0.3 first-login.
- Database-backed Command OS persistence is still not complete.
- Recovery queue UI for unrepairable local state is not complete.
- Delete/archive impact summaries should be hardened before real business data is stored.

## 10. Unfinished POD / Merch Command Work

- Merch/POD workflow remains opt-in rather than preloaded.
- Merch workflow simulation still works using explicit Merch structures.
- POD/Merch module still needs end-to-end UX review against the new ENTRAL-only first launch.
- Approval queue, pricing, launch package, and reports exist but should be marked incomplete where external publishing would be implied.

## 11. Suggested First Codex Prompt For Tomorrow

"Continue ENTRAL v0.3 from `ENTRAL_V0_3_GOAL_SPEC.md`. Real-device QA the new mobile Command OS tabs, then continue extracting `executeCommand` into tested command handlers without redesigning the dashboard."

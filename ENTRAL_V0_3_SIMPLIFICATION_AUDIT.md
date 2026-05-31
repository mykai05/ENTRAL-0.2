# ENTRAL v0.3 Simplification Audit

Source of truth: `ENTRAL_V0_3_GOAL_SPEC.md`

## Critical Issues

- First-time boot previously loaded a full Merch hierarchy by default. Fixed: the default Command OS fallback now starts with ENTRAL only. Existing stored user state is preserved.
- `help` previously fell through to normal command/AI behavior. Fixed: `help`, `show commands`, `what can you do`, and related phrases now return a real ENTRAL Command Help menu.
- Structural and high-impact command changes could happen immediately from natural language. Improved: command-console creation requests, business templates, moves, archives, and Merch/POD workflow generation now create an authorization preview before execution.

## High Priority Issues

- `NeuronsCommandCenter` is very dense and owns graph rendering, command console, business wizard, Merch tools, inspector, voice, local state, and mobile layout. It works, but future changes are risky. Recommendation: split only after v0.3 behavior is stable.
- Mobile still uses the dashboard as the main command surface. Improved: command suggestions are visible, bottom tabs are present, and mobile hierarchy/task/report panels are now reachable without hidden shortcuts. Remaining: live phone QA and possible panel-height tuning.
- The right-side command panel was too crowded for normal use. Fixed: the panel is now organized into Talk, Build, Graph, and Tools sections, with the command input kept reachable and mobile layout using more of the viewport.
- Business setup exists and now has a clearer authorization path. Fixed: preview/approve/cancel flow exists for template creation, and `Modify` reopens the business wizard for editing. Remaining: move/archive/workflow previews still require canceling and reissuing the corrected directive for modification.
- Template coverage is now aligned to the required v0.3 categories. Remaining: the wizard should expose the full optional field set before calling Phase 6 complete.

## Medium Priority Issues

- Internal and user-facing hierarchy-control terminology now uses graph/command language. Atomic language is reserved for the visual style of the graph.
- Command classification now exists in `frontend/lib/command-intent.ts`, but command execution is still mostly conditional routing inside `executeCommand`. Recommendation: continue extraction into tested handlers.
- Command palette and command console overlap in purpose. Current decision: keep both. Command console is primary; palette is a visible shortcut/action index.

## Low Priority Issues

- Existing docs are numerous and partially overlap. Recommendation: keep v0.3 docs as current truth and consolidate older architecture docs later.
- Some status/report copy can sound too complete when there is little operational data. Recommendation: report generation should explicitly say when data is insufficient.

## Dead Buttons / Empty Pages / Duplicate Systems

- No obvious dead route was found during the static pass.
- Dashboard has the highest duplication risk because it embeds Command OS, Merch, controls, inspector, and console in one place.
- Agent/template features exist outside dashboard and may overlap with Command OS templates. No removal was made because the distinction is still useful: dashboard is command visualization, agents is management.

## Missing Explanations

- First-time empty hierarchy needed stronger guidance. Improved via ENTRAL-only boot message, visible help, first-contact actions, first-business guidance, and inspector empty states.
- Mobile graph controls have screen-reader instructions and touch controls. Improved: mobile guide requests now surface the bottom-tab interaction model.

## Safe Fixes Implemented

- ENTRAL-only first-time fallback.
- Real help menu.
- Authorization preview cards.
- Move/archive/workflow authorization previews.
- Business-template Modify flow.
- Seven required business templates.
- First-contact action set and child/task empty states.
- Mobile command suggestions restored.
- Mobile bottom tabs and hierarchy/task/report panels.
- Reorganized ENTRAL Command panel with clearer section navigation and more accessible scroll behavior.
- Opt-in demo environment authorization.
- Reusable command-intent classifier with tests.
- User-facing `Atom` wording removed where it referred to command hierarchy.

## Deferred For Safety

- Full component split of `NeuronsCommandCenter`.
- Removing pages or major panels.
- Hard migration/removal of existing user localStorage hierarchy.
- Full mobile-only standalone task/report routes.

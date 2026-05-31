# ENTRAL v0.3 Pre-Flight Audit

Source of truth: `ENTRAL_V0_3_GOAL_SPEC.md`

## Current Route / Page Structure

- Frontend uses Next.js App Router under `frontend/app`.
- Public routes: `/`, `/login`, `/signup`.
- Protected routes: `/dashboard`, `/chat`, `/automations`, `/agents`, `/admin`.
- `frontend/middleware.ts` redirects protected routes to login when the auth cookie is missing and redirects authenticated users away from login/signup.

## Current Component Structure

- Global providers live in `frontend/components/AppProviders.tsx`.
- `CommandPalette`, `SettingsPanel`, and onboarding are intentionally not rendered on public login/signup/landing routes.
- Dashboard loads through `DashboardClient` and renders `NeuronsCommandCenter`.
- Command Center currently owns graph rendering, command console, graph controls, business wizard, Merch panels, mobile navigation, inspector, voice command hooks, and local persistence. This is functional but dense.

## Current Command / Chat Implementation

- The dashboard command console routes many local commands through `executeCommand` in `NeuronsCommandCenter`.
- Existing command support includes hierarchy focus, active/failing node filters, business wizard, create Marshal/General/Commander/Soldier, removal confirmation, Merch batch/approval/report controls, task creation, graph controls, panel controls, focus mode, settings, command palette, tutorial, and fallback AI.
- Completed in the first v0.3 pass:
  - `help`, `show commands`, and related phrases return a real ENTRAL Command Help menu.
  - A reusable command action planner now routes first-time-user commands like `show tasks`, `open reports`, and `show my businesses` to visible Command OS surfaces instead of falling through to generic graph behavior.
  - Structural creation from the command console now shows an authorization preview for single entities and business templates.
  - Visible hierarchy Add controls now also use authorization instead of direct creation.
  - Create-node approvals preserve the parent entity shown in the preview.
  - Moves, archives, and Merch/POD workflow generation now require authorization previews.
  - First-pass command classification exists in `frontend/lib/command-intent.ts`.
- Still incomplete for v0.3:
  - Command execution routing still lives mostly inside `executeCommand`, though intent, action planning, creation, suggestions, and report helpers have been extracted.
  - Authorization previews support Approve, Cancel, and business-template Modify. Move/archive/workflow Modify still requires canceling and reissuing the corrected directive.

## Current Entity / Hierarchy Model

- `frontend/lib/command-os.ts` defines `NodeType = emperor | marshal | general | commander | soldier`.
- `frontend/lib/command-os-store.ts` validates the official hierarchy and repairs many invalid states.
- Store validation supports Marshal migration from legacy General-under-ENTRAL states.
- Current fallback hierarchy now starts with ENTRAL only. Existing saved localStorage command structures are preserved to avoid data loss.

## Current Persistence / Hydration

- Dashboard graph state persists in localStorage under `entral-command-os-state-v3`, with fallbacks to older keys.
- Authenticated dashboards now sync the validated Command OS snapshot to `/api/v1/command-os/state`.
- Backend persistence stores one `CommandOSSnapshot` per user and deduplicated `CommandOSReport` records extracted from entity/task report history.
- Invalid legacy mock entities are cleared.
- Previous state is backed up before Marshal migration.
- Active tasks can be marked failed during hydration recovery.
- Risk: users with existing state will keep a preloaded hierarchy unless they intentionally reset or the state is migrated. This is acceptable for preserving user data, but first-time fallback must be ENTRAL-only.

## Current Reporting / Task System

- Local Command OS tasks include delegation paths and Marshal/General/Commander/Soldier context.
- Backend has automation, task, agent, AI, merch store/product/report services.
- Reports use `Situation / Analysis / Recommendation / Next Actions` through `command-communications`.
- Dashboard report commands now use the local Command OS report builder. Reports state insufficient data clearly, include command path and scoped tasks, populate the mobile report feed, and write local report-history records to entities/tasks.

## Current Mobile Behavior

- CSS includes mobile-specific Command Center layout and a mobile navigation drawer.
- Touch graph controls already support:
  - Single-finger pan
  - Two-finger pinch zoom
  - Two-finger rotate/perspective changes
  - Tap to focus entity
- Mobile now has bottom tabs for Command, Hierarchy, Tasks, Reports, and More plus compact hierarchy/task/report panels. It still needs live phone QA because the dashboard remains a dense integration surface.
- The right-side ENTRAL Command panel is now split into Talk, Build, Graph, and Tools sections so users can reach command history, setup actions, graph controls, and Merch/POD tools without fighting one overcrowded scroll region.

## Current Graph / Orbit Visualization

- Dashboard uses a custom WebGL canvas in `NeuronsCommandCenter`.
- It supports click/tap focus, camera movement, lock/follow behavior, orbit controls, trails, rings, and grouped hierarchy rendering.
- User-facing `Atom` wording has been removed where it referred to hierarchy controls. Remaining atomic language is limited to the visual graph style.

## Current Tutorial / Onboarding / Voice

- `OnboardingProvider` exists and is hidden on public entry routes.
- Voice utilities support wake-word handling, reports-only speech mode, and speech output selection.
- Tutorial now has v0.3-aligned modules for Quick Start, Command Guide, Hierarchy Guide, Business Creation, Mobile, Voice, Merch/POD, and Advanced Tools. Live walkthrough preparation now opens the command console, controls, inspector, or business wizard before highlighting those targets.

## Current Merch / POD Implementation

- Backend has Merch Store, POD Product, compliance, pricing, product batch, and merch report services.
- Frontend has Merch panels inside the dashboard.
- Command OS no longer preloads Merch data for first-time fallback. Merch templates and tools remain opt-in through wizard/templates or the explicit demo environment authorization flow.
- Business wizard templates now cover the required v0.3 categories: POD / Merch Business, Website Agency, Content Agency, E-commerce Brand, SaaS Startup, Local Service Business, and Custom Blank Structure.
- Business wizard now exposes the main optional PDF fields: industry, audience, preferred Marshal, brand style, notes, initial services/products, and initial goal. These are stored as Command OS memory notes and synced through the Command OS snapshot when the user is signed in.

## Current Tests and Scripts

- Root scripts use pnpm workspace commands.
- Frontend tests cover Command OS defaults/store, voice, onboarding, messages, auth forms, automation/agent status, and merch workflow.
- Backend tests cover auth, AI service, automation executor, policies, schemas, merch reports, compliance, pricing, and product generation.
- Frontend tests now include ENTRAL-only default coverage and a command-intent classifier test file. Merch workflow tests use explicit Merch fixtures instead of relying on default seeded hierarchy.

## Duplicated / Risky Areas

- `NeuronsCommandCenter` is doing too much but is currently the working integration point. Do not split it during a stability pass unless necessary.
- Command palette and command console both expose commands. This is acceptable if palette remains a visible shortcut and console remains primary.
- Merch functionality lives inside dashboard panels and backend routes. Avoid adding a second Merch UI system until dashboard clarity is stabilized.

## What Should Not Be Touched Casually

- Auth middleware and API cookie behavior.
- Command OS reducer validation and migration logic.
- Backend Prisma migrations.
- Railway/Vercel deployment config unless a build/deploy check proves it is broken.
- Existing user localStorage state without backup or recovery path.

## Recommended Implementation Order

1. Continue extracting command execution handlers from `executeCommand`.
2. Add tests for no-parent blocking and approval execution paths.
3. Real-device QA mobile bottom tabs, hierarchy tree, task panel, report panel, and Academy spotlights.
4. Add editable Modify behavior to move/archive/workflow previews if needed.
5. Run lint/test/build after each focused pass and document remaining risks.

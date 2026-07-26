# Phase 110 UI baseline

**Gate:** 110
**Baseline revision:** Phase 110 implementation at `1326f267` as reconciled into `main`
**Review revision:** `62f4cc4167583e6e0a87cd209a6f63dd5ca0e891`
**Record status:** Retrospective completion record

## Scope and phase boundary

Phase 110 removes or consolidates duplicate, broken, decorative, unreachable, or disconnected UI behavior without inventing canonical data. It does not implement the later canonical UI clients, database read models, mission runtime, provider adapters, or broad autonomy.

The Phase 170 packet explicitly owns canonical UI clients, Dashboard/Portfolio Mode, and business detail. This baseline therefore records the current Phase 110 source behavior honestly instead of labeling the legacy snapshot/browser recovery path as canonical.

## Captured surfaces

The repository contains paired desktop and representative phone captures:

| Destination | Desktop evidence | Phone evidence | Viewport |
|---|---|---|---|
| Dashboard | `artifacts/phase-110/after-dashboard-desktop.png` | `artifacts/phase-110/after-dashboard-phone.png` | 1440x900; 780x1688 |
| Open Universe Graph | `artifacts/phase-110/after-graph-desktop.png` | `artifacts/phase-110/after-graph-phone.png` | 1440x900; 780x1688 |
| Infrastructure | `artifacts/phase-110/after-infrastructure-desktop.png` | `artifacts/phase-110/after-infrastructure-phone.png` | 1440x900; 780x1688 |

The captures demonstrate the consolidated shell, compact Graph controls, structured empty states, desktop layout, and narrow-width stacking. They are implementation evidence, not proof that the later canonical database client is already connected.

## Current route and screen hierarchy

### Authenticated member surface

- `/member/dashboard` - Dashboard destination;
- `/member` - protected member entry to the Dashboard destination;
- `/member/graph` - Open Universe Graph destination;
- `/member/infrastructure` - Infrastructure destination;
- `/member/sign-in`, `/member/verify-email`, and `/member/password-reset` - authentication lifecycle.

The server page loads and validates the member organization session before mounting the command center. An unassigned or unavailable member receives an explicit service/assignment state.

### Internal surface

The internal shell preserves `/dashboard`, `/graph`, and `/infrastructure`. Older internal route entry points such as admin, agents, automations, and chat are routed into the consolidated surfaces rather than maintaining separate competing shells.

### Shared shell hierarchy

1. brand and signed-in state;
2. Dashboard, Open Universe Graph, and Infrastructure destination navigation;
3. explicit scope strip;
4. destination-specific content;
5. Academy, Settings, and Sign out utilities.

Academy remains manually accessible. It is not forced ahead of the primary workspace.

## Control inventory

### Dashboard

- Portfolio and ENTRAL view selection;
- navigation to Infrastructure records;
- Academy;
- global Settings;
- Sign out.

Dashboard summaries come from the currently loaded Command OS snapshot. Missing businesses, work, exceptions, or financial records render explicit zero/empty/unavailable states. The UI does not create samples or estimate absent financial data.

### Open Universe Graph

The compact toolbar contains exactly:

1. Search;
2. Fit view;
3. Back;
4. Settings.

Settings opens one Graph display panel. Node selection opens one minimal inspector and a real navigation path to the full Infrastructure record. The Graph contains no ENTRAL conversation window.

### Infrastructure

- searchable hierarchy;
- record selection;
- full read-only record fields, instructions, results, evidence, and logs;
- bounded section navigation for agents, automations, governance, and business operations.

Create, edit, pause, reassign, retire, and other canonical state actions are not exposed in the Phase 110 record inspector. They require the later complete action path.

## Payload and state inventory

The consolidated command center currently restores a signed-in internal user's legacy state from `GET /api/v1/command-os/state` and writes through `PUT /api/v1/command-os/state`. If no usable backend snapshot is available, user-scoped browser recovery state is used and the source badge says so.

For the protected member surface, internal Command OS persistence is deliberately disabled because member tokens are not authorized on internal routes. Member organization/session data is loaded through the protected member API boundary.

This is a transitional Phase 110 state:

- browser state is presentation/recovery only;
- `CommandOSSnapshot` is not the Phase 140+ canonical hierarchy;
- protected member workspace data must not be widened into internal routes;
- canonical client/read-model integration is Phase 170 work.

## Baseline problems identified

The pre-consolidation repository contained:

- competing screen shells and legacy route entry points;
- duplicate settings/control presentations;
- member-specific agent-run and sovereign-command paths that duplicated command behavior and did not fit the locked three-destination model;
- a `north-star` destination competing with Infrastructure;
- Graph controls distributed across the older command-center UI;
- visible workbenches whose readiness could be confused with a completed governed provider path;
- desktop-first sections needing narrow-width stacking and touch hardening;
- locally recovered state that needed a visible source label instead of being presented as authoritative canonical data.

## Measured interaction and render risks

| Risk | Phase 110 treatment |
|---|---|
| Duplicate destination and settings choices increase navigation cost | One shell, three destinations, one Graph settings panel |
| Graph toolbar occupies too much narrow-width space | Four compact controls; phone capture verifies wrapping/fit |
| Dense record UI overflows phone width | Single-column/narrow layouts and committed phone captures |
| Hover-only discovery | Primary controls remain buttons/links with accessible labels |
| Empty state can look like a loaded business | Explicit zero, empty, unavailable, and recovery-source labels |
| Browser recovery can be mistaken for canonical state | Source badge distinguishes backend snapshot, loading, and local fallback |
| Disconnected state actions appear executable | Phase 110 record inspector remains read-only |

## Verification coverage

Relevant automated evidence includes:

- `frontend/tests/DashboardClient.test.tsx`;
- `frontend/tests/MemberDestinationNav.test.tsx`;
- `frontend/tests/Middleware.test.ts`;
- `frontend/tests/OnboardingTour.test.tsx`;
- `frontend/tests/UICleanup.test.tsx`;
- `frontend/tests/CommandCenterGraphIntegrity.test.ts`;
- `frontend/tests/MemberBoundary.test.tsx`;
- `e2e/entral.e2e.mjs`;
- the six committed desktop/phone captures.

The repository-wide lint, frontend component suite, production build, release-positioning tests, and release-readiness checks form the acceptance command set.

## Gate 110 conclusion

The Phase 110 shell is consolidated, its remaining controls have current actions or navigation, and empty/unavailable behavior is honest. The exact removals and consolidations are recorded in `docs/entral/ui/111_deletion_and_consolidation_log.md`. Canonical database-driven UI synchronization is not claimed and remains correctly gated to Phase 170.

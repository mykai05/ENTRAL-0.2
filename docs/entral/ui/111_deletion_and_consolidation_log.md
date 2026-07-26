# Phase 110 deletion and consolidation log

**Implementation commit:** `1326f267`
**Status:** Accepted retrospective record

## Decision rule

A UI or route was removed, hidden, redirected, or consolidated when it:

- duplicated one of the three locked destinations;
- duplicated a control or settings surface;
- could not reach a real current backend path;
- implied canonical data or provider capability that did not exist;
- exposed member tokens to an internal-only boundary;
- created an alternate command hierarchy or state owner;
- added visual complexity without supporting a decision.

No removed behavior was replaced with simulated success.

## Removed paths and components

| Removed item | Change | Reason |
|---|---|---|
| `backend/src/routes/memberAgents.ts` | Deleted | Duplicated member-agent command behavior outside the accepted member workspace boundary |
| `backend/src/services/sovereignCommand.ts` | Deleted | Alternate sovereign-command path conflicted with the locked operational/governance separation |
| `backend/tests/sovereignCommand.test.ts` | Deleted with its retired service | Test no longer represented an accepted runtime path |
| `frontend/app/member/[organizationId]/agent-runs/route.ts` | Deleted | Removed an organization-specific proxy/runtime surface that was not part of the locked three-destination member UI |
| `frontend/components/MemberAgentWorkspace.tsx` | Deleted | Duplicate member command workspace with overlapping controls and state |
| legacy member `north-star` destination | Renamed/consolidated into `/member/infrastructure` | Infrastructure is the authoritative exhaustive record destination |
| obsolete route-level standalone shells | Redirected or mounted into consolidated destinations | Prevented competing navigation and duplicated page furniture |
| old global styling used only by retired layouts | Removed from the active layout path | Reduced contradictory styling and overflow behavior |

## Consolidated behavior

### Destination navigation

All primary authenticated navigation is normalized to:

- Dashboard;
- Open Universe Graph;
- Infrastructure.

Member and internal surfaces use the same destination vocabulary while retaining their separate authentication and authorization boundaries.

### Graph controls

Previously distributed display controls are consolidated into:

- a toolbar containing Search, Fit view, Back, and Settings;
- one Graph settings panel;
- one selected-node inspector.

The Graph does not host the ENTRAL conversation panel.

### Settings

Graph display settings exist in the single Graph panel. Account/application settings remain a separate global utility because they control a different scope. No second Graph settings set remains visible.

### Infrastructure

The Phase 110 record inspector consolidates hierarchy, identity, status, parent/child relationships, objective, instructions, recent results, evidence, and logs. Canonical mutation controls remain absent until their complete action paths ship.

### Academy and onboarding

Academy remains a manual utility. The graph-first/command-center surface stays immediately available. Tutorial events and Academy-library events remain distinct.

## Controls deliberately retained

| Control | Real Phase 110 behavior |
|---|---|
| Destination tabs/links | Navigate to Dashboard, Graph, or Infrastructure |
| Search | Filters the current graph or infrastructure record set |
| Fit view | Reframes the current graph |
| Back | Returns to the previous graph selection when history exists |
| Settings | Opens the one relevant settings surface |
| Open full record | Navigates from Graph selection to the matching Infrastructure record |
| Academy | Opens the manual learning surface |
| Sign out | Calls the authenticated logout path and clears local session state |
| Portfolio/ENTRAL mode | Switches the Dashboard presentation within the current shell |

## Actions deliberately not exposed

The Phase 110 Infrastructure record inspector does not show simulated:

- create or duplicate;
- edit or reparent;
- pause or resume;
- reassign or retarget;
- archive, retire, restore, or rollback;
- model assignment or tool grants;
- budget, schedule, or policy mutation.

Each action must wait for shared contracts, canonical persistence, audit, events, verification, and typed errors. Catalogued provider workbenches are not represented as live provider execution.

## Empty-state and source-label corrections

- No Commander/business card is created when no business record exists.
- No financial period is estimated when no canonical payload exists.
- No active work or execution is implied by an empty task list.
- Backend snapshot, loading, and browser recovery sources are displayed distinctly.
- Member authorization is not bypassed to make internal persistence appear available.

## Layout and touch consolidation

- The shared shell uses responsive destination navigation.
- Dashboard cards and panels stack at phone width.
- Graph controls remain accessible without hover.
- Infrastructure hierarchy and inspector adapt to the narrow layout.
- Six committed captures cover all three destinations at desktop and phone dimensions.

## Verification

The deletion set is covered by source-level route/component removal, navigation and middleware tests, UI component tests, production build checks, route smoke coverage, and the committed Phase 110 captures.

## Gate 110 conclusion

The removed files and routes no longer form a competing UI or command path. Remaining visible controls have a current function or navigation target. Stateful canonical controls remain correctly hidden until later phases implement the complete backend path.

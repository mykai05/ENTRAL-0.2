# ENTRAL Mobile UX Audit

Source of truth: `ENTRAL_V0_3_GOAL_SPEC.md`

## Current Mobile Strengths

- Dashboard has mobile-specific CSS and avoids the desktop left navigation under `760px`.
- Command console can be closed and reopened.
- Touch graph controls support:
  - One-finger pan
  - Two-finger pinch zoom
  - Two-finger camera rotation
  - Tap to select/focus an entity
- Public login/signup routes do not render settings or command palette popups.
- Dashboard now has visible mobile bottom tabs for Command, Hierarchy, Tasks, Reports, and More.
- Hierarchy, task, report, and action panels are reachable without keyboard shortcuts or hidden gestures.

## Current Mobile Problems

- The dashboard is still a dense desktop command center adapted to mobile, not a dedicated command tablet.
- Command suggestions were hidden on mobile. Fixed: they now appear as a compact horizontal strip.
- Mobile bottom navigation is implemented, but still needs live phone QA for final fit.
- Mobile hierarchy now has a tree panel, but the 3D graph remains the visual centerpiece behind it.
- Task and report centers now exist as dashboard panels, but they are not full standalone routes.
- The graph remains visually impressive but may still be heavy on lower-end phones.

## Safe Fixes Completed

- Restored mobile command suggestion chips so first-time users can discover Help, Create Marshal, and Business Setup actions.
- Added bottom navigation: Command, Hierarchy, Tasks, Reports, More.
- Added collapsible mobile hierarchy tree.
- Added mobile task empty state and mobile report feed.
- Added mobile More actions for Help, Business Setup, Load Demo, Graph Controls, Settings, Academy, and Full Picture.
- Updated ENTRAL Academy with Mobile Guide and Voice Guide lessons so mobile users have an explicit training path.
- Verified the code path for one-finger pan, two-finger rotate, and pinch zoom is present in `NeuronsCommandCenter`.

## Recommended Next Mobile Work

1. Verify bottom tabs, command console, and Academy spotlights fit on real mobile browsers.
2. Add mobile task filters if the task list grows beyond the first eight records.
3. Add a larger report reader if command reports become long.
4. Reduce optional graph effects further on small screens if frame rate drops.

# Entral UI production cleanup

## Scope and discovery

This implementation review covered the complete user-facing Entral frontend at desktop (1440 x 1000), tablet (768 x 1024), and mobile (390 x 844). Business behavior, authorization checks, tenant boundaries, audit behavior, backend schemas, and external execution gates were preserved.

The resolved application is the `mykai05/ENTRAL-0.2` repository. The frontend uses Next.js App Router 15.5.18, React 19.2.6, TypeScript 5.9.3 in strict mode, local React components, Lucide icons, and a custom token-based stylesheet in `frontend/app/globals.css`. It does not use a third-party component library.

Authentication and access states reviewed:

- Local guest mode when the account API is unavailable or returns an unauthenticated response.
- Authenticated owner/user mode for saved chat, agents, automation, account privacy, and workspace data.
- Administrator mode for governance controls.
- Optional administrator verification-code state.
- Backend unavailable, loading, empty, and not-found states.
- First-run Academy and settings overlays.

The application has `USER` and `ADMIN` roles. Teams are the task tenancy boundary; team membership carries owner/member semantics, while other saved records remain scoped by authenticated user. This cleanup did not change those models.

## Routes reviewed

| Route | Purpose | States verified |
| --- | --- | --- |
| `/` | Direct entry redirect | Redirects to `/dashboard`; no retired sign-in or beta screen |
| `/dashboard` | Command Center | Local guest, authenticated owner, desktop/tablet/mobile, focus and command surfaces |
| `/chat` | Saved communications | Guest access boundary, owner conversation flow, empty, loading, sending, delete confirmation |
| `/agents` | Agent configuration and work | Guest access boundary, create, preset, assignment, scheduling, detail and task controls |
| `/automations` | Browser job operations | Guest access boundary, form validation, queue, recovery, cancel and retry states |
| `/admin` | Governance and audit | Checking, unauthenticated, non-admin/admin gate, verification code, policies and task controls |
| Unknown route | Custom not-found state | Desktop/tablet/mobile layout and navigation |
| `/signup`, `/onboarding`, `/verify-email`, `/forgot-password`, `/reset-password` | Retired account entry routes | Redirect to `/dashboard` |

## Control inventory and decisions

| Surface | Classification and action |
| --- | --- |
| Shared header | Removed the second per-page Command Center action. The primary navigation is canonical. Governance is hidden unless an `ADMIN` session is confirmed. Mode labels now reflect local vs authenticated state. |
| Settings | Removed dead password inputs, the duplicate speech enable switch, and the duplicate tutorial action. Kept one speech-mode selector and one Academy walkthrough action. The floating Settings trigger is hidden on the dashboard because the command-center settings control is canonical there. |
| Command palette | Renamed misleading `Run agent` to `Open agents`, removed the stale chat-export deep link, added an explicit close control and a persistent search label. |
| Command Center | Removed duplicate quick actions for Talk/Graph/Tools/View graph, duplicate ENTRAL overview access, canned Infrastructure/Analytics/notification pseudo-controls, the fake inspector refresh, the inactive screen preview placeholder, the duplicate Marshal action, and the disabled core-delete control. |
| Command Center voice | Repaired push-to-talk keyboard activation. Stop speech is now state-dependent instead of visibly disabled when unavailable. |
| Chat | Removed the duplicate API snippet. Replaced ambiguous `Clear` with state-specific `Delete thread` or `Discard draft`; saved deletion now requires confirmation and the action is absent when there is nothing to remove. |
| Agents | Removed the API snippet and hidden Escape-to-cancel shortcut. Preset selection now remounts forms with the selected values. Background mode labels describe the action, and disabled assignment/schedule controls have explicit reasons. Cancel/revoke actions require confirmation. |
| Automations | Removed the API snippet. Added field-level error associations and confirmation plus destructive styling for cancellation. Loading prevents repeat submission. |
| Governance | Removed the API snippet. Policy, task, and pause controls are not rendered until admin access is confirmed. Pause-all, revoke, and delete use destructive styling and confirmation. |
| Connection Center | Hidden `Coming Soon` and placeholder entries from the active tool grid. Mock preview is shown only for tools with a mock workflow. Planned integrations are summarized as unavailable rather than exposed as working controls. |
| Merch operations | Removed the duplicate Shopify owner phrase and the second visible store refresh action while preserving internal refresh behavior. Added responsive containment and shared styling for the previously unstyled revenue tables. |
| Dialogs and drawers | Added reusable initial focus, Escape handling, Tab containment, and focus restoration to Settings, command palette/help, Academy, screen-share confirmation, and node-removal confirmation. The closed inspector is now inert. |

## Shared component and visual standardization

- Extended the shared `Button` with a safe default `type="button"`, loading semantics, and a canonical danger variant.
- Added shared spacing, radius, control-height, danger, touch-target, and responsive table rules.
- Fixed `TextField` so an omitted ID still produces a valid label and error association.
- Consolidated authenticated-session read/write/clear behavior so stale sessions cannot leave a false real-account label after a 401 response.
- Made the desktop command mode strip a compact, non-overlapping status row while retaining screen-reader descriptions.
- Moved the full responsive breakpoint to 820px so the required 768px viewport uses Entral's intentional tablet/mobile command surface.
- Normalized mobile headers, overlay width/height, 44px touch targets, form width constraints, and table overflow containment.
- Added a global reduced-motion fallback for animations and transitions.

## Accessibility fixes

- One page-level `h1` remains on secondary routes; nested Chat content now uses an `h2`.
- Dialogs trap focus, close on Escape, and return focus to the initiating control.
- Settings tabs have IDs, tab panels, `aria-controls`, selected state, roving tab stops, and arrow/Home/End navigation.
- Icon-only controls retain accessible names.
- The command palette search has a persistent programmatic label.
- Automation validation uses `aria-invalid` and error/help associations.
- Hidden inspector controls cannot receive keyboard focus.
- Business template buttons retain native button semantics.
- Destructive actions are distinguishable by more than position and require confirmation.
- Status badges include text and icons; status is not communicated by color alone.

## Responsive and visual verification

Before screenshots:

- `docs/ui/screenshots/before/{dashboard,agents,automations,chat,admin,not-found}-{desktop,tablet,mobile}.png`
- Metrics: `docs/ui/screenshots/before/baseline-metrics.json`

After screenshots:

- `docs/ui/screenshots/after/{dashboard,agents,automations,chat,admin,not-found}-{desktop,tablet,mobile}.png`
- Metrics: `docs/ui/screenshots/after/after-metrics.json`

The final automated visual pass found:

- Zero horizontal-overflow routes at 1440px, 768px, or 390px.
- Zero duplicate visible action labels on the six captured route states.
- Zero unexplained visible disabled buttons on the six captured route states.
- Stable guest permission states instead of actionable controls that would fail only after submission.

## Verification completed

| Check | Result |
| --- | --- |
| Exact project runtime | Passed: Node.js 20.19.0 and pnpm 9.12.3 |
| Recursive TypeScript checks (`pnpm lint`) | Passed under the exact project runtime: frontend and backend |
| Unit/component/integration tests (`pnpm test`) | Passed under the exact project runtime: 48 frontend files / 189 tests and 54 backend files / 254 tests |
| Browser E2E (`node e2e/entral.e2e.mjs` with local frontend/backend URLs) | Passed under the exact project runtime: 6 scenarios, including all-route overflow, keyboard focus restoration, and console/page-error gates |
| Production build (`pnpm build`) | Passed under the exact project runtime: Next.js production build and backend TypeScript build |
| Release positioning (`pnpm test:release-positioning`) | Passed: 2 tests |
| Prisma generation (`pnpm prisma:generate`) | Passed after stopping the local backend that held the Windows engine DLL |
| Release readiness (`pnpm release:check`) | Passed: local gates and live drift check |
| Git whitespace check (`git diff --check`) | Passed |

## Remaining blockers

No release-critical UI blocker remains within this task's scope.

The local verification environment now uses the same Node.js 20.19.0 and pnpm 9.12.3 versions declared by the repository and CI/CD workflow. The earlier host-runtime discrepancy is resolved.

Production deployment was authorized as a separate follow-up after this UI task. Website integration, member authentication integration, billing integration, and public Entral marketing changes were not started.

# ENTRAL Hostile First-Time User Audit

Date: 2026-05-30

Scope: hostile first-time-user audit across the current ENTRAL frontend routes, shared layout, protected chrome, dashboard Command OS, command palette, onboarding, settings, chat, automations, agents, and governance screens. Desktop and mobile behavior were reviewed through route/component inspection, responsive CSS inspection, current local build/test output, and targeted source checks. Browser automation was attempted, but the in-app browser bridge was unavailable in this sandbox; this report does not pretend visual screenshots were captured.

## Summary

ENTRAL is organized enough for a new user to enter, sign up, land in the Command Center, and find the guided first-business path. The main confusion risk was discoverability: business creation existed inside the dashboard but was not accessible from the global command menu, and the dashboard's `View templates` button behaved like an explanation instead of opening templates. Those problems were fixed.

## Page-by-Page Audit

| Page | Purpose | Purpose obvious? | Discoverable? | Duplicated elsewhere? | Necessary? | Confusing? | Unfinished? | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Public landing page that routes users to signup/login and explains the Command OS at a high level. | Yes. The hero, CTA, and preview are clear. | Yes. Signup and login are visible. | No. | Keep. It is the public entry point. | Low. The preview is intentionally lightweight. | No obvious unfinished UI. | Keep. |
| `/login` | Authenticate returning operators. | Yes. | Yes. Login fields, forgot password, and signup link are visible. | No. | Keep. | Low. Password reset is framed as recovery help, not a hidden app feature. | Reset email delivery is not implemented. | Keep; no protected chrome appears here. |
| `/signup` | Create a new operator account. | Yes. | Yes. Landing page and login page both link to it. | No. | Keep. | Low. Form is short and labeled. | No obvious unfinished UI. | Keep; no protected chrome appears here. |
| `/dashboard` | Main Command OS: graph, hierarchy navigation, command console, business setup, inspector, and unified controls. | Mostly. | Improved. Business setup is now in the command palette and opens from `#business-setup`. | Partial overlap with `/agents` and `/chat`, but the dashboard is the single source of truth for the hierarchy. | Keep. This is the core product. | Medium before fixes; lower now. | Some real execution paths remain intentionally simulated/policy-gated. | Keep and simplify only when features duplicate management pages. |
| `/chat` | Focused saved communications, screen-aware help, and conversation import/export. | Yes. Subtitle separates it from hierarchy control. | Yes. App nav and command palette link to it. | Partial overlap with dashboard command console. | Keep. It preserves saved conversation workflows. | Low. History sidebar can close. | No obvious unfinished UI beyond backend availability. | Keep as "Communications," not hierarchy control. |
| `/automations` | Create, schedule, retry, cancel, and monitor automation jobs. | Yes. | Yes. App nav and command palette link to it. | Some task language overlaps with dashboard tasks. | Keep. It is the concrete job console. | Low. Form/list structure is conventional. | Depends on backend/worker availability. | Keep as automation management. |
| `/agents` | Create/configure agents, use templates, assign tasks, schedule background work, view logs. | Mostly. | Yes. App nav and command palette link to it. | Partial overlap with dashboard hierarchy entities. | Keep. It handles agent management separate from visualization. | Medium if "templates" is vague; fixed by renaming command-palette action to `Agent templates`. | No obvious empty page. | Keep; avoid duplicating dashboard hierarchy controls here. |
| `/admin` | Governance, policies, audit logs, and autonomy controls. | Yes for advanced users. | Yes. App nav and command palette link to it. | No. | Keep. | Low. Admin verification field explains when needed. | No obvious unfinished UI. | Keep as protected governance surface. |
| `/_not-found` and error route | On-brand fallback when routes fail. | Yes. | N/A. | No. | Keep. | Low. | No. | Keep. |

## Critical Issues

None found in this pass.

## High Priority Issues

- Fixed: Business creation was not visible enough outside the dashboard console. Added `Business setup` to the command palette.
- Fixed: Opening `/dashboard#business-setup` did not directly launch the guided setup. Added a dashboard event/hash handler.
- Fixed: Dashboard `View templates` did not open the actual template picker. It now opens guided business setup.
- Fixed: Generic `Open templates` wording could send users to agent templates when they expected business templates. Renamed it to `Agent templates`.

## Medium Priority Issues

- Fixed: Leftover old gold styling existed in hover states, message borders, status pills, skeletons, privacy notices, and chips. Replaced those with the active neon accent variable.
- Watch: `/chat` and dashboard command console are both conversational. Current copy makes the split clear enough: dashboard controls the hierarchy; `/chat` is saved communications.
- Watch: `/agents` and dashboard hierarchy both use agent language. Current page subtitle says the live hierarchy stays in the Command Center, which reduces duplication confusion.

## Low Priority Issues

- Fixed: Command palette search hints did not mention business setup. The placeholder and empty-state hint now include setup/business language.
- Watch: Some empty states remain intentionally simple. They are not dead pages, but should stay concise.
- Watch: Forgot password is discoverable, but production email reset is still outside this current UI cleanup.

## Fixed Issues

1. Added global `Business setup` command palette action.
2. Wired `entral:open-business-wizard` and `/dashboard#business-setup` to open the guided business wizard directly.
3. Changed dashboard `View templates` to open the real template picker instead of only posting explanatory text.
4. Renamed `Open templates` to `Agent templates`.
5. Updated command palette search copy to mention setup/business paths.
6. Removed stale gold theme references and the unused `--color-gold` variable.
7. Verified login/signup remain free of settings and command-palette chrome through `AppProviders`.
8. Verified mobile command console has hide/reopen controls and mobile navigation is visible through the `Navigate` control.

## Dead Buttons

- Fixed: Dashboard `View templates` felt dead because it only wrote a message. It now opens templates.
- No other obvious dead buttons found from component inspection.

## Empty Pages

- No empty route pages found.
- Empty states exist for agents, automations, conversations, tasks, logs, schedules, and audit logs; those are expected zero-data states, not empty pages.

## Duplicate Systems

- Dashboard command console vs `/chat`: related but not duplicate. Dashboard controls Command OS; `/chat` stores focused conversations and screen assistance.
- Dashboard hierarchy vs `/agents`: related but not duplicate. Dashboard visualizes command structure; `/agents` manages configurable/background agents.
- Automations vs dashboard tasks: related but not duplicate. Automations is the job-management page.

## Unused Architecture

- No clearly abandoned route/component was safe to delete in this pass.
- The Command OS/Merch architecture is large, but currently referenced by dashboard controls and backend routes/tests.

## Confusing Terminology

- Fixed: `Open templates` was ambiguous. It is now `Agent templates`.
- Current accepted hierarchy terms are visible: ENTRAL, Marshals, business Generals, Commanders, Soldiers.
- No `Enterprise` terminology found in the inspected frontend search.

## Missing Onboarding / Missing Explanations

- Existing Academy and first-business guidance are present.
- First-time business setup is now reachable through dashboard empty state, command suggestions, command palette, and `/dashboard#business-setup`.
- Login/signup intentionally avoid protected app chrome so first-time users are not distracted.

## Mobile Issues

- Fixed/verified in source: command console can be hidden and reopened.
- Verified in source: graph help text explains one-finger pan, two-finger rotate, and pinch zoom.
- Verified in source: mobile `Navigate` control exposes hierarchy navigation without keyboard shortcuts.
- Verified in source: chat, agents, and automation sidebars have close/show controls.
- Remaining risk: real phone/browser visual QA is still needed because this sandbox could not capture live screenshots.

## First-Time User Issues

- Fixed: first real action, `Business setup`, is now globally discoverable.
- Fixed: dashboard template action now opens the picker.
- Reduced: command palette hints now include business setup language.
- Remaining risk: a brand-new user may still need the Academy on first login, but the provider is already gated behind authentication and user-specific first-launch state.

## Verification

Passed:

- Frontend type check.
- Backend type check.
- Frontend tests.
- Backend tests.
- Frontend production build.
- Backend production build.

Not visually verified:

- In-app browser screenshots. Browser connection failed inside the sandbox, and local port `3000` responded with a stale server error while the production frontend build itself passed. Treat live desktop/mobile screenshot QA as the final manual smoke test after pushing.

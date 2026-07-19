# Entral member platform boundary

## Purpose

The `/member` surface is the member-facing Entral application boundary. It gives each provisioned organization its own Entral dashboard and organization neural map while remaining separate from the Sovereign internal command center. It does not render or return Sovereign agent controls, prompts, connectors, administrative diagnostics, governance controls, or cross-organization records.

## Authentication and sessions

- `/member/sign-in` uses Entral's existing verified-account authentication with a distinct `member` session audience.
- The browser submits credentials only to the same-origin `/api/member/login` bridge.
- The bridge accepts JSON only, limits the request body to 16 KiB, forwards the backend `Set-Cookie` response, and removes the backend bearer token before returning JSON to the browser.
- The HttpOnly Entral session cookie is authoritative. The member UI does not store a bearer token or long-lived credential in browser storage.
- Member login, email verification, and password reset issue the restricted member audience only when the account belongs to an explicitly provisioned organization. Recovery artifacts store the requesting flow, so a member recovery link cannot mint an internal session; a successful recovery without an entitlement clears the cookie and reports that access is not provisioned.
- The backend denies a member-audience cookie or bearer token on every route except the explicit authentication, health, and `/api/v1/member/**` allowlist. Hiding internal UI chrome is not an authorization boundary.
- Frontend middleware uses the HttpOnly cookie's scoped, expiring member claim as a presentation hint to redirect direct navigation away from internal routes before their chrome renders. This redirect is defense in depth only; the backend verifies the signature and remains the authorization boundary.
- Legacy cookies without an explicit valid session scope and audience are invalidated. Every pre-migration account retains its existing internal-login eligibility after signing in again; accounts created after migration default to member-only until an explicit administrative decision grants internal access.
- `/member` verifies the cookie against the backend before rendering organization data. Missing or rejected sessions return to member sign in; backend failures fail closed as an unavailable state.
- Return paths are restricted to protected `/member` paths to prevent open redirects.
- Member recovery and verification requests use `flow: "member"`, so emailed links return to `/member/password-reset` and `/member/verify-email` rather than the internal command center.
- Member routes are marked `noindex`, `nofollow`, `noarchive`, and `no-referrer`.

## Organization authorization

The existing `Team` / `TeamMember` relationship is the current organization boundary.

- Team membership is necessary but not sufficient: `Team.memberAccessEnabled` must also be explicitly enabled. All existing and new organizations migrate disabled.
- Public self-service signup is closed. `POST /api/v1/signup` requires an authenticated internal administrator and creates a member-only account in a disabled organization.
- Authorized internal tooling provisions or withdraws an organization through `PATCH /api/v1/admin/organizations/:organizationId/member-access`. The entitlement change and audit event are atomic.
- Entral Base fixes `Team.memberSeatLimit` at five or fewer seats. The migration adds a database check and PostgreSQL triggers that reject enabling an over-limit organization or inserting a sixth member into an enabled organization.
- `POST /api/v1/admin/organizations/:organizationId/members` is the only API path added for assigning an existing user to an Entral Base organization. It requires an internal administrator, serializes on the organization row, counts seats in the same serializable transaction, rejects at five, and stores the membership and audit event atomically. It does not send email or create an account.

- `GET /api/v1/member/organizations` derives organization memberships from the authenticated user ID.
- `GET /api/v1/member/organizations/:organizationId/overview` verifies the compound `userId_teamId` membership before querying any organization record.
- Every task and member query in the overview is server-scoped to the verified organization ID.
- Task aggregates and recent work include only records explicitly marked `memberVisible=true`. Existing and newly created tasks default to private.
- Missing and inaccessible identifiers return the same `404` response to avoid tenant discovery.
- Responses use explicit allowlisted projections and `Cache-Control: private, no-store` with origin/cookie/authorization variance.
- Cross-tenant negative tests verify that no task, member, or published-workspace query runs after membership verification fails.

The member UI reports the current seat usage as `n of 5`. The current architecture still has no invitation lifecycle, subscription state, or provider-backed billing model; those omissions are not represented as operational.

## Member-visible data

The first supported member overview is read-only and limited to:

- Organization name, member count, and the signed-in member's role.
- Aggregate status and overdue counts for tasks explicitly approved for member visibility.
- Up to eight recent member-visible organization tasks with safe assignee names.
- Organization member names and roles.
- The current member-seat count and enforced Entral Base allowance.
- A typed, organization-scoped published operating snapshot containing business health, objectives and priorities, findings and recommendations, a monthly operating summary, and an optional sanitized chain of command.
- A compact seven-node organization neural-map summary on `/member` plus the read-only multi-business ENTRAL Orbital Command system at `/member/graph`. Both are derived only from the same already authorized overview response; neither queries the internal Command OS or executable agent tables.

The compact neural map is an organization operating view, not a representation of autonomous execution. The complete member graph is a nested orbital command system: ENTRAL is the fixed sun, Marshals orbit ENTRAL, each General orbits its Marshal, each Commander orbits its General, and each Soldier orbits its Commander. Operating signals use separate subordinate tracks so they do not disrupt the command hierarchy. A published organization hierarchy may contain multiple Generals and up to 5,000 sanitized nodes. The WebGL renderer draws at most 900 nodes at once, preserves representative nodes from every command rank, and discloses how many lower-level nodes were omitted from the current rendering.

The hierarchy DTO contains only `id`, `name`, `parentId`, `rank`, and operating `status`. The strict publication schema requires one ENTRAL root and valid `ENTRAL -> Marshal -> General -> Commander -> Soldier` parent relationships. It rejects duplicate identifiers, missing parents, rank-skipping links, prompts, instructions, logs, tools, permissions, task content, approvals, diagnostics, and arbitrary fields. If an organization has not published a hierarchy, the member graph clearly labels and displays a member-safe starter topology with five Marshals, one organization General, four Commanders, and sixteen Soldiers. It never describes that starter topology as live organization data.

Approved business health, priorities, work, team, summaries, findings, and recommendations remain attached to the organization General as operating-signal branches. Exact assignee links are created only when a returned task references a returned organization member; the browser cannot supply or substitute an organization identifier.

Every graph node is therefore either a sanitized command-hierarchy node, a fixed Entral operating domain, or a representation of an organization-scoped record already present in `MemberOverviewResponse`. The compact `/member` map remains a deliberately restrained dashboard summary. The complete `/member/graph` route uses Entral's WebGL planetary visual language: a luminous Entral sun, parent-centered orbital tracks, rank-specific orbital motion, persistent high-command labels, a depth-first searchable chain of command, selected-body inspector, full-screen mode, and local speed, spacing, brightness, particle, label, palette, and per-branch color controls. The camera remains stable unless the member moves it; command bodies perform the orbital motion. It does not import or render the internal `NeuronsCommandCenter`, and it has no command input, agent execution, connector, or mutation path.

Selecting a command body or changing the 3D controls changes only the local rendering. The scene builder accepts only `MemberOverviewResponse`, the already authorized DTO returned for the verified organization, and performs no network request. Color preferences are stored locally under an organization-specific browser key and contain colors only. The complete view makes record counts and source limits explicit instead of implying that truncated API data is exhaustive. The canvas supports pointer rotation, wheel zoom, arrow-key rotation, plus/minus zoom, Home reset, visible focus, and a hierarchy that remains fully usable if WebGL is unavailable. Orbital motion can be paused, reduced-motion preference pauses it by default, and responsive layouts intentionally move the hierarchy and inspector below the planetary system on narrow screens to preserve touch targets and eliminate horizontal overflow.

Member roles returned to the browser are normalized to the public `OWNER | MEMBER` allowlist. Unknown or internal role strings fail closed to `MEMBER`. Both public roles may inspect the current read-only map. Any future owner-only write must be independently authorized on the server; the role badge is not an authorization boundary.

`MemberWorkspaceSnapshot` is one compact publication record per organization. Its JSON payload is validated against a strict allowlist before storage and again before member delivery; internal prompts, diagnostics, controls, and arbitrary fields are rejected rather than passed through. `PUT /api/v1/admin/organizations/:organizationId/member-workspace` is internal-admin-only, supports optimistic version checks, serializes concurrent publication, and writes the snapshot and a content-minimal audit record in one transaction. The audit stores counts and a hash, not the full operating narrative. A missing snapshot or an intentionally empty section renders as a clean read-only empty state with no dead member controls.

Production publication fails closed when `DATA_ENCRYPTION_KEY` is absent. When the key is configured, the published snapshot is stored in the existing AES-256-GCM secure-JSON envelope. Republishing content identical to a legacy plaintext row still rewrites that row into an encrypted envelope and records the storage-only re-encryption in the same audit transaction. This requirement is intentionally scoped to member-workspace publication so existing secure-JSON callers keep their established behavior.

This change does not add a public or member-facing approval, agent-execution, scheduling, connector, or command-routing control. Authorized internal tooling can publish or withdraw a task through `PATCH /api/v1/admin/tasks/:taskId/member-visibility`; that endpoint requires an Entral administrator, is rate-limited, is idempotent for repeated state, and atomically records the actor, organization, previous state, resulting state, request, and task in the audit log with the visibility mutation. Subscription management remains explicitly unavailable because no approved billing provider or subscription lifecycle exists.

## Request protections

- State-changing browser requests require a configured trusted `Origin`.
- Explicit cross-site Fetch Metadata is rejected.
- A cookie-authenticated mutation without `Origin` is rejected unless Fetch Metadata confirms `same-origin`.
- Existing non-browser bearer clients remain supported when `Origin` is absent.
- Public proxy failures return a request ID and safe message without upstream host or stack details.
- Authentication, account, and member responses are private and non-cacheable.

## Configuration

Backend configuration continues to use:

- `APP_PUBLIC_URL`: Entral's public frontend origin; also the allowlisted browser origin and base for authentication email links.
- `CORS_ORIGIN`: the allowed frontend origin for credentialed API requests.
- `COOKIE_NAME`: the HttpOnly session cookie name.
- `API_PROXY_URL`: the frontend server's private backend proxy target in production.
- `DATA_ENCRYPTION_KEY`: required for production member-workspace publication; used only server-side to encrypt and authenticate snapshot storage.

Frontend configuration adds:

- `NEXT_PUBLIC_SP_COMMAND_URL`: the public Sovereign Protocol origin used for the real support and consultation link. It contains no credentials and defaults to `https://spcommand.com`.

No billing provider, price, subscription model, billing secret, or billing-derived entitlement has been added to Entral. `memberAccessEnabled` is a deliberate internal provisioning decision independent of payment state. Billing remains outside this repository boundary until an approved provider and tested subscription architecture exist.

## Verification

The implementation includes tests for trusted-origin handling, no-Origin cookie rejection, non-browser compatibility, authentication requirements, organization scoping, cross-tenant denial before published-workspace lookup, private caching, strict member DTO projection, public role normalization, production encryption fail-closed behavior, AES-GCM snapshot storage, plaintext snapshot re-encryption, open-redirect rejection, browser token stripping, login body/content-type limits, member recovery routing, internal-chrome exclusion, real and empty published-workspace states, starter and published multi-business hierarchies, strict hierarchy link validation, internal-field rejection, deterministic bounded 3D coordinates, the 900-node rendering budget, exact assignment links, keyboard node selection, the WebGL fallback, local motion and color controls, member-source independence from internal command modules, manual and reduced-motion behavior, logout recovery, member-recovery field association, 404 retry suppression, multi-organization response races and identity mismatches, five-seat reporting, sixth-seat rejection, over-limit access rejection, serializable provisioning, optimistic publication conflicts, and audit-failure rollback for both seat provisioning and workspace publication.

The migration at `prisma/migrations/20260718000000_add_member_platform_boundaries/migration.sql` creates the closed member boundary, the five-seat database guards, and the one-snapshot-per-organization storage model. Apply it with the established `pnpm prisma:deploy` release process only after database backup and deployment approval.

`backend/tests/memberSeatPostgres.integration.test.ts` is an opt-in environment-parity harness. It creates a random disposable schema, applies the actual migration set, verifies direct and concurrent sixth-seat rejection plus over-limit enablement rejection, then drops the schema. Run it only against a disposable database by setting both `TEST_DATABASE_URL` and `RUN_POSTGRES_INTEGRATION=1` before the backend test command. On 2026-07-18 PostgreSQL 15.18 was installed locally and the harness passed against the dedicated `entral_test` database. The complete backend run with this opt-in test enabled passed 60 files and 293 tests.

Deployment of a reviewed build follows the established Entral release workflow. The graph introduces no migration, environment variable, privileged endpoint, writable member action, or billing dependency.

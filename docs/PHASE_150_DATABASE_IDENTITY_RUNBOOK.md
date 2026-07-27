# Phase 150 database identity runbook

Phase 150 uses five distinct database identities. The migration/bootstrap
identity owns schema changes. The API, worker, verifier, and audit-reader
identities are non-owner runtime logins that inherit only their matching
NOLOGIN group role:

| Service | Runtime group | Purpose |
| --- | --- | --- |
| API | `entral_api` | Authenticated request and command transactions |
| Worker | `entral_worker` | Background processing and outbox publication |
| Verifier | `entral_verifier` | Completes requested deterministic verifications |
| Audit tooling | `entral_audit_reader` | Read-only audit, event, and version review |
| Migration job | none | Applies migrations 043-045 and administers runtime roles |

The migration/bootstrap URL must never be present in an API or worker runtime.
`railway.json` therefore starts only the API and does not run migrations.
`railway.worker.json` is the separate worker-service configuration.

## Provision or rotate environment logins

Run these statements through a separately held PostgreSQL bootstrap connection.
Generate independent high-entropy passwords outside SQL and inject them with
the deployment provider's secret controls. Do not store them in the repository
or shell history.

```sql
CREATE ROLE entral_api_login
  LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  INHERIT NOREPLICATION PASSWORD '<API_SECRET>';
GRANT entral_api TO entral_api_login;

CREATE ROLE entral_worker_login
  LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  INHERIT NOREPLICATION PASSWORD '<WORKER_SECRET>';
GRANT entral_worker TO entral_worker_login;

CREATE ROLE entral_audit_login
  LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  INHERIT NOREPLICATION PASSWORD '<AUDIT_SECRET>';
GRANT entral_audit_reader TO entral_audit_login;

CREATE ROLE entral_verifier_login
  LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  INHERIT NOREPLICATION PASSWORD '<VERIFIER_SECRET>';
GRANT entral_verifier TO entral_verifier_login;
```

ENTRAL's runtime login roles use `INHERIT` so Prisma receives the matching
group privileges without issuing `SET ROLE`.

After the complete repository migration sequence, including the Phase 195
migration:

```powershell
$env:DATABASE_URL = "<bootstrap-or-admin-url>"
corepack pnpm prisma:roles
```

The command validates that both
`prisma/security/046_roles_and_grants.sql` and
`prisma/security/047_phase_195_roles_and_grants.sql` have exactly one outer
`BEGIN`/`COMMIT` wrapper. It strips only those wrappers and sends both policies,
in that order, through one `prisma db execute --stdin` connection under one
outer transaction. Normalization or SQL failure leaves neither policy
committed, so there is no revoke/grant gap or partially applied role state.
The combined role policy remains idempotent; re-run it after adding canonical
tables or functions.

## Reconcile pre-Phase-150 identities

Migration 045 deliberately leaves every preexisting unbound canonical identity
ineligible for automatic email linking. This prevents an old service identity,
recycled email, or stale record from inheriting interactive authority.

For each verified legacy human, compare the current `public."User"` record to
the canonical record under an administrator-controlled process. Prefer setting
`auth_subject` directly. If a one-time email link is necessary, set
`auth_link_eligible=true` for only that reviewed row and confirm the next
successful bind immediately resets it to `false`. Never enable this flag for a
service identity. An inactive bound identity is rejected and must not be
reactivated by a login attempt.

## Provision the outbox service identity

Create one non-interactive canonical identity for the worker. Generate the UUID
outside SQL and store it as a deployment secret; do not reuse a human email or
an identity previously linked through `auth_subject`.

```sql
INSERT INTO entral.app_users (
  id, email, display_name, is_human_authority, is_active,
  auth_subject, auth_link_eligible
) VALUES (
  '<OUTBOX_APP_USER_UUID>'::uuid,
  'canonical-outbox@service.internal',
  'Canonical Outbox Worker',
  false,
  true,
  NULL,
  false
);

INSERT INTO entral.scope_grants (
  user_id, scope_type, scope_id, permissions
) VALUES (
  '<OUTBOX_APP_USER_UUID>'::uuid,
  'SYSTEM',
  NULL,
  ARRAY['publish_events']::text[]
);
```

The worker database role has no identity-table access and no general canonical
command/query access. Its active canonical allowlist is limited to the
transactional outbox, the service binder, and the outbox RLS helper. Consumer
offsets remain ungranted until a governed consumer process is implemented.

The production worker also requires `JWT_SECRET`. Existing Shopify recovery
code uses it only as a fallback signing key when a dedicated
`SHOPIFY_APP_API_SECRET` is absent. Use the same rotated deployment secret
expected by that existing workflow; do not invent a repository default.
Worker-mode environment validation does not require API-only email delivery
variables (`RESEND_API_KEY` or `AUTH_EMAIL_FROM`).

## Provision the trusted verifier identity

The verifier login is separate from both the API and outbox worker. Create a
non-interactive canonical identity, grant it the system-level
`record_verification` capability, and grant only the business/classification
read permissions needed by its assigned verification workload:

```sql
INSERT INTO entral.app_users (
  id, email, display_name, is_human_authority, is_active,
  auth_subject, auth_link_eligible
) VALUES (
  '<VERIFIER_APP_USER_UUID>'::uuid,
  'canonical-verifier@service.internal',
  'Canonical Trusted Verifier',
  false,
  true,
  NULL,
  false
);

INSERT INTO entral.scope_grants (
  user_id, scope_type, scope_id, permissions
) VALUES
  (
    '<VERIFIER_APP_USER_UUID>'::uuid,
    'SYSTEM',
    NULL,
    ARRAY['record_verification']::text[]
  ),
  (
    '<VERIFIER_APP_USER_UUID>'::uuid,
    'BUSINESS',
    '<ASSIGNED_BUSINESS_UUID>'::uuid,
    ARRAY['read_ai','run_ai']::text[]
  );
```

Add `read_confidential` or `read_restricted` only when the verifier is
explicitly assigned to those classifications. The API may request a `PENDING`
verification but cannot update it or create a terminal result. Only a login
that is a member of `entral_verifier`, bound to an active service identity with
`record_verification`, can complete it. Human authority remains part of the
governance decision but does not self-attest deterministic execution. The
database derives and persists the trusted flag, canonical app-user ID, and
exact login role; caller-supplied custom settings cannot manufacture trust.

## Provision the audit service identity

The audit database login is a transport identity; RLS still requires a separate
canonical service identity. Generate a distinct UUID and bind it inside each
audit transaction:

```sql
INSERT INTO entral.app_users (
  id, email, display_name, is_human_authority, is_active,
  auth_subject, auth_link_eligible
) VALUES (
  '<AUDIT_APP_USER_UUID>'::uuid,
  'canonical-audit@service.internal',
  'Canonical Audit Reader',
  false,
  true,
  NULL,
  false
);

INSERT INTO entral.scope_grants (
  user_id, scope_type, scope_id, permissions
) VALUES (
  '<AUDIT_APP_USER_UUID>'::uuid,
  'SYSTEM',
  NULL,
  ARRAY['read_audit','read_events']::text[]
);
```

Call `entral.bind_service_app_user('<AUDIT_APP_USER_UUID>')` with
transaction-local settings before audit queries. The audit role cannot write
canonical or application records. `read_audit` and `read_events` do not imply
`read_confidential` or `read_restricted`: history rows persist the strongest
classification across their before/after states, and policies re-evaluate the
current classification of linked artifacts, memory, contexts, runs, and
retrieval records. Grant a classification permission separately only to an
audit identity whose operational purpose and credential handling require it.

## Deployment order

1. Back up the production database and record its restore point.
2. Apply repository migrations with the migration-only URL.
3. Run `pnpm prisma:roles` with the bootstrap URL so security policies 046 and
   047 apply through one connection and one transaction.
4. Provision or rotate the four environment login roles.
5. Provision the outbox, verifier, and audit service identities and their
   separate grants.
6. Set the API service `DATABASE_URL` to the API login and deploy it with
   `PROCESS_ROLE=api`.
7. Set the worker service `DATABASE_URL` to the worker login and deploy it with
   `PROCESS_ROLE=worker`. Configure `REDIS_URL`,
   `CANONICAL_OUTBOX_DISPATCHER_ENABLED=true`, and
   `CANONICAL_OUTBOX_SERVICE_APP_USER_ID=<OUTBOX_APP_USER_UUID>`. Keep
   `CANONICAL_OUTBOX_MAX_ATTEMPTS` at the governed retry limit (default 12);
   poison events then transition to terminal `DEAD_LETTER`.
8. Keep the verifier and audit credentials outside the API and outbox
   runtimes. Run verification in a separately deployed, governed process.
9. Verify all runtime logins are non-owner, non-superuser, non-`BYPASSRLS`,
   and non-`CREATEROLE`; then run the cross-business and transaction probes.
10. Create one canonical event and verify its outbox row reaches `PUBLISHED`
    and a BullMQ job with the same outbox UUID exists.

## Required connection behavior

All canonical API and worker access runs inside an interactive transaction.
The transaction sets action reason, correlation ID, and governance action ID
with transaction-local settings, then calls
`entral.bind_authenticated_app_user` or `entral.bind_service_app_user`.
Connection-level identity settings are forbidden because pooled sessions could
leak authority.

Idempotency key operation, scope, and request-hash bindings are immutable.
Keys move only from `IN_PROGRESS` to `SUCCEEDED` or `FAILED`, and completed
keys cannot be rewritten. A tool call and its bound key must finish in the
same transaction, with matching terminal status and exact replay output/error;
completed unbound keys and completed-key reuse are rejected. Governance actions
and tool calls may each bind a given idempotency key only once.

Tool calls and AI runs cannot enter `SUCCEEDED` without a matching `PASSED`
verification carrying database-derived trusted provenance. A run also cannot
be terminal while any recorded step or tool call remains nonterminal.

BullMQ jobs use the outbox UUID as `jobId` and are intentionally retained after
completion or failure. This preserves deduplication if Redis accepts a job and
the worker crashes before recording `PUBLISHED`. Any cleanup must be a separate
governed operation that removes only jobs below a verified PostgreSQL
publication/consumer watermark.

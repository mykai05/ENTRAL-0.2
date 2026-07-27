# ENTRAL Production Deployment

## Current Stack

- Frontend: Next.js App Router in `frontend`
- Backend: Fastify API and background workers in `backend`
- Database: PostgreSQL through Prisma
- Local package manager: pnpm workspace
- CI/CD: GitHub Actions

## Platform Recommendation

Vercel is recommended for the Next.js frontend.

The current Fastify backend is a persistent Node service with background workers, automation runners, schedulers, and orchestration loops. Deploy it to a long-running Node host such as Railway, Render, Fly.io, DigitalOcean App Platform, AWS ECS, or a VM/container platform. Do not deploy the current backend as-is to Vercel serverless functions without refactoring the API and workers.

## Required Production Environment

### Frontend, Vercel

| Variable | Required | Notes |
| --- | --- | --- |
| `API_PROXY_URL` | Yes for this topology | Public HTTPS URL of the deployed Fastify API. The documented Vercel deployment requires this proxy so member cookies and `/api/v1/*` requests remain same-origin. |
| `NEXT_PUBLIC_API_URL` | Optional | Use only for direct browser-to-backend API calls. Leave unset when using `API_PROXY_URL`. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public HTTPS URL of the deployed frontend, used for metadata and previews. |
| `COOKIE_NAME` | Recommended | Must match backend `COOKIE_NAME` if changed from `entral_token`. |

### Backend API and worker

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production`. |
| `PROCESS_ROLE` | Yes | Use `api` for the API service and `worker` for the worker service. The Railway start commands set this explicitly. |
| `DATABASE_URL` | Yes | Restricted PostgreSQL connection string for the service role. Do not give either runtime the database-owner or migration-only credential. |
| `JWT_SECRET` | Yes | At least 32 characters. Use a strong secret. |
| `CORS_ORIGIN` | Yes | Frontend production URL, for example `https://entral.example.com`. |
| `API_HOST` | Host-specific | Usually `0.0.0.0` for containers. |
| `API_PORT` | Host-specific | Use the port provided by the host when required. |
| `COOKIE_NAME` | Recommended | Defaults to `entral_token`; must match frontend middleware. |
| `APP_PUBLIC_URL` | Yes on API | Public HTTPS URL of the frontend. Auth verification and password reset emails use this for secure links. |
| `API_PUBLIC_URL` | Yes on API when Shopify OAuth is enabled | Public HTTPS URL of the API, used to build the Shopify OAuth callback. |
| `AUTH_EMAIL_PROVIDER` | Yes on API | Use `resend` in production. The API refuses production startup with console-only auth email delivery. |
| `AUTH_EMAIL_FROM` | Yes on API | Verified sender address for account verification and password reset email. |
| `RESEND_API_KEY` | Yes on API | Resend API key for real auth email delivery. |
| `OPENAI_API_KEY` | Required when AI is enabled | Without it, real AI requests must report unavailable; production may not substitute a local fallback. |
| `OPENAI_MODEL` | Recommended | Defaults to `gpt-4o`. |
| `AI_DAILY_COST_LIMIT_CENTS` | Recommended | Per-user daily AI estimate cap before provider calls. Defaults to `250`. |
| `AI_MONTHLY_COST_LIMIT_CENTS` | Recommended | Per-user monthly AI estimate cap before provider calls. Defaults to `2500`. |
| `AI_DECISION_ESTIMATED_COST_CENTS` | Optional | Estimated cost for the AI Brain classification/planning call. Defaults to `1`. |
| `AI_CHAT_ESTIMATED_COST_CENTS` | Optional | Estimated cost for a text command response. Defaults to `4`. |
| `AI_SCREEN_ESTIMATED_COST_CENTS` | Optional | Estimated cost for a screen/vision response. Defaults to `8`. |
| `AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS` | Optional | Cost estimate recorded for local fallback requests. Defaults to `0`. |
| `REDIS_URL` | Yes on worker | Redis connection used by BullMQ and the dedicated worker. It is optional on the API because canonical writes first enter the PostgreSQL outbox. |
| `CANONICAL_OUTBOX_DISPATCHER_ENABLED` | Yes on worker | Set `true` on the worker and `false` on the API so only one runtime dispatches the canonical outbox. |
| `CANONICAL_OUTBOX_SERVICE_APP_USER_ID` | Yes on worker | UUID of the actually provisioned restricted canonical service identity and scope used for durable outbox and readiness writes. |
| `LOG_LEVEL` | Optional | Defaults to `info`. |
| `AI_FEATURE_ENABLED` | Optional | Defaults to `true`. |
| `AI_LOCAL_FALLBACK` | Yes | Use `false` in production. Phase 195 production startup fails closed when a local AI fallback is reachable. |
| `AUTOMATION_FEATURE_ENABLED` | Optional | Defaults to `true`. |
| `AUTOMATION_WORKER_ENABLED` | Optional | Defaults to `true`. |
| `AUTOMATION_ALLOWED_DOMAINS` | Recommended | Comma-separated automation allow list. |
| `AUTOMATION_LOCAL_FALLBACK` | Yes | Use `false` in production. Phase 195 does not permit a success-shaped local automation fallback. |
| `AUTOMATION_MAX_CONCURRENCY` | Optional | Defaults to `2`, max `5`. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Optional | Required only when the host needs a custom browser path. |
| `AGENT_ORCHESTRATOR_ENABLED` | Optional | Defaults to `true`. |
| `AGENT_MAX_CONCURRENCY` | Optional | Defaults to `3`, max `10`. |
| `AUTONOMY_SCHEDULER_ENABLED` | Optional | Internal flag for background-agent scheduling. Defaults to `true`. |
| `AUTONOMY_SCHEDULER_INTERVAL_MS` | Optional | Background-agent scheduler polling interval. Defaults to `5000`. |
| `AUTONOMY_MIN_INTERVAL_MINUTES` | Optional | Defaults to `15`. |
| `DATA_ENCRYPTION_KEY` | Recommended | Enables app-level encryption for sensitive payloads. |
| `ADMIN_MFA_CODE` | Recommended | Requires admin MFA header when set. |
| `ALERT_WEBHOOK_URL` | Optional | Webhook target for policy-block and operational error alerts. |

### GitHub Actions Secrets

| Secret | Required | Notes |
| --- | --- | --- |
| `VERCEL_TOKEN` | Yes | Vercel token for production deploys. |
| `VERCEL_ORG_ID` | Yes | Vercel team/user ID. |
| `VERCEL_PROJECT_ID` | Yes | Vercel project ID. |

## Deployment Steps

1. Run the authoritative complete Phase 195 gate in
   [`docs/PHASE_195_VERIFICATION.md`](docs/PHASE_195_VERIFICATION.md) before
   changing a provider. The commands below are a quick developer preflight
   subset only; passing them does not authorize a deployment:

   ```powershell
   corepack pnpm test:phase195
   corepack pnpm test:e2e
   corepack pnpm build
   corepack pnpm release:check
   ```

2. Provision production PostgreSQL and Redis services, then create separate
   persistent Railway services for the API (`railway.json`) and worker
   (`railway.worker.json`).
3. Follow
   [`docs/PHASE_150_DATABASE_IDENTITY_RUNBOOK.md`](docs/PHASE_150_DATABASE_IDENTITY_RUNBOOK.md):
   back up the database, run `pnpm prisma:deploy` with the migration-only
   connection, and run `pnpm prisma:roles` separately with the bootstrap
   connection that can administer PostgreSQL roles.
4. Provision or rotate the restricted API and worker LOGIN roles and their
   NOLOGIN group-role memberships. Provision the scoped canonical outbox app
   user used by `CANONICAL_OUTBOX_SERVICE_APP_USER_ID`. Never put a
   database-owner, bootstrap, or migration-only credential in a runtime service.
5. Set the required production environment variables on both services, with
   `AI_LOCAL_FALLBACK=false` and `AUTOMATION_LOCAL_FALLBACK=false`; set the
   API-only email/public-URL variables and the worker-only Redis/outbox
   variables described above.
6. Build the shared contracts and backend, then start the API and worker through
   their respective Railway configurations:

   ```bash
   pnpm --filter @entral/contracts build
   pnpm --filter @entral/backend build
   pnpm --filter @entral/backend start
   pnpm --filter @entral/backend worker
   ```

7. Create a Vercel project for the repository root.
8. Set the required Vercel `API_PROXY_URL` to the API service HTTPS URL.
9. Set `NEXT_PUBLIC_APP_URL` to the frontend HTTPS URL after the first Vercel deploy.
10. Set `COOKIE_NAME` in Vercel only if the backend cookie name is customized.
11. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to GitHub Actions secrets.
12. Push to `main`; CI will verify, build, and deploy the frontend.
13. After deployment, run the strict public release check against the live URL:

   ```powershell
   $env:RELEASE_CHECK_STRICT_LIVE="1"
   $env:ENTRAL_LIVE_URL="https://entral-0-2-frontend.vercel.app"
   corepack pnpm release:check
   ```

14. After the exact-main provider, migration, CI, recovery, runtime-mode, and
    authenticated smoke receipts are independently verified, follow the
    validate-then-write procedure in
    [`docs/PHASE_195_VERIFICATION.md`](docs/PHASE_195_VERIFICATION.md) to record
    immutable release evidence with a separate migration-only or database-owner
    connection.

The live frontend should show the approved positioning, real/mock/read-only labels, and human approval copy before any public announcement or beta expansion.

## Direct Deployment Status

This workspace is prepared for frontend deployment through Vercel. Direct deployment from this local environment still requires network access, Vercel authentication, a linked Vercel project, and a deployed backend URL.

The backend must be deployed separately before the production frontend is fully usable.

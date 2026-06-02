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
| `API_PROXY_URL` | Recommended | Public HTTPS URL of the deployed Fastify backend. Vercel rewrites `/api/v1/*` through this proxy so auth cookies stay same-origin. |
| `NEXT_PUBLIC_API_URL` | Optional | Use only for direct browser-to-backend API calls. Leave unset when using `API_PROXY_URL`. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public HTTPS URL of the deployed frontend, used for metadata and previews. |
| `COOKIE_NAME` | Recommended | Must match backend `COOKIE_NAME` if changed from `entral_token`. |

### Backend

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | At least 32 characters. Use a strong secret. |
| `CORS_ORIGIN` | Yes | Frontend production URL, for example `https://entral.example.com`. |
| `API_HOST` | Host-specific | Usually `0.0.0.0` for containers. |
| `API_PORT` | Host-specific | Use the port provided by the host when required. |
| `COOKIE_NAME` | Recommended | Defaults to `entral_token`; must match frontend middleware. |
| `APP_PUBLIC_URL` | Yes | Public HTTPS URL of the frontend. Auth verification and password reset emails use this for secure links. |
| `AUTH_EMAIL_PROVIDER` | Yes | Use `resend` in production. The backend refuses production startup with console-only auth email delivery. |
| `AUTH_EMAIL_FROM` | Yes | Verified sender address for account verification and password reset email. |
| `RESEND_API_KEY` | Yes | Resend API key for real auth email delivery. |
| `OPENAI_API_KEY` | Required for real AI | Without it, AI must use local fallback. |
| `OPENAI_MODEL` | Recommended | Defaults to `gpt-4o`. |
| `AI_DAILY_COST_LIMIT_CENTS` | Recommended | Per-user daily AI estimate cap before provider calls. Defaults to `250`. |
| `AI_MONTHLY_COST_LIMIT_CENTS` | Recommended | Per-user monthly AI estimate cap before provider calls. Defaults to `2500`. |
| `AI_DECISION_ESTIMATED_COST_CENTS` | Optional | Estimated cost for the AI Brain classification/planning call. Defaults to `1`. |
| `AI_CHAT_ESTIMATED_COST_CENTS` | Optional | Estimated cost for a text command response. Defaults to `4`. |
| `AI_SCREEN_ESTIMATED_COST_CENTS` | Optional | Estimated cost for a screen/vision response. Defaults to `8`. |
| `AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS` | Optional | Cost estimate recorded for local fallback requests. Defaults to `0`. |
| `REDIS_URL` | Optional currently | Keep available for future BullMQ/Redis orchestration. |
| `LOG_LEVEL` | Optional | Defaults to `info`. |
| `AI_FEATURE_ENABLED` | Optional | Defaults to `true`. |
| `AI_LOCAL_FALLBACK` | Optional | Use `false` in production if real AI is required. |
| `AUTOMATION_FEATURE_ENABLED` | Optional | Defaults to `true`. |
| `AUTOMATION_WORKER_ENABLED` | Optional | Defaults to `true`. |
| `AUTOMATION_ALLOWED_DOMAINS` | Recommended | Comma-separated automation allow list. |
| `AUTOMATION_LOCAL_FALLBACK` | Optional | Defaults to `true`. |
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

1. Provision a production PostgreSQL database.
2. Deploy the backend to a persistent Node host.
3. Set all backend environment variables on that host.
4. Run production migrations:

   ```bash
   pnpm prisma:deploy
   ```

5. Build and start the backend:

   ```bash
   pnpm --filter @entral/backend build
   pnpm --filter @entral/backend start
   ```

6. Run local release checks before pushing:

   ```powershell
   npm.cmd run release:check
   npm.cmd run test:e2e
   npm.cmd --prefix frontend run build
   ```

7. Create a Vercel project for the repository root.
8. Set the Vercel environment variable `API_PROXY_URL` to the backend HTTPS URL.
9. Set `NEXT_PUBLIC_APP_URL` to the frontend HTTPS URL after the first Vercel deploy.
10. Set `COOKIE_NAME` in Vercel only if the backend cookie name is customized.
11. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to GitHub Actions secrets.
12. Push to `main`; CI will verify, build, and deploy the frontend.
13. After deployment, run the strict public release check against the live URL:

   ```powershell
   $env:RELEASE_CHECK_STRICT_LIVE="1"
   $env:ENTRAL_LIVE_URL="https://entral-0-2-frontend.vercel.app"
   npm.cmd run release:check
   ```

The live frontend should show the approved positioning, real/mock/read-only labels, and human approval copy before any public announcement or beta expansion.

## Direct Deployment Status

This workspace is prepared for frontend deployment through Vercel. Direct deployment from this local environment still requires network access, Vercel authentication, a linked Vercel project, and a deployed backend URL.

The backend must be deployed separately before the production frontend is fully usable.

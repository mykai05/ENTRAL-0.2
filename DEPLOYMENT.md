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
| `NEXT_PUBLIC_API_URL` | Yes | Public HTTPS URL of the deployed Fastify backend. |
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
| `OPENAI_API_KEY` | Required for real AI | Without it, AI must use local fallback. |
| `OPENAI_MODEL` | Recommended | Defaults to `gpt-4o`. |
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
| `AUTONOMY_SCHEDULER_ENABLED` | Optional | Defaults to `true`. |
| `AUTONOMY_SCHEDULER_INTERVAL_MS` | Optional | Defaults to `5000`. |
| `AUTONOMY_MIN_INTERVAL_MINUTES` | Optional | Defaults to `15`. |
| `DATA_ENCRYPTION_KEY` | Recommended | Enables app-level encryption for sensitive payloads. |
| `ADMIN_MFA_CODE` | Recommended | Requires admin MFA header when set. |
| `ALERT_WEBHOOK_URL` | Optional | Webhook target for policy-block alerts. |

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

6. Create a Vercel project for the repository root.
7. Set the Vercel environment variable `NEXT_PUBLIC_API_URL` to the backend HTTPS URL.
8. Set `COOKIE_NAME` in Vercel only if the backend cookie name is customized.
9. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to GitHub Actions secrets.
10. Push to `main`; CI will verify, build, and deploy the frontend.

## Direct Deployment Status

This workspace is prepared for frontend deployment through Vercel. Direct deployment from this local environment still requires network access, Vercel authentication, a linked Vercel project, and a deployed backend URL.

The backend must be deployed separately before the production frontend is fully usable.

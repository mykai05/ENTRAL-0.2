# ENTRAL Fast Deployment Path

This is the simplest production setup:

- Railway: PostgreSQL, Redis, Fastify API, and a separate background worker
- Vercel: Next.js frontend

## What Is Already Prepared

- `railway.json` tells Railway how to build, start, and healthcheck the API.
- `railway.worker.json` tells Railway how to build and start the worker.
- `vercel.json` tells Vercel how to build the frontend from this monorepo.
- The backend reads Railway's `PORT` automatically.
- The frontend can proxy `/api/v1/*` requests to the Railway backend through `API_PROXY_URL`.

## What You Still Need To Do

1. Pass the local release gates, push the accepted branch to GitHub, and require
   a successful CI run before production changes.
2. Create a Railway project and add PostgreSQL and Redis.
3. Add separate API and worker services from GitHub, using `railway.json` and
   `railway.worker.json` respectively.
4. Follow
   [`docs/PHASE_150_DATABASE_IDENTITY_RUNBOOK.md`](docs/PHASE_150_DATABASE_IDENTITY_RUNBOOK.md):
   run `pnpm prisma:deploy` with the migration-only connection, then run
   `pnpm prisma:roles` separately with the role-admin bootstrap connection.
5. Provision or rotate the restricted API/worker LOGIN roles and their NOLOGIN
   memberships, plus the scoped canonical outbox app-user identity. Do not put
   an owner, bootstrap, or migration-only credential in a runtime service.
6. Add the API and worker environment variables, with both production fallback
   flags set to `false`.
7. Deploy both services and copy the API public URL.
8. Create a Vercel project from the same GitHub repo.
9. Add the required Vercel frontend environment variables.
10. Deploy Vercel and copy the frontend URL.
11. Update Railway `CORS_ORIGIN` and `APP_PUBLIC_URL` to the final Vercel URL.
12. Redeploy the API and worker if their shared variables changed.
13. Test signup, login, dashboard, graph persistence, and worker readiness.
14. After every exact-main receipt exists, follow
    [`docs/PHASE_195_VERIFICATION.md`](docs/PHASE_195_VERIFICATION.md) to validate
    and then record immutable release evidence.

## Railway API and Worker Variables

Set these on both Railway runtime services. Their start commands set
`PROCESS_ROLE=api` and `PROCESS_ROLE=worker` respectively:

```env
NODE_ENV=production
API_HOST=0.0.0.0
JWT_SECRET=replace-with-generated-secret
COOKIE_NAME=entral_token
CORS_ORIGIN=https://replace-after-vercel-deploy.vercel.app
OPENAI_API_KEY=replace-with-openai-key
OPENAI_MODEL=gpt-4o
AI_FEATURE_ENABLED=true
AI_LOCAL_FALLBACK=false
AUTOMATION_FEATURE_ENABLED=true
AUTOMATION_WORKER_ENABLED=true
AUTOMATION_LOCAL_FALLBACK=false
AUTOMATION_ALLOWED_DOMAINS=example.com
AGENT_ORCHESTRATOR_ENABLED=true
AUTONOMY_SCHEDULER_ENABLED=true
LOG_LEVEL=info
DATA_ENCRYPTION_KEY=replace-with-generated-secret
```

Add `DATABASE_URL` separately to each service using its restricted API or
worker LOGIN role; do not reference an owner, bootstrap, or migration-only
credential.

Set these API-only values:

```env
APP_PUBLIC_URL=https://replace-with-vercel-frontend-url
API_PUBLIC_URL=https://replace-with-railway-api-url
AUTH_EMAIL_PROVIDER=resend
AUTH_EMAIL_FROM=replace-with-verified-sender
RESEND_API_KEY=replace-with-resend-key
CANONICAL_OUTBOX_DISPATCHER_ENABLED=false
```

`API_PUBLIC_URL` is mandatory when Shopify OAuth is enabled. `APP_PUBLIC_URL`
and the Resend values are required for production member verification and
password-reset email.

Set these worker-only values:

```env
REDIS_URL=replace-with-railway-redis-reference
CANONICAL_OUTBOX_DISPATCHER_ENABLED=true
CANONICAL_OUTBOX_SERVICE_APP_USER_ID=replace-with-provisioned-outbox-app-user-uuid
```

The outbox app-user UUID must already exist with the governed canonical scope
and grants; an arbitrary UUID does not establish authority. Keep the dispatcher
disabled on the API so there is one durable publisher. `REDIS_URL` is optional
on the API unless an explicitly enabled API feature uses Redis.

Generate `JWT_SECRET` and `DATA_ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Run it twice and use a different value for each secret.

## Vercel Frontend Variables

Set these on the Vercel frontend project:

```env
API_PROXY_URL=https://replace-with-railway-backend-url
COOKIE_NAME=entral_token
NEXT_PUBLIC_APP_URL=https://replace-with-vercel-frontend-url
```

Do not put `OPENAI_API_KEY` on Vercel. It belongs only on Railway.

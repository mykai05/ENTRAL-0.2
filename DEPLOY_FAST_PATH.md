# ENTRAL Fast Deployment Path

This is the simplest production setup:

- Railway: PostgreSQL database and Fastify backend
- Vercel: Next.js frontend

## What Is Already Prepared

- `railway.json` tells Railway how to build, migrate, start, and healthcheck the backend.
- `vercel.json` tells Vercel how to build the frontend from this monorepo.
- The backend reads Railway's `PORT` automatically.
- The frontend can proxy `/api/v1/*` requests to the Railway backend through `API_PROXY_URL`.

## What You Still Need To Do

1. Push the latest code to GitHub.
2. Create a Railway project.
3. Add Railway PostgreSQL.
4. Add the backend service from GitHub.
5. Add Railway backend environment variables.
6. Deploy the backend and copy its public URL.
7. Create a Vercel project from the same GitHub repo.
8. Add Vercel frontend environment variables.
9. Deploy Vercel and copy the frontend URL.
10. Update Railway `CORS_ORIGIN` to the final Vercel URL.
11. Redeploy Railway.
12. Test signup, login, dashboard, and chat.

## Railway Backend Variables

Set these on the Railway backend service:

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
AUTOMATION_LOCAL_FALLBACK=true
AUTOMATION_ALLOWED_DOMAINS=example.com
AGENT_ORCHESTRATOR_ENABLED=true
AUTONOMY_SCHEDULER_ENABLED=true
LOG_LEVEL=info
DATA_ENCRYPTION_KEY=replace-with-generated-secret
```

Add `DATABASE_URL` as a Railway reference from the PostgreSQL service.

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

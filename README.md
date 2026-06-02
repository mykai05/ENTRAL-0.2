# Entral Platform MVP

This workspace contains the working foundation for Entral:

- `frontend`: Next.js App Router UI for landing, sign-in, sign-up, and dashboard.
- `backend`: Fastify REST API with JWT auth, HttpOnly cookies, validation, rate limiting, task endpoints, AI chat endpoints, automation endpoints, and agent orchestration endpoints.
- `prisma`: Prisma schema for users, teams, memberships, tasks, conversations, messages, automation jobs, automation logs, agents, agent tasks, agent logs, and agent messages.

## Local Setup

### Fast UI Start

On Windows, double-click `start-entral.cmd` from the project folder. It starts the frontend on `http://localhost:3000`, starts a local memory backend on `http://localhost:4000`, and keeps the server window open.

If you prefer the terminal:

```powershell
npm.cmd run dev
```

Keep that terminal open while using the app. Closing it stops both local servers.

The fast start uses an in-memory backend so signup, login, dashboard, tasks, chat, automations, agents, and admin screens are usable without PostgreSQL. Data resets when the server stops.

### E2E Smoke Tests

Run browser smoke coverage for auth, dashboard, chat, and mobile:

```powershell
npm.cmd run test:e2e
```

The E2E runner starts or reuses the local memory backend on `http://127.0.0.1:4000` and the frontend on `http://localhost:3000`. It uses installed Edge or Chrome through `playwright-core`; set `E2E_BROWSER_EXECUTABLE` if your browser lives somewhere else.

### Release Readiness Gate

Run the launch safety gate before treating a build as public-release-ready:

```powershell
npm.cmd run release:check
```

The check fails when local source is missing the approved positioning, real/mock/read-only labels, human approval gates, cost guardrails, or locked growth orchestration behavior. It also scans public source and docs for forbidden launch claims such as unsupported full-operation or external-execution promises.

The command checks `https://entral-0-2-frontend.vercel.app` by default and warns when the live deployment is behind local source. Set `ENTRAL_LIVE_URL` to check another public URL. Set `RELEASE_CHECK_STRICT_LIVE=1` for a final release pass where live deployment drift should fail the command.

### Full Stack Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL 15 locally and make sure `DATABASE_URL` in `.env` points to it.

4. Generate the Prisma client and apply migrations:

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. Start both apps:

   ```bash
   npm.cmd run dev:backend:real
   ```

The frontend runs on `http://localhost:3000` and the API runs on `http://localhost:4000`. Use `npm.cmd run dev:frontend` in a second terminal when running the real backend.

## API Contracts

All API routes are versioned under `/api/v1` and return JSON.

### `POST /api/v1/signup`

Request:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "correct-horse-battery-staple"
}
```

Response `201`:

```json
{
  "user": {
    "id": "clx...",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "role": "USER"
  },
  "team": {
    "id": "clx...",
    "name": "Ada Lovelace's Team",
    "slug": "ada-lovelace-clx..."
  }
}
```

### `POST /api/v1/login`

Request:

```json
{
  "email": "ada@example.com",
  "password": "correct-horse-battery-staple"
}
```

Response `200`:

```json
{
  "user": {
    "id": "clx...",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "role": "USER"
  }
}
```

### `POST /api/v1/logout`

Clears the auth cookie.

### `GET /api/v1/me`

Requires auth. Returns the current user and their teams.

### `GET /api/v1/tasks?page=1&pageSize=20`

Requires auth. Returns paginated tasks visible to the current user's teams.

### `POST /api/v1/tasks`

Requires auth.

Request:

```json
{
  "title": "Review onboarding flow",
  "description": "Check mobile layout and auth states",
  "status": "TODO",
  "teamId": "optional-team-id"
}
```

Response `201`:

```json
{
  "task": {
    "id": "clx...",
    "title": "Review onboarding flow",
    "status": "TODO"
  }
}
```

### `GET /api/v1/ai/conversations`

Requires auth. Returns up to 50 conversations owned by the current user.

### `POST /api/v1/ai/conversations`

Requires auth. Creates a new empty conversation.

Request:

```json
{
  "title": "Planning"
}
```

### `GET /api/v1/ai/conversations/:conversationId`

Requires auth. Returns one conversation and all messages, only if owned by the current user.

### `DELETE /api/v1/ai/conversations/:conversationId`

Requires auth. Deletes one owned conversation and its messages.

### `POST /api/v1/ai/chat`

Requires auth. Appends a user message, calls the server-side AI service, saves the assistant response, and returns it.

Request:

```json
{
  "conversationId": "optional-existing-conversation-id",
  "message": "Help me plan onboarding tasks"
}
```

Response `200`:

```json
{
  "conversationId": "clx...",
  "messageId": "clx...",
  "content": "Assistant reply text",
  "createdAt": "2026-05-25T22:45:00.000Z",
  "userMessage": {
    "messageId": "clx...",
    "content": "Help me plan onboarding tasks",
    "createdAt": "2026-05-25T22:44:59.000Z"
  }
}
```

## AI Configuration

AI calls happen only in the backend. Set `OPENAI_API_KEY` in `.env` or your deployment environment. `OPENAI_MODEL` defaults to `gpt-4o`.

For local development without an API key, `AI_LOCAL_FALLBACK=true` returns a deterministic fallback reply so the UI and persistence flow can be tested without exposing a key.

## Automation Configuration

Automation jobs are processed by a DB-backed worker in the backend. This keeps Phase 3 runnable locally without Redis while preserving a polling-friendly job contract that can move to BullMQ/Redis later.

Set `AUTOMATION_ALLOWED_DOMAINS` to a comma-separated allow list. Local development defaults to `localhost,127.0.0.1,example.com`. Playwright uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when provided. If a browser executable is unavailable and `AUTOMATION_LOCAL_FALLBACK=true`, scrape jobs fall back to a simple HTTP extraction path.

### `GET /api/v1/automation/jobs`

Requires auth. Returns the current user's latest automation jobs with recent logs.

### `POST /api/v1/automation/jobs`

Requires auth. Creates a scrape job and returns immediately.

Request:

```json
{
  "type": "scrape",
  "payload": {
    "url": "http://localhost:3000",
    "selector": "h1"
  },
  "scheduledAt": "2026-05-25T23:15:00.000Z"
}
```

Response `201`:

```json
{
  "job": {
    "id": "clx...",
    "type": "scrape",
    "status": "pending",
    "payload": {
      "url": "http://localhost:3000",
      "selector": "h1"
    },
    "result": null,
    "event": {
      "taskId": "clx...",
      "status": "pending",
      "result": null
    }
  }
}
```

### `GET /api/v1/automation/jobs/:jobId`

Requires auth. Returns one owned job with logs and result.

### `POST /api/v1/automation/jobs/:jobId/cancel`

Requires auth. Cancels a pending or scheduled owned job.

### `POST /api/v1/automation/jobs/:jobId/retry`

Requires auth. Requeues a finished owned job.

## Agent Orchestration Configuration

Phase 4 agents are coordinated by a DB-backed orchestrator in the backend. It stores the same message-bus events a Redis Pub/Sub worker would publish (`task-assigned`, `task-started`, and `task-result`), which keeps local development simple while preserving a clean upgrade path to Redis-backed workers.

Set `AGENT_ORCHESTRATOR_ENABLED=true` to process queued agent tasks. `AGENT_MAX_CONCURRENCY` controls how many agent tasks the local orchestrator runs at once.

### `GET /api/v1/agents`

Requires auth. Returns the current user's agents with load and status.

### `POST /api/v1/agents`

Requires auth. Registers a specialized agent.

Request:

```json
{
  "name": "Researcher",
  "role": "Research and summarize findings",
  "capabilities": ["research", "summarize", "qualify"]
}
```

Response `201`:

```json
{
  "agent": {
    "id": "clx...",
    "name": "Researcher",
    "role": "Research and summarize findings",
    "capabilities": ["research", "summarize", "qualify"],
    "status": "idle",
    "isPaused": false,
    "load": 0
  }
}
```

### `GET /api/v1/agents/:agentId`

Requires auth. Returns one owned agent with recent tasks, logs, and agent messages.

### `GET /api/v1/agents/:agentId/status`

Requires auth. Returns the latest status for one owned agent.

### `POST /api/v1/agents/:agentId/assign`

Requires auth. Assigns a task to an agent and returns immediately with a stable orchestration event.

Request:

```json
{
  "title": "Research target account",
  "action": "research",
  "payload": {
    "instructions": "Find useful public details and summarize the next best action.",
    "context": "Optional context from chat, automation, or tasks",
    "sourceType": "manual"
  }
}
```

Response `201`:

```json
{
  "task": {
    "id": "clx...",
    "agentId": "clx...",
    "title": "Research target account",
    "action": "research",
    "status": "queued",
    "payload": {
      "instructions": "Find useful public details and summarize the next best action.",
      "context": "Optional context from chat, automation, or tasks",
      "sourceType": "manual"
    },
    "result": null
  },
  "event": {
    "type": "task-assigned",
    "taskId": "clx...",
    "agentId": "clx...",
    "action": "research",
    "payload": {
      "instructions": "Find useful public details and summarize the next best action."
    }
  }
}
```

### Agent Controls

These routes require auth and only affect owned agents:

- `POST /api/v1/agents/:agentId/pause`
- `POST /api/v1/agents/:agentId/resume`
- `POST /api/v1/agents/:agentId/restart`

## Governance And Scheduled Work Configuration

Phase 5 adds approved recurring schedules, policy enforcement, audit logging, and an admin dashboard at `/admin`.

Set `AUTONOMY_SCHEDULER_ENABLED=true` to let the backend turn due approved schedules into agent tasks. `AUTONOMY_SCHEDULER_INTERVAL_MS` controls how often the scheduler checks for due work. `AUTONOMY_MIN_INTERVAL_MINUTES` caps how frequently a recurring schedule can run. These environment variable names are retained for compatibility; the product language should describe scheduled, approved work.

Set `DATA_ENCRYPTION_KEY` to enable app-level AES-GCM encryption for sensitive JSON payloads and audit entries. Existing plaintext JSON remains readable so local development can upgrade safely. Set `ADMIN_MFA_CODE` to require admins to send `x-admin-mfa-code` on admin API calls. Set `ALERT_WEBHOOK_URL` to receive policy-block alerts in Slack/email-style webhook tools.

Default policies are seeded automatically on first startup:

- Block credential exfiltration keywords.
- Block internal metadata domains.
- Limit each agent to 50 tasks per hour.

### `POST /api/v1/agents/:agentId/schedules`

Requires auth. Creates a recurring schedule for one owned agent. The scheduler creates agent tasks only inside the configured schedule, policy, and audit boundaries.

Request:

```json
{
  "title": "Daily account pulse",
  "action": "research",
  "intervalMinutes": 60,
  "runImmediately": true,
  "payload": {
    "instructions": "Run a scheduled account check and summarize changes.",
    "sourceType": "schedule"
  }
}
```

Response `201`:

```json
{
  "schedule": {
    "id": "clx...",
    "agentId": "clx...",
    "title": "Daily account pulse",
    "action": "research",
    "status": "active",
    "intervalMinutes": 60,
    "nextRunAt": "2026-05-26T02:30:00.000Z"
  }
}
```

### Schedule Controls

These routes require auth and only affect owned agent schedules:

- `POST /api/v1/agents/:agentId/schedules/:scheduleId/pause`
- `POST /api/v1/agents/:agentId/schedules/:scheduleId/resume`
- `POST /api/v1/agents/:agentId/schedules/:scheduleId/revoke`

### `GET /api/v1/admin/overview`

Requires admin role. Returns system health, active agent tasks, policies, and recent audit entries.

### `POST /api/v1/admin/policies`

Requires admin role. Creates a governance policy.

Request:

```json
{
  "name": "Block sensitive data requests",
  "enabled": true,
  "effect": "block",
  "severity": "high",
  "rule": {
    "kind": "blocked_keywords",
    "keywords": ["password", "api key", "private key"]
  }
}
```

Supported rule kinds are `blocked_keywords`, `blocked_domains`, `agent_quota`, and `manual_approval_required`.

### Admin Policy And Audit Routes

These routes require admin role:

- `GET /api/v1/admin/policies`
- `PATCH /api/v1/admin/policies/:policyId`
- `DELETE /api/v1/admin/policies/:policyId`
- `GET /api/v1/admin/audit-logs?page=1&pageSize=50`
- `POST /api/v1/admin/agent-tasks/:taskId/revoke`
- `POST /api/v1/admin/agents/pause-all`

Audit entries use a standard JSON shape with actor, target, action, outcome, severity, metadata, timestamp, and an integrity hash. Policy checks run before agent execution and before scheduled work is converted into an agent task.

## Test Plan

- Launch safety gate: `npm.cmd run release:check`
- Backend validation and auth utilities: `pnpm --filter @entral/backend test`
- Backend policy helpers and governance schemas: `pnpm --filter @entral/backend test`
- Frontend component rendering: `pnpm --filter @entral/frontend test`
- Full workspace checks: `pnpm lint && pnpm test && pnpm build`

## Deployment Notes

The included GitHub Actions workflow verifies lint, tests, Prisma client generation, and builds. A production Vercel deployment job is included for `main` and expects Vercel secrets to be configured in GitHub.

The verification job also runs `pnpm audit --audit-level high` so dependency vulnerabilities fail CI before deployment.

See `DEPLOYMENT.md` for the production environment checklist, Vercel frontend setup, and backend hosting requirements.

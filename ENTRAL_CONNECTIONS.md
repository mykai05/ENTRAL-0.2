# ENTRAL Connection Center

The Connection Center is the visible tool bay for ENTRAL integrations. It is available from the dashboard command console under `Tools`.

## Purpose

The Connection Center shows:

- Tool name and category
- Connection status
- Risk level
- Required credentials
- Provider/model details for AI tools
- Missing environment variables, by name only
- Whether approval is required
- Available actions
- Test connection action
- Mock execution action

## Backend Routes

- `GET /api/v1/connections/tools`
- `GET /api/v1/connections/development-status`
- `POST /api/v1/connections/tools/:toolId/test`
- `POST /api/v1/connections/tools/:toolId/mock-execute`

All routes require authentication.

## OpenAI Provider

The OpenAI provider is the only real provider targeted by v0.4.1.

- Secrets stay backend-only in `OPENAI_API_KEY`.
- `OPENAI_MODEL` controls the model and defaults to `gpt-4o`.
- Test connection performs a backend provider health check when a key exists.
- If the key is missing, the card reports `Missing API Key` and ENTRAL continues in Mock Mode.
- The frontend never receives or stores the API key.

## GitHub + Vercel Read-Only Development Connections

GitHub and Vercel are now the first non-AI real status integrations. They are strictly read-only.

GitHub backend env vars:

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`

Vercel backend env vars:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

ENTRAL can read:

- GitHub repository metadata, default branch, latest commit, recent commits, open pull requests, workflow/check status when available, repository URL, and last push timestamp.
- Vercel project metadata, latest deployment, production deployment, deployment URL, build/error summary when available, and last deployment timestamp.

ENTRAL cannot:

- Push code
- Create commits
- Merge pull requests
- Delete branches
- Trigger Vercel deployments
- Roll back deployments
- Edit files
- Modify Vercel settings or environment variables

If credentials are missing, the Connection Center shows `Missing Credentials` and explains Mock Mode. The frontend only receives safe status metadata and required environment variable names.

## Real Integration Rules

Before a tool becomes real, credentials must remain backend-only, scopes must be documented, authorization must be enforced, and audit logging must record the request and result.

Gmail, Etsy, Printify, Shopify, Codex, and other non-AI integrations remain mock/future tools. GitHub and Vercel are read-only only. No write external actions are enabled until their own approval and policy layers are implemented.

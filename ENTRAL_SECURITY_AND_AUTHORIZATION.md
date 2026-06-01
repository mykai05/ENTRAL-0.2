# ENTRAL Security And Authorization

ENTRAL v0.4 is designed around approval-gated execution.

## Core Rule

No external side effect should happen without explicit user authorization.

This includes sending email, creating calendar events, deploying, publishing products or listings, posting to social media, charging money, editing external files, or running browser automation against external systems.

GitHub and Vercel are exceptions only for read-only status inspection. They may read pipeline health, but cannot modify source control or deployment state.

## Authorization Levels

- `not_required`: local conversation or harmless UI command
- `recommended`: research/mock plan or low-risk external planning
- `required`: mutation, publishing, communication, money movement, deployment, or high-risk action

## Audit Records

AI Brain audit entries track plan ID, user request, intent, plan summary, tools used, entities changed, provider name, model name, authorization status, execution result, errors, and timestamp.

GitHub/Vercel status checks create low-risk audit entries with tool name, action, request context when available, result status, outcome, timestamp, and explicit `writeActionsEnabled: false`.

## Credential Rules

Credentials must never be exposed to the frontend. The frontend can show credential names such as `OPENAI_API_KEY`, but not values.

## AI Provider Rule

OpenAI is the first backend-only AI provider. Missing `OPENAI_API_KEY` is not fatal; ENTRAL reports `AI Provider Not Connected` and remains in Mock Mode. Provider JSON is validated before it can influence classification or action plans.

## GitHub + Vercel Read-Only Rule

Required backend-only credentials:

- GitHub: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

The frontend receives only safe metadata: status, repository/project names, branch, latest commit summary, deployment status, URLs, missing environment variable names, and Mock Mode guidance.

Forbidden in v0.4.2:

- Pushing code
- Creating commits
- Merging pull requests
- Deleting branches
- Triggering deployments
- Rolling back deployments
- Changing Vercel settings or environment variables

If the user requests one of these actions, ENTRAL must refuse and explain that GitHub/Vercel are read-only in this phase.

## Current Limit

External providers beyond OpenAI, GitHub read-only status, and Vercel read-only status are not truly connected. Connection Center test/mock actions are safe simulations for those tools.

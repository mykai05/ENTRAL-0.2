# ENTRAL Tool Registry

The Tool Registry is the canonical list of tools ENTRAL knows how to reason about.

## Registry Fields

Each tool includes `id`, `name`, `category`, `description`, `status`, `connectionStatus`, `requiredCredentials`, `availableActions`, `requiresAuthorization`, `riskLevel`, and optional safe metadata such as `missingEnvVars`, `readOnly`, and `writeActionsEnabled`.

## Tool Statuses

- Connected
- Mock Mode
- Not Connected
- Needs Credentials
- Missing Credentials
- Coming Soon
- Disabled
- Error

## Risk Levels

- Low
- Medium
- High
- Critical

High and Critical tools require explicit authorization before execution.

Read-only Low-risk tools may be queried without write authorization, but they still create audit records.

## Current Tool Families

AI providers, development tools, email, calendar, POD, e-commerce, design, website, research, file storage, payments, social media, browser automation, and analytics.

The frontend registry exists for UI planning and fallback display. The backend registry is authoritative for connection state because credentials and environment variables are server-side only.

## GitHub + Vercel Read-Only Tools

`github` is a Development tool and `vercel` is a Deployment tool.

Both are marked:

- Risk level: Low
- Read-only: true
- Write actions enabled: false
- Authorization for future write actions: required before any future phase can enable writes

Supported read-only actions:

- GitHub: repository metadata, default branch, recent commits, open pull requests, workflow/check status.
- Vercel: project metadata, latest deployment, production deployment, deployment URL, deployment status.

Forbidden actions in v0.4.2:

- Push code
- Create commits
- Merge PRs
- Delete branches
- Trigger deployments
- Roll back deployments
- Modify Vercel settings or environment variables

## Shopify Autonomy Tooling

`shopify` is a High-risk E-commerce tool that always requires authorization before live write actions.

Supported autonomy actions now include store-creation provisioning packets, governed Dev Dashboard browser tasks, browser-task capture, OAuth start/continue, queued autonomy resume runs, and controlled draft storefront actions.

The governed store-creation browser task can use `SHOPIFY_DEV_DASHBOARD_STORAGE_STATE_PATH` when the owner has already exported an authenticated Playwright storage-state file after signing into Shopify Dev Dashboard. The registry exposes `devDashboardStorageStateStatus` as `not_configured`, `missing`, or `ready` so autonomy planning can distinguish a blank browser from a usable owner-approved session. This improves autonomous store creation without entering credentials or bypassing MFA. Billing, paid plans, payouts, payments, domain purchases, app charges, and public publishing remain hard stops.

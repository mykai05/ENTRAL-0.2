# ENTRAL Tool Registry

The Tool Registry is the canonical list of tools ENTRAL knows how to reason about.

## Registry Fields

Each tool includes `id`, `name`, `category`, `description`, `status`, `connectionStatus`, `requiredCredentials`, `availableActions`, `requiresAuthorization`, and `riskLevel`.

## Tool Statuses

- Connected
- Mock Mode
- Not Connected
- Needs Credentials
- Coming Soon
- Disabled
- Error

## Risk Levels

- Low
- Medium
- High
- Critical

High and Critical tools require explicit authorization before execution.

## Current Tool Families

AI providers, development tools, email, calendar, POD, e-commerce, design, website, research, file storage, payments, social media, browser automation, and analytics.

The frontend registry exists for UI planning and fallback display. The backend registry is authoritative for connection state because credentials and environment variables are server-side only.

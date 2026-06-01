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

## Real Integration Rules

Before a tool becomes real, credentials must remain backend-only, scopes must be documented, authorization must be enforced, and audit logging must record the request and result.

Gmail, Etsy, Printify, Shopify, Vercel, GitHub, Codex, and other non-AI integrations remain mock/future tools. They must not execute real external actions until their own approval and policy layers are implemented.

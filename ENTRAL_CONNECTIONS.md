# ENTRAL Connection Center

The Connection Center is the visible tool bay for ENTRAL integrations. It is available from the dashboard command console under `Tools`.

## Purpose

The Connection Center shows:

- Tool name and category
- Connection status
- Risk level
- Required credentials
- Whether approval is required
- Available actions
- Test connection action
- Mock execution action

## Backend Routes

- `GET /api/v1/connections/tools`
- `POST /api/v1/connections/tools/:toolId/test`
- `POST /api/v1/connections/tools/:toolId/mock-execute`

All routes require authentication.

## Real Integration Rules

Before a tool becomes real, credentials must remain backend-only, scopes must be documented, authorization must be enforced, and audit logging must record the request and result.

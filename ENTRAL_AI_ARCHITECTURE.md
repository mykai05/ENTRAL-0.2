# ENTRAL AI Brain Architecture

ENTRAL v0.4 adds an AI Brain layer above the existing Command OS. The goal is structured understanding, planning, authorization, and safe mock execution, not autonomous external execution.

## Request Flow

1. User sends a message through the command console or `/api/v1/ai/chat`.
2. AI Brain classifies the request.
3. AI Brain creates an action plan.
4. The plan identifies affected hierarchy entities and required tools.
5. Risk and authorization requirements are calculated.
6. Safe local commands can continue immediately.
7. External or risky actions require explicit authorization.
8. Approved external actions run in mock mode until a real integration is connected and policy-approved.
9. Audit entries record the plan, authorization state, tools, and outcome.

## Current Implementation

- Frontend classifier and planner: `frontend/lib/ai-brain.ts`
- Frontend tool registry: `frontend/lib/tool-registry.ts`
- Dashboard Connection Center: `frontend/components/ConnectionCenter.tsx`
- Backend classifier and planner: `backend/src/services/aiBrain.ts`
- Backend tool registry: `backend/src/services/toolRegistry.ts`
- Backend connection routes: `backend/src/routes/connections.ts`

## Safety Boundary

ENTRAL may plan, explain, simulate, and request approval. ENTRAL must not claim it has emailed, deployed, published, charged, scraped, posted, or modified external systems unless a real connected tool executed the action and returned a verified result.

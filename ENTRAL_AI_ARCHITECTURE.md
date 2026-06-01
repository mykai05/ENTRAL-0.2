# ENTRAL AI Brain Architecture

ENTRAL v0.4 adds an AI Brain layer above the existing Command OS. v0.4.1 connects that brain to the first backend-only AI provider while preserving structured understanding, planning, authorization, audit logging, and safe mock execution.

## Request Flow

1. User sends a message through the command console or `/api/v1/ai/chat`.
2. Backend AI Brain creates a deterministic safety classification.
3. If OpenAI is connected, the backend asks the provider for structured JSON classification and planning.
4. Provider JSON is validated and merged with deterministic safety checks.
5. The plan identifies affected hierarchy entities and required tools.
6. Risk and authorization requirements are recalculated server-side.
7. Safe local commands can continue immediately.
8. External or risky actions require explicit authorization.
9. Approved external actions still run in mock mode until each real integration is connected and policy-approved.
10. Audit entries record the plan, provider, model, authorization state, tools, and outcome.

## Current Implementation

- Frontend classifier and planner: `frontend/lib/ai-brain.ts`
- Frontend tool registry: `frontend/lib/tool-registry.ts`
- Dashboard Connection Center: `frontend/components/ConnectionCenter.tsx`
- Backend classifier and planner: `backend/src/services/aiBrain.ts`
- Backend AI provider interface: `backend/src/services/aiProvider.ts`
- Backend OpenAI routing service: `backend/src/services/openaiService.ts`
- Backend tool registry: `backend/src/services/toolRegistry.ts`
- Backend connection routes: `backend/src/routes/connections.ts`

## Provider Configuration

Required for live provider responses:

- `OPENAI_API_KEY`: backend-only secret. Never expose to frontend code or localStorage.

Optional:

- `OPENAI_MODEL`: defaults to `gpt-4o`.
- `AI_FEATURE_ENABLED`: defaults to `true`.
- `AI_LOCAL_FALLBACK`: defaults to `true`.

If `OPENAI_API_KEY` is missing, ENTRAL does not crash. The provider reports `Missing API Key`, chat continues in Mock Mode, and deterministic AI Brain planning remains active.

## Safety Boundary

ENTRAL may plan, explain, simulate, and request approval. ENTRAL must not claim it has emailed, deployed, published, charged, scraped, posted, or modified external systems unless a real connected tool executed the action and returned a verified result.

Provider output is treated as advisory. ENTRAL validates all provider JSON before using it and never allows provider output to downgrade high-risk actions into automatic execution.

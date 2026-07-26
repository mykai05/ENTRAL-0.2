# Phase 120 data, memory, and intelligence implementation map

**Gate:** 120
**Date:** 2026-07-25
**Reference revision:** `62f4cc4167583e6e0a87cd209a6f63dd5ca0e891`
**Record status:** Accepted repository-specific design map, reconciled against the Phase 130-160 implementation

## Foundation decision

Preserve the current modular TypeScript monorepo. PostgreSQL is the source of truth. The API/control service owns canonical reads and writes. The worker owns durable outbox publication and background execution. Redis is ephemeral. The web application owns presentation and selected-scope state only.

No empty service directory is created by this map. Listed paths either exist now or are the exact existing parent in which the next numbered phase must implement working code.

## Canonical module map

| Record family | Singular data owner | Repository contract/module | Persistence owner |
|---|---|---|---|
| Identity and application scope | Canonical identity/access boundary | `backend/src/db.ts`, `backend/src/auth.ts`, `packages/contracts/src/domain.ts` | `entral.app_users`, `entral.scope_grants`; legacy login tables remain an identity input until fully adapted |
| Taxonomy and hierarchy | Canonical control plane | `backend/src/services/canonicalControlPlane.ts`, `backend/src/routes/controlPlane.ts` | `entral.taxonomy_versions`, `entral.entities`, `entral.entity_versions`; lineage is derived from enforced parent relationships |
| Businesses | Canonical control plane | `backend/src/services/canonicalControlPlane.ts`, shared domain/validation contracts | `entral.businesses`, `entral.business_versions`, profiles/states/financial snapshots |
| Missions, tasks, schedules | Canonical work module within the control plane | shared domain contracts; database implementation in Phase 140 migrations | `entral.missions`, `entral.tasks`, `entral.schedules` |
| Operational messages | Canonical work/message module | route-law types and validation in `packages/contracts/`; database enforcement in Phase 140 | `entral.operational_messages` |
| Governance actions | Canonical action service | `backend/src/services/canonicalControlPlane.ts`, `backend/src/routes/controlPlane.ts`, action-policy contract | `entral.governance_actions`, steps, policy checks, idempotency keys, snapshots |
| Models and prompts | Canonical model-governance records | `packages/contracts/src/domain.ts`; runtime adapters remain provider-neutral | `entral.model_profiles`, `entral.prompt_versions`, `entral.policy_versions` |
| Tools and credentials | Canonical tool registry/grant records | `packages/contracts/src/integration.ts`, `backend/src/services/integrationRegistry.ts` for legacy catalog compatibility | `entral.tool_definitions`, `entral.tool_grants`, `entral.credential_references` |
| Context and AI runs | Canonical intelligence execution records | shared contracts plus later working services under `backend/src/services/` | `entral.context_manifests`, `entral.ai_runs`, `entral.ai_steps`, `entral.tool_calls`, `entral.verification_results` |
| Memory and retrieval | Canonical memory records | shared domain contracts; no browser/chat/vector authority | `entral.memory_items`, `entral.retrieval_logs` |
| Sources, artifacts, evidence | Canonical evidence/provenance records | shared domain contracts and governed service boundary | `entral.source_records`, `entral.artifacts`, `entral.evidence_links` |
| Health, recommendations, decisions, outcomes | Canonical intelligence records | shared domain contracts; later vertical-slice services under `backend/src/services/` | `entral.health_assessments`, `entral.recommendations`, `entral.decisions`, `entral.experiments`, `entral.outcomes` |
| Metrics, costs, resource use | Canonical metrics/economics records | shared contracts and later intelligence services | `entral.metric_definitions`, `entral.metric_observations`, `entral.cost_records`, `entral.resource_usage` |
| Audit | Database integrity boundary | immutable writes from canonical transactions | `entral.audit_entries` |
| Canonical events | Canonical action/domain service | semantic event written by the transaction owner | `entral.canonical_events` |
| Transactional outbox | Database transaction owner; worker publication owner | `backend/src/services/canonicalOutboxWorker.ts`, `backend/src/worker.ts` | `entral.transactional_outbox` |
| Consumer progress | Each named projector/consumer | outbox/event worker module | `entral.event_consumer_offsets` |
| Snapshots and read models | Canonical control-plane query boundary | `backend/src/services/canonicalControlPlane.ts`; typed UI clients belong to Phase 170 | `entral.state_snapshots`, `entral.v_entity_summary`, `entral.v_business_summary`, and `entral.v_audit_timeline` |

## Dependency direction

Allowed dependency direction:

`frontend -> packages/contracts -> API routes -> canonical services -> backend/src/db.ts -> PostgreSQL`

The worker uses:

`worker -> canonical outbox service -> backend/src/db.ts -> PostgreSQL -> Redis/BullMQ publication`

Model and tool adapters use:

`AI/tool orchestrator -> typed proposal/tool request -> canonical action service -> PostgreSQL`

Prohibited directions:

- frontend directly to PostgreSQL;
- model or prompt directly to SQL;
- worker bypassing the action/transaction owner for material state;
- Redis, vector search, browser storage, or a provider becoming a canonical owner;
- duplicate payload definitions outside `@entral/contracts`.

## Material write transaction

Every canonical material change has one transaction owner: the canonical action/domain service handling that aggregate.

Within one PostgreSQL transaction it must:

1. bind authenticated application user, action reason, and request scope;
2. claim the idempotency key and compare the request hash;
3. load and lock the aggregate;
4. compare the expected version;
5. validate hierarchy, route, business, entity, and data scope;
6. validate authority, policy, budget, risk, provider state, and credential reference;
7. record the governance action and rollback point when the change is control-plane work;
8. apply the smallest valid state change;
9. run deterministic verification or record governed pending verification;
10. write aggregate/version, audit, semantic canonical event, and outbox;
11. commit all or none;
12. return the versioned typed action result.

An audit write performed later by the UI, model, or worker does not satisfy this boundary.

## Event publication path

1. The domain service inserts one semantic event and one outbox row in the state transaction.
2. `backend/src/services/canonicalOutboxWorker.ts` claims eligible rows under a least-privileged bound service identity.
3. The worker publishes the typed event to the configured Redis/BullMQ channel.
4. Publication success is recorded durably; failure records attempt count, error, and bounded retry time.
5. Consumers deduplicate by event/outbox identity and advance their own canonical consumer offset.
6. Reconnect and restart rebuild projections from PostgreSQL/event state, never from browser cache.

Database-generated fallback events protect integrity, but a material domain action should emit the more specific semantic event.

## Operational-message path

Operational messages are handled separately from governance actions:

`authenticated request -> operational-message validator -> adjacency and direction enforcement -> transaction -> message record + rejection/delivery evidence + audit/event/outbox`

Skipped-layer and peer attempts are retained as rejected evidence and are not delivered.

## Governance-action path

`Human or ENTRAL request -> typed action contract -> authenticated scope and authority -> expected version/idempotency -> governed transaction -> verification -> typed ActionResult`

Targeting a lower entity is permitted only as an audited control-plane action. It does not create a routine message bypass.

## Deterministic context compilation

Context must be selected in this exact order:

1. canonical business and entity state;
2. current financial and operational metrics;
3. health drivers, exceptions, confidence, and source freshness;
4. missions, tasks, schedules, dependencies, and blockers;
5. recent decisions, governed interventions, and realized outcomes;
6. authority, budgets, policy, and doctrine;
7. scoped durable memory;
8. relevant artifacts and external evidence.

Before semantic ranking, the compiler filters by actor authority, business, entity, classification, validation state, and retention. It persists included and excluded references, freshness, filters, token budget, compiler version, and content hash.

Chat history, browser state, unverified proposed knowledge, and cross-business semantic candidates do not enter factual context as canonical state.

## Memory and evidence rules

Canonical memory classes are Canonical Fact, Doctrine, Episodic, Working, Derived Summary, and Proposed Knowledge.

Every memory item binds:

- scope and business/entity;
- typed content;
- source record or artifact;
- provenance and content hash;
- confidence and validation state;
- author/generating process;
- classification and retention;
- superseded item;
- rebuildable semantic index reference.

Working memory expires. Proposed Knowledge is excluded from factual answers until verified. Derived summaries retain source links. External results become evidence only after normalization, hashing, scope checks, and deterministic verification.

## AI execution boundary

Every AI run persists purpose, scope, business/entity/mission/action links, exact model profile, prompt and policy versions, context manifest, typed inputs/outputs, steps, tool calls, tokens, cost, latency, errors, evidence, and verification.

Models may analyze, explain, plan, or propose. They do not own canonical transactions. A tool call requires an active exact grant, correct business and credential owner, permitted operation, limits, idempotency, normalized result, evidence, and verification.

## Access and database-session boundary

- API requests bind a human application identity and action reason.
- Worker publication binds a dedicated service application identity.
- Verifier and audit access use distinct least-privileged database logins.
- `backend/src/db.ts` is the required bound-session entry point for canonical data.
- Service checks and PostgreSQL RLS both apply.
- ENTRAL global scope is explicit and audited.
- Search, retrieval, exports, artifacts, logs, backups, and provider calls preserve the same business/entity scope.
- Secret-manager references may be stored; secret values may not.

## Legacy-state disposition

The Prisma `public` schema and the legacy Command OS snapshot predate the canonical control plane. They remain runtime compatibility inputs for currently deployed surfaces, not accepted owners for new canonical entities, businesses, missions, memory, governance, events, or intelligence.

The ordered disposition is:

1. do not add new canonical responsibilities to the legacy stores;
2. expose canonical typed read clients in Phase 170;
3. synchronize Dashboard, Graph, Infrastructure, and ENTRAL from canonical versions;
4. migrate or retire legacy projections only after readback and rollback evidence;
5. preserve the encrypted member publication boundary for organization-approved projections;
6. delete compatibility paths only when no deployed reader or recovery obligation remains.

## Microsoft independence

No Microsoft service is required for:

- login or sessions;
- canonical database state;
- memory or semantic retrieval;
- missions, tasks, or scheduling;
- audit, events, or outbox;
- API, worker, queue, or deployment.

Outlook/tool catalog entries are inactive provider metadata until separately activated. They do not form a core dependency.

## Phase 130-160 reconciliation

The later completed phases validate this map:

- Phase 130 created the shared contracts and API integration surface;
- Phase 140 created hierarchy, business, mission, governance, and tool foundations;
- Phase 150 created AI, memory, evidence, metrics, integrity, RLS, roles, and the outbox worker;
- Phase 160 seeded and verified one ENTRAL, eight Marshals, and 123 Generals with deterministic invariants.

This reconciliation does not start Phase 170. It proves the Phase 120 module names and ownership choices match implemented repository paths.

## Gate 120 conclusion

Every canonical data and event family has one owner. Transaction, event, context, operational-message, governance-action, AI, evidence, and access boundaries are precise. Legacy and browser stores are explicitly non-canonical, and Microsoft is not a core dependency. The next allowed work remains the separately gated Phase 170 canonical UI clients.

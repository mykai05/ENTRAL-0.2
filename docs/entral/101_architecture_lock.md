# Phase 100 architecture lock

**Status:** Accepted
**Date:** 2026-07-25
**Scope:** All subsequent ENTRAL implementation phases

## Precedence

When instructions conflict, use this order:

1. the Human's current instruction;
2. the Codex-only engineering-role override, for role assignment only;
3. the ENTRAL master implementation order;
4. the production-only implementation rules;
5. the production Commerce Agent Command Architecture;
6. the production UI Simplification and Autonomous Control Directive;
7. the production manager/build directive;
8. ADR-0001 and supporting contracts, database, UI, AI, integration, deployment, and acceptance records.

The Commerce Agent Command Architecture controls hierarchy, role ownership, naming, and routine communication. The UI directive controls the current three-destination interaction model. The manager/build directive controls engineering defaults and delivery. No later ADR may silently change the canonical chain.

## Canonical hierarchy

The only command hierarchy is:

`HUMAN <-> ENTRAL <-> MARSHAL <-> GENERAL <-> COMMANDER <-> SOLDIER`

The singular/plural display of a roster does not create another layer. The database role names are `ENTRAL`, `MARSHAL`, `GENERAL`, `COMMANDER`, and `SOLDIER`.

Required ownership law:

- ENTRAL has no parent and no business;
- a Marshal's parent is ENTRAL;
- a General's parent is a Marshal;
- a Commander has one General parent and owns exactly one individual business;
- each individual business has exactly one non-retired Commander;
- a Soldier has one Commander parent and inherits exactly that Commander's business;
- passive models, applications, APIs, databases, automations, and providers are tools, never hierarchy peers;
- parent changes cannot create a cycle, skip a level, or cross a business boundary illegally.

Exactly one active ENTRAL, eight canonical Marshals, and 123 taxonomy-versioned General templates form the canonical seed. Stable codes and IDs distinguish records even when display names overlap.

## Operational-message law

Routine operational communication is adjacent and bidirectional only:

- Human and ENTRAL;
- ENTRAL and Marshal;
- Marshal and General;
- General and Commander;
- Commander and Soldier.

Downward messages carry orders, doctrine, budget, permission, or tasks. Upward messages carry reports, exceptions, escalations, recommendations, or completion. Peer and skipped-layer delivery is rejected, retained as evidence, and never routed.

## Governance-action distinction

Human or ENTRAL sovereign intervention is a control-plane action, not an operational-message bypass. A governed action may target a lower entity to create, edit, pause, resume, repair, isolate, reconfigure, duplicate, reassign, retarget, retire, restore, roll back, or change a budget, model, tool, policy, or schedule.

Every material governance action records:

- actor, authority basis, reason, and explicit scope;
- target and expected aggregate version;
- idempotency key and request hash;
- policy, risk, budget, credential, and isolation checks;
- before state, proposed change, execution steps, and after state;
- rollback point and rollback plan;
- verification plan and result;
- evidence, immutable audit, canonical event, and outbox record;
- remaining exception.

A global action does not create a permanent Human-to-lower-layer or ENTRAL-to-nonadjacent conversational channel.

## Canonical state boundary

PostgreSQL is the source of truth. The canonical record families live in the `entral` schema and are changed only through typed services and governed transactions.

The following are never canonical:

- React state, browser local/session storage, or cached UI payloads;
- Redis queues, leases, or caches;
- a semantic/vector index;
- chat transcripts by themselves;
- provider responses that have not been normalized, evidenced, and verified;
- the in-memory development server;
- hard-coded sample business data;
- Microsoft services;
- legacy snapshots once a canonical read/write path exists.

Object storage may hold large artifacts and evidence, but PostgreSQL retains the record, scope, hash, classification, provenance, and lifecycle reference.

## Transaction and event boundary

A material write must:

1. authenticate the actor and resolve scope;
2. claim idempotency and hash the request;
3. load and lock the aggregate;
4. compare the expected version;
5. validate hierarchy, business ownership, route, authority, policy, budget, risk, and credentials;
6. create the governance/action record and rollback point where applicable;
7. make the smallest valid change;
8. verify synchronously or enqueue governed verification;
9. write state, audit, canonical event, and outbox in the same database transaction;
10. commit all or none and return a typed result.

Models and tools do not receive unrestricted database credentials. They may propose typed work; the deterministic action boundary owns the write.

## Identity, access, and isolation

- Every request has an authenticated actor.
- Database work binds an application user and an explicit action reason.
- Service checks and PostgreSQL RLS both enforce scope.
- API, worker, verifier, and audit duties use least-privileged logins.
- Business data, memory, artifacts, contacts, and credential references cannot leak across Commander businesses.
- ENTRAL-wide access is explicit, audited, and used through governed paths.
- Secret values do not appear in source, logs, prompts, events, canonical JSON, or client bundles.
- Provider access is scoped to exact owner, business, adapter/API version, environment, operations, limits, and credential reference.

## UI lock

The three top-level destinations are:

1. Dashboard;
2. Open Universe Graph;
3. Infrastructure.

Dashboard is the post-login operating surface. Infrastructure is the exhaustive, searchable manual record and control surface. The Graph is a secondary topology/navigation view with search, fit view, back, and one settings panel. ENTRAL conversation is not embedded in the Graph.

The UI owns selection and presentation state only. It must not invent business records, infer unavailable financial fields, simulate success, or expose an action before its backend, persistence, audit, event, verification, and error path work.

## Memory and intelligence lock

Context is compiled deterministically from structured current state first, followed by metrics, health and freshness, work, recent decisions/outcomes, authority/policy/doctrine, scoped durable memory, artifacts, and external evidence.

Memory classes, source references, hashes, confidence, validation, retention, and supersession are explicit. Proposed knowledge is not factual memory. Derived summaries remain traceable. Working memory expires. Semantic retrieval is scoped before ranking and is rebuildable.

Every AI run binds exact model, prompt, policy, context, tool, cost, latency, evidence, and verification versions. A persuasive response is not proof of completion.

## Deployment lock

The accepted initial shape is a modular TypeScript monorepo with:

- a responsive Next.js web application;
- a Fastify API/control service;
- a background worker;
- PostgreSQL canonical state;
- Redis for ephemeral coordination only;
- object storage for large artifacts/evidence when configured;
- provider-neutral model and tool adapters.

Do not introduce broad microservice decomposition without reliability or scale evidence. Do not introduce a Microsoft core dependency.

## Production exposure rule

A capability is visible or callable only when its production code, versioned contracts, persistence/recovery, automated tests, deterministic verification, evidence, and required live provider acceptance are complete.

Unavailable work remains specification or catalog data. Inert buttons, fake success payloads, placeholder adapters presented as live, alternate state authorities, and fabricated canonical business records are prohibited.

## Engineering-role acceptance

Codex owns engineering management, architecture custody, decomposition, implementation, review, integration, testing, and release verification for the ordered handoffs. Fable-specific engineering language is interpreted as Codex responsibility and creates no dependency or product role.

This role assignment does not broaden product authority, bypass the Human, weaken a phase gate, or change the canonical hierarchy.

## Phase-boundary lock

Each numbered phase begins only after its prerequisite gate is evidenced. Availability of a later ZIP does not authorize its implementation.

In particular, canonical UI clients, Dashboard/Portfolio Mode, business detail, and synchronization work belong to Phase 170. Phase 100-160 documentation may identify that boundary but may not implement or claim it.

## Gate 100 acceptance

This lock, together with `docs/entral/100_repository_baseline.md`, records precedence, hierarchy, operational-message law, governance separation, source-of-truth boundaries, repository shape, commands, and genuine blockers. No runtime behavior is changed by this retrospective gate repair.

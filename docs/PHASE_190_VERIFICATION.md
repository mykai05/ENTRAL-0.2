# Phase 190 verification

## Gate

Gate 190 passes at the repository and disposable-production-database layers:
pause and resume are a complete governed vertical slice. The slice is limited
to `MARSHAL`, `GENERAL`, `COMMANDER`, and `SOLDIER` entities.

This record does not authorize or claim Phase 200 work. Provider deployment,
production migration, and live endpoint evidence remain separate release gates
and must be verified directly rather than inferred from this source record.

## Input and baseline

- Packet: `ENTRAL-PHASE-190-PAUSE-AND-RESUME-VERTICAL-SLICE.zip`
- Packet SHA-256: `15EA10DAD980173CFC7AC8FB5F6EF47C5DB63E973BDFE2CD3F12ECB5E78D56F8`
- Starting repository commit: `68112f4934bff9212eb40ff1b270a858714faeec`
- Starting branch state matched `origin/main`.
- `START_HERE.md` was read before the remaining packet files.
- All 15 packet checksums passed.
- Both supplied DOCX directives were rendered through LibreOffice and visually
  inspected across all 35 pages.
- Gate 180 and its preserved Dashboard, dual Universe Graph, Infrastructure,
  mobile, contextual ENTRAL, hierarchy, and scale evidence were confirmed
  before Phase 190 changes began.

## Production slice

One shared `EntityLifecycleActionRequest` represents both the member and
internal control-plane endpoints. Every request binds:

- Human or internal ENTRAL actor identity;
- exact entity, business, and inherited scope;
- current aggregate version;
- Pause or Resume operation;
- `FINISH_IN_FLIGHT` containment;
- reason, risk, authority, verification, rollback, and idempotency data;
- optional restoration causation.

The dedicated executor performs one PostgreSQL transaction:

1. claim and hash the idempotency key;
2. bind the canonical database session and validate authority;
3. lock and validate the target, role, scope, state, and version;
4. validate parent and dependency readiness for Resume;
5. record and advance the governance action;
6. update entity status and version exactly once;
7. verify deterministic status, version, and new-work leasing readback;
8. record trusted verification;
9. record the ENTRAL-to-Human completion report;
10. prove exactly one entity event, audit entry, and outbox receipt;
11. complete the idempotency receipt;
12. return the reconstructed, contract-validated result.

No success response is returned before the transaction contains the target
state, next version, governance history, PASSED verification, matching
aggregate-version event, audit, outbox, and conversation evidence.

## Containment and restoration

- A paused entity and every descendant beneath it become ineligible for new
  active task or schedule leasing through one reusable recursive database
  guard.
- Existing active work is not interrupted or rewritten.
- Resume requires the complete parent chain to be active and rejects inactive
  tools, grants, or credentials.
- Undo is a new opposite governance action with its own version, audit, event,
  verification, outbox, idempotency key, and completion message.
- The restored action becomes `ROLLED_BACK`; neither action nor history is
  deleted or rewritten.
- Historical idempotent replay remains deterministic after restoration.

The API role does not gain general access to the worker-owned outbox. A narrow
security-definer function returns only the current governance action's entity
event, audit, and pending-outbox counts.

## User surfaces

- Infrastructure exposes Pause or Resume only on eligible lower-entity full
  records, requires an operational reason, displays the optimistic version and
  `finish in-flight` containment, and presents a verified receipt with Undo.
- The contextual ENTRAL assistant converts a Human request into the same typed
  lifecycle request and still requires explicit confirmation.
- The verified result reports the same entity version and canonical event
  sequence used to refresh Dashboard, Infrastructure, both Universe Graph
  renderers, and the ENTRAL conversation.
- Graph movement pause remains presentation-only and is not connected to agent
  lifecycle Pause.
- The canonical shell, both graph implementations, full-screen controls,
  collapsible entity detail, page scrolling, and member Academy behavior remain
  intact.

## Verification results

- Exact runtime: Node `20.19.0`, pnpm `9.12.3`.
- Contract tests: 25 passed.
- Backend tests: 354 passed; six opt-in PostgreSQL files skipped in the ordinary
  run.
- Frontend tests: 331 passed.
- Phase 190 PostgreSQL gate: one comprehensive test passed against a disposable
  PostgreSQL 18 database using non-superuser API and worker login roles.
- Browser E2E: all 10 scenarios passed, including the rendered Phase 190
  Pause receipt and versioned Undo/Resume restoration, both graph renderers,
  page scrolling, mobile behavior, persistent ENTRAL context, and the
  10,000-entity scale surface.
- Lint/type checks: contracts, backend, and frontend passed.
- Production build: contracts, backend, and the 16-route Next.js frontend
  passed.
- `git diff --check`: passed.

The PostgreSQL gate applied every migration and the production role/grant
script, then proved:

- Pause and Resume for Marshal, General, Commander, and Soldier;
- exact state/version/event/audit/outbox/conversation convergence;
- descendant leasing blocked while existing in-flight work remained active;
- parent readiness and active dependency checks;
- same-request replay and conflicting-key rejection;
- stale-version rejection;
- authenticated-Human authority enforcement;
- cross-business rejection;
- one-winner concurrent conflict behavior;
- restoration causation and full history;
- partial outbox publication failure, retry, and no duplicate entity mutation;
- disconnect/reconnect recovery and deterministic historical replay;
- cleanup of the disposable database and environment login roles.

## CI and release boundary

The CI PostgreSQL matrix now includes the Phase 190 gate beside the Phase
150-180 database gates. The Railway application start command still does not
run migrations: production migration and role/grant application must follow the
existing backup-first, migration-only credential procedure before the new API
is exercised.

Phase 190 ends here. No later phase is implemented by this change.

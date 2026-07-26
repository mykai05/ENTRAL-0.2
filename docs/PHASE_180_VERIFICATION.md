# Phase 180 verification

## Gate

The local Gate 180 implementation and acceptance checks pass: complete UI shell, canonical synchronization, mobile operation, and scale evidence.

This record is limited to Phase 180. It does not authorize or claim Phase 190 work. Repository publication and live-provider evidence are recorded only after the verified revision is deployed.

## Input and baseline

- Packet: `ENTRAL-PHASE-180-UI-ENTRAL-SHELL-INFRASTRUCTURE-UNIVERSE-GRAPH-MOBILE-AND-SCALE.zip`
- Packet SHA-256: `B34A95E76E5BD1A397950D5D46779559A2DBE25ADADECF811C5CC3277E0B0E7C`
- Starting repository commit: `7f0911d5bce4e49095ce53a0026723a1b4939e11`
- Starting branch state matched `origin/main`.
- `START_HERE.md` was read before the remaining packet files.
- Both supplied DOCX directives were rendered through LibreOffice and visually inspected across all 35 pages.

## Implemented gate evidence

- The authenticated member shell exposes exactly three destinations: Dashboard, Universe Graph, and Infrastructure.
- The member-access organization gates the legacy tenant route. It is explicitly distinguished from canonical data scope, which comes from the signed-in `entral.app_users` identity and database `scope_grants`.
- Dashboard, Graph, Infrastructure, and ENTRAL accept only event-sequence-aligned canonical portfolio, hierarchy, record, and conversation snapshots.
- A business scope switch clears entity selection and changes the visible graph, Infrastructure records, Dashboard detail, and ENTRAL context together.
- Slow, failed, aborted, reconnected, and cross-organization refreshes cannot publish a stale snapshot or a false connected state.
- ENTRAL renders only RLS-visible Human-to-ENTRAL and ENTRAL-to-Human operational messages. Pending event receipts remain visible and truthful.
- Conversation evidence is preserved as typed `{type,id}` references. Resolvable business/entity links open the exact canonical target; an unavailable target is stated explicitly without inferred substitute evidence.
- The Phase 180 database migration resolves message evidence scope through the message's entity, task, or mission ownership while retaining the Phase 150 evidence-scope constraint.
- Graph renders the complete visible canonical hierarchy, preserves lineage during business scoping, supports semantic level of detail, search, fit, continuous pan/zoom, one-finger touch pan, two-finger pinch, keyboard traversal, and a dismissible detail drawer.
- Graph remains alert-only for ENTRAL; the conversational panel is not mounted over the canvas.
- Infrastructure presents the same hierarchy as a virtualized ARIA tree, preserves one roving tab stop at 10,000 rows, and loads complete version-aligned entity records on demand.
- Full records expose configuration, runtime, authority, operations, economics, reliability, audit, evidence, connections, and version history without inventing mutation controls.
- Aggregate versions remain distinct from the canonical event-sequence snapshot cursor.
- Full business/entity sections are not silently truncated; the PostgreSQL gate asserts 205 task records.
- Mobile navigation uses the same three destinations. Phone Graph gestures use trusted Chromium touch input, rotation preserves context, and Infrastructure uses a full-screen record surface with a visible Back action.
- The isolated scale fixture generates exactly 500 businesses, 500 Commanders, 9,368 Soldiers, and 10,000 total entities without production writes. Its hierarchy and per-business agent counts are invariant-checked.

## Verification results

- Full workspace tests:
  - contracts: 24 passed
  - backend: 349 passed; 5 opt-in PostgreSQL files skipped in the ordinary run
  - frontend: 309 passed
- Real PostgreSQL gate: 5 integration files and 5 tests passed against disposable PostgreSQL 18 databases.
  - all migrations applied, including `20260726020000_phase_180_message_evidence_scope`
  - canonical seed fingerprint and 18 database invariants passed
  - Human and assigned-member participant/business/RLS conversation isolation passed
  - typed message evidence survived readback and appeared in the business evidence list
  - full-record completeness, aggregate/event separation, and canonical event refresh passed
  - disposable databases and roles were removed after verification
- Browser E2E: all 8 scenarios passed.
- Phase 180 benchmark: 2 passed.
- Lint/type checks: contracts, backend, and frontend passed.
- Production build: contracts, backend, and Next.js frontend passed.
- Contract reproducibility: passed.
- Canonical taxonomy and release-positioning tests: passed.
- Release readiness and forbidden-positioning scan: passed.
- Production dependency audit: no known vulnerabilities.
- Independent final audits:
  - backend/contracts/database: passed
  - shell/Graph/Infrastructure/mobile/evidence: implementation passed; this document and the browser artifact close the final evidence finding
- Agent-browser protected-entry visual check: the root redirected to member sign-in and rendered intact.
- Automated WCAG A/AA scan of the protected entry surface: 0 violations; one gradient-backed contrast group was inconclusive to automation.
- Local runtime caveat: Node 22.20.0 emitted the repository's engine warning; the repository and CI remain pinned to Node 20.19.0.

## Isolated generator measurements

| Measurement | Result | Budget |
| --- | ---: | ---: |
| Fixture generation | 9.877 ms | 500 ms |
| Search | 1.026 ms | 100 ms |
| Serialization | 10.139 ms | 500 ms |
| Serialized size | 5,244,210 bytes | evidence only |
| Heap delta | 12.244 MB | 128 MB |

## Production-browser scale measurements

The committed machine-readable evidence is `docs/evidence/phase180-browser-scale.json`. CI also retains the current run as the `phase-180-browser-scale` artifact.

| Profile | Viewport | Graph ready | Keyboard interaction | Infrastructure search | Rendered tree rows |
| --- | --- | ---: | ---: | ---: | ---: |
| Desktop | 1440 x 900 | 2,899.7 ms | 78.5 ms | 434.4 ms | 18 |
| Phone | 390 x 844 | 2,881.4 ms | 77.7 ms | 422.4 ms | 15 |

The phone run additionally verifies that trusted one-finger pan and two-finger pinch each change the production canvas frame.

## Repairs found during verification

- Combined caller cancellation with the internal API timeout so React cleanup remains an abort rather than a false timeout.
- Prevented stale organization refreshes and failed post-event refreshes from publishing aligned/connected state.
- Corrected full-record aggregate versions to use row versions while retaining event sequence as the separate snapshot receipt.
- Removed silent full-record collection limits and asserted 205 tasks in PostgreSQL.
- Preserved pending canonical conversation receipts instead of filtering them out.
- Restricted conversation history by participant plus mission, task, and business RLS scope.
- Preserved structured evidence references and made every rendered evidence action resolve or fail closed visibly.
- Corrected message-evidence business derivation in a forward database migration.
- Corrected the 500/10,000 fixture's Marshal-General hierarchy and per-business agent counts.
- Added relationship-aware Graph keyboard traversal, real touch gestures, and exact-scale browser injection.
- Corrected Infrastructure depth-first ordering, parent semantics, off-screen roving focus, and virtualized keyboard reachability.
- Kept canonical version state visible in the mobile full-screen Infrastructure record.
- Made the local launcher portable and supplied the development-memory defaults required for browser verification.
- Replaced the legacy release-readiness shell assertion with the canonical three-destination member shell.
- Made browser-scale evidence machine-readable and retained it as a CI artifact.

## Boundary

Development-memory routes exist only in the development memory server for local browser verification. Production canonical reads remain PostgreSQL/RLS-backed. The benchmark fixture is isolated and never seeded into production. Phase 180 adds no ungoverned mutation surface.

# Phase 203 preflight production graph recovery

TaskPacket: `P203-PRODUCTION-GRAPH-RECOVERY-001`

Phase 202 remains historically certified at `c689176234bca8a43f6bb5665f6a8a63d8d653dd`, but a user-visible production incident was discovered immediately afterward. This document does not erase or restate that history. It binds the post-certification incident, the forward-only repair, and the corrected release evidence that supersedes stale fields.

## Bounded production diagnosis

- The owner-reported request ID did not exist in the bounded Railway search. The matching production request was `4d5a5983-6d94-45b1-9578-c1729ecb9711`.
- Railway recorded `graph.projection.failed` with `INVALID_GRAPH_ROOT` after `getHierarchySnapshot` succeeded. No PostgreSQL SQLSTATE applied to that projection-construction failure.
- The migrated founder session resolved valid `app.user_id`, `app.tenant_id`, `app.organization_id`, and Phase 202 actor context, but RLS returned zero canonical entities.
- Production contained exactly one shared canonical ENTRAL root and 132 shared ENTRAL/Marshal/General nodes, but no canonical businesses and no `BusinessBoundary` rows.
- `buildGraphProjection` correctly rejected a hierarchy with zero visible roots. Its exactly-one-root invariant remains unchanged.
- Hierarchy event sequence 399 remained available and graph preferences were owned by the correct user/organization at version 5. Projection-version alignment could not be constructed until root visibility was repaired.

The exact root cause is the Phase 202 tenant predicate: it exposed only mapped businesses and their ancestors. A legitimate migrated organization with a shared canonical taxonomy and no businesses therefore lost its root. The forward migration retains the original legacy authority predicate and tenant assignment, and adds only read access to the unique shared ENTRAL -> Marshal -> General taxonomy. Business-scoped Commanders and Soldiers, every mutation, and malformed multiple-root state remain fail closed.

Two adjacent migrated-member failures were bounded and repaired without weakening RLS:

- Phase 200 Tutorial tables were omitted from the Phase 202 human table classifier even though their exact user/team policies depended on it.
- The interaction analytics route wrote its audit record outside the verified tenant transaction, while the Phase 202 member audit exception allowed only auth-session evidence. The repair uses the exact tenant transaction and admits only the four released Phase 200 interaction actions with the exact target type and UUID event ID.

## Regression and durable acceptance

`backend/tests/phase203ProductionGraphRecoveryPostgres.integration.test.ts` migrates real pre-Phase-202 owner and ordinary-member User, Team, TeamMember, Tutorial, and shared hierarchy state into Phase 202. It proves `INVALID_GRAPH_ROOT` and invisible Tutorial state before the repair, then proves one visible root, three shared nodes, two edges, projection/event alignment, positive root full-record access, cross-tenant Commander denial, exact-subject Tutorial progress and mutation-receipt writes for an ordinary member, bounded member analytics insertion, denial of an unsupported analytics action, and a clean canonical business mapping invariant.

Starting with Phase 203, `ReleaseManifest` certification requires an authenticated, non-intercepted production member journey covering Command, Businesses, Universe 2D, Universe 3D, Infrastructure, and Tutorial at 360, 390, 412, 430, and desktop width. The journey binds the exact main SHA and migrated-account provenance receipt, verifies actual rendered node and edge sets, a ready WebGL canvas, progressive mobile expansion, exact 2D/3D event/selection parity, server-backed Tutorial state, and zero canonical sync errors at every viewport.

## Historical evidence correction

`docs/evidence/phase202/POST_CERTIFICATION_CORRECTION_P203.json` is the canonical append-only supersession receipt. It records:

- Phase 202 Vercel `dpl_HRwLpSwJaN3mU8Ye2VhEpu3Ho7MW` at the exact Phase 202 main SHA;
- independently read Railway API `0cc752c9-1599-49e8-b0d2-c7eb15f0c900` and worker `e3c342e6-efcd-430e-a49d-195e51670b54`;
- immediate rollback Phase 200 at `22ced00b5c0f2b0f79f2cc1302bf2f534ddf7516`;
- deep restore Phase 198 at `5c2f9d58c25dec82d4c3102f3b48a76797801594`.

Historical tags and prior Governor events remain unchanged. Final incident release deployment and authenticated production acceptance are recorded only after the exact protected-main repair SHA is live.

## Final incident release

- Protected main: `bdceb245ab7d94530f31e4293536497adcad4542` (tree `78925f45b09d540b3cacaaa690275c1c99699e23`).
- Protected-main CI: run `30782512745`, attempt 2, passed the complete required suite.
- Vercel frontend: `dpl_BMP1J3Pkz9LB1NBw2sb5f5LNCKmX` at the exact main SHA.
- Railway API: `6887706f-1f13-4b3f-8ae9-f812ac7c4321`; Railway worker: `011b8ff5-9814-4ba7-861e-9b298a80cb32`. Both were built from the verified 858-file exact-main source archive.
- Production migration `20260803000000_phase_203_graph_recovery`: 45 applied, zero failed, zero rolled back, zero pending; database roles were applied and independently audited.
- Authenticated migrated-founder acceptance passed every canonical workspace endpoint and the real member journey at 360, 390, 412, 430, and 1440 CSS pixels. It rendered 132 canonical nodes, 131 canonical edges, exactly one root, aligned hierarchy/projection version 399, and zero canonical-sync errors. The session was revoked and read back as HTTP 401.
- Immediate rollback remains Phase 200 at `22ced00b5c0f2b0f79f2cc1302bf2f534ddf7516`; deep restore remains Phase 198 at `5c2f9d58c25dec82d4c3102f3b48a76797801594`.

This preflight is an incident release, not the normal Phase 203 capability release. It intentionally creates no `phase-203` tag, Phase 203 ReleaseManifest, or Phase 203 certification. The normal Capability Truth Registry TaskPacket begins only after the Governor records this incident as resolved.

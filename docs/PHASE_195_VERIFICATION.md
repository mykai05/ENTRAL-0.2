# Phase 195 verification and release runbook

Phase 195 reconciles the accepted Phase 100-190 mainline and replaces the two
renderer-specific graph models with one authorized projection, one shared view
state, and durable user-and-organization preferences. This file separates
repository evidence, provider deployment, migration state, and authenticated
live behavior; none of those gates substitutes for another.

## Accepted starting point

- Repository: `mykai05/ENTRAL-0.2`
- Baseline main commit:
  `1d34bf8e5d32c6eccb691cda6741a0b51c20f819`
- Annotated immutable baseline tag: `phase-190` (pushed to origin on
  2026-07-26 and verified to dereference to the baseline main commit)
- Baseline CI run: `30214475928` (verify passed; workflow deploy job skipped)
- Canonical reconciliation:
  `docs/PHASE_195_BRANCH_RECONCILIATION.md`
- Billing remains disabled. Phase 195 adds no billing provider, price,
  subscription entitlement, or billing-derived capability.

## Provider baseline readback

This is a pre-change observation, not Phase 195 completion evidence.

| Gate | Verified baseline |
|---|---|
| Vercel frontend | Team `team_CQ42FPYTh2X9wnyeyAkJo7BP`, project `prj_vhTeytmfj0HGppo3YC2LwiWuLspG`, production deployment `dpl_2MZJ629bmHeXWQ6H1Pq5ZB1JjeDd`, READY at exact baseline main SHA |
| Public member surface | `https://spcommand.com/member/graph` resolved to the baseline Vercel deployment during read-only inspection; no retained authenticated production receipt proves an exact 132-entity RLS readback |
| Railway project | `ffcd108b-e81f-4952-bbe7-841a5dc4379e`, production environment `75e5d390-968c-4acd-a45a-4981f9959107` |
| Railway API | Service `2bdeff1a-74fc-4484-8316-6f10d974aaae`, deployment `024e3ca8-9af6-4bb4-bb1b-9b0d5fcedf87`, healthy and operator-labeled `Deploy Phase 190 merge 646863d2`; Railway did not expose a provider-bound full Git SHA for this deployment |
| Railway worker | Service `e531972e-5c0a-4885-9f19-f44f6bc6a366`, deployment `35af3ad1-fa22-4885-b279-5e38be447fbf`, GitHub-bound to full SHA `646863d2b2a30491d35c786028166561aceededf` |
| Redis | Service `ad2a7c19-28d5-4be4-ad36-31eb039783c2`, Redis 8.2.1, persistent volume, live stream activity |
| PostgreSQL | Service `46e95d14-c7fa-4643-8e35-e39ae66e170f`, PostgreSQL 18, persistent volume |
| Latest migration | `20260726030000_phase_190_entity_pause_resume_vertical_slice`, checksum `927fbb32cb61c5f15ab0cbc7dee838cf615d458358d0e69d873391a4e977adb5` |

The baseline Vercel build log reported Vercel CLI `56.5.0`. It also warned that
Vercel deployments created with Node.js 20.x on or after 2026-10-01 will fail.
The Phase 195 workflow therefore pins the provider-proven CLI version for this
release, while a separately reviewed Node.js 24 migration remains required
before that dated provider cutoff.

The worker's provider-bound SHA was one merge behind the frontend. The API
operator label referenced the same short commit, but did not provide a
provider-bound full SHA. Exact-SHA deployment parity was therefore not
satisfied. Phase 195 must deploy both services from the accepted Phase 195 main
commit and retain full provider SHA bindings.

## Required local and CI gates

Run from a clean clone with Node 20.19.0, pnpm 9.12.3, Docker, PostgreSQL 18,
Redis, and Chrome:

```powershell
pnpm install --frozen-lockfile
pnpm contracts:verify
pnpm prisma:generate
pnpm test:release-positioning
pnpm test:phase160
pnpm test:phase180
pnpm test:phase195:licenses
pnpm test:phase195
$env:PHASE195_RECOVERY_GATE_CONFIRM = "DISPOSABLE_ONLY"
pnpm test:phase195:recovery
Remove-Item Env:PHASE195_RECOVERY_GATE_CONFIRM
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm release:check
```

These commands are clean-clone executable only when every referenced Phase 195
script, test, migration, policy, and notice file belongs to the accepted commit.
At the dated 2026-07-26 pre-release audit, those additions were still untracked
and a clone of the then-current `origin/main` could not run the Phase 195
commands. Before release, repeat the tracked-path and clean-clone checks against
the proposed accepted SHA rather than treating that historical observation as
current Git status.

The PostgreSQL integration job must set `RUN_POSTGRES_INTEGRATION=1` and use a
disposable PostgreSQL 18 database. The Redis integration job must use an
ephemeral Redis service. CI executes the contract, graph, accessibility, scale,
and release gates, and uploads the matching Phase 195 browser JSON/PNG,
production-license, and per-run recovery receipts from their declared
`test-results` paths.

## Authoritative acceptance-vector ledger

Every row below maps one mandatory condition from
`03_ACCEPTANCE/PHASE_195_ACCEPTANCE.yaml`. Local tests and intercepted browser
fixtures can support a vector, but they cannot close a provider, restart, or
authenticated production condition.

| Vector | Current local or CI evidence | Mandatory closure evidence |
|---|---|---|
| PHASE-195-AC-01 | `PHASE_195_BRANCH_RECONCILIATION.md` records the selected Phase 100-190 chain and duplicate dispositions. | Reconcile once more against current `origin/main`, review the final diff, and retain the clean accepted main SHA. |
| PHASE-195-AC-02 | `ci-cd.yml` pins Node, pnpm, PostgreSQL, Redis, browser, audit, build, and release gates. | Retain one successful clean-clone hosted run and its artifacts from the accepted SHA. |
| PHASE-195-AC-03 | PostgreSQL integration, worker-readiness, health, outbox, and runtime-safety tests cover the constituent paths. | Boot, migrate, authenticate, consume outbox work, restart the production-equivalent API/worker/database/Redis stack, and retain post-restart readbacks. |
| PHASE-195-AC-04 | `phase195RuntimeSafety.test.ts` and the fail-closed release gate reject production memory, deterministic, sample, and mock paths. | Retain separate API and worker runtime receipts from the exact production SHA proving those paths are unreachable. |
| PHASE-195-AC-05 | `phase190EntityLifecyclePostgres.integration.test.ts` covers durable lifecycle state. The browser suite exercises pause, direct resume, and undo with receipt lineage and reload rehydration, emitting `phase195-ac05-lifecycle-browser-fixture.json`. | Execute the restart sequence below against the accepted deployed services and real PostgreSQL/outbox state. The intercepted browser fixture is never production evidence. |
| PHASE-195-AC-06 | The `phase-190` tag identifies the immutable starting point and release-evidence contracts exist. | Create and push the accepted Phase 195 release tag and retain the final evidence bundle before Phase 200 branches. |
| PHASE-195-AC-07 | Projection, Workspace, renderer, contract, RLS, and browser parity tests compare canonical IDs, edges, lineage, counts, authority input, and authorized selected-detail fields. The intercepted browser case requires an exact nonzero child count plus mission/detail parity between the 2D live region/drawer and expanded 3D inspector. | An authenticated production receipt must bind both renderers to one response from the exact deployed main SHA. |
| PHASE-195-AC-08 | The Phase 195 browser case measures cards, headers, stages, and canvases with a two-pixel tolerance and retains breakpoint PNGs plus numeric DOM geometry in `phase195-dual-graph-browser-fixture.json`. | Repeat the computed geometry assertions without route interception on every approved production desktop viewport. |
| PHASE-195-AC-09 | Browser E2E exercises Auto, Side by side, Stack, 2D only, and 3D only at desktop, tablet, and mobile widths, reloads the persisted 3D-only choice in each profile, and retains the requested/effective arrangement readback in `phase195-dual-graph-browser-fixture.json`. | Repeat against production with a real authenticated preference record and retain its versioned readback. |
| PHASE-195-AC-10 | Authority/projection/layout tests prove monotonic tiers and bounded within-tier score influence. | Retain authenticated production projection and rendered-geometry assertions for the accepted build. |
| PHASE-195-AC-11 | The exact 132-entity layout, collision, cache, scale, and portable SVG-golden tests are deterministic. | Retain production reload stability, even-spacing, collision/legibility, and no-random-repositioning evidence. |
| PHASE-195-AC-12 | Layout and Workspace tests exercise every exposed 2D and 3D pattern and exact entity/edge preservation. | The authenticated production browser must show an observable geometry change for every exposed pattern while IDs and edges remain identical. |
| PHASE-195-AC-13 | Workspace, renderer, motion/force, and semantics tests cover the concise menu and functional Advanced controls, including explicit tree-force rejection. | Retain production control-by-control observable-effect evidence and confirm no unsupported control is exposed. |
| PHASE-195-AC-14 | Contract and PostgreSQL tests cover schema migration, optimistic versions, organization/user scope, reset, and conflicts; intercepted browser E2E covers reload behavior. | Save in one authenticated production session, restore in a second session for the same user and organization, reject a stale version, reset, and read canonical defaults back. |
| PHASE-195-AC-15 | Component tests cover synchronized state and exact all-eight-Marshal descendants. Browser E2E uses an exact 132-entity/131-edge fixture and emits `phase195-all-eight-marshal-browser-fixture.json` after checking both renderers. | On production data, select each of the eight Marshals and retain the exact RLS-visible General-ID sets from both renderers. |
| PHASE-195-AC-16 | Workspace, accessibility, visual semantics, deep-link, export, pin/reset, and browser tests cover the named controls and textual fallback. | Repeat keyboard, reduced-motion, export, deep-link, legend, and textual-hierarchy smoke checks in the authenticated production surface. |
| PHASE-195-AC-17 | Renderer performance, worker, 132/10,000-node scale, telemetry, and truthful failure tests exist. The large-fixture browser case requires the fitted 2D frame's actual rendered canonical-ID count and FNV-1a signature to match all 10,000 canonical IDs, in addition to the timing gates. | Retain production frame/dropped-frame telemetry, LOD behavior, exact rendered-ID count/signature, and recoverable failure readbacks without customer payloads. |
| PHASE-195-AC-18 | The local browser suite supplies fixture-only geometry, arrangement, reload, and Marshal checks. It cannot satisfy this vector. | Execute the exact authenticated production-smoke procedure below only after all provider SHAs equal accepted main. |
| PHASE-195-AC-19 | Release contracts, guarded recorder, reconciliation record, and this runbook define the sequence. | Merge and push accepted main, deploy that exact SHA, retain live/readback/recovery evidence, close the immutable gate, and only then begin the next phase. |

The `phase195-*-browser-fixture.json` artifacts intentionally contain
`accepted_production_evidence: false` and
`evidence_class: INTERCEPTED_BROWSER_FIXTURE`. CI may retain them as local
regression evidence, but the completion manifest and AC-18 smoke receipt must
not cite them as live evidence.

### PHASE-195-AC-05 restart acceptance

Use one authorized non-ENTRAL entity and record its initial status and version
`V0`. Do not use the intercepted browser route for this procedure.

1. From the authenticated production member surface, submit PAUSE with expected
   version `V0`. Retain the request/action ID, idempotency key, canonical event,
   audit, conversation/outbox, containment, and verification receipt. Read back
   `PAUSED` at `V0 + 1` through the member API.
2. Restart or roll both the Railway API and worker at the accepted SHA. In the
   disposable production-equivalent recovery run, also restart PostgreSQL 18
   and Redis. Wait for API and worker readiness and verify the outbox has no
   stranded lifecycle work.
3. Open a fresh authenticated browser session and read the same entity. It must
   still be `PAUSED` at `V0 + 1`; a component-local state value is not a pass.
4. Submit a direct RESUME with expected version `V0 + 1`, retain the same
   receipt classes, restart/roll API and worker again, and read `ACTIVE` at
   `V0 + 2` from a fresh session.
5. Submit a second PAUSE at `V0 + 2`, then use Undo. The inverse RESUME must
   carry `restores_action_id` equal to that second PAUSE action ID and advance
   through `V0 + 3` to `V0 + 4`. Restart/roll the services once more and read
   `ACTIVE` at `V0 + 4`.
6. Retain provider restart/deployment IDs, readiness timestamps, the sanitized
   lifecycle receipt, database/readback digest, and outbox/worker receipt.
   Any version mismatch, lost restoration lineage, missing receipt, or state
   regression after restart blocks AC-05.

### PHASE-195-AC-18 authenticated production smoke

This procedure is blocked until GitHub `origin/main`, Vercel frontend, Railway
API, and Railway worker all identify the same accepted 40-character SHA and
PostgreSQL reports the Phase 195 migration/grants applied.

1. Use a fresh authenticated production browser context with no request
   interception, response replacement, service worker mock, or preview URL.
   Record the production URL, accepted SHA, provider deployment IDs, viewport,
   organization scope, start time, and a sanitized session/receipt identifier.
2. Capture the one canonical projection response and a protected exact-ID
   digest. Assert both renderers expose identical entity IDs, edge IDs, counts,
   lineage, authority tier/score, status, health, and RLS visibility.
3. At every approved desktop viewport, compute DOM rectangles for both cards,
   headers, toolbars, stages, and canvases. Equal widths and top/bottom edges,
   plus header, toolbar, stage, and canvas heights, must differ by no more than
   two CSS pixels. Retain the numeric JSON and screenshots. The checked-in
   browser matrix currently includes 1440 by 1000; record any additional
   release-approved desktop widths explicitly.
4. Exercise Auto, Side by side, Stack, 2D only, and 3D only at desktop, tablet,
   and mobile widths. Reload after each persisted choice where applicable and
   prove the saved choice is unchanged while narrow responsive overrides do not
   overwrite it.
5. Save a non-default arrangement, 2D layout, 3D pattern, and spacing value.
   Close the browser context, authenticate a second session for the same user
   and organization, and read back the same schema/version/settings. Exercise a
   stale-version rejection, reset to canonical defaults, and read the defaults
   back from the server.
6. For every exposed layout/pattern, retain an automated geometry assertion
   showing an actual coordinate change with identical authorized IDs/edges.
   Assert authority radii remain monotonic, within-tier scores remain bounded,
   peer spacing is even, and the same accepted projection is stable on reload.
   A screenshot without numeric/readback evidence is insufficient.
7. Select each of the eight production Marshals. For each, isolate/expand its
   lineage and compare the exact RLS-visible General-ID set and edge-ID set in
   both renderers. Store protected exact-ID evidence and expose only its digest
   in the public completion record.
8. Retain a sanitized JSON receipt and screenshots, hash every retained
   artifact, and bind the receipt to the accepted SHA and deployment IDs. Any
   fixture, manual-only assertion, preview deployment, SHA mismatch, or missing
   readback keeps AC-18 blocked.

## Migration and recovery procedure

The migration identity remains separate from API and worker runtime identities.
Do not put the migration-only URL into either runtime service.

The reusable local/CI gate is fail-closed and accepts no positional targets:

```powershell
$env:PHASE195_RECOVERY_GATE_CONFIRM = "DISPOSABLE_ONLY"
pnpm test:phase195:recovery
Remove-Item Env:PHASE195_RECOVERY_GATE_CONFIRM
```

It generates unique labeled source/restore database and container names, binds
random ports to loopback only, and checks exact container ID, name, and both
labels before restart or cleanup. It verifies a custom-format backup and a
globals backup made with `--no-role-passwords`, retains only hashes and
structural metadata, deletes the backup bytes, and writes
`test-results/phase195/phase195-recovery-<run-id>.json`. Local receipts are
ignored by Git; CI uploads that path as the Phase 195 evidence artifact. The
gate is disposable evidence only and never authorizes a provider or production
write.

Fresh exact-Node20.19.0 local run `4948006b4b4b` passed after the
recorder-integrity migration change using PostgreSQL 18.4 and Redis 8.2.8. Its
ignored receipt
`test-results/phase195/phase195-recovery-4948006b4b4b.json` has SHA-256
`02fe49f09d970687182f3d8e80cc70586f824d39cc8a013849ade8664e9f9896`;
it verified a 785,252-byte custom backup and 1,929-byte globals backup, and the
applied Phase 195 migration checksum is
`d2224f0648920a8be9a9d50561c4139ea3199f11ca953dba2963186c2cdaf1ad`.
This remains dirty-tree disposable local evidence, not hosted CI or production
evidence.

1. Record the target main SHA and provider deployment plan.
2. Create and verify a PostgreSQL custom-format backup plus globals backup.
3. Restore the backup into a disposable PostgreSQL 18 database.
4. Apply the complete migration sequence and the Phase 195 roles/grants file.
5. Seed twice and verify exactly one ENTRAL, eight Marshals, 123 Generals, and
   the same hierarchy edge count after restart.
6. Run non-superuser API and worker integration tests against the restored
   database and Redis.
7. Apply the production migration with the migration-only credential.
8. Read back `_prisma_migrations` and the Phase 195 preference table/policies;
   retain the exact migration checksum and readback digest.
9. Deploy API and worker from the exact accepted main SHA, then verify worker
   readiness and outbox consumption.
10. After CI, provider, authenticated smoke, runtime, and recovery receipts are
    complete, run the immutable recorder and read its canonical gate back
    through the admin-authenticated control-plane route.

Forward recovery is the production rollback strategy for Phase 195 schema
changes. Application rollback must retain the additive preference table and
ignore its records; do not destructively drop customer preferences during a
binary rollback.

## Production acceptance

Phase 195 is closed only after all of these readbacks are retained:

- GitHub main, Vercel frontend, Railway API, and Railway worker identify the
  same accepted Phase 195 SHA.
- PostgreSQL reports the Phase 195 migration and grants applied without
  rollback.
- Authenticated member proxy requests preserve same-origin cookies and return
  one graph projection to both renderers.
- The browser proves entity IDs, edge IDs, lineage, authority metadata, status,
  health, counts, and RLS visibility are equal between 2D and 3D.
- Auto, Side by side, Stack, 2D only, and 3D only persist correctly at desktop,
  tablet, and mobile widths.
- At desktop widths the two card edges, headers, toolbars, and canvases differ
  by no more than two CSS pixels.
- Every exposed layout changes geometry while keeping authority bands
  monotonic and stable across reload.
- Preferences restore in a second authenticated session, reject stale versions,
  and reset to canonical defaults.
- Search, filters, connection modes, shared navigation, Marshal drilldown,
  pinning, authorized deep links, exports, keyboard use, reduced motion, and
  textual fallback pass.
- Phase 190 pause, resume, and undo still persist across restart.
- Loading, empty, API failure, and renderer failure are truthful and
  recoverable; no production request selects sample hierarchy or deterministic
  fallback data.

The completion record must include the final main SHA, migration fingerprint,
Vercel/Railway deployment IDs, CI run and artifact IDs, authenticated smoke
receipt, executed restore reference, and remaining external credential
boundaries.

## Immutable production evidence recording

The production control-plane route is read-only. The only supported recording
path is the fail-closed CLI, which accepts a strict JSON manifest from a
protected file and opens PostgreSQL only when write mode is explicitly enabled.
It rejects positional arguments so database credentials and evidence values
cannot be placed in command history. Its output is a bounded summary; it does
not print the manifest, provider URLs, smoke URLs, or database URL.

Prepare the manifest outside the repository and validate it without opening a
database connection:

```powershell
$env:RELEASE_EVIDENCE_MANIFEST_PATH = "C:\protected\phase-195-release.json"
Remove-Item Env:RELEASE_EVIDENCE_WRITE -ErrorAction SilentlyContinue
Remove-Item Env:RELEASE_EVIDENCE_DATABASE_URL -ErrorAction SilentlyContinue
pnpm release:evidence:record
```

After every provider and live gate is independently verified, use a
migration-only or database-owner connection. Never reuse an API, worker, or
verifier runtime credential:

```powershell
$env:RELEASE_EVIDENCE_MANIFEST_PATH = "C:\protected\phase-195-release.json"
$env:RELEASE_EVIDENCE_DATABASE_URL = "<migration-only PostgreSQL URL>"
$env:RELEASE_EVIDENCE_WRITE = "1"
pnpm release:evidence:record
```

The recorder uses a serializable transaction and a phase-scoped advisory lock.
It reads the named row from `_prisma_migrations`, requires an applied,
non-rolled-back migration with the exact checksum, records every child receipt,
and reads the canonical gate back before commit. An identical replay is a
success; any pre-existing value that differs from the accepted manifest aborts
the whole transaction. The command does not deploy a provider, run a migration,
or manufacture any missing evidence.

All six release-evidence tables are insert-only at the database layer.
`BEFORE UPDATE OR DELETE` row triggers and `BEFORE TRUNCATE` statement triggers
reject mutation even from the table owner; the recorder inserts already-final
rows, and a correction requires a new release/evidence identity. The PostgreSQL
integration gate proves owner UPDATE, DELETE, and TRUNCATE attempts fail.

The protected manifest is complete only when it contains:

- The final accepted 40-character main SHA, repository, release tag, acceptance
  timestamp, and stable root idempotency key. The recorder derives the retained
  actor identity from PostgreSQL `current_user`; the manifest cannot claim it.
- The exact Phase 195 migration name and production `_prisma_migrations`
  checksum, a dedicated migration-readback `checked_at` timestamp, and a
  SHA-256 of the retained database readback.
- Exactly three exact-SHA provider readbacks: frontend/Vercel, API/Railway, and
  worker/Railway. Each needs the service and deployment IDs, HTTPS public
  readback URL, deployment and verification timestamps, freshness, and retained
  readback SHA-256.
- The successful GitHub Actions run ID and HTTPS URL, verification timestamp,
  retained run SHA-256, and at least one artifact ID with its SHA-256.
- An authenticated member smoke receipt ID, HTTPS target, `PASSED` status,
  verification timestamp, and retained receipt SHA-256. Its target origin must
  match the frontend deployment public URL origin.
- An executed restore strategy, durable recovery receipt reference,
  verification timestamp, and retained receipt SHA-256. Forward recovery alone
  cannot close the Phase 195 production gate.
- Every retained pull-request disposition with its actual historical head SHA.
  Exactly one `MERGED` final-acceptance pull request must bind the accepted
  release SHA and repository; `SUPERSEDED` and `REJECTED` entries must not
  fabricate that SHA.
- Separate API and worker production-runtime receipts at the accepted SHA, each
  naming the same service as its corresponding deployment and proving in-memory
  canonical state, deterministic fallback, and sample data are unreachable.
- A stable gate ID, closure timestamp after all receipts, and an empty
  `remaining_external_boundaries` array.

This implementation task does not authorize or perform the final production
recording. Keep the manifest untracked and remove the three environment
variables after the authorized recording session.

## V7 continuation locks

- Phase 205 may extend graph entities with canonical `AgentInstance` and
  assignment references through the same projection. It may not create a
  second graph data source. The versioned
  `bindCanonicalGraphRuntimeState` contract is the executable compatibility
  seam: it joins opaque future canonical AgentInstance/assignment records only
  to entity IDs already present in the RLS-authorized `GraphProjection`,
  preserves exact entity count/order/object identity, and rejects duplicate or
  out-of-scope bindings.
- Phase 215 Microsoft separation may replace Microsoft-facing adapters only. It
  may not remove or degrade the member shell, graph projection, graph routes,
  provider release workflow, or production verification gates.
- Phase 200 cannot branch until the immutable Phase 195 release gate is closed
  on exact deployed main.

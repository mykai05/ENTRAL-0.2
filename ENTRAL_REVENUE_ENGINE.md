# ENTRAL Revenue Engine

Module 1 is the internal revenue operating layer for POD and digital product portfolios.

## Current Build

The first Revenue Engine section evaluates existing Client Merch Stores and POD product drafts, then produces a private operating plan:

- Portfolio totals: stores, products, approved products, published products, estimated retail value, estimated profit, revenue, and high-risk products.
- Store decisions: scale, prepare launch, generate, watch, pause, or kill.
- Product decisions: scale, prepare launch, generate, watch, revise, pause, or kill.
- Pipeline actions: next internal work items for product generation, launch package preparation, scale prep, or internal rotation.
- Rotation changes: internal status updates that can revise, pause, or archive weak assets without deleting data.
- Launch Pipeline: ranks stores for internal product seeding, launch package preparation, and approval-packet queueing.
- Digital Product Portfolio: creates internal high-margin digital product lanes, prompts, pricing presets, launch templates, and approval-gated draft queues.
- Performance Velocity Ledger: ingests internal sales snapshots, calculates revenue/profit velocity, conversion, refund/ad-spend risk, and queues evidence-based scale or rotation recommendations.
- Signal Intake Center: normalizes approved read-only commerce, content, and payment evidence into internal performance snapshots and reconciliation-only finance records without contacting providers.
- Listing Optimization Queue: creates title, description, tag, mockup-note, and pricing variants from product/store/performance evidence, then applies approved variants to internal listing draft records only.
- Store Setup Runbook: prepares storefront settings, collection blueprints, product lane targets, credential-scope requirements, connector readiness evidence, and rollback steps before any live connector work.
- Launch Readiness Board: combines launch pipeline, store setup, provider payload, and approval evidence into one ranked internal board for handoff readiness, blockers, and next actions.
- Launch Handoff Packet Builder: turns handoff-ready stores into portfolio-level provider bundle previews with locked request manifests, artifact-slot requirements, credential scopes, drift checks, blockers, and durable internal packet records.
- Launch Handoff Control Center: manages durable handoff packet records with internal statuses, review blockers, recommended controls, and audit-logged status changes.
- Launch Operations Pack: consolidates sprint/checklist/handoff evidence, locked request manifests, artifact slots, manual steps, QA checks, readiness scores, and blockers into operator-facing manual-only launch artifacts with audit-log recording.
- Launch Revenue Closure Ledger: scores manual launch packs against readiness, expected first-week revenue, blockers, performance evidence, and post-launch monitoring triggers before any future live connector design.
- Revenue Live Connector Readiness Registry: maps launch-closed stores to connector design readiness, required read-only approvals, credential environment names, future live scopes, endpoint templates, review gates, rollback controls, and locked read-only/live boundaries.
- Financial Orchestrator: converts internal revenue performance snapshots into split-policy checked ledger entries, 50/25/25 default allocation buckets, approval-locked payout intents, and Stripe Treasury + Connect readiness evidence without moving money.
- Scaling Budget Review: persists validated scale-asset budget packets, exposes approve/reject review state, and feeds pending scale-capital approvals into Portfolio Command Center finance commands without authorizing spend.
- Scaling Spend Control: converts approved scaling budget packets into manual-only product, listing, content, and reserve spend-control packets with audit evidence and no external spend execution.
- Payout Review Center: reviews payout intents, produces budget release packets, records approve/reject decisions, and keeps Stripe Treasury + Connect readiness in manifest-only mode.
- Release Governance: persists budget release packet records, reconciliation reports, risk-tier dashboards, and read-only Stripe readiness probes while financial execution remains locked.
- Faceless Content Pipeline: creates internal short-form content briefs, scripts, storyboards, ElevenLabs voiceover specs, Runway/Kling/Luma video specs, Shorts/TikTok/Reels channel packages, and content performance optimization signals without contacting providers or uploading content.
- Portfolio Command Center: aggregates revenue, performance velocity, payout governance, scaling budget review, scaling outcome evidence, content traction, recent command history, risk lanes, and one-click internal command actions for pause, kill, revise, scale, payout review, scale outcome review, governance recording, and content queueing.
- Revenue Opportunity Factory: turns a raw private commerce idea into an idempotent internal store shell, POD product draft batch, durable source-keyed opportunity record, and next queue actions for listing optimization, store setup, and Autopilot.
- Revenue Opportunity Control Center: scores durable opportunity records by linked store, product, and performance evidence, tracks lifecycle stage/readiness, and allows only internal status changes such as watch, paused, killed, blocked, or ready-for-handoff.
- Revenue Launch Checklist: joins opportunity, store/product drafts, launch readiness, connector approvals, import handoffs, Signal Intake evidence, and portfolio command actions into one ranked internal operator view.
- Revenue Launch Checklist Action Bridge: maps ranked checklist items onto existing internal apply endpoints with store-scoped/id-scoped payloads, dry-run previews, confirmation gates, and manual-review blockers.
- Revenue Launch Sprint: optionally creates one internal opportunity, then repeatedly refreshes and dispatches ready checklist bridge actions for a bounded number of cycles before stopping at manual-review gates.
- Revenue Autopilot: coordinates signal intake, POD launch seeding, digital product queues, listing optimization, store setup, content briefs, finance splits, release governance, and portfolio commands into one approval-gated internal command plan.
- Read-Only Signal Connector Center: prepares commerce, content, and payment connector manifests with read-only scopes, credential environment requirements, endpoint templates, sample Signal Intake payloads, and audit-logged manifest recording.
- Signal Connector Approval Center: persists durable read-only connector approval records, supports approve/reject review gates, and queues internal import jobs from approved sample payloads without contacting providers.
- Signal Import Handoff Runner: transforms queued, approved read-only import-job sample payloads into internal Signal Intake records after explicit confirmation, then marks import jobs completed with handoff audit metadata.
- Browser Operations Layer: monitors the internal read-only automation queue, verifies allowed-domain policy, tracks isolated browser-context capacity, and previews/applies internal recovery actions for failed or stale jobs without stealth, proxy, fingerprint, account, upload, payment, or platform-evasion automation.
- Provider Payload Package: creates locked Printify, Printful, Etsy, and Shopify request drafts from approved products.
- Provider Payload Approval Packets: queues those request drafts into human review records with credential scopes, rollback checks, and audit evidence.
- Provider Handoff Bundles: turns approved provider packets into locked request manifests, artwork slots, manual launch checklists, rollback steps, and connector-readiness status.
- Dashboard controls: preview/create Revenue Opportunity Factory assets, preview/run the Revenue Launch Sprint, inspect/update Revenue Opportunity Control status, load the Revenue Launch Checklist, load/preview/dispatch the Launch Checklist Action Bridge, load the Launch Readiness Board, load/record Launch Handoff Packets, control saved handoff packet states, load/preview/record Launch Operations Packs, load/preview/record Launch Revenue Closure Ledger scorecards, load/preview/record Revenue Live Connector Readiness Registry entries, build the Revenue Autopilot, preview/record internal autopilot command records, preview/execute safe internal autopilot steps, load/record read-only Signal Connector manifests, queue/review connector approvals, queue read-only signal import jobs, preview/ingest queued signal import handoffs, build the Portfolio Command Center, run the portfolio engine, ingest manual performance snapshots, load velocity, build listing tests, build store setup runbooks, build finance splits, build the launch and digital queues, and apply portfolio commands, finance, listing, setup, launch, digital, and rotation work.

## API

`POST /api/v1/merch/revenue-engine/opportunity-factory`

Creates or previews an internal revenue opportunity from a raw idea. Required body:

```json
{
  "confirm": "CREATE INTERNAL REVENUE OPPORTUNITY",
  "dryRun": false,
  "idea": "Private operator merch line for funding ENTRAL advancement",
  "businessName": "Signal Forge",
  "productTypes": ["T-shirt", "Sticker", "Notebook", "Poster"],
  "productCount": 5,
  "riskTolerance": "Low",
  "storePlatform": "Etsy",
  "podProvider": "Printify"
}
```

The factory derives a private store shell, creates internal POD product drafts through the existing batch generator, upserts a durable `RevenueOpportunity` registry record keyed by `(userId, sourceKey)`, and skips generated product names that already exist for that opportunity on rerun. It returns the opportunity plan, opportunity id, created store/product counts, skipped duplicates, next internal queue actions, and an audit log. It does not publish listings, contact POD or marketplace providers, upload artwork, move money, run browser automation, use stealth, rotate proxies, spoof fingerprints, or start ad spend.

`GET /api/v1/merch/revenue-engine/opportunities/control`

Returns the internal Revenue Opportunity Control Center. Optional query settings:

- `includeKilled`
- `maxOpportunities`
- `minProductDrafts`
- `minListingReadyProducts`
- `minApprovedProducts`
- `minReadinessForHandoff`
- `windowDays`

The plan reads durable `RevenueOpportunity` records, linked store/product drafts, and internal performance snapshots. It returns lifecycle stage, readiness score, risk level, blockers, recommended internal status, next internal actions, and safe control actions. It does not publish, upload, open provider sessions, call connectors, run browsers, move money, start ad spend, or change external systems.

`POST /api/v1/merch/revenue-engine/opportunities/:opportunityId/control`

Updates only the internal durable opportunity status. Required body:

```json
{
  "confirm": "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL",
  "status": "watch",
  "note": "Holding for more performance evidence.",
  "dryRun": false
}
```

Allowed statuses are `active`, `watch`, `paused`, `blocked`, `killed`, and `ready_for_handoff`. The `ready_for_handoff` status is rejected unless the opportunity meets readiness, listing, and approval thresholds, unless `overrideReadiness` is explicitly supplied. Apply mode writes an audit log and updates the opportunity registry record only.

`GET /api/v1/merch/revenue-engine/launch-readiness`

Returns the internal Launch Readiness Board. Optional query settings:

- `includeApprovalHistory`
- `maxStores`
- `minLaunchReadiness`
- `minProviderReadiness`

The board aggregates Revenue Launch Pipeline state, Store Setup Runbook readiness, locked Provider Payload Packages, and Growth Approval / Provider Approval packet history. It ranks stores by launch-readiness stage, readiness score, blockers, provider payload counts, approval state, and next internal action such as seed product drafts, optimize listings, queue launch approval, prepare store setup, request provider payload approval, or generate provider handoff. It is read-only and does not publish listings, create provider products, upload artwork, open provider admin sessions, move money, start ads, post content, run browsers, use stealth, rotate proxies, spoof fingerprints, or perform platform evasion.

`GET /api/v1/merch/revenue-engine/launch-checklist`

Returns the internal Revenue Launch Checklist. Optional query settings:

- `includeCompleted`
- `maxItems`
- `minPriorityScore`
- `windowDays`

The checklist joins Revenue Opportunity Control, Launch Readiness, read-only Signal Connector approvals, queued Signal Import Handoffs, Signal Intake evidence, and Portfolio Command Center actions into one ranked operator view. Each item includes store/opportunity identity, priority score, income velocity score, readiness score, risk, blockers, stage statuses, next internal action, draft/product metrics, connector queue counts, import handoff counts, performance evidence, and linked portfolio commands. It is read-only and does not publish listings, call providers, upload assets, run browsers, use stealth, rotate proxies, spoof fingerprints, execute imports, move money, contact payment processors, post content, or perform external writes.

`GET /api/v1/merch/revenue-engine/launch-checklist/action-bridge`

Returns the internal Revenue Launch Checklist Action Bridge. Optional query settings:

- `includeCompleted`
- `maxActions`
- `maxItems`
- `minPriorityScore`
- `windowDays`

The bridge maps the highest-priority checklist items to existing internal module apply endpoints. Ready bridge actions include only scoped payloads such as a store id, selected read-only connector manifest ids, selected approved connector approval ids, selected queued import job ids, or selected portfolio command hashes. Manual-review items stay blocked when the next step requires direct judgment, such as connector approve/reject review, manual performance evidence input, store-shell source data, or provider payload packet review. The response includes action status, dispatch kind, endpoint, payload preview, blocker reason, and blocked external actions.

`POST /api/v1/merch/revenue-engine/launch-checklist/action-bridge/apply`

Previews or dispatches ready checklist bridge actions into existing internal apply endpoints. Required body:

```json
{
  "confirm": "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
  "dryRun": true,
  "maxActions": 5,
  "note": "Preview ready checklist actions before internal dispatch."
}
```

When `dryRun` is true, ENTRAL previews the selected ready actions without writing data. Apply mode dispatches only ready bridge actions into the existing internal modules: Launch Pipeline, Listing Optimization, Store Setup, Signal Connector Approval queueing, Signal Import Job queueing, Signal Import Handoff ingestion, and Portfolio Command Center records. It never approves connector access, publishes listings, creates provider products, uploads files, runs browser stealth, rotates proxies, spoofs fingerprints, contacts providers, imports live data, posts content, starts ads, or moves money.

`POST /api/v1/merch/revenue-engine/launch-sprint`

Runs a bounded internal Revenue Launch Sprint. Required body:

```json
{
  "confirm": "RUN INTERNAL REVENUE LAUNCH SPRINT",
  "dryRun": false,
  "idea": "Private operator merch line for funding ENTRAL advancement",
  "businessName": "Signal Forge",
  "productTypes": ["T-shirt", "Sticker", "Notebook", "Poster"],
  "productCount": 5,
  "maxCycles": 4,
  "maxActions": 5
}
```

If `idea` is provided, the sprint first runs the internal Revenue Opportunity Factory with the same dry-run setting. It then refreshes the Launch Checklist Action Bridge, dispatches only ready bridge actions, refreshes the bridge again, and repeats until `maxCycles`, no ready actions, or a manual-review gate is reached. Dry-run mode previews one bridge cycle without writing records. Apply mode can create internal opportunity/store/product records and dispatch existing internal bridge actions, but it does not approve connector reviews, create write scopes, import live provider data, publish listings, upload files, post content, start ads, move money, run browser stealth, rotate proxies, spoof fingerprints, or evade platform controls.

`GET /api/v1/merch/revenue-engine/launch-handoff`

Returns the internal Launch Handoff Packet Builder. Optional query settings:

- `includeBlocked`
- `maxBundles`
- `minLaunchReadiness`
- `minProviderReadiness`
- `minConnectorReadiness`

The plan starts from the Launch Readiness Board, locked Provider Payload Packages, and approved provider approval records. It returns bundle previews, request-manifest counts, artifact-slot counts, credential scopes, connector readiness, blockers, queue actions, and approved packet references. It is read-only and does not publish listings, create provider products, upload artwork, open provider admin sessions, move money, start ads, post content, run browsers, use stealth, rotate proxies, spoof fingerprints, or perform platform evasion.

`POST /api/v1/merch/revenue-engine/launch-handoff/apply`

Records the current internal Launch Handoff Packet Builder output as durable `RevenueLaunchHandoffPacket` rows. Required body:

```json
{
  "confirm": "RECORD INTERNAL LAUNCH HANDOFF PACKETS",
  "dryRun": false,
  "maxBundles": 10
}
```

Apply mode writes or updates internal handoff packet records by dedupe key, attaches the audit log id, stores locked bundle JSON, credential scopes, providers, blockers, manifest counts, artifact-slot counts, readiness scores, and status such as `ready_for_manual_handoff`, `queued_review`, or `blocked_review`. It does not execute provider requests, upload files, open browser sessions, publish listings, change storefronts, move money, or authorize connector execution.

`GET /api/v1/merch/revenue-engine/launch-handoff/control`

Returns the internal Launch Handoff Control Center. Optional query settings:

- `includeArchived`
- `maxPackets`
- `minConnectorReadiness`

The plan reads durable `RevenueLaunchHandoffPacket` rows, recomputes review blockers, recommended status, status counts, manifest/artifact totals, and control actions. It does not execute provider requests, open browsers, upload files, publish listings, or contact external systems.

`POST /api/v1/merch/revenue-engine/launch-handoff/packets/:packetId/control`

Updates only the internal status of a saved launch handoff packet. Required body:

```json
{
  "confirm": "UPDATE INTERNAL LAUNCH HANDOFF CONTROL",
  "status": "ready_for_manual_handoff",
  "note": "Reviewed locked manifests and artifact slots.",
  "dryRun": false
}
```

Allowed statuses are `queued_review`, `ready_for_manual_handoff`, `blocked_review`, and `archived`. Ready status is rejected unless the packet has manifests, connector readiness, and no high-risk blockers, unless `overrideReadiness` is explicitly supplied. Apply mode writes an audit log and updates only the internal packet record.

`GET /api/v1/merch/revenue-engine/launch-operations-pack`

Returns the internal Launch Operations Pack. Optional query settings:

- `includeBlocked`
- `maxPacks`
- `minLaunchReadiness`
- `minProviderReadiness`
- `minConnectorReadiness`

The plan joins Launch Handoff Packets and the Revenue Launch Checklist into manual-only launch artifacts. Each pack includes readiness scores, request-manifest summaries, required artifact slots, credential scopes, operator steps, QA checks, audit trail pointers, checklist context, blockers, and locked external actions. It is read-only and does not publish listings, send provider requests, upload files, move money, open browsers, run stealth, rotate proxies, spoof fingerprints, post content, start ads, or perform external writes.

`POST /api/v1/merch/revenue-engine/launch-operations-pack/apply`

Records selected Launch Operations Packs as internal audit artifacts. Required body:

```json
{
  "confirm": "RECORD INTERNAL LAUNCH OPERATIONS PACKS",
  "dryRun": false,
  "storeIds": ["store_123"],
  "note": "Manual launch pack reviewed."
}
```

When `dryRun` is true, ENTRAL reports which packs would be recorded. Apply mode writes an audit log containing selected pack summaries, manifest counts, artifact-slot counts, credential scopes, readiness state, and blocked external actions. It does not create provider-side products, publish marketplace listings, upload assets, change storefront settings, authorize connectors, call providers, move money, run browser automation, or execute any external system.

`GET /api/v1/merch/revenue-engine/launch-closure-ledger`

Returns the internal Launch Revenue Closure Ledger. Optional query settings:

- `expectedOrderValue`
- `includeBlocked`
- `maxEntries`
- `minClosureScore`
- `monitoringWindowDays`
- `targetFirstWeekRevenue`

The ledger joins Launch Operations Pack scorecards with the Performance Velocity Ledger. Each entry includes launch pack readiness, audit pointers, manual review state, expected first-week revenue bands, outstanding blockers, performance evidence, closure score, recommended internal action, and queued monitoring triggers for revenue, content, refund, payout-governance, and scale-or-rotate review. It is read-only and does not publish listings, create provider products, upload files, import live data, open provider admin sessions, move money, run stealth browsers, rotate proxies, spoof fingerprints, post content, start ads, or perform external writes.

`POST /api/v1/merch/revenue-engine/launch-closure-ledger/apply`

Records selected Launch Revenue Closure Ledger entries as internal audit artifacts. Required body:

```json
{
  "confirm": "RECORD INTERNAL LAUNCH CLOSURE LEDGER",
  "dryRun": false,
  "storeIds": ["store_123"],
  "note": "Manual closure scorecard reviewed."
}
```

When `dryRun` is true, ENTRAL reports which closure ledger entries would be recorded. Apply mode writes an audit log containing selected scorecards, first-week revenue targets, readiness state, blocker summaries, monitoring trigger counts, and blocked external actions. It does not change launch status, execute provider requests, publish listings, upload assets, authorize connectors, import live marketplace/payment data, move money, run browser automation, or execute any external system.

`GET /api/v1/merch/revenue-engine/live-connector-readiness`

Returns the internal Revenue Live Connector Readiness Registry. Optional query settings:

- `includeBlocked`
- `maxEntries`
- `minClosureScore`
- `minReadOnlyConnectors`
- `requireOperationsPackAudit`
- `requirePerformanceEvidence`

The registry joins Launch Revenue Closure Ledger entries, Launch Operations Packs, and Read-Only Signal Connector Approval state. Each entry includes readiness status, next internal action, closure score, expected first-week revenue, performance evidence, operations pack audit status, approved read-only connector counts, connector boundary records by provider/role, credential environment variable names, read-only scopes, future live-scope manifests, endpoint templates, review gates, and rollback controls. A `ready_for_design` entry means connector design review may be prepared internally only; it does not authorize credentials, OAuth, write scopes, provider requests, browser sessions, uploads, publishing, imports, payouts, transfers, or platform writes.

`POST /api/v1/merch/revenue-engine/live-connector-readiness/apply`

Records selected Revenue Live Connector Readiness Registry entries as internal audit artifacts. Required body:

```json
{
  "confirm": "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY",
  "dryRun": false,
  "storeIds": ["store_123"],
  "note": "Connector design readiness reviewed internally."
}
```

When `dryRun` is true, ENTRAL reports which registry entries would be recorded. Apply mode writes an audit log containing selected readiness status, provider boundaries, future scope names, live-mode locks, approved read-only evidence counts, and blocked external actions. It does not enable credentials, request OAuth consent, create write scopes, contact providers, open provider admin sessions, run browser automation, publish listings, upload files, import live data, post content, start ads, or move money.

`GET /api/v1/merch/revenue-engine/portfolio`

Returns the current read-only portfolio plan. Optional query thresholds:

- `minProductProfit`
- `minProductMargin`
- `scaleProductProfit`
- `scaleProductMargin`
- `minScaleProducts`
- `minPortfolioProductsPerStore`
- `maxRotationUpdates`

`GET /api/v1/merch/portfolio-command-center`

Returns the cross-asset Portfolio Command Center plan. Optional query settings:

- `windowDays`
- `maxActions`
- `includeFinance`
- `includeContent`
- `includeCommandHistory`

The plan aggregates Revenue Engine decisions, Performance Velocity Ledger evidence, Release Governance state, Scaling Budget Review packets, Scaling Execution Ledger outcomes, Faceless Content Pipeline signals, and recent command records. It returns command actions, risk lanes, command counts, pending payout amount, scaling outcome counts, content views, profit velocity, and blocked external actions with `externalExecution: false` and `providerContacted: false`.

`POST /api/v1/merch/portfolio-command-center/actions/apply`

Records prioritized portfolio command actions internally. Required body:

```json
{
  "confirm": "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL previews command records and internal status updates without writing data. Apply mode creates `PortfolioCommandAction` records, writes an audit log, and can update only internal store/product statuses when a command includes an explicit recommended status such as `Paused`, `Archived`, or `Needs Revision`. It does not call stores, POD providers, social platforms, ad platforms, Stripe, banks, browsers, proxies, or upload APIs.

`GET /api/v1/merch/revenue-engine/autopilot`

Returns the internal Revenue Autopilot plan. Optional query settings:

- `mode` as `balanced`, `velocity`, or `conservative`
- `maxActions`
- `includeSignalIntake`
- `includeContent`
- `includeFinance`
- `windowDays`

The plan coordinates Signal Intake Center readiness, Launch Pipeline product seeding, Digital Product Portfolio drafts, Listing Optimization experiments, Store Setup runbooks, Faceless Content briefs, Financial Orchestrator records, Release Governance packets, and Portfolio Command Center actions. It returns phases, prioritized command actions, draft-profit totals, finance/control counts, and blocked external actions with `externalExecution: false` and `providerContacted: false`.

`POST /api/v1/merch/revenue-engine/autopilot/apply`

Records Revenue Autopilot command records internally. Required body:

```json
{
  "confirm": "RUN INTERNAL REVENUE AUTOPILOT",
  "dryRun": false,
  "mode": "balanced",
  "maxActions": 12
}
```

When `dryRun` is true, ENTRAL previews the command records without writing data. Apply mode creates queued `PortfolioCommandAction` records and writes an audit log only. It does not create product records, edit listings, change store statuses, create content briefs, record finance ledger entries, move money, call providers, upload content, run browsers, use stealth, rotate proxies, spoof fingerprints, publish listings, or start ad spend. Those narrower internal record writes remain behind each module's own apply endpoint and approval gate.

`POST /api/v1/merch/revenue-engine/autopilot/execute`

Previews or executes selected internal Autopilot steps. Required body:

```json
{
  "confirm": "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS",
  "dryRun": false,
  "mode": "balanced",
  "maxActions": 12,
  "maxSteps": 6,
  "includeDraftCreation": false,
  "includeLaunchApprovalPackets": false
}
```

Default execution only runs lower-duplication internal writes: listing draft optimization, store setup state preparation, faceless content brief queueing, finance split records, release governance records, and Portfolio Command Center records. POD product seeding, digital product draft creation, and launch approval packet creation stay visible in the plan but are skipped unless `includeDraftCreation` or `includeLaunchApprovalPackets` is explicitly enabled. The executor returns selected steps, skipped reasons, aggregate write counts, a combined audit log, and `externalExecution: false` / `providerContacted: false`. It still does not publish listings, upload artwork or content, call providers, move money, start ad spend, run browser automation, use stealth, rotate proxies, spoof fingerprints, or perform platform evasion.

`POST /api/v1/merch/revenue-engine/rotation/apply`

Applies queued internal rotation changes only. Required body:

```json
{
  "confirm": "APPLY INTERNAL ROTATION",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL returns the same rotation changes without modifying records.

`GET /api/v1/merch/revenue-engine/performance`

Returns the internal Performance Velocity Ledger. Optional query settings:

- `windowDays`
- `source`
- `storeId`
- `minScaleProfitVelocity`
- `minScaleConversionRate`
- `minPauseProfitVelocity`
- `minKillProfitVelocity`
- `minSnapshotsForKill`
- `minWatchVisits`
- `maxRefundRate`
- `maxAdSpendRatio`
- `maxRecommendations`

The digest calculates gross revenue, net revenue, net profit, revenue velocity, profit velocity, conversion rate, profit margin, refund rate, ad-spend ratio, evidence grade, product/store scale signals, and internal rotation changes.

`POST /api/v1/merch/revenue-engine/performance/snapshots`

Stores internal performance snapshots only. Required body:

```json
{
  "confirm": "INGEST INTERNAL PERFORMANCE SNAPSHOTS",
  "dryRun": false,
  "snapshots": [
    {
      "storeId": "store-id",
      "productId": "product-id",
      "source": "manual",
      "periodStart": "2026-05-26T00:00:00.000Z",
      "periodEnd": "2026-06-02T00:00:00.000Z",
      "visits": 210,
      "unitsSold": 6,
      "grossRevenue": 180,
      "netProfit": 92
    }
  ]
}
```

When `dryRun` is true, ENTRAL previews the post-ingest digest without writing data. Apply mode records the snapshots, rolls store revenue and estimated profit from the internal ledger, and writes an audit log. It does not import data from any external provider.

`POST /api/v1/merch/revenue-engine/performance/rotation/apply`

Applies performance-based internal status changes only. Required body:

```json
{
  "confirm": "APPLY PERFORMANCE ROTATION",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL returns the queued performance rotation changes without modifying records. Apply mode can move weak products to `Needs Revision` or `Archived`, pause weak stores internally, and write an audit log.

`GET /api/v1/merch/revenue-engine/signal-intake`

Returns the Signal Intake Center readiness plan. Optional query settings:

- `includeSamplePayloads`
- `maxSignals`
- `windowDays`

The plan reports available stores, products, content briefs, sample provider-shaped payloads, intake lanes, normalized record counts, projected revenue/profit/balance totals, and blocked external actions. It does not contact Etsy, Shopify, Printify, Printful, Stripe, YouTube, TikTok, Instagram, analytics providers, browsers, proxies, banks, or upload APIs.

`GET /api/v1/merch/revenue-engine/signal-connectors`

Returns the internal Read-Only Signal Connector Center. Optional query settings:

- `includeCommerce`
- `includeContent`
- `includePayments`
- `includeSamplePayloads`
- `maxConnectors`
- `onlyReady`
- `windowDays`

The plan prepares connector manifests for commerce providers such as Etsy, Shopify, Printify, and Printful; content providers such as YouTube Shorts, TikTok, and Instagram Reels; and payment probes such as Stripe balance reconciliation. Each manifest includes read-only scopes, credential environment variable names, endpoint templates, transform targets, sample payloads that preview through Signal Intake, approval gates, and blocked external actions. It does not request credentials, refresh tokens, call APIs, open browsers, import live data, create write scopes, publish listings, upload content, post to social channels, move money, or create payouts.

`POST /api/v1/merch/revenue-engine/signal-connectors/apply`

Records approved read-only connector manifests in the internal audit ledger only. Required body:

```json
{
  "confirm": "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
  "dryRun": false,
  "manifestIds": ["readonly_signal_connector:commerce:etsy:store_1:product_1"],
  "note": "Approved read-only connector manifest for Signal Intake review."
}
```

When `dryRun` is true, ENTRAL previews the same selected manifests without writing an audit log. Apply mode records the selected manifest ids, sample Signal Intake totals, blocked external actions, and confirmation phrase in the audit ledger only. It does not create connector credentials, schedule live imports, contact providers, run browsers, move money, or write to external systems.

`GET /api/v1/merch/revenue-engine/signal-connectors/approvals`

Returns the durable Signal Connector Approval Center. Optional query settings:

- `includeArchived`
- `maxRecords`
- `includeCommerce`
- `includeContent`
- `includePayments`
- `includeSamplePayloads`
- `maxConnectors`
- `onlyReady`
- `windowDays`

The plan joins current read-only connector manifests with saved approval records and import jobs. It returns approval queue candidates, pending/approved/rejected counts, import-job queue candidates, sample Signal Intake previews, audit events, and blocked external actions. It does not contact providers, request credentials, open browsers, run imports, upload content, publish listings, move money, or create write scopes.

`POST /api/v1/merch/revenue-engine/signal-connectors/approvals/apply`

Queues durable internal approval records for ready connector manifests. Required body:

```json
{
  "confirm": "QUEUE READONLY SIGNAL CONNECTOR APPROVALS",
  "dryRun": false,
  "manifestIds": ["readonly_signal_connector:commerce:etsy:store_1:product_1"],
  "note": "Queue connector approval for internal review."
}
```

Apply mode upserts `RevenueSignalConnectorApproval` records by `(userId, dedupeKey)`, stores the locked manifest JSON, sample payload, Signal Intake preview, read-only scopes, blocked actions, credential environment names, endpoint templates, and request audit log id. Existing approval records are skipped rather than reset.

`POST /api/v1/merch/revenue-engine/signal-connectors/approvals/:approvalId/review`

Approves or rejects one connector approval record. Required body for approval:

```json
{
  "action": "approve",
  "confirm": "APPROVE READONLY SIGNAL CONNECTOR",
  "note": "Approved for internal import job queueing."
}
```

Use `"confirm": "REJECT READONLY SIGNAL CONNECTOR"` with `"action": "reject"` to reject. Review writes an audit log and updates only the internal approval record. Records already archived or queued for import cannot be re-reviewed.

`POST /api/v1/merch/revenue-engine/signal-connectors/import-jobs/apply`

Queues internal import jobs for approved connector records that still have sample payloads and no existing job. Required body:

```json
{
  "confirm": "QUEUE READONLY SIGNAL IMPORT JOBS",
  "dryRun": false,
  "approvalIds": ["approval-id"],
  "note": "Queue approved sample payloads for read-only Signal Intake handoff."
}
```

Apply mode upserts `RevenueSignalImportJob` records by `(userId, approvalId)`, stores the sample payload and Signal Intake preview, marks the approval record `import_queued`, and writes an audit log. It queues internal handoff records only; it does not run live imports, call APIs, schedule browser jobs, move money, publish content, or write to external systems.

`GET /api/v1/merch/revenue-engine/signal-connectors/import-handoff`

Returns the internal Signal Import Handoff Runner. Optional query settings:

- `includeArchived`
- `maxJobs`
- `maxSignals`
- `windowDays`

The plan reads queued `RevenueSignalImportJob` records, separates ready jobs from blocked/completed jobs, merges stored sample payloads, and previews the resulting Signal Intake normalization. It does not call providers, refresh credentials, run browsers, import live data, upload content, publish listings, move money, or create write scopes.

`POST /api/v1/merch/revenue-engine/signal-connectors/import-handoff/apply`

Previews or ingests queued read-only import jobs into internal Signal Intake. Required body:

```json
{
  "confirm": "INGEST QUEUED READONLY SIGNAL IMPORT JOBS",
  "dryRun": false,
  "importJobIds": ["signal-import-job-id"],
  "note": "Ingest reviewed queued connector payloads into internal Signal Intake."
}
```

Apply mode revalidates store/product/content-brief ownership, writes internal Signal Intake evidence records from stored sample payloads, records a handoff audit log, and marks selected import jobs `completed` with `handoffAuditLogId`, `completedAt`, and `intakeResultJson`. It does not perform live connector imports or contact any external system.

`POST /api/v1/merch/revenue-engine/signal-intake/apply`

Previews or records approved read-only signal evidence. Required body:

```json
{
  "confirm": "INGEST APPROVED READ-ONLY SIGNALS",
  "dryRun": false,
  "commerceSignals": [
    {
      "storeId": "store-id",
      "source": "etsy",
      "periodStart": "2026-05-26T00:00:00.000Z",
      "periodEnd": "2026-06-02T00:00:00.000Z",
      "visits": 320,
      "unitsSold": 8,
      "grossRevenue": 240
    }
  ],
  "contentSignals": [],
  "paymentSignals": []
}
```

When `dryRun` is true, ENTRAL normalizes the incoming provider-shaped rows and returns the staged plan without writing records. Apply mode can create `RevenuePerformanceSnapshot` records, `FacelessContentPerformanceSnapshot` records, and `FinancialReconciliationReport` records with `source: signal_intake`. Payment signals are reconciliation evidence only; they do not move money, create payouts, change balances, or call Stripe Treasury + Connect.

`GET /api/v1/merch/financial-orchestrator/plan`

Returns the internal Financial Orchestrator plan. Optional query settings:

- `scalingPercent` default `50`
- `personalPercent` default `25`
- `bufferPercent` default `25`
- `minPayoutIntentAmount`
- `reserveFloorAmount`
- `includePayoutIntents`
- `windowDays`
- `source`
- `storeId`

The split percentages must add to exactly `100`. The plan reads internal revenue performance snapshots, calculates recognized net profit, holds the reserve floor, creates allocation buckets, prepares ledger-entry drafts, and produces approval-required payout intents for buckets that meet the configured threshold.

`POST /api/v1/merch/financial-orchestrator/apply`

Creates internal finance records only. Required body:

```json
{
  "confirm": "APPLY INTERNAL FINANCIAL ORCHESTRATOR",
  "dryRun": false,
  "scalingPercent": 50,
  "personalPercent": 25,
  "bufferPercent": 25
}
```

When `dryRun` is true, ENTRAL previews split policy, ledger rows, and payout intents without writing data. Apply mode creates a split policy record, ledger rows for unrecorded performance snapshots, approval-locked payout intent records, and an audit log. It does not call Stripe Treasury, Stripe Connect, bank, card, payment, payout, or balance APIs.

`GET /api/v1/merch/financial-orchestrator/payout-intents/review`

Returns the internal Payout Review Center. The plan includes:

- Payout review queue with current status, amount, category, provider, destination type, and risk level.
- Budget release packets for scaling, personal, and buffer allocations.
- Stripe Treasury + Connect readiness manifest with blocked scopes.
- Reconciliation totals for pending, approved, rejected, and total amounts.
- Blocked external actions for every payout and spend path.

`POST /api/v1/merch/financial-orchestrator/payout-intents/:intentId/review`

Approves or rejects a pending payout intent internally. Required body for approval:

```json
{
  "action": "approve",
  "confirm": "APPROVE FINANCIAL PAYOUT INTENT",
  "note": "Approved for manual handoff only."
}
```

Required body for rejection:

```json
{
  "action": "reject",
  "confirm": "REJECT FINANCIAL PAYOUT INTENT",
  "note": "Rejected from payout review."
}
```

Approval sets the payout intent to `approved_manual_handoff`, writes an audit log, and updates the internal review plan. It does not call Stripe, create transfers, create outbound payments, change balances, change bank accounts, or authorize automated payout execution.

`GET /api/v1/merch/financial-orchestrator/scaling-budgets/review`

Returns persisted internal scaling budget packets created by the Financial Orchestrator from scored Revenue Engine assets. The response includes packet status, asset/store identity, score band, score, amount, budget caps, pending/approved/rejected totals, retained scale capital, blocked external actions, and provider execution flags.

`POST /api/v1/merch/financial-orchestrator/scaling-budgets/:packetId/review`

Approves or rejects a pending scaling budget packet internally. Required body for approval:

```json
{
  "action": "approve",
  "confirm": "APPROVE FINANCIAL SCALING BUDGET",
  "note": "Approved for internal manual scaling budget handoff only."
}
```

Required body for rejection:

```json
{
  "action": "reject",
  "confirm": "REJECT FINANCIAL SCALING BUDGET",
  "note": "Rejected from scaling budget review."
}
```

Approval sets the packet to `approved_manual_handoff`, writes an audit log, and updates Portfolio Command Center finance risk through the persisted review plan. It does not increase spend, call providers, start ads, move money, create payouts, open browser sessions, publish listings, upload content, or authorize external execution.

`GET /api/v1/merch/financial-orchestrator/scaling-spend-control`

Returns the internal Scaling Spend Control plan. It converts approved scaling budget packets into manual spend-control packets across product generation, listing optimization, content production, and operations buffer categories. Each packet includes a max amount, asset/store identity, purpose, controls, blocked actions, score evidence, and external execution flags.

`POST /api/v1/merch/financial-orchestrator/scaling-spend-control/apply`

Records scaling spend-control packets internally. Required body:

```json
{
  "confirm": "RECORD FINANCIAL SCALING SPEND CONTROLS",
  "dryRun": false
}
```

Dry-run mode previews the internal spend-control packet records. Apply mode upserts packets by dedupe key and writes one audit log. It does not spend money, call providers, order samples, start ads, upload files, publish content, open browsers, execute Stripe Treasury or Connect transfers, or authorize external execution.

`GET /api/v1/merch/financial-orchestrator/scaling-execution-ledger`

Returns the internal Scaling Execution Ledger. It merges persisted scaling spend-control packets with manually recorded outcome evidence and returns per-packet recommendations: `validate`, `watch`, `stop`, or `scale_next`. Each packet summary includes allocated amount, amount spent, gross revenue, net profit, ROI, reason, next internal state, and blocked external actions.

`POST /api/v1/merch/financial-orchestrator/scaling-execution-ledger/entries`

Records manual scaling outcome evidence against existing spend-control packets. Required body:

```json
{
  "confirm": "INGEST INTERNAL SCALING EXECUTION OUTCOMES",
  "dryRun": false,
  "entries": [
    {
      "scalingSpendPacketId": "scale-spend-record-1",
      "amountSpent": 21,
      "grossRevenue": 84,
      "netProfit": 50.4,
      "unitsSold": 3,
      "visits": 120,
      "periodStart": "2026-05-26T00:00:00.000Z",
      "periodEnd": "2026-06-02T00:00:00.000Z",
      "outcome": "validated",
      "source": "manual",
      "notes": "Manual operator outcome evidence."
    }
  ]
}
```

The endpoint validates packet ownership, rejected/stale states, date windows, and cumulative amount spent against packet caps. Dry-run mode previews ledger scoring without writing. Apply mode records evidence entries and writes an audit log. It does not execute spend, move money, call providers, upload files, publish listings, start ads, open browser sessions, or authorize external action.

`GET /api/v1/merch/financial-orchestrator/release-governance`

Returns the internal Release Governance plan. The plan includes:

- Current budget release packets from the payout review center.
- Persisted release packet records and recent reconciliation reports.
- Reconciliation status, variance, readiness counts, and high/medium/low risk tiers.
- Read-only Stripe readiness probe with `providerContacted: false`.
- Blocked external actions for payout execution, spend increases, account changes, and financial provider writes.

`POST /api/v1/merch/financial-orchestrator/release-governance/apply`

Records release governance controls internally. Required body:

```json
{
  "confirm": "RECORD FINANCIAL RELEASE GOVERNANCE",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL previews budget release packet upserts and reconciliation report creation without writing data. Apply mode upserts internal release packet records, creates a reconciliation report, and writes a single audit log tying those records together. It does not call Stripe, query balances, move money, change payout schedules, increase spend, or touch bank/card/account records.

`GET /api/v1/merch/faceless-content/pipeline`

Returns the internal Faceless Content Pipeline plan. Optional query settings:

- `maxStores`
- `briefsPerStore`
- `targetChannels` as comma-separated values: `youtube_shorts,tiktok,instagram_reels`
- `includeVoiceoverSpecs`
- `includeVideoSpecs`
- `includeChannelPackages`
- `minViewsForRemix`
- `minClicksForScale`
- `windowDays`

The plan ranks store/product candidates, prepares faceless short-form briefs, scripts, storyboards, ElevenLabs voiceover job specs, Runway/Kling/Luma video specs, upload packages for YouTube Shorts, TikTok, and Instagram Reels, provider readiness manifests, and optimization signals from internal content performance snapshots.

`POST /api/v1/merch/faceless-content/pipeline/apply`

Records internal content briefs only. Required body:

```json
{
  "confirm": "CREATE INTERNAL FACELESS CONTENT PIPELINE",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL previews the internal brief records without writing data. Apply mode stores new content brief records, keeps duplicate briefs from being recreated, and writes an audit log. It does not call Runway, Kling, Luma, ElevenLabs, YouTube, TikTok, Instagram, Meta, Google, analytics providers, browsers, or upload APIs.

`GET /api/v1/merch/faceless-content/performance`

Returns internal content performance tracking and optimization signals. Optional query settings:

- `windowDays`
- `channel`
- `source`
- `storeId`

The digest calculates views, clicks, conversions, watch seconds, net revenue, click rate, conversion rate, retention, and recommendations such as `scale_remix`, `revise_hook`, or `watch`.

`POST /api/v1/merch/faceless-content/performance/snapshots`

Stores manual or approved read-only content performance snapshots. Required body:

```json
{
  "confirm": "INGEST INTERNAL CONTENT PERFORMANCE SNAPSHOTS",
  "dryRun": false,
  "snapshots": [
    {
      "channel": "youtube_shorts",
      "source": "manual",
      "periodStart": "2026-05-26T00:00:00.000Z",
      "periodEnd": "2026-06-02T00:00:00.000Z",
      "views": 1400,
      "clicks": 40,
      "conversions": 4,
      "watchSeconds": 18200,
      "revenue": 96,
      "cost": 12
    }
  ]
}
```

When `dryRun` is true, ENTRAL previews the post-ingest digest without writing data. Apply mode stores the snapshots and writes an audit log. It does not import analytics from any platform unless a future read-only connector is explicitly approved.

`GET /api/v1/merch/revenue-engine/listing-optimization`

Returns the internal Listing Optimization Queue. Optional query settings:

- `includePricingExperiments`
- `maxPriceIncreasePercent`
- `maxProducts`
- `minProfitMargin`
- `minVisitsForPerformanceExperiment`
- `variantsPerProduct`
- `windowDays`

The plan evaluates active product drafts and live internal records for missing copy, thin tags, weak conversion evidence, scale signals, and margin issues. It generates ranked variants with title, description, tags, retail price, estimated fees, estimated profit, margin, hypothesis, mockup notes, and approval-gate status.

`POST /api/v1/merch/revenue-engine/listing-optimization/apply`

Applies recommended listing variants to ENTRAL internal product draft fields only. Required body:

```json
{
  "confirm": "APPLY INTERNAL LISTING OPTIMIZATION",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL previews the product draft updates without modifying records. Apply mode updates internal listing title, description, tags, price, estimated fees/profit, profit margin, mockup notes, and internal status, then writes an audit log. It does not edit or publish marketplace/provider records.

`GET /api/v1/merch/revenue-engine/store-setup`

Returns the internal Store Setup Runbook plan. Optional query settings:

- `includeCredentialScopes`
- `maxStores`
- `minApprovedProducts`
- `minConnectorReadiness`
- `minListingReadyProducts`

The plan prepares storefront settings, launch collections, product-type collection blueprints, product lane targets, credential-scope requirements, connector readiness status, setup steps, rollback evidence, and blocked external actions. It is designed as the bridge between listing readiness and future connector handoff.

`POST /api/v1/merch/revenue-engine/store-setup/apply`

Applies internal store setup status changes only. Required body:

```json
{
  "confirm": "APPLY INTERNAL STORE SETUP RUNBOOK",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL previews the internal store status updates. Apply mode can move prepared stores to `Building Store` or connector-ready stores to `Awaiting Approval`, then writes an audit log. It does not create collections, change storefront settings, connect credentials, open browser sessions, contact providers, publish listings, or move money.

`GET /api/v1/merch/revenue-engine/launch-pipeline`

Returns the internal idea-to-launch queue. Optional query settings:

- `maxStores`
- `minApprovedProducts`
- `minPortfolioProductsPerStore`
- `productCount`
- `riskTolerance`

`POST /api/v1/merch/revenue-engine/launch-pipeline/apply`

Creates internal launch queue records only. Required body:

```json
{
  "confirm": "CREATE INTERNAL LAUNCH QUEUE",
  "dryRun": false
}
```

Apply mode can create internal POD product drafts, update store status to internal preparation states, and queue approval packets for launch-ready stores. It does not contact any marketplace, POD provider, social platform, ad platform, payment provider, or browser automation provider.

`GET /api/v1/merch/revenue-engine/digital-products`

Returns the internal digital product portfolio plan. Optional query settings:

- `maxStores`
- `minDigitalProductsPerStore`
- `productsPerStore`
- `riskTolerance`
- `includeLeadMagnets`

The plan ranks stores for high-margin digital product expansion, then prepares lanes such as printable planners, Notion templates, prompt packs, Canva templates, digital wall art, mini-courses, and optional lead magnets. Each draft includes zero supplier/shipping cost assumptions, platform-fee estimates, asset generation prompts, listing templates, delivery checklists, launch checklists, and explicit approval gates.

`POST /api/v1/merch/revenue-engine/digital-products/apply`

Creates internal digital product draft records only. Required body:

```json
{
  "confirm": "CREATE INTERNAL DIGITAL PRODUCT QUEUE",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL previews the digital product records and store updates without modifying data. Apply mode creates internal `Prompt Ready` product records, expands store product lanes, records an audit log, and keeps all external execution locked.

`GET /api/v1/merch/stores/:storeId/provider-payloads`

Returns locked mock-mode provider payloads for the selected store. Optional query settings:

- `maxProducts`
- `includeUnapproved`

The response includes redacted request headers, path templates, payload bodies, credential scopes, idempotency keys, validation checklists, and required approval gates. It does not send API requests, upload artwork, create listings, publish products, or change store settings.

`POST /api/v1/merch/stores/:storeId/provider-payloads/approval-request`

Queues the locked provider payload package as a review packet. Optional body:

```json
{
  "includeUnapproved": false,
  "maxProducts": 5,
  "note": "Review provider payload package before connector setup.",
  "scheduledFor": "2026-06-03T16:00:00.000Z"
}
```

The approval packet records provider actions as `Provider` review actions, attaches payload counts/readiness, credential-scope controls, blocked external actions, rollback checklist items, and an audit log. It does not contact Printify, Printful, Etsy, Shopify, or any future connector.

`GET /api/v1/merch/stores/:storeId/growth-approvals/:packetId/provider-handoff`

Builds a provider handoff bundle from an approved provider payload packet. The packet must already be approved in ENTRAL. The bundle includes:

- Redacted request manifests with method, path template, headers, idempotency key, credential scopes, and formatted JSON bodies.
- Required artifact slots for design assets, mockups, image sets, variant maps, disclosure notes, and QA screenshots.
- Manual launch checklist and rollback checklist.
- Drift checks comparing the approved packet summary to freshly rebuilt internal payloads.
- Connector-readiness status and required pre-connector controls.

This endpoint is read-only. It does not open a browser session, contact provider APIs, upload files, create listings, publish products, or change store settings.

`GET /api/v1/automation/browser-operations`

Returns the Browser Operations Layer plan for internal read-only automation jobs. Optional query settings:

- `includeCompleted`
- `maxRecoveryJobs`
- `staleRunningMinutes`
- `windowHours`

The plan reports queue totals, capacity slots, worker and Playwright readiness, allowed domains, safety lanes, recovery runbooks, and blocked external actions. It uses `externalExecution: false` and `providerContacted: false`; the queue is limited to configured allowed-domain jobs and each browser job uses an ephemeral browser context.

`POST /api/v1/automation/browser-operations/recovery/apply`

Previews or applies internal queue recovery actions. Required body:

```json
{
  "confirm": "APPLY INTERNAL BROWSER RECOVERY ACTIONS",
  "dryRun": false
}
```

When `dryRun` is true, ENTRAL returns the failed/stale job recovery plan without modifying records. Apply mode can mark stale running jobs as failed for deliberate review and requeue failed or canceled jobs for internal retry. It does not use stealth, anti-detection, CAPTCHA bypass, proxy rotation, residential proxies, fingerprint spoofing, account warmup, traffic disguise, third-party login, upload, payment, or platform-write automation.

## Safety Boundary

This module does not publish listings, contact platforms, import marketplace analytics without approval, start ad spend, post content, move money, upload digital files, connect credentials, change storefront settings, create collections, call AI video or voiceover providers, upload social content, or run stealth/evasive browser automation. It changes only ENTRAL internal records, runs only allowed-domain read-only browser jobs with isolated contexts, and writes audit logs for applied rotations, read-only signal connector manifest recording, signal connector approval queueing, connector approval review, read-only signal import-job queueing, queued signal import handoff ingestion, signal intake, performance ingestion, performance rotation, financial orchestration, payout intent review, release governance recording, faceless content pipeline recording, faceless content performance ingestion, listing optimization, store setup runbooks, launch checklist planning, launch queue creation, digital product queue creation, provider payload approval requests, launch handoff packet generation, recording, and status control, launch operations pack audit recording, launch closure ledger audit recording, live connector readiness registry audit recording, provider handoff bundle generation, and browser queue recovery.

Blocked external actions are listed in every portfolio plan so downstream modules know what remains locked behind future explicit connectors and approvals.

## Next Section

The next major section should add a Live Connector Design Dossier that converts readiness-registry entries into provider-specific dry-run request maps, idempotency keys, credential custody checklists, rollback rehearsals, and final operator approval packets without contacting external systems.

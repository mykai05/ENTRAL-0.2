# Phase 195 branch and pull-request reconciliation

This ledger records the readback performed on 2026-07-26 before Phase 195
implementation began. The immutable comparison point is
`origin/main@1d34bf8e5d32c6eccb691cda6741a0b51c20f819`.

## Canonical dependency chain

The accepted Phase 100-190 release chain is:

`#18 -> #19 -> #20 -> #21 -> #22 -> #23 -> #24 -> #25 -> #26 -> #27 ->
#28 -> #29 -> #30 -> #31 -> #32 -> #33 -> #34 -> #35 -> #36`

The chain preserves the shared contracts, PostgreSQL control plane, member
proxy, canonical taxonomy, Dashboard, manually opened Academy, canonical
three-destination member shell, simultaneous 2D and 3D graph, contextual
assistant, scrolling correction, Phase 190 pause/resume, and the last accepted
graph layout refinement. Timestamp order was not used as an architecture
decision.

## Pull requests

| PR | State | Canonical disposition |
|---:|---|---|
| 1 | Closed, unmerged | Superseded sign-in removal experiment; rejected because it removed the authenticated recovery boundary. |
| 2 | Merged | Historical sign-in-page change; later member authentication work is canonical. |
| 3 | Merged | Historical sign-in-control change; later member authentication work is canonical. |
| 4 | Merged | Direct-entry intent preserved through the canonical member redirects. |
| 5 | Merged | Live backend/CI correction preserved. |
| 6 | Merged | Secure member platform foundation preserved. |
| 7 | Merged | Tenant graph foundation preserved and superseded by later graph implementations. |
| 8 | Merged | Organization graph foundation preserved and superseded by later canonical graph implementations. |
| 9 | Merged | 3D member field foundation preserved. |
| 10 | Merged | Member graph route stabilization preserved. |
| 11 | Merged | Member graph touch-target work preserved. |
| 12 | Merged | Command-universe recovery preserved and superseded by the canonical member shell. |
| 13 | Merged | Member command-universe work preserved and superseded by the canonical member shell. |
| 14 | Merged | Orbital graph work preserved where compatible and superseded by the dual-graph implementation. |
| 15 | Merged | Member-hosted command center preserved. |
| 16 | Merged | Member interface precision work preserved. |
| 17 | Closed, unmerged | Explicitly superseded on 2026-07-26. Its alternate `memberAgents`, `sovereignCommand`, fourth North Star destination, and separate member agent state violate the locked three-destination/canonical-control-plane architecture. Remote branch retained as non-canonical history. |
| 18 | Merged | Canonical Phase 100-120 base. |
| 19 | Merged | Phase 100-120 live release connection. |
| 20 | Merged | Canonical Phase 130 shared contracts. |
| 21 | Merged | Canonical Phase 140 PostgreSQL control plane. |
| 22 | Merged | Canonical Phase 150 integrity/access implementation. |
| 23 | Merged | Canonical member same-origin API proxy. |
| 24 | Merged | Canonical Phase 160 taxonomy and seed gate. |
| 25 | Merged | Phase 100-120 evidence closure. |
| 26 | Merged | Hosted-runner action runtime correction. |
| 27 | Merged | Canonical Phase 170 portfolio Dashboard. |
| 28 | Merged | Canonical Academy authentication and manual-entry correction. |
| 29 | Merged | Canonical Phase 180 three-destination member shell. |
| 30 | Merged | Phase 180 CI artifact runtime correction. |
| 31 | Merged | Canonical dual-renderer graph foundation. |
| 32 | Merged | Canonical simultaneous dual-graph workspace. |
| 33 | Merged | Canonical fullscreen and contextual assistant behavior. |
| 34 | Merged | Canonical graph scroll/mobile correction. |
| 35 | Merged | Canonical Phase 190 pause/resume/undo vertical slice. |
| 36 | Merged | Last accepted pre-Phase-195 graph layout refinement and baseline tip. |

GitHub readback found no open pull request after #17 was closed. PR #1 and #17
are the only closed, unmerged pull requests. PRs #2-#16 and #18-#36 are merged.

## Remote branches

`git merge-base --is-ancestor <tip> origin/main` proved that the following 27
remote tips are already ancestors of the accepted mainline. Their disposition
is **merged history; do not re-merge**:

- `agent/complete-phase-100-160-gates`
- `agent/phase-170-academy-auth-fix`
- `agent/phase-170-canonical-dashboard`
- `agent/phase-180-canonical-shell`
- `agent/phase-180-ci-runtime`
- `agent/phase-180-dual-graph`
- `agent/refresh-ci-action-runtimes`
- `codex/entral-command-universe-v2`
- `codex/first-business-finance-flow`
- `codex/full-tenant-graph-ui`
- `codex/graph-layout-gravity`
- `codex/member-3d-command-field`
- `codex/member-command-center-host`
- `codex/member-platform-integration`
- `codex/money-army-batch-ledger`
- `codex/money-army-foundations`
- `codex/phase-100-120-release`
- `codex/phase-130-shared-contracts`
- `codex/phase-140-database-foundation`
- `codex/phase-150-intelligence-integrity-access`
- `codex/phase-150-member-api-proxy`
- `codex/phase-160-canonical-taxonomy`
- `codex/phase-180-fullscreen-assistant`
- `codex/phase-180-simultaneous-graphs`
- `codex/phase-190-pause-resume`
- `codex/shopify-autonomy`
- `codex/tenant-neuron-workspace`

Three remote tips are not direct ancestors:

| Branch | Tip | Disposition |
|---|---|---|
| `agent/open-command-center-directly` | `3f7015d3a066a522817e398bb5dad56a5ae427ef` | `git cherry origin/main` marks its sole patch equivalent with `-`; intent is already preserved. Superseded history, no merge. |
| `agent/remove-sign-in-page` | `2ee1dd9e74ccbbf9cfe950a2e6f4f73a5587f461` | User-owned mixed experimental payload with stale cache material and sign-in removal. Preserve remote history; reject as a release source. |
| `codex/production-agent-launch` | `ebe076004ad4b61efa865a8a9e7beca08c729795` | PR #17 payload. Explicitly superseded by the canonical hierarchy/member-shell architecture; preserve remote history, no merge. |

No remote branch was deleted. Retention keeps user-owned and historical data
recoverable while this ledger makes the canonical release path unambiguous.

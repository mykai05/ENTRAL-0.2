# Phase 204 internal-commerce capability inventory

Captured: 2026-08-03

Scope: `P204-INTERNAL-COMMERCE-ACTIVATION-001`

## Source registry state

Production readback and the committed Phase 203 seed agree on the following baseline:

- 56 global production catalogue records;
- 56 `CATALOGUED` records;
- zero tenant-scoped records;
- zero tenant installations;
- zero `ACTIVE` records;
- zero `SELLABLE` records.

The 56 global source records remain immutable catalogue inputs. Phase 204 may create source-bound tenant runtime derivatives; it must not promote the global records in place.

## Exact minimal source set

| Source capability ID | Source key | Phase 204 disposition |
|---|---|---|
| `20300000-0002-4000-8000-000000000108` | `capability.agent-blueprint.governance` | Create a tenant runtime derivative only after the bounded internal-commerce governance path is implemented and evidence-complete. |
| `20300000-0002-4000-8000-000000000107` | `capability.agent-blueprint.tool-orchestration` | Create a tenant runtime derivative only after real bounded tool orchestration is implemented; depend on the governance derivative. |
| `20300000-0002-4000-8000-000000000106` | `capability.agent-blueprint.brand-operations` | Create a tenant runtime derivative only for the implemented product-line operating scope; depend on governance and tool orchestration. |
| `20300000-0001-4000-8000-000000000012` | `integration.tool.etsy` | Keep below `ACTIVE` unless a real Etsy connection passes authentication, authorization scope, operation, readback, reconciliation, refresh or webhook, failure handling, canary, and production-readback gates. The global source is simulated and is not activation evidence. |

Every tenant derivative must remain `public_claim_eligible = false`, `pricing_eligibility = NOT_ELIGIBLE`, and `plan_eligible = false`. Internal use does not make ENTRAL software customer-sellable.

## Explicit non-promotions

Phase 204 TaskPacket 1 does not activate Shopify, browser automation, OpenAI, local Commander Packs, the local merch workflow, client-local uploads, analytics, Gmail, Stripe, PayPal, Canva, or any other catalogue record. A record that is placeholder, simulated, mock-backed, local-only, draft-only, unconnected, incomplete, or evidence-incomplete remains below `ACTIVE`.

No Gumroad catalogue record exists. A Gumroad source record may be added only if Etsy has an allowed provider blocker and a real Gumroad integration is then implemented; the fallback is not pre-activated.

## Required lifecycle and evidence

Tenant runtime derivatives advance one state at a time:

`CATALOGUED -> DESIGNED -> IMPLEMENTED -> UNIT_VERIFIED -> INTEGRATION_VERIFIED -> CANARY_VERIFIED -> ACTIVE`

Each transition is immutable and receipt-bound. `ACTIVE` additionally requires `REAL` production readiness, no failure state, satisfied dependencies, complete required evidence, a production readback receipt, an exact tenant and organization scope, and an active tenant installation. Missing, failed, expired, wrong-environment, wrong-capability, or wrong-tenant evidence fails closed.


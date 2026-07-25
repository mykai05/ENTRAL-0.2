# Phase 130 shared contracts and boundary map

## Gate

Phase 130 is complete only when `@entral/contracts` compiles, validates, and is
used at every existing repository boundary covered by this phase. This document
does not authorize Phase 140 persistence work.

## Canonical decisions

The handoff capsule contained conflicting TypeScript and OpenAPI shapes for
context, business, action, event, and audit records. ENTRAL resolves that
conflict by treating the dependency-free TypeScript package as the executable
source of truth and keeping checked-in schemas aligned to it.

- Operational hierarchy: `ENTRAL -> MARSHAL -> GENERAL -> COMMANDER -> SOLDIER`.
- The old lowercase `emperor` token remains only in the private Command OS
  presentation model. It is not accepted by member API, storage, or shared wire
  contracts.
- Member starter data has one organization Commander with organization-scoped
  Soldiers. Multi-business identity and persistence remain Phase 140 work.
- Action requests require optimistic version and idempotency values. Runtime
  helpers reject stale versions and duplicate keys.
- Personality versions are semantic versions and every runtime component
  version is explicit.
- Provider credentials or a successful connection test do not constitute
  activation. Only one exact `ACTIVE` registry record can authorize a provider
  operation.

## Existing boundary adoption

| Boundary | Shared contract enforcement |
| --- | --- |
| Web member session | Parses and allowlists `MemberOrganizationsResponse` before rendering. |
| Web member overview | Parses and allowlists `MemberOverviewResponse`; canonical hierarchy is uppercase. |
| Member API | Validates serialized organization and overview responses before send. |
| Member workspace persistence | Zod storage schema imports canonical roles and parent validation. |
| Agent queue | BullMQ and local fallback use `QueueJobEnvelope` and validate before consumption. |
| Automation queue | Local worker uses the same versioned queue envelope. |
| OpenAI adapter | Requires one exact active provider record, operation grant, provider API version, adapter version, owner, credential reference, and activation evidence. |
| Shopify storefront executor | Applies the same gate before business execution or its credential preflight contacts Shopify. |
| Resend adapter | Applies the same gate before sending transactional authentication email. |
| GitHub/Vercel adapters | Apply the same gate before read-only repository or deployment provider contact. |

## Deliberately unexposed paths

The capsule's planned portfolio, business, entity, conversation, action, audit,
and event endpoints are not included in `openapi.yaml`. Their canonical
persistence and complete backend behavior do not exist in this phase. Shared
types are available for future implementation, but type availability is not an
API availability claim.

## Integration registry configuration

`INTEGRATION_REGISTRY_JSON` is a backend-only JSON array of records matching
`packages/contracts/integration-registry-record.schema.json`. It contains secret
references, never secret values. Multiple records for a provider fail closed
until a caller supplies an exact owner-selection path; the current adapters
therefore accept exactly one active owner record per provider.

Shopify execution requires:

- provider code `shopify`;
- operation `storefront.draft.write`;
- provider API version matching `SHOPIFY_API_VERSION`;
- adapter version `1.0.0`.

OpenAI execution requires:

- provider code `openai`;
- operation `chat.completions`;
- provider API version `v1`;
- adapter version `1.0.0`.

Resend execution requires:

- provider code `resend`;
- operation `email.send`;
- provider API version `v1`;
- adapter version `1.0.0`.

GitHub read execution requires provider code `github`, operation
`repository.status.read`, API version `2022-11-28`, and adapter version `1.0.0`.
Vercel read execution requires provider code `vercel`, operation
`deployment.status.read`, API version `v9-projects+v6-deployments`, and adapter
version `1.0.0`.

OAuth exchange, credential capture, and explicit connection tests are
activation-evidence gathering paths rather than business execution. They remain
behind their existing consent, scope, and verification controls so an operator
can create the evidence required to reach `ACTIVE`. Normal provider reads,
writes, and sends fail closed unless the exact registry record is active.

Generic operator-configured webhooks and automation URLs are not named provider
adapters. Their execution remains governed by the existing outbound URL,
approval, and audit controls.

## Verification

```powershell
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm contracts:verify
pnpm lint
pnpm test
pnpm build
pnpm release:check
```

The contract verification command includes two clean builds and compares their
complete SHA-256 digests. `dist/` remains generated and ignored.

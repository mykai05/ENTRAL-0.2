# ENTRAL shared contracts

`@entral/contracts` is the single versioned wire and runtime contract package for
the ENTRAL web application, API, workers, agent runtime, and integration
runtime. It has no runtime dependencies so every boundary can validate the same
shapes. The development-only YAML parser verifies the checked-in specifications.

The canonical operational hierarchy is:

`HUMAN <-> ENTRAL <-> MARSHAL <-> GENERAL <-> COMMANDER <-> SOLDIER`

Operational messages may cross only one adjacent edge. Governance actions use
the separately validated action/control-plane contract.

Provider catalog or credential presence is never activation. Runtime provider
code must call `assertExecutableIntegration` with the exact owner, provider API
version, adapter version, credential reference, and operation before contact.
Only `ACTIVE` records with live evidence pass.

The OpenAPI file intentionally contains only endpoints with complete backend
behavior. Future portfolio, business, entity, action, audit, and event paths
remain TypeScript contracts until their persistence and service paths are
implemented.

Run the Phase 130 gate:

```powershell
pnpm contracts:verify
pnpm lint
pnpm test
pnpm build
```

`dist/` is generated from `src/` and ignored by Git. The reproducibility check
builds twice into clean temporary directories and requires byte-identical
output.

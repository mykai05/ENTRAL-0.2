# Phase 160 canonical taxonomy runbook

Phase 160 installs the locked ENTRAL commerce taxonomy as database state:
one ENTRAL, eight Marshals, and 123 Generals. The repository JSON is the
canonical record set. The SQL seed is deterministic and uses the same IDs,
stable codes, parent links, definitions, and taxonomy version.

## Commands

Set `DATABASE_URL` through the environment or provider secret injection. Never
paste or commit it.

```powershell
pnpm prisma:deploy
pnpm prisma:seed
pnpm prisma:seed
pnpm prisma:invariants
```

The second seed is required at the phase gate. It must leave the canonical
fingerprint and audit/event/outbox material counts unchanged. The invariant
command must run as the owner of `entral.entities`; a row-level-security-limited
runtime identity could hide violations and is refused.

The locked canonical fingerprint is:

```text
f070396c703bf6b96b1ab020f819f915a85b37d2ec41b82b454f7d9d9f946ecb
```

The canonical capsule artifact hashes are:

```text
047 JSON  7806cdd28faf3b3db01cca8ed50936b879876b003cc39f120d0cba7a73307d59
048 SQL   d2867ebcd8e2892f9ae495a2486c601ef1e128572e687c089c1a2f1833540202
```

The repository SQL intentionally differs from the capsule hash only where its
execution path was hardened: no-op conflict updates are skipped and the one-time
seed receipt is not duplicated. The canonical entity values and embedded source
provenance remain unchanged.

## Local or acceptance reset

Reset is a separate, destructive command. It is allowed only when all of these
conditions hold:

- `ENTRAL_ALLOW_DATABASE_RESET=1` is set explicitly;
- the database host is `localhost`, `127.0.0.1`, or `::1`;
- the database name begins with `entral_local_`, `entral_test_`,
  `entral_acceptance_`, or `entral_phase`;
- no supported environment marker is `production`.

```powershell
$env:ENTRAL_ALLOW_DATABASE_RESET = "1"
pnpm prisma:reset:seed
```

The command fails closed and never prints the database URL. It must never be
used for Railway or any other remote production database.

## Production procedure

1. Confirm the provider is PostgreSQL 18 and all earlier migrations are
   applied.
2. Create a fresh logical custom-format database backup plus globals backup.
3. Verify the custom backup with `pg_restore --list`.
4. Run migrations, then `pnpm prisma:seed` twice through the owner identity.
5. Run `pnpm prisma:invariants` and retain its JSON result.
6. Confirm the seed event has a transactional outbox row and let the worker
   publish it.
7. Restart PostgreSQL through the provider, wait for healthy state, and rerun
   `pnpm prisma:invariants`.

GitHub CI, Vercel deployment, and Railway service health do not prove the data
seed occurred. Production Phase 160 evidence requires the backup, explicit
seed, invariant result, restart/readback, and outbox result.

## Acceptance coverage

`backend/tests/phase160CanonicalTaxonomyPostgres.integration.test.ts` creates
two clean PostgreSQL 18 databases, applies all migrations, seeds both, compares
the locked fingerprint, reruns in place without side effects, reconnects, loads
the supplied acceptance vectors, creates non-vacuous Commander/Soldier/business
and credential fixtures, and checks hierarchy, routing, governance separation,
ownership, credential isolation, and event/outbox integrity.

The capsule invariant query file is retained at
`prisma/acceptance/092_database_invariant_queries.sql`; the automated verifier
executes equivalent owner-visible assertions.

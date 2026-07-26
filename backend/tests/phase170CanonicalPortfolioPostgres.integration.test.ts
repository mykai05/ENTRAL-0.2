import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CanonicalControlPlaneRepository } from "../src/services/canonicalControlPlane.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(testDatabaseUrl && process.env.RUN_POSTGRES_INTEGRATION === "1");

type BusinessKind = "Store" | "Software" | "Service" | "Marketplace" | "Subscription";

type SeededBusiness = {
  businessId: string;
  commanderId: string;
  generalId: string;
  kind: BusinessKind;
  name: string;
  soldierId: string;
};

function runPrisma(
  prismaCli: string,
  repositoryRoot: string,
  databaseUrl: string,
  args: string[],
  operation: string
) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  if (result.status !== 0) {
    throw new Error(`${operation} failed: ${result.stderr || result.stdout}`);
  }
}

function loginUrl(databaseUrl: URL, name: string, password: string) {
  const url = new URL(databaseUrl);
  url.username = name;
  url.password = password;
  url.searchParams.set("connection_limit", "2");
  return url.toString();
}

function session(authSubject: string, reason: string) {
  return {
    actionReason: reason,
    authSubject,
    correlationId: randomUUID()
  } as const;
}

async function seedBusiness(
  owner: PrismaClient,
  marshalId: string,
  kind: BusinessKind,
  ordinal: number
): Promise<SeededBusiness> {
  const businessId = randomUUID();
  const generalId = randomUUID();
  const commanderId = randomUUID();
  const soldierId = randomUUID();
  const code = String(ordinal).padStart(2, "0");
  const name = `${kind} Acceptance Business`;

  await owner.$executeRaw`
    INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
    VALUES (
      ${generalId}::uuid,
      ${`G-PHASE170-${code}`},
      'GENERAL',
      ${kind},
      ${marshalId}::uuid,
      'ACTIVE'
    )
  `;
  await owner.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
      VALUES (
        ${commanderId}::uuid,
        ${`C-PHASE170-${code}`},
        'COMMANDER',
        ${`${kind} Commander`},
        ${generalId}::uuid,
        'ACTIVE'
      )
    `;
    await tx.$executeRaw`
      INSERT INTO entral.businesses (
        id, stable_code, name, commander_id, general_id, marshal_id,
        status, primary_objective
      )
      VALUES (
        ${businessId}::uuid,
        ${`BIZ-PHASE170-${code}`},
        ${name},
        ${commanderId}::uuid,
        ${generalId}::uuid,
        ${marshalId}::uuid,
        'OPERATING',
        ${`Operate the canonical ${kind.toLowerCase()} model.`}
      )
    `;
    await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
  });
  await owner.$executeRaw`
    INSERT INTO entral.entities (
      id, stable_code, role, name, parent_id, business_id, status
    )
    VALUES (
      ${soldierId}::uuid,
      ${`S-PHASE170-${code}`},
      'SOLDIER',
      ${`${kind} Operations Soldier`},
      ${commanderId}::uuid,
      ${businessId}::uuid,
      'ACTIVE'
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.business_profiles (
      business_id, offer, target_customer, channels, operating_plan, constraints
    )
    VALUES (
      ${businessId}::uuid,
      ${JSON.stringify({ business_model: kind, name })}::jsonb,
      ${JSON.stringify({ segment: `${kind} customer` })}::jsonb,
      ${JSON.stringify([kind === "Store" ? "commerce" : "direct"])}::jsonb,
      ${JSON.stringify({ cadence: "weekly", model: kind })}::jsonb,
      '{}'::jsonb
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.business_states (
      business_id, health_state, health_score, health_drivers,
      current_phase, primary_objective, source_freshness, last_material_change_at
    )
    VALUES (
      ${businessId}::uuid,
      ${ordinal === 5 ? "WATCH" : "HEALTHY"}::entral.health_state,
      ${90 - ordinal},
      ${JSON.stringify([{
        code: `${kind.toLowerCase()}-evidence`,
        direction: "POSITIVE",
        evidence_ids: [],
        explanation: `Verified ${kind.toLowerCase()} operating evidence is current.`,
        label: `${kind} evidence`,
        severity: "INFO",
        source_freshness: "2026-07-25T00:00:00.000Z",
        value: ordinal
      }])}::jsonb,
      'OPERATING',
      ${`Run the canonical ${kind.toLowerCase()} business.`},
      ${JSON.stringify({ finance: "2026-07-25T00:00:00.000Z" })}::jsonb,
      '2026-07-25T00:00:00.000Z'::timestamptz
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.financial_snapshots (
      business_id, period_start, period_end, gross_revenue,
      net_contribution, operating_cost, capital_available, currency, source_refs
    )
    VALUES (
      ${businessId}::uuid,
      '2026-07-01'::date,
      '2026-07-24'::date,
      ${10_000 * ordinal},
      ${2_500 * ordinal},
      ${7_500 * ordinal},
      ${5_000 * ordinal},
      'USD',
      '[]'::jsonb
    )
  `;

  return { businessId, commanderId, generalId, kind, name, soldierId };
}

describe.skipIf(!integrationEnabled)("Phase 170 canonical portfolio PostgreSQL gate", () => {
  it("enforces Human versus assigned scope across five business models and refreshes from events", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_phase170_${suffix}`;
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    databaseUrl.searchParams.delete("schema");
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    const roleName = `entral_phase170_api_${suffix}`;
    const rolePassword = randomUUID();
    let owner: PrismaClient | null = null;
    let api: PrismaClient | null = null;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
        "Phase 170 disposable PostgreSQL migration"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        [
          "db",
          "execute",
          "--file",
          "prisma/security/046_roles_and_grants.sql",
          "--schema",
          "prisma/schema.prisma"
        ],
        "Phase 170 role and grant deployment"
      );
      await admin.$executeRawUnsafe(
        `CREATE ROLE "${roleName}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS ` +
        `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${rolePassword}'`
      );
      await admin.$executeRawUnsafe(`GRANT entral_api TO "${roleName}"`);

      owner = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
      const humanSubject = `phase170-human-${suffix}`;
      const memberSubject = `phase170-member-${suffix}`;
      const humanUserId = randomUUID();
      const memberUserId = randomUUID();
      await owner.user.createMany({
        data: [
          {
            email: `phase170-human-${suffix}@example.test`,
            id: humanSubject,
            name: "Phase 170 Human",
            passwordHash: "integration-test-only",
            role: "ADMIN"
          },
          {
            email: `phase170-member-${suffix}@example.test`,
            id: memberSubject,
            name: "Phase 170 Member",
            passwordHash: "integration-test-only",
            role: "USER"
          }
        ]
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active, auth_subject
        )
        VALUES
          (
            ${humanUserId}::uuid,
            ${`phase170-human-${suffix}@example.test`},
            'Phase 170 Human',
            true,
            true,
            ${humanSubject}
          ),
          (
            ${memberUserId}::uuid,
            ${`phase170-member-${suffix}@example.test`},
            'Phase 170 Member',
            false,
            true,
            ${memberSubject}
          )
      `;

      const entralId = randomUUID();
      const marshalId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, status)
        VALUES (${entralId}::uuid, 'ENTRAL-PHASE170', 'ENTRAL', 'ENTRAL', 'ACTIVE')
      `;
      await owner.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
        VALUES (
          ${marshalId}::uuid,
          'M-PHASE170',
          'MARSHAL',
          'Phase 170 Portfolio',
          ${entralId}::uuid,
          'ACTIVE'
        )
      `;
      const kinds: BusinessKind[] = ["Store", "Software", "Service", "Marketplace", "Subscription"];
      const seeded: SeededBusiness[] = [];
      for (const [index, kind] of kinds.entries()) {
        seeded.push(await seedBusiness(owner, marshalId, kind, index + 1));
      }
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (
          user_id, scope_type, scope_id, permissions, granted_by_user_id
        )
        VALUES (
          ${memberUserId}::uuid,
          'BUSINESS',
          ${seeded[0]!.businessId}::uuid,
          ARRAY['read', 'read_events']::text[],
          ${humanUserId}::uuid
        )
      `;
      const completenessMissionId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.missions (
          id, stable_code, objective, issuer_entity_id, owner_entity_id, business_id
        )
        VALUES (
          ${completenessMissionId}::uuid,
          ${`MISSION-PHASE180-COMPLETE-${suffix}`},
          'Prove that full-record task sections are not silently truncated.',
          ${seeded[0]!.commanderId}::uuid,
          ${seeded[0]!.commanderId}::uuid,
          ${seeded[0]!.businessId}::uuid
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.tasks (
          id, stable_code, mission_id, owner_entity_id, business_id, objective
        )
        SELECT
          gen_random_uuid(),
          ${`TASK-PHASE180-COMPLETE-${suffix}-`} || lpad(task_number::text, 3, '0'),
          ${completenessMissionId}::uuid,
          ${seeded[0]!.commanderId}::uuid,
          ${seeded[0]!.businessId}::uuid,
          'Completeness task ' || task_number::text
        FROM generate_series(1, 205) AS task_number
      `;
      const outOfScopeMissionId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.missions (
          id, stable_code, objective, issuer_entity_id, owner_entity_id, business_id
        )
        VALUES (
          ${outOfScopeMissionId}::uuid,
          ${`MISSION-PHASE180-OUT-OF-SCOPE-${suffix}`},
          'Prove that assigned members cannot read conversations outside their inherited scope.',
          ${seeded[1]!.commanderId}::uuid,
          ${seeded[1]!.commanderId}::uuid,
          ${seeded[1]!.businessId}::uuid
        )
      `;
      const conversationMessageId = randomUUID();
      const memberConversationMessageId = randomUUID();
      const memberInboundMessageId = randomUUID();
      const memberOutOfScopeMessageId = randomUUID();
      const conversationEvidenceSourceId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.source_records (
          id, source_type, provider, external_id, business_id, trust_level
        )
        VALUES (
          ${conversationEvidenceSourceId}::uuid,
          'PHASE180_ACCEPTANCE',
          'ENTRAL',
          ${`phase180-conversation-${suffix}`},
          ${seeded[0]!.businessId}::uuid,
          'AUTHORITATIVE'
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.operational_messages (
          id,
          mission_id,
          sender_user_id,
          recipient_entity_id,
          message_type,
          payload,
          evidence_refs
        )
        VALUES (
          ${conversationMessageId}::uuid,
          ${completenessMissionId}::uuid,
          ${humanUserId}::uuid,
          ${entralId}::uuid,
          'Clarification',
          jsonb_build_object('content', 'Verify the canonical Phase 180 conversation surface.'),
          jsonb_build_array(jsonb_build_object(
            'type', 'SOURCE_RECORD',
            'id', ${conversationEvidenceSourceId}::text
          ))
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.operational_messages (
          id,
          mission_id,
          sender_user_id,
          sender_entity_id,
          recipient_user_id,
          recipient_entity_id,
          message_type,
          payload,
          evidence_refs
        )
        VALUES
          (
            ${memberConversationMessageId}::uuid,
            ${completenessMissionId}::uuid,
            ${memberUserId}::uuid,
            NULL,
            NULL,
            ${entralId}::uuid,
            'Clarification',
            jsonb_build_object('content', 'Assigned member scoped request.'),
            jsonb_build_array(jsonb_build_object(
              'type', 'SOURCE_RECORD',
              'id', ${conversationEvidenceSourceId}::text
            ))
          ),
          (
            ${memberInboundMessageId}::uuid,
            ${completenessMissionId}::uuid,
            NULL,
            ${entralId}::uuid,
            ${memberUserId}::uuid,
            NULL,
            'ExecutionReport',
            jsonb_build_object('content', 'ENTRAL assigned member scoped result.'),
            jsonb_build_array(jsonb_build_object(
              'type', 'SOURCE_RECORD',
              'id', ${conversationEvidenceSourceId}::text
            ))
          ),
          (
            ${memberOutOfScopeMessageId}::uuid,
            ${outOfScopeMissionId}::uuid,
            ${memberUserId}::uuid,
            NULL,
            NULL,
            ${entralId}::uuid,
            'Clarification',
            jsonb_build_object('content', 'Assigned member out-of-scope request.'),
            jsonb_build_array(jsonb_build_object(
              'type', 'BUSINESS',
              'id', ${seeded[1]!.businessId}::text
            ))
          )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.evidence_links (
          from_type, from_id, source_record_id, evidence_role, claim
        )
        VALUES
          (
            'MESSAGE',
            ${conversationMessageId}::uuid,
            ${conversationEvidenceSourceId}::uuid,
            'SUPPORTS',
            'Supports the canonical Human and ENTRAL conversation test.'
          ),
          (
            'MESSAGE',
            ${memberConversationMessageId}::uuid,
            ${conversationEvidenceSourceId}::uuid,
            'SUPPORTS',
            'Supports the assigned-member outbound conversation test.'
          ),
          (
            'MESSAGE',
            ${memberInboundMessageId}::uuid,
            ${conversationEvidenceSourceId}::uuid,
            'SUPPORTS',
            'Supports the assigned-member inbound conversation test.'
          )
      `;

      api = new PrismaClient({
        datasources: { db: { url: loginUrl(databaseUrl, roleName, rolePassword) } }
      });
      const repository = new CanonicalControlPlaneRepository(api);
      const conversation = await repository.getEntralConversation(
        seeded[0]!.businessId,
        session(humanSubject, "Verify Phase 180 canonical ENTRAL conversation history.")
      );
      expect(conversation.messages).toEqual([
        expect.objectContaining({
          business_id: seeded[0]!.businessId,
          content: "Verify the canonical Phase 180 conversation surface.",
          direction: "HUMAN_TO_ENTRAL",
          event_id: expect.any(String),
          event_sequence: expect.any(Number),
          evidence_refs: [{
            id: conversationEvidenceSourceId,
            type: "SOURCE_RECORD"
          }],
          message_id: conversationMessageId
        })
      ]);
      expect(conversation.event_sequence).toBeGreaterThanOrEqual(conversation.messages[0]!.event_sequence!);
      const memberConversation = await repository.getEntralConversation(
        null,
        session(memberSubject, "Verify assigned-member Phase 180 ENTRAL conversation isolation.")
      );
      expect(memberConversation.messages).toHaveLength(2);
      expect(memberConversation.messages).toEqual(expect.arrayContaining([
        expect.objectContaining({
          business_id: seeded[0]!.businessId,
          direction: "HUMAN_TO_ENTRAL",
          event_id: expect.any(String),
          event_sequence: expect.any(Number),
          message_id: memberConversationMessageId
        }),
        expect.objectContaining({
          business_id: seeded[0]!.businessId,
          direction: "ENTRAL_TO_HUMAN",
          event_id: expect.any(String),
          event_sequence: expect.any(Number),
          message_id: memberInboundMessageId
        })
      ]));
      expect(memberConversation.messages.map((message) => message.message_id)).not.toContain(
        conversationMessageId
      );
      expect(memberConversation.messages.map((message) => message.message_id)).not.toContain(
        memberOutOfScopeMessageId
      );
      const memberScopedConversation = await repository.getEntralConversation(
        seeded[0]!.businessId,
        session(memberSubject, "Verify assigned-member Phase 180 business conversation scope.")
      );
      expect(memberScopedConversation.messages.map((message) => message.message_id).sort())
        .toEqual([memberConversationMessageId, memberInboundMessageId].sort());
      const memberDeniedConversation = await repository.getEntralConversation(
        seeded[1]!.businessId,
        session(memberSubject, "Verify assigned-member Phase 180 inaccessible conversation scope.")
      );
      expect(memberDeniedConversation.messages).toEqual([]);
      const humanPortfolio = await repository.getPortfolio(
        session(humanSubject, "Verify Phase 170 Human portfolio scope.")
      );
      const memberPortfolio = await repository.getPortfolio(
        session(memberSubject, "Verify Phase 170 assigned business scope.")
      );

      expect(humanPortfolio.scope.mode).toBe("HUMAN_PORTFOLIO");
      expect(humanPortfolio.businesses).toHaveLength(5);
      expect(new Set(humanPortfolio.businesses.map((business) => business.general_name)))
        .toEqual(new Set(kinds));
      expect(humanPortfolio.totals.businesses).toBe(5);
      expect(humanPortfolio.totals.active_soldiers).toBe(5);
      expect(humanPortfolio.totals.financials).toEqual([
        expect.objectContaining({
          business_count: 5,
          businesses_with_financials: 5,
          currency: "USD",
          gross_revenue: 150_000,
          net_contribution: 37_500
        })
      ]);
      expect(memberPortfolio.scope.mode).toBe("ASSIGNED_BUSINESSES");
      expect(memberPortfolio.businesses.map((business) => business.business_id))
        .toEqual([seeded[0]!.businessId]);

      const humanHierarchy = await repository.getHierarchySnapshot(
        session(humanSubject, "Verify Phase 180 Human hierarchy snapshot.")
      );
      const memberHierarchy = await repository.getHierarchySnapshot(
        session(memberSubject, "Verify Phase 180 assigned hierarchy snapshot.")
      );
      expect(humanHierarchy.event_sequence).toBe(humanPortfolio.event_sequence);
      expect(humanHierarchy.entities).toHaveLength(17);
      expect(memberHierarchy.scope.mode).toBe("ASSIGNED_BUSINESSES");
      expect(memberHierarchy.entities.map((entity) => entity.entity_id)).toEqual(expect.arrayContaining([
        entralId,
        marshalId,
        seeded[0]!.generalId,
        seeded[0]!.commanderId,
        seeded[0]!.soldierId
      ]));

      const fullEntity = await repository.getEntityFull(
        seeded[0]!.commanderId,
        session(memberSubject, "Verify Phase 180 on-demand entity detail.")
      );
      expect(fullEntity).not.toBeNull();
      expect(fullEntity!.event_sequence).toBe(memberHierarchy.event_sequence);
      expect(fullEntity!.entity.aggregate_version).toBe(fullEntity!.entity.summary.version);
      expect(fullEntity!.entity.summary.version).toBeGreaterThanOrEqual(1);
      expect((fullEntity!.entity.runtime as { tasks: unknown[] }).tasks).toHaveLength(205);
      expect(fullEntity!.entity).toEqual(expect.objectContaining({
        audit: expect.anything(),
        authority: expect.anything(),
        configuration: expect.anything(),
        connections: expect.anything(),
        economics: expect.anything(),
        evidence: expect.anything(),
        operations: expect.anything(),
        reliability: expect.anything(),
        runtime: expect.anything(),
        version_history: expect.any(Array)
      }));
      await expect(repository.getEntityFull(
        seeded[1]!.commanderId,
        session(memberSubject, "Verify Phase 180 out-of-scope entity denial.")
      )).resolves.toBeNull();

      const fullBusiness = await repository.getBusinessFull(
        seeded[1]!.businessId,
        session(humanSubject, "Verify Phase 170 on-demand business detail.")
      );
      expect(fullBusiness).not.toBeNull();
      expect(fullBusiness!.business.aggregate_version).toBe(fullBusiness!.business.summary.version);
      expect(fullBusiness!.business.summary.version).toBeGreaterThanOrEqual(1);
      const memberFullBusiness = await repository.getBusinessFull(
        seeded[0]!.businessId,
        session(memberSubject, "Verify Phase 180 complete business task section.")
      );
      expect(memberFullBusiness).not.toBeNull();
      expect((memberFullBusiness!.business.operations as { tasks: unknown[] }).tasks).toHaveLength(205);
      expect(memberFullBusiness!.business.evidence_ids).toContain(conversationEvidenceSourceId);
      expect(fullBusiness!.business.overview).toMatchObject({
        profile: expect.objectContaining({
          offer: expect.objectContaining({ business_model: "Software" })
        })
      });
      await expect(repository.getBusinessFull(
        seeded[1]!.businessId,
        session(memberSubject, "Verify Phase 170 out-of-scope detail denial.")
      )).resolves.toBeNull();

      const cursor = memberPortfolio.event_sequence;
      await owner.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.businesses
          SET primary_objective = 'Operate the updated canonical store model.'
          WHERE id = ${seeded[0]!.businessId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.business_states
          SET
            primary_objective = 'Operate the updated canonical store model.',
            last_material_change_at = clock_timestamp()
          WHERE business_id = ${seeded[0]!.businessId}::uuid
        `;
      });
      const events = await repository.listPortfolioEvents(
        cursor,
        session(memberSubject, "Verify Phase 170 canonical event refresh.")
      );
      expect(events.next_sequence).toBeGreaterThan(cursor);
      expect(events.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ business_id: seeded[0]!.businessId })
      ]));
      const refreshed = await repository.getPortfolio(
        session(memberSubject, "Verify Phase 170 refreshed portfolio version.")
      );
      expect(refreshed.businesses[0]!.version).toBeGreaterThan(memberPortfolio.businesses[0]!.version);
      expect(refreshed.businesses[0]!.primary_objective)
        .toBe("Operate the updated canonical store model.");
    } finally {
      await Promise.allSettled([api?.$disconnect(), owner?.$disconnect()]);
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity ` +
        `WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
      ).catch(() => undefined);
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
      await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`).catch(() => undefined);
      await admin.$disconnect();
    }
  }, 180_000);
});

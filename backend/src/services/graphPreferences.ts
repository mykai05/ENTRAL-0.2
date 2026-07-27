import { createHash } from "node:crypto";
import {
  GRAPH_CONTRACT_VERSION,
  GRAPH_PREFERENCES_SCHEMA_VERSION,
  canonicalGraphPreferenceSettings,
  normalizeGraphPreferenceSettings,
  parseGraphViewPreferences,
  parseGraphViewPreferencesMutationResponse,
  resetGraphPreferenceSettings,
  type GraphPreferenceResetScope,
  type GraphPreferenceSettings,
  type GraphPinnedPosition,
  type GraphViewPreferences,
  type GraphViewPreferencesMutationResponse
} from "@entral/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  prisma,
  withCanonicalSession,
  type CanonicalSessionContext
} from "../db.js";

type PreferenceRow = {
  id: string;
  schemaVersion: number;
  migratedFromSchemaVersion: number | null;
  simpleSettings: unknown;
  advancedSharedSettings: unknown;
  advanced2dSettings: unknown;
  advanced3dSettings: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type PinnedPositionRow = {
  entityId: string;
  renderer: "2D" | "3D";
  x: string | number;
  y: string | number;
  z: string | number | null;
};

type MutationReceiptRow = {
  requestSha256: string;
  responseSnapshot: unknown;
  eventIds: string[];
};

export class GraphPreferencesError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "GraphPreferencesError";
  }
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function numberFromDatabase(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Stored graph coordinate is not finite.");
  return parsed;
}

function pinnedPositions(rows: readonly PinnedPositionRow[]): GraphPinnedPosition[] {
  return rows.map((row) => ({
    entity_id: row.entityId,
    renderer: row.renderer,
    x: numberFromDatabase(row.x)!,
    y: numberFromDatabase(row.y)!,
    z: numberFromDatabase(row.z)
  }));
}

function defaultPreferences(
  appUserId: string,
  organizationId: string
): GraphViewPreferences {
  return parseGraphViewPreferences({
    contract_version: GRAPH_CONTRACT_VERSION,
    schema_version: GRAPH_PREFERENCES_SCHEMA_VERSION,
    preference_id: null,
    user_id: appUserId,
    organization_id: organizationId,
    source: "CANONICAL_DEFAULTS",
    settings: canonicalGraphPreferenceSettings(),
    version: 0,
    created_at: null,
    updated_at: null,
    migrated_from_schema_version: null
  });
}

function savedPreferences(input: {
  appUserId: string;
  organizationId: string;
  row: PreferenceRow;
  positions: readonly PinnedPositionRow[];
  migratedFromSchemaVersion?: number | null;
}): GraphViewPreferences {
  const normalized = normalizeGraphPreferenceSettings({
    simple: input.row.simpleSettings,
    advanced_shared: input.row.advancedSharedSettings,
    advanced_2d: input.row.advanced2dSettings,
    advanced_3d: input.row.advanced3dSettings,
    pinned_positions: pinnedPositions(input.positions)
  }, input.row.schemaVersion as 1 | 2);
  return parseGraphViewPreferences({
    contract_version: GRAPH_CONTRACT_VERSION,
    schema_version: GRAPH_PREFERENCES_SCHEMA_VERSION,
    preference_id: input.row.id,
    user_id: input.appUserId,
    organization_id: input.organizationId,
    source: "SAVED_OVERRIDE",
    settings: normalized.settings,
    version: input.row.version,
    created_at: input.row.createdAt.toISOString(),
    updated_at: input.row.updatedAt.toISOString(),
    migrated_from_schema_version:
      input.migratedFromSchemaVersion
      ?? input.row.migratedFromSchemaVersion
      ?? normalized.migrated_from_schema_version
  });
}

async function lockPreferenceScope(
  transaction: Prisma.TransactionClient,
  appUserId: string,
  organizationId: string
) {
  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${`${appUserId}:${organizationId}`}, 195)
    )::text AS "lockToken"
  `;
}

async function findPreference(
  transaction: Prisma.TransactionClient,
  appUserId: string,
  organizationId: string,
  forUpdate: boolean
) {
  const query = Prisma.sql`
    SELECT
      id,
      schema_version AS "schemaVersion",
      migrated_from_schema_version AS "migratedFromSchemaVersion",
      simple_settings AS "simpleSettings",
      advanced_shared_settings AS "advancedSharedSettings",
      advanced_2d_settings AS "advanced2dSettings",
      advanced_3d_settings AS "advanced3dSettings",
      version::integer AS version,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM entral.graph_view_preferences
    WHERE user_id = ${appUserId}::uuid
      AND organization_id = ${organizationId}
    ${forUpdate ? Prisma.sql`FOR UPDATE` : Prisma.empty}
  `;
  const rows = await transaction.$queryRaw<PreferenceRow[]>(query);
  return rows[0] ?? null;
}

async function findPinnedPositions(
  transaction: Prisma.TransactionClient,
  appUserId: string,
  organizationId: string
) {
  return transaction.$queryRaw<PinnedPositionRow[]>`
    SELECT
      entity_id AS "entityId",
      renderer,
      position_x::text AS x,
      position_y::text AS y,
      position_z::text AS z
    FROM entral.graph_pinned_positions
    WHERE user_id = ${appUserId}::uuid
      AND organization_id = ${organizationId}
    ORDER BY renderer, entity_id
  `;
}

async function findReceipt(
  transaction: Prisma.TransactionClient,
  appUserId: string,
  organizationId: string,
  idempotencyKey: string
) {
  const rows = await transaction.$queryRaw<MutationReceiptRow[]>`
    SELECT
      request_sha256 AS "requestSha256",
      response_snapshot AS "responseSnapshot",
      event_ids AS "eventIds"
    FROM entral.graph_preference_mutation_receipts
    WHERE user_id = ${appUserId}::uuid
      AND organization_id = ${organizationId}
      AND idempotency_key = ${idempotencyKey}
  `;
  return rows[0] ?? null;
}

function replayReceipt(receipt: MutationReceiptRow, requestSha256: string) {
  if (receipt.requestSha256 !== requestSha256) {
    throw new GraphPreferencesError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "The idempotency key was already used for a different graph preference mutation."
    );
  }
  const stored = parseGraphViewPreferencesMutationResponse(receipt.responseSnapshot);
  return parseGraphViewPreferencesMutationResponse({
    ...stored,
    idempotent_replay: true
  });
}

async function insertReceipt(
  transaction: Prisma.TransactionClient,
  input: {
    appUserId: string;
    organizationId: string;
    idempotencyKey: string;
    operation: "UPDATE" | "RESET";
    requestSha256: string;
    response: GraphViewPreferencesMutationResponse;
  }
) {
  await transaction.$executeRaw`
    INSERT INTO entral.graph_preference_mutation_receipts (
      user_id,
      organization_id,
      idempotency_key,
      request_sha256,
      operation,
      response_snapshot,
      event_ids
    ) VALUES (
      ${input.appUserId}::uuid,
      ${input.organizationId},
      ${input.idempotencyKey},
      ${input.requestSha256},
      ${input.operation},
      ${jsonInput(input.response)},
      ${input.response.event_ids}::uuid[]
    )
  `;
}

async function replacePinnedPositions(
  transaction: Prisma.TransactionClient,
  input: {
    appUserId: string;
    organizationId: string;
    positions: readonly GraphPinnedPosition[];
  }
) {
  await transaction.$executeRaw`
    DELETE FROM entral.graph_pinned_positions
    WHERE user_id = ${input.appUserId}::uuid
      AND organization_id = ${input.organizationId}
  `;
  if (input.positions.length === 0) return;

  const visible = await transaction.$queryRaw<{ count: number }[]>`
    SELECT count(*)::integer AS count
    FROM entral.entities
    WHERE id IN (${Prisma.join(input.positions.map((position) => Prisma.sql`${position.entity_id}::uuid`))})
  `;
  if (visible[0]?.count !== new Set(input.positions.map((position) => position.entity_id)).size) {
    throw new GraphPreferencesError(
      400,
      "UNAVAILABLE_PIN_TARGET",
      "Pinned positions contain an entity that is not available in the authenticated graph scope."
    );
  }

  const values = input.positions.map((position) => Prisma.sql`(
    ${input.appUserId}::uuid,
    ${input.organizationId},
    ${position.entity_id}::uuid,
    ${position.renderer},
    ${position.x},
    ${position.y},
    ${position.z}
  )`);
  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO entral.graph_pinned_positions (
      user_id,
      organization_id,
      entity_id,
      renderer,
      position_x,
      position_y,
      position_z
    ) VALUES ${Prisma.join(values)}
  `);
}

async function emitPreferenceEvents(
  transaction: Prisma.TransactionClient,
  input: {
    preferenceId: string;
    organizationId: string;
    operation: "UPDATE" | "RESET";
    previousVersion: number;
    resultingVersion: number;
    changedSections: readonly string[];
    pinnedPositionCount: number;
  }
) {
  const rows = await transaction.$queryRaw<{ eventIds: string[] }[]>`
    SELECT entral.record_graph_preference_change(
      ${input.preferenceId}::uuid,
      ${input.organizationId}::text,
      ${input.operation}::text,
      ${input.previousVersion}::bigint,
      ${input.resultingVersion}::bigint,
      ${GRAPH_PREFERENCES_SCHEMA_VERSION}::integer,
      ${input.changedSections}::text[],
      ${input.pinnedPositionCount}::integer
    ) AS "eventIds"
  `;
  return rows[0]?.eventIds ?? [];
}

function changedUpdateSections(
  previous: GraphPreferenceSettings,
  next: GraphPreferenceSettings
) {
  const sections: string[] = [];
  if (stableHash(previous.simple) !== stableHash(next.simple)) sections.push("SIMPLE");
  if (
    stableHash(previous.advanced_shared)
    !== stableHash(next.advanced_shared)
  ) {
    sections.push("ADVANCED_SHARED");
  }
  if (stableHash(previous.advanced_2d) !== stableHash(next.advanced_2d)) {
    sections.push("VIEW_2D");
  }
  if (stableHash(previous.advanced_3d) !== stableHash(next.advanced_3d)) {
    sections.push("VIEW_3D");
  }
  if (
    stableHash(previous.pinned_positions)
    !== stableHash(next.pinned_positions)
  ) {
    sections.push("PINNED_POSITIONS");
  }
  if (previous.simple.arrangement !== next.simple.arrangement) sections.push("ARRANGEMENT");
  return sections;
}

function resetChangedSections(
  previous: GraphPreferenceSettings,
  next: GraphPreferenceSettings,
  resetScope: GraphPreferenceResetScope
): string[] {
  const changedSections = changedUpdateSections(previous, next);
  return resetScope === "ALL"
    ? ["ALL", ...changedSections]
    : changedSections;
}

export class GraphPreferencesService {
  constructor(private readonly database: PrismaClient = prisma) {}

  async get(
    organizationId: string,
    databaseSession: CanonicalSessionContext
  ): Promise<GraphViewPreferences> {
    return withCanonicalSession(this.database, databaseSession, async (transaction, appUserId) => {
      await lockPreferenceScope(transaction, appUserId, organizationId);
      let row = await findPreference(transaction, appUserId, organizationId, true);
      if (!row) return defaultPreferences(appUserId, organizationId);
      let positions = await findPinnedPositions(transaction, appUserId, organizationId);

      if (row.schemaVersion < GRAPH_PREFERENCES_SCHEMA_VERSION) {
        const migrated = savedPreferences({
          appUserId,
          organizationId,
          row,
          positions,
          migratedFromSchemaVersion: row.schemaVersion
        });
        const updatedRows = await transaction.$queryRaw<PreferenceRow[]>`
          UPDATE entral.graph_view_preferences
          SET
            schema_version = ${GRAPH_PREFERENCES_SCHEMA_VERSION},
            migrated_from_schema_version = ${row.schemaVersion},
            simple_settings = ${jsonInput(migrated.settings.simple)},
            advanced_shared_settings = ${jsonInput(migrated.settings.advanced_shared)},
            advanced_2d_settings = ${jsonInput(migrated.settings.advanced_2d)},
            advanced_3d_settings = ${jsonInput(migrated.settings.advanced_3d)}
          WHERE id = ${row.id}::uuid
            AND version = ${row.version}
          RETURNING
            id,
            schema_version AS "schemaVersion",
            migrated_from_schema_version AS "migratedFromSchemaVersion",
            simple_settings AS "simpleSettings",
            advanced_shared_settings AS "advancedSharedSettings",
            advanced_2d_settings AS "advanced2dSettings",
            advanced_3d_settings AS "advanced3dSettings",
            version::integer AS version,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `;
        row = updatedRows[0]!;
        positions = await findPinnedPositions(transaction, appUserId, organizationId);
        await emitPreferenceEvents(transaction, {
          preferenceId: row.id,
          organizationId,
          operation: "UPDATE",
          previousVersion: migrated.version,
          resultingVersion: row.version,
          changedSections: ["ALL"],
          pinnedPositionCount: positions.length
        });
      }

      return savedPreferences({
        appUserId,
        organizationId,
        row,
        positions
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async update(
    organizationId: string,
    request: {
      expected_version: number;
      idempotency_key: string;
      settings: GraphPreferenceSettings;
      migrated_from_schema_version: number | null;
    },
    databaseSession: CanonicalSessionContext
  ): Promise<GraphViewPreferencesMutationResponse> {
    const requestSha256 = stableHash({ operation: "UPDATE", request });
    return withCanonicalSession(this.database, databaseSession, async (transaction, appUserId) => {
      await lockPreferenceScope(transaction, appUserId, organizationId);
      const existingReceipt = await findReceipt(
        transaction,
        appUserId,
        organizationId,
        request.idempotency_key
      );
      if (existingReceipt) return replayReceipt(existingReceipt, requestSha256);

      const previousRow = await findPreference(transaction, appUserId, organizationId, true);
      const previousVersion = previousRow?.version ?? 0;
      if (request.expected_version !== previousVersion) {
        throw new GraphPreferencesError(
          409,
          "STALE_EXPECTED_VERSION",
          `expected_version ${request.expected_version} does not match actual version ${previousVersion}.`
        );
      }
      const previousPositions = previousRow
        ? await findPinnedPositions(transaction, appUserId, organizationId)
        : [];
      const previous = previousRow
        ? savedPreferences({
            appUserId,
            organizationId,
            row: previousRow,
            positions: previousPositions
          }).settings
        : canonicalGraphPreferenceSettings();

      let updatedRow: PreferenceRow;
      if (previousRow) {
        const rows = await transaction.$queryRaw<PreferenceRow[]>`
          UPDATE entral.graph_view_preferences
          SET
            schema_version = ${GRAPH_PREFERENCES_SCHEMA_VERSION},
            migrated_from_schema_version = ${request.migrated_from_schema_version},
            simple_settings = ${jsonInput(request.settings.simple)},
            advanced_shared_settings = ${jsonInput(request.settings.advanced_shared)},
            advanced_2d_settings = ${jsonInput(request.settings.advanced_2d)},
            advanced_3d_settings = ${jsonInput(request.settings.advanced_3d)},
            version = version + 1
          WHERE id = ${previousRow.id}::uuid
            AND version = ${request.expected_version}
          RETURNING
            id,
            schema_version AS "schemaVersion",
            migrated_from_schema_version AS "migratedFromSchemaVersion",
            simple_settings AS "simpleSettings",
            advanced_shared_settings AS "advancedSharedSettings",
            advanced_2d_settings AS "advanced2dSettings",
            advanced_3d_settings AS "advanced3dSettings",
            version::integer AS version,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `;
        if (!rows[0]) {
          throw new GraphPreferencesError(409, "STALE_EXPECTED_VERSION", "Graph preferences changed concurrently.");
        }
        updatedRow = rows[0];
      } else {
        const rows = await transaction.$queryRaw<PreferenceRow[]>`
          INSERT INTO entral.graph_view_preferences (
            user_id,
            organization_id,
            schema_version,
            migrated_from_schema_version,
            simple_settings,
            advanced_shared_settings,
            advanced_2d_settings,
            advanced_3d_settings
          ) VALUES (
            ${appUserId}::uuid,
            ${organizationId},
            ${GRAPH_PREFERENCES_SCHEMA_VERSION},
            ${request.migrated_from_schema_version},
            ${jsonInput(request.settings.simple)},
            ${jsonInput(request.settings.advanced_shared)},
            ${jsonInput(request.settings.advanced_2d)},
            ${jsonInput(request.settings.advanced_3d)}
          )
          RETURNING
            id,
            schema_version AS "schemaVersion",
            migrated_from_schema_version AS "migratedFromSchemaVersion",
            simple_settings AS "simpleSettings",
            advanced_shared_settings AS "advancedSharedSettings",
            advanced_2d_settings AS "advanced2dSettings",
            advanced_3d_settings AS "advanced3dSettings",
            version::integer AS version,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `;
        updatedRow = rows[0]!;
      }

      await replacePinnedPositions(transaction, {
        appUserId,
        organizationId,
        positions: request.settings.pinned_positions
      });
      const storedPositions = await findPinnedPositions(transaction, appUserId, organizationId);
      const preferences = savedPreferences({
        appUserId,
        organizationId,
        row: updatedRow,
        positions: storedPositions
      });
      const eventIds = await emitPreferenceEvents(transaction, {
        preferenceId: updatedRow.id,
        organizationId,
        operation: "UPDATE",
        previousVersion,
        resultingVersion: updatedRow.version,
        changedSections: changedUpdateSections(previous, request.settings),
        pinnedPositionCount: storedPositions.length
      });
      const response = parseGraphViewPreferencesMutationResponse({
        preferences,
        idempotent_replay: false,
        event_ids: eventIds
      });
      await insertReceipt(transaction, {
        appUserId,
        organizationId,
        idempotencyKey: request.idempotency_key,
        operation: "UPDATE",
        requestSha256,
        response
      });
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async reset(
    organizationId: string,
    request: {
      expected_version: number;
      idempotency_key: string;
      reset_scope: GraphPreferenceResetScope;
    },
    databaseSession: CanonicalSessionContext
  ): Promise<GraphViewPreferencesMutationResponse> {
    const requestSha256 = stableHash({ operation: "RESET", request });
    return withCanonicalSession(this.database, databaseSession, async (transaction, appUserId) => {
      await lockPreferenceScope(transaction, appUserId, organizationId);
      const existingReceipt = await findReceipt(
        transaction,
        appUserId,
        organizationId,
        request.idempotency_key
      );
      if (existingReceipt) return replayReceipt(existingReceipt, requestSha256);

      const previousRow = await findPreference(transaction, appUserId, organizationId, true);
      const previousVersion = previousRow?.version ?? 0;
      if (request.expected_version !== previousVersion) {
        throw new GraphPreferencesError(
          409,
          "STALE_EXPECTED_VERSION",
          `expected_version ${request.expected_version} does not match actual version ${previousVersion}.`
        );
      }

      if (!previousRow) {
        const response = parseGraphViewPreferencesMutationResponse({
          preferences: defaultPreferences(appUserId, organizationId),
          idempotent_replay: false,
          event_ids: []
        });
        await insertReceipt(transaction, {
          appUserId,
          organizationId,
          idempotencyKey: request.idempotency_key,
          operation: "RESET",
          requestSha256,
          response
        });
        return response;
      }

      const previousPositions = await findPinnedPositions(transaction, appUserId, organizationId);
      const previous = savedPreferences({
        appUserId,
        organizationId,
        row: previousRow,
        positions: previousPositions
      });
      let preferences: GraphViewPreferences;
      let resultingVersion: number;
      let storedPositions: PinnedPositionRow[] = [];

      if (request.reset_scope === "ALL") {
        await transaction.$executeRaw`
          DELETE FROM entral.graph_pinned_positions
          WHERE user_id = ${appUserId}::uuid
            AND organization_id = ${organizationId}
        `;
        const deleted = await transaction.$executeRaw`
          DELETE FROM entral.graph_view_preferences
          WHERE id = ${previousRow.id}::uuid
            AND version = ${request.expected_version}
        `;
        if (deleted !== 1) {
          throw new GraphPreferencesError(409, "STALE_EXPECTED_VERSION", "Graph preferences changed concurrently.");
        }
        preferences = defaultPreferences(appUserId, organizationId);
        resultingVersion = 0;
      } else {
        const next = resetGraphPreferenceSettings(
          previous.settings,
          request.reset_scope
        );
        const rows = await transaction.$queryRaw<PreferenceRow[]>`
          UPDATE entral.graph_view_preferences
          SET
            schema_version = ${GRAPH_PREFERENCES_SCHEMA_VERSION},
            migrated_from_schema_version = NULL,
            simple_settings = ${jsonInput(next.simple)},
            advanced_shared_settings = ${jsonInput(next.advanced_shared)},
            advanced_2d_settings = ${jsonInput(next.advanced_2d)},
            advanced_3d_settings = ${jsonInput(next.advanced_3d)},
            version = version + 1
          WHERE id = ${previousRow.id}::uuid
            AND version = ${request.expected_version}
          RETURNING
            id,
            schema_version AS "schemaVersion",
            migrated_from_schema_version AS "migratedFromSchemaVersion",
            simple_settings AS "simpleSettings",
            advanced_shared_settings AS "advancedSharedSettings",
            advanced_2d_settings AS "advanced2dSettings",
            advanced_3d_settings AS "advanced3dSettings",
            version::integer AS version,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `;
        const updatedRow = rows[0];
        if (!updatedRow) {
          throw new GraphPreferencesError(409, "STALE_EXPECTED_VERSION", "Graph preferences changed concurrently.");
        }
        await replacePinnedPositions(transaction, {
          appUserId,
          organizationId,
          positions: next.pinned_positions
        });
        storedPositions = await findPinnedPositions(transaction, appUserId, organizationId);
        preferences = savedPreferences({
          appUserId,
          organizationId,
          row: updatedRow,
          positions: storedPositions
        });
        resultingVersion = updatedRow.version;
      }

      const eventIds = await emitPreferenceEvents(transaction, {
        preferenceId: previousRow.id,
        organizationId,
        operation: "RESET",
        previousVersion,
        resultingVersion,
        changedSections: resetChangedSections(
          previous.settings,
          preferences.settings,
          request.reset_scope
        ),
        pinnedPositionCount: storedPositions.length
      });
      const response = parseGraphViewPreferencesMutationResponse({
        preferences,
        idempotent_replay: false,
        event_ids: eventIds
      });
      await insertReceipt(transaction, {
        appUserId,
        organizationId,
        idempotencyKey: request.idempotency_key,
        operation: "RESET",
        requestSha256,
        response
      });
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

export const graphPreferencesService = new GraphPreferencesService();

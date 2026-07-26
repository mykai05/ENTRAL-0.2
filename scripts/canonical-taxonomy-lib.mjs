import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const CANONICAL_TAXONOMY_ID = "d10d945f-fdde-5cb2-aee5-7be737fa52f1";
export const CANONICAL_TAXONOMY_VERSION = "1.0.0";
export const EXPECTED_CANONICAL_FINGERPRINT =
  "f070396c703bf6b96b1ab020f819f915a85b37d2ec41b82b454f7d9d9f946ecb";

const EXPECTED_MARSHAL_COUNTS = new Map([
  ["M01", 22],
  ["M02", 17],
  ["M03", 15],
  ["M04", 10],
  ["M05", 16],
  ["M06", 13],
  ["M07", 14],
  ["M08", 16]
]);
const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`Canonical taxonomy validation failed: ${message}`);
  }
}

export function canonicalRows(document) {
  return [document.entral, ...document.marshals, ...document.generals];
}

export function canonicalFingerprint(rows) {
  const normalized = [...rows]
    .sort((left, right) =>
      left.stable_code < right.stable_code ? -1 : left.stable_code > right.stable_code ? 1 : 0
    )
    .map((row) =>
      [
        row.id,
        row.stable_code,
        row.role,
        row.name,
        row.parent_id ?? "",
        row.definition,
        row.taxonomy_version
      ].join("\t")
    )
    .join("\n")
    .concat("\n");
  return createHash("sha256").update(normalized).digest("hex");
}

export function loadCanonicalDocument(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateCanonicalDocument(document) {
  invariant(document.schema_version === "1.0.0", "unexpected document schema version");
  invariant(document.taxonomy_id === CANONICAL_TAXONOMY_ID, "unexpected taxonomy ID");
  invariant(document.entral?.stable_code === "ENTRAL", "missing ENTRAL root");
  invariant(document.entral?.role === "ENTRAL", "root role is not ENTRAL");
  invariant(document.entral?.parent_id === null, "ENTRAL must not have a parent");
  invariant(document.marshals?.length === 8, "expected 8 Marshals");
  invariant(document.generals?.length === 123, "expected 123 Generals");
  invariant(document.counts?.entral === 1, "declared ENTRAL count is not 1");
  invariant(document.counts?.marshals === 8, "declared Marshal count is not 8");
  invariant(document.counts?.generals === 123, "declared General count is not 123");

  const rows = canonicalRows(document);
  const ids = new Set();
  const stableCodes = new Set();
  for (const row of rows) {
    invariant(UUID_V5.test(row.id), `${row.stable_code ?? "unknown"} does not use a UUIDv5 ID`);
    invariant(!ids.has(row.id), `duplicate ID ${row.id}`);
    invariant(!stableCodes.has(row.stable_code), `duplicate stable code ${row.stable_code}`);
    invariant(row.taxonomy_version === CANONICAL_TAXONOMY_VERSION, `${row.stable_code} version drift`);
    ids.add(row.id);
    stableCodes.add(row.stable_code);
  }

  const marshalById = new Map(document.marshals.map((row) => [row.id, row]));
  for (const marshal of document.marshals) {
    invariant(marshal.role === "MARSHAL", `${marshal.stable_code} is not a Marshal`);
    invariant(marshal.parent_id === document.entral.id, `${marshal.stable_code} has the wrong parent`);
    invariant(
      EXPECTED_MARSHAL_COUNTS.get(marshal.stable_code) === marshal.general_count,
      `${marshal.stable_code} declared General count drift`
    );
  }

  const actualMarshalCounts = new Map();
  for (const general of document.generals) {
    const parent = marshalById.get(general.parent_id);
    invariant(general.role === "GENERAL", `${general.stable_code} is not a General`);
    invariant(Boolean(parent), `${general.stable_code} references a missing Marshal`);
    invariant(general.parent_code === parent.stable_code, `${general.stable_code} parent code drift`);
    actualMarshalCounts.set(parent.stable_code, (actualMarshalCounts.get(parent.stable_code) ?? 0) + 1);
  }
  for (const [marshalCode, expected] of EXPECTED_MARSHAL_COUNTS) {
    invariant(actualMarshalCounts.get(marshalCode) === expected, `${marshalCode} actual General count drift`);
  }

  const duplicateNames = [...new Set(rows.map((row) => row.name))]
    .map((name) => [name, rows.filter((row) => row.name === name)])
    .filter(([, matches]) => matches.length > 1);
  invariant(duplicateNames.length === 2, "unexpected duplicate-name set");
  invariant(
    duplicateNames.every(
      ([name, matches]) =>
        ["Rental Commerce General", "Subscription Boxes General"].includes(name) &&
        new Set(matches.map((row) => row.parent_code)).size === 2
    ),
    "repeated General names are not correctly parent-scoped"
  );

  const fingerprint = canonicalFingerprint(rows);
  invariant(fingerprint === EXPECTED_CANONICAL_FINGERPRINT, `fingerprint drift: ${fingerprint}`);
  return { counts: { entral: 1, generals: 123, marshals: 8 }, fingerprint, rows };
}

export function databaseUrlFromEnvironment(environment = process.env) {
  const value = environment.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }
  const parsed = new URL(value);
  if (!parsed.protocol.startsWith("postgres")) {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }
  return parsed;
}

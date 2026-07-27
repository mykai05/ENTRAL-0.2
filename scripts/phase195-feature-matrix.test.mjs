import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const matrixUrl = new URL("../docs/PHASE_195_FEATURE_MATRIX.md", import.meta.url);

test("Phase 195 feature matrix contains one ordered evidence row for every authoritative feature", async () => {
  const matrix = await readFile(matrixUrl, "utf8");
  const rows = [...matrix.matchAll(
    /^\|\s*(P195-F\d{3})\s*\|\s*(Verified|Local; release pending|Partial|Blocked)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/gm
  )].map((match) => ({
    evidence: match[3].trim(),
    featureId: match[1],
    gap: match[4].trim(),
    status: match[2]
  }));
  const expected = Array.from(
    { length: 60 },
    (_, index) => `P195-F${String(index + 1).padStart(3, "0")}`
  );

  assert.deepEqual(
    rows.map((row) => row.featureId),
    expected,
    "the matrix must contain exactly one ordered row for P195-F001 through P195-F060"
  );
  assert.equal(new Set(rows.map((row) => row.featureId)).size, 60);
  for (const row of rows) {
    assert.ok(row.evidence.length >= 20, `${row.featureId} needs concrete evidence`);
    assert.ok(row.gap.length >= 20, `${row.featureId} needs an explicit gap or closure condition`);
  }

  const statusCounts = new Map(
    ["Verified", "Local; release pending", "Partial", "Blocked"].map(
      (status) => [status, rows.filter((row) => row.status === status).length]
    )
  );
  const normalizedMatrix = matrix.replace(/\s+/g, " ");
  for (const [status, count] of statusCounts) {
    assert.ok(
      normalizedMatrix.includes(`${count} **${status}**`),
      `the status summary must match the ${status} row count`
    );
  }
  assert.doesNotMatch(
    matrix,
    /\u00c2|\u00e2|\ufffd/,
    "the matrix must not contain common mojibake markers"
  );
});

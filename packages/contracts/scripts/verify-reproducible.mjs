import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import process from "node:process";

async function filesUnder(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(fullPath, root));
    else files.push(relative(root, fullPath).replaceAll("\\", "/"));
  }
  return files.sort();
}

async function digest(directory) {
  const hash = createHash("sha256");
  for (const file of await filesUnder(directory)) {
    hash.update(file);
    hash.update(await readFile(join(directory, file)));
  }
  return hash.digest("hex");
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "entral-contracts-repro-"));
const first = join(temporaryRoot, "first");
const second = join(temporaryRoot, "second");
const tsc = join(process.cwd(), "..", "..", "node_modules", "typescript", "bin", "tsc");

try {
  for (const output of [first, second]) {
    execFileSync(process.execPath, [tsc, "-p", "tsconfig.json", "--outDir", output], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
  }
  assert.equal(await digest(first), await digest(second), "clean contract builds must be byte-identical");
  process.stdout.write("reproducible contract build: PASS\n");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

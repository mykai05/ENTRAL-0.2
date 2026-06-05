import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const candidates = [
  process.env.npm_execpath,
  resolve(repoRoot, ".corepack/v1/pnpm/9.12.3/bin/pnpm.cjs")
].filter(Boolean);

for (const candidate of candidates) {
  if (existsSync(candidate)) {
    const result = spawnSync(process.execPath, [candidate, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit"
    });
    process.exit(result.status ?? 1);
  }
}

const result = spawnSync("pnpm", args, {
  cwd: repoRoot,
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit"
});

process.exit(result.status ?? 1);

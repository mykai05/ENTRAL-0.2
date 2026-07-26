import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const npmExecPath = process.env.npm_execpath;
const packageManager = npmExecPath && existsSync(npmExecPath)
  ? { command: process.execPath, prefixArgs: [npmExecPath] }
  : { command: process.platform === "win32" ? "pnpm.cmd" : "pnpm", prefixArgs: [] };
const commands = [
  {
    args: ["--filter", "@entral/backend", "dev:memory"],
    name: "backend"
  },
  {
    args: ["--filter", "@entral/frontend", "dev"],
    name: "frontend"
  }
];
const children = [];

function prefixOutput(name, stream) {
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) {
        process.stdout.write(`[${name}] ${line}\n`);
      }
    }
  });
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

console.log("Starting ENTRAL local dev stack...");
console.log("Frontend: http://localhost:3000");
console.log("Backend:  http://localhost:4000");
console.log("Mode:     memory backend for local development");

for (const command of commands) {
  const child = spawn(packageManager.command, [...packageManager.prefixArgs, ...command.args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_HOST: process.env.API_HOST ?? "0.0.0.0",
      API_PORT: process.env.API_PORT ?? "4000",
      API_PROXY_URL: process.env.API_PROXY_URL ?? "http://127.0.0.1:4000",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://entral:entral@127.0.0.1:5432/entral_local_memory",
      JWT_SECRET: process.env.JWT_SECRET ?? "entral-local-memory-only-secret-32-characters",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? ""
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false
  });

  children.push(child);
  prefixOutput(command.name, child.stdout);
  prefixOutput(command.name, child.stderr);

  child.on("exit", (code, signal) => {
    console.log(`[${command.name}] stopped${code === null ? "" : ` with code ${code}`}${signal ? ` (${signal})` : ""}`);
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}

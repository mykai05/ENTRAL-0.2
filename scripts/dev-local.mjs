import { spawn } from "node:child_process";
import process from "node:process";

const pnpm = ".corepack/v1/pnpm/9.12.3/bin/pnpm.cjs";
const commands = [
  {
    args: [pnpm, "--filter", "@entral/backend", "dev:memory"],
    name: "backend"
  },
  {
    args: [pnpm, "--filter", "@entral/frontend", "dev"],
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
  const child = spawn(process.execPath, command.args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
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

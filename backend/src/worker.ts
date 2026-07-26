import { env } from "./env.js";
import { prisma } from "./db.js";
import { assertWorkerEntrypointRole, resolveProcessRole } from "./processRole.js";
import { startAgentOrchestrator } from "./services/agentOrchestrator.js";
import { startAutomationWorker } from "./services/automationQueue.js";
import { startAutonomyScheduler } from "./services/autonomyScheduler.js";
import { startCanonicalOutboxWorker } from "./services/canonicalOutboxWorker.js";

const processRole = resolveProcessRole({
  nodeEnv: env.NODE_ENV,
  processRole: process.env.PROCESS_ROLE
});
assertWorkerEntrypointRole(processRole);

const stopAutomationWorker = startAutomationWorker();
const stopAgentOrchestrator = startAgentOrchestrator();
const stopAutonomyScheduler = startAutonomyScheduler();
const stopCanonicalOutboxWorker = await startCanonicalOutboxWorker();

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopAutomationWorker();
  stopAgentOrchestrator();
  stopAutonomyScheduler();
  let exitCode = 0;
  try {
    await stopCanonicalOutboxWorker();
  } catch (error) {
    exitCode = 1;
    console.error("Unable to stop the canonical outbox dispatcher cleanly.", error);
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    exitCode = 1;
    console.error("Unable to disconnect the worker database client cleanly.", error);
  }

  process.exit(exitCode);
}

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});

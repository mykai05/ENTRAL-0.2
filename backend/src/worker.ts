import { startAgentOrchestrator } from "./services/agentOrchestrator.js";
import { startAutomationWorker } from "./services/automationQueue.js";
import { startAutonomyScheduler } from "./services/autonomyScheduler.js";

const stopAutomationWorker = startAutomationWorker();
const stopAgentOrchestrator = startAgentOrchestrator();
const stopAutonomyScheduler = startAutonomyScheduler();

function shutdown() {
  stopAutomationWorker();
  stopAgentOrchestrator();
  stopAutonomyScheduler();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

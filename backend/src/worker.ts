import { env } from "./env.js";
import { prisma } from "./db.js";
import { assertWorkerEntrypointRole, resolveProcessRole } from "./processRole.js";
import { startAgentOrchestrator } from "./services/agentOrchestrator.js";
import { startAutomationWorker } from "./services/automationQueue.js";
import { startAutonomyScheduler } from "./services/autonomyScheduler.js";
import { startCanonicalOutboxWorker } from "./services/canonicalOutboxWorker.js";
import {
  assertWorkerReadinessConfiguration,
  startWorkerReadinessHeartbeat,
  type WorkerReadinessComponents
} from "./services/workerReadiness.js";

const processRole = resolveProcessRole({
  nodeEnv: env.NODE_ENV,
  processRole: process.env.PROCESS_ROLE
});
assertWorkerEntrypointRole(processRole);

const enabledWorkerComponents = {
  process: true,
  automation_worker: env.AUTOMATION_WORKER_ENABLED,
  agent_orchestrator: env.AGENT_ORCHESTRATOR_ENABLED,
  autonomy_scheduler: env.AUTONOMY_SCHEDULER_ENABLED,
  canonical_outbox_dispatcher: env.CANONICAL_OUTBOX_DISPATCHER_ENABLED
} satisfies WorkerReadinessComponents;
assertWorkerReadinessConfiguration({
  components: enabledWorkerComponents,
  production: env.NODE_ENV === "production",
  serviceAppUserId: env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID
});

const workerReadinessComponents: WorkerReadinessComponents = {
  process: true,
  automation_worker: false,
  agent_orchestrator: false,
  autonomy_scheduler: false,
  canonical_outbox_dispatcher: false
};
type ComponentStop = {
  name: string;
  stop: () => Promise<void>;
};
const componentStops: ComponentStop[] = [];
let recordWorkerReadinessNow: (() => Promise<void>) | undefined;

function reportComponentHealth(
  component: Exclude<keyof WorkerReadinessComponents, "process">
) {
  return (healthy: boolean) => {
    if (workerReadinessComponents[component] === healthy) return;
    workerReadinessComponents[component] = healthy;
    void recordWorkerReadinessNow?.().catch((error) => {
      console.error("Unable to persist an immediate worker readiness transition.", error);
    });
  };
}

async function stopStartedComponents() {
  let firstError: unknown;
  for (const component of [...componentStops].reverse()) {
    try {
      await component.stop();
    } catch (error) {
      firstError ??= error;
      console.error(`Unable to stop ${component.name} cleanly.`, error);
    }
  }
  componentStops.length = 0;
  if (firstError) throw firstError;
}

let stopWorkerReadinessHeartbeat: () => Promise<void> = async () => undefined;
try {
  componentStops.push({
    name: "the canonical outbox dispatcher",
    stop: await startCanonicalOutboxWorker({
      onHealthChange: reportComponentHealth("canonical_outbox_dispatcher")
    })
  });
  componentStops.push({
    name: "the automation worker",
    stop: await startAutomationWorker({
      onHealthChange: reportComponentHealth("automation_worker")
    })
  });
  componentStops.push({
    name: "the agent orchestrator",
    stop: await startAgentOrchestrator({
      onHealthChange: reportComponentHealth("agent_orchestrator")
    })
  });
  componentStops.push({
    name: "the autonomy scheduler",
    stop: await startAutonomyScheduler({
      onHealthChange: reportComponentHealth("autonomy_scheduler")
    })
  });
  const readinessHeartbeat = await startWorkerReadinessHeartbeat({
    getComponents: () => ({ ...workerReadinessComponents }),
    production: env.NODE_ENV === "production",
    serviceAppUserId: env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID
  });
  stopWorkerReadinessHeartbeat = readinessHeartbeat;
  recordWorkerReadinessNow = readinessHeartbeat.recordNow;
} catch (error) {
  await stopStartedComponents().catch(() => undefined);
  throw error;
}

let shuttingDown = false;

async function stopReadinessWithRetry() {
  const errors: unknown[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await stopWorkerReadinessHeartbeat();
      return;
    } catch (error) {
      errors.push(error);
      console.error(`Unable to persist STOPPING worker readiness (attempt ${attempt}/3).`, error);
    }
  }
  throw new AggregateError(errors, "Worker readiness STOPPING transition failed after three attempts.");
}

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  let exitCode = 0;
  try {
    await stopStartedComponents();
  } catch (error) {
    exitCode = 1;
  }
  recordWorkerReadinessNow = undefined;
  try {
    await stopReadinessWithRetry();
  } catch (error) {
    exitCode = 1;
    console.error("Unable to stop the worker readiness heartbeat cleanly.", error);
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    exitCode = 1;
    console.error("Unable to disconnect the worker database client cleanly.", error);
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

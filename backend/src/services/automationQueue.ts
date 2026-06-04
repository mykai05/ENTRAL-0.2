import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { executeAutomationJob } from "./automationExecutor.js";
import { parseSecureJson } from "./secureJson.js";
import { captureShopifyStoreCreationForStore } from "./shopifyStoreCreationCapture.js";
import {
  buildShopifyStoreCreationCaptureInputFromBrowserReceipt,
  shopifyStoreCreationBrowserTaskJobType,
  shopifyStoreCreationBrowserTaskPayloadSchema,
  shopifyDevDashboardBrowserSession,
  type ShopifyStoreCreationBrowserTaskPayload,
  type ShopifyStoreCreationBrowserTaskReceipt
} from "./shopifyStoreCreationBrowserTask.js";

const queuedJobs = new Set<string>();
let runningJobs = 0;
let workerTimer: NodeJS.Timeout | undefined;

const shopifyStoreCreationBrowserAutoRecoveryLogMessage = "Shopify Dev Dashboard session recovery requeued this store-creation browser task.";
const shopifyStoreCreationBrowserAutoCaptureRecoveryLogMessage = "Shopify capture-ready browser evidence was recovered by the automation worker.";
const recoverableShopifyStoreCreationBrowserTaskStatuses = new Set([
  "blocked_operator_gate",
  "browser_unavailable",
  "no_domain_detected"
]);

export function shopifyStoreCreationBrowserTaskReceiptStatusFromResultJson(resultJson: string | null) {
  if (!resultJson) return null;

  try {
    const parsed = JSON.parse(resultJson) as { receipt?: { status?: unknown } };
    return typeof parsed.receipt?.status === "string" ? parsed.receipt.status : null;
  } catch {
    return null;
  }
}

function parseShopifyStoreCreationBrowserTaskResult(resultJson: string | null) {
  if (!resultJson) return null;

  try {
    const parsed = JSON.parse(resultJson) as { auditLogId?: unknown; receipt?: unknown };

    if (!parsed.receipt || typeof parsed.receipt !== "object") return null;

    return parsed as {
      auditLogId?: string;
      receipt: ShopifyStoreCreationBrowserTaskReceipt;
    };
  } catch {
    return null;
  }
}

export function parseShopifyStoreCreationBrowserTaskPayloadJson(payloadJson: string | null) {
  try {
    const parsed = parseSecureJson<ShopifyStoreCreationBrowserTaskPayload>(payloadJson);
    const payload = shopifyStoreCreationBrowserTaskPayloadSchema.safeParse(parsed);

    if (!payload.success) {
      return {
        ok: false as const,
        reason: "payload_schema_invalid"
      };
    }

    return {
      ok: true as const,
      payload: payload.data
    };
  } catch {
    return {
      ok: false as const,
      reason: "payload_json_unreadable"
    };
  }
}

export function shopifyStoreCreationBrowserTaskAutoCaptureStateFromResultJson(resultJson: string | null) {
  const parsed = parseShopifyStoreCreationBrowserTaskResult(resultJson);
  const receipt = parsed?.receipt;

  if (!receipt) return null;

  return {
    autoCaptureDone: Boolean(receipt.autoCapture),
    autoCaptureError: typeof receipt.autoCaptureError === "string" ? receipt.autoCaptureError : null,
    detectedDomain: typeof receipt.detectedDomain === "string" ? receipt.detectedDomain : null,
    status: typeof receipt.status === "string" ? receipt.status : null
  };
}

export function shouldAutoRequeueShopifyStoreCreationBrowserTask(input: {
  recoveryLogCount: number;
  resultJson: string | null;
  sessionStorageStateStatus: string;
  status: string;
  type: string;
}) {
  return input.sessionStorageStateStatus === "ready"
    && input.type === shopifyStoreCreationBrowserTaskJobType
    && input.status === "completed"
    && input.recoveryLogCount === 0
    && recoverableShopifyStoreCreationBrowserTaskStatuses.has(shopifyStoreCreationBrowserTaskReceiptStatusFromResultJson(input.resultJson) ?? "");
}

export function shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture(input: {
  captureRecoveryLogCount: number;
  oauthAppConfigured: boolean;
  resultJson: string | null;
  status: string;
  type: string;
}) {
  const state = shopifyStoreCreationBrowserTaskAutoCaptureStateFromResultJson(input.resultJson);

  return input.oauthAppConfigured
    && input.type === shopifyStoreCreationBrowserTaskJobType
    && input.status === "completed"
    && input.captureRecoveryLogCount === 0
    && state?.status === "capture_ready"
    && Boolean(state.detectedDomain)
    && !state.autoCaptureDone;
}

export function automationPendingSlotsAfterRecoveredBrowserJobs(availableSlots: number, recoveredBrowserJobCount: number) {
  return Math.max(availableSlots - recoveredBrowserJobCount, 0);
}

async function addJobLog(jobId: string, message: string, level: "info" | "warn" | "error" = "info") {
  await prisma.automationLog.create({
    data: {
      jobId,
      level,
      message
    }
  });
}

async function runAutomationJob(jobId: string, logger?: FastifyBaseLogger) {
  queuedJobs.delete(jobId);

  if (runningJobs >= env.AUTOMATION_MAX_CONCURRENCY) {
    enqueueAutomationJob(jobId, 1000, logger);
    return;
  }

  const job = await prisma.automationJob.findUnique({ where: { id: jobId } });

  if (!job || job.status === "canceled" || job.status === "completed" || job.status === "failed") {
    return;
  }

  if (job.scheduledAt && job.scheduledAt.getTime() > Date.now()) {
    enqueueAutomationJob(jobId, job.scheduledAt.getTime() - Date.now(), logger);
    return;
  }

  runningJobs += 1;

  try {
    const claim = await prisma.automationJob.updateMany({
      where: {
        id: jobId,
        status: { in: ["pending", "scheduled"] },
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: new Date() } }
        ]
      },
      data: {
        status: "running",
        startedAt: new Date(),
        error: null
      }
    });

    if (claim.count !== 1) {
      return;
    }

    const runningJob = await prisma.automationJob.findUnique({ where: { id: jobId } });

    if (!runningJob) {
      return;
    }

    await addJobLog(jobId, "Job started");
    const result = await executeAutomationJob(runningJob, (message, level = "info") => addJobLog(jobId, message, level));

    const complete = await prisma.automationJob.updateMany({
      where: {
        id: jobId,
        status: "running"
      },
      data: {
        status: "completed",
        resultJson: JSON.stringify(result),
        completedAt: new Date()
      }
    });

    if (complete.count !== 1) {
      await addJobLog(jobId, "Job stopped before completion", "warn");
      return;
    }

    await addJobLog(jobId, "Job completed");
    logger?.info({ automationJobId: jobId }, "Automation job completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation job failed.";
    const fail = await prisma.automationJob.updateMany({
      where: {
        id: jobId,
        status: { not: "canceled" }
      },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date()
      }
    });

    if (fail.count === 1) {
      await addJobLog(jobId, message, "error");
    }

    logger?.error({ automationJobId: jobId, err: error }, "Automation job failed");
  } finally {
    runningJobs -= 1;
  }
}

async function requeueRecoverableShopifyStoreCreationBrowserTasks(limit: number, logger?: FastifyBaseLogger) {
  if (limit <= 0 || shopifyDevDashboardBrowserSession().storageStateStatus !== "ready") {
    return [];
  }

  const jobs = await prisma.automationJob.findMany({
    where: {
      status: "completed",
      type: shopifyStoreCreationBrowserTaskJobType
    },
    orderBy: [
      { completedAt: "asc" },
      { createdAt: "asc" }
    ],
    take: Math.max(limit * 4, limit),
    include: {
      logs: {
        where: { message: shopifyStoreCreationBrowserAutoRecoveryLogMessage },
        select: { id: true }
      }
    }
  });
  const requeuedJobIds: string[] = [];

  for (const job of jobs) {
    if (requeuedJobIds.length >= limit) break;

    if (!shouldAutoRequeueShopifyStoreCreationBrowserTask({
      recoveryLogCount: job.logs.length,
      resultJson: job.resultJson,
      sessionStorageStateStatus: "ready",
      status: job.status,
      type: job.type
    })) {
      continue;
    }

    const updated = await prisma.automationJob.updateMany({
      where: {
        id: job.id,
        status: "completed",
        type: shopifyStoreCreationBrowserTaskJobType
      },
      data: {
        completedAt: null,
        error: null,
        resultJson: null,
        scheduledAt: null,
        startedAt: null,
        status: "pending"
      }
    });

    if (updated.count !== 1) continue;

    await addJobLog(job.id, shopifyStoreCreationBrowserAutoRecoveryLogMessage);
    requeuedJobIds.push(job.id);
    enqueueAutomationJob(job.id, 0, logger);
  }

  return requeuedJobIds;
}

function shopifyOAuthAppConfigured() {
  return Boolean(env.SHOPIFY_APP_API_KEY && env.SHOPIFY_APP_API_SECRET);
}

async function updateShopifyBrowserTaskAutoCaptureResult(input: {
  jobId: string;
  result: { auditLogId?: string; receipt: ShopifyStoreCreationBrowserTaskReceipt };
  receipt: ShopifyStoreCreationBrowserTaskReceipt;
}) {
  await prisma.automationJob.update({
    where: { id: input.jobId },
    data: {
      resultJson: JSON.stringify({
        ...input.result,
        receipt: input.receipt
      })
    }
  });
}

async function markShopifyBrowserTaskAutoCaptureRecoverySkipped(jobId: string, message: string) {
  await addJobLog(jobId, message, "warn");
  await addJobLog(jobId, shopifyStoreCreationBrowserAutoCaptureRecoveryLogMessage, "warn");
}

async function recoverCaptureReadyShopifyStoreCreationBrowserTasks(limit: number, logger?: FastifyBaseLogger) {
  if (limit <= 0 || !shopifyOAuthAppConfigured()) {
    return [];
  }

  const jobs = await prisma.automationJob.findMany({
    where: {
      status: "completed",
      type: shopifyStoreCreationBrowserTaskJobType
    },
    orderBy: [
      { completedAt: "asc" },
      { createdAt: "asc" }
    ],
    take: Math.max(limit * 4, limit),
    include: {
      logs: {
        where: { message: shopifyStoreCreationBrowserAutoCaptureRecoveryLogMessage },
        select: { id: true }
      }
    }
  });
  const recoveredJobIds: string[] = [];

  for (const job of jobs) {
    if (recoveredJobIds.length >= limit) break;

    if (!shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture({
      captureRecoveryLogCount: job.logs.length,
      oauthAppConfigured: true,
      resultJson: job.resultJson,
      status: job.status,
      type: job.type
    })) {
      continue;
    }

    const payload = parseShopifyStoreCreationBrowserTaskPayloadJson(job.payloadJson);
    const result = parseShopifyStoreCreationBrowserTaskResult(job.resultJson);

    if (!payload.ok || !result) {
      const message = "Shopify capture-ready browser evidence recovery skipped because the job payload or result was unreadable.";

      if (result) {
        await updateShopifyBrowserTaskAutoCaptureResult({
          jobId: job.id,
          receipt: {
            ...result.receipt,
            autoCaptureError: message
          },
          result
        });
      }
      await markShopifyBrowserTaskAutoCaptureRecoverySkipped(
        job.id,
        message
      );
      continue;
    }

    const store = await prisma.clientMerchStore.findFirst({
      where: {
        id: payload.payload.storeId,
        userId: job.userId
      }
    });

    if (!store) {
      const receipt = {
        ...result.receipt,
        autoCaptureError: "Shopify store creation browser task store was not found during capture recovery."
      };

      await updateShopifyBrowserTaskAutoCaptureResult({ jobId: job.id, receipt, result });
      await addJobLog(job.id, shopifyStoreCreationBrowserAutoCaptureRecoveryLogMessage, "warn");
      continue;
    }

    try {
      const captureInput = buildShopifyStoreCreationCaptureInputFromBrowserReceipt({
        payload: payload.payload,
        receipt: result.receipt
      });
      const captureResult = await captureShopifyStoreCreationForStore({
        store,
        userId: job.userId,
        value: captureInput
      });
      const receipt = {
        ...result.receipt,
        autoCapture: {
          auditLogId: captureResult.auditLogId,
          autonomyResumeJobId: captureResult.capture.autonomyResumeJob?.id ?? null,
          oauthStarted: Boolean(captureResult.capture.oauth),
          status: captureResult.capture.status,
          summary: captureResult.capture.summary
        },
        autoCaptureError: null
      };

      await updateShopifyBrowserTaskAutoCaptureResult({ jobId: job.id, receipt, result });
      await addJobLog(job.id, shopifyStoreCreationBrowserAutoCaptureRecoveryLogMessage);
      recoveredJobIds.push(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shopify store creation auto-capture recovery failed.";
      const receipt = {
        ...result.receipt,
        autoCaptureError: message
      };

      await updateShopifyBrowserTaskAutoCaptureResult({ jobId: job.id, receipt, result });
      await addJobLog(job.id, shopifyStoreCreationBrowserAutoCaptureRecoveryLogMessage, "warn");
      logger?.warn({ automationJobId: job.id, err: error }, "Shopify capture-ready browser evidence recovery failed");
    }
  }

  return recoveredJobIds;
}

export function enqueueAutomationJob(jobId: string, delayMs = 0, logger?: FastifyBaseLogger) {
  if (!env.AUTOMATION_FEATURE_ENABLED || queuedJobs.has(jobId)) {
    return;
  }

  queuedJobs.add(jobId);
  setTimeout(() => {
    void runAutomationJob(jobId, logger).catch((error) => {
      logger?.error({ automationJobId: jobId, err: error }, "Automation job runner crashed");
    });
  }, Math.max(delayMs, 0));
}

export async function enqueueDueAutomationJobs(logger?: FastifyBaseLogger) {
  if (!env.AUTOMATION_FEATURE_ENABLED || runningJobs >= env.AUTOMATION_MAX_CONCURRENCY) {
    return;
  }

  const availableSlots = env.AUTOMATION_MAX_CONCURRENCY - runningJobs;
  const recoveredShopifyBrowserJobIds = await requeueRecoverableShopifyStoreCreationBrowserTasks(availableSlots, logger);
  if (recoveredShopifyBrowserJobIds.length > 0) {
    logger?.info({ automationJobIds: recoveredShopifyBrowserJobIds }, "Recovered Shopify store creation browser tasks after dashboard session became ready");
  }
  const recoveredShopifyCaptureJobIds = await recoverCaptureReadyShopifyStoreCreationBrowserTasks(env.AUTOMATION_MAX_CONCURRENCY, logger);
  if (recoveredShopifyCaptureJobIds.length > 0) {
    logger?.info({ automationJobIds: recoveredShopifyCaptureJobIds }, "Recovered Shopify capture-ready browser evidence after OAuth app credentials became ready");
  }
  const pendingSlots = automationPendingSlotsAfterRecoveredBrowserJobs(availableSlots, recoveredShopifyBrowserJobIds.length);
  if (pendingSlots <= 0) {
    return;
  }

  const jobs = await prisma.automationJob.findMany({
    where: {
      status: { in: ["pending", "scheduled"] },
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date() } }
      ]
    },
    orderBy: [
      { scheduledAt: "asc" },
      { createdAt: "asc" }
    ],
    take: pendingSlots
  });

  jobs.forEach((job) => enqueueAutomationJob(job.id, 0, logger));
}

export function startAutomationWorker(logger?: FastifyBaseLogger) {
  if (!env.AUTOMATION_WORKER_ENABLED || workerTimer) {
    return () => undefined;
  }

  void enqueueDueAutomationJobs(logger).catch((error) => {
    logger?.error({ err: error }, "Automation worker polling failed");
  });
  workerTimer = setInterval(() => {
    void enqueueDueAutomationJobs(logger).catch((error) => {
      logger?.error({ err: error }, "Automation worker polling failed");
    });
  }, 5000);

  return () => {
    if (workerTimer) {
      clearInterval(workerTimer);
      workerTimer = undefined;
    }
  };
}

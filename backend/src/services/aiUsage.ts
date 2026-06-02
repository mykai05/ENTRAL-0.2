import type { Prisma } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../db.js";
import { stringifySecureJson } from "./secureJson.js";
import { getPrimaryAiProviderState } from "./aiProvider.js";

export type AiUsageRequestKind = "chat" | "development_status" | "development_write_refusal" | "screen";

export type AiUsageSummary = {
  daily: {
    limitCents: number;
    remainingCents: number;
    usedCents: number;
  };
  monthly: {
    limitCents: number;
    remainingCents: number;
    usedCents: number;
  };
  mode: "mock" | "real";
  provider: {
    modelName: string;
    providerName: string;
    status: string;
  };
};

type AiUsagePreflight = {
  estimatedCostCents: number;
  provider: AiUsageSummary["provider"];
  summary: AiUsageSummary;
};

type RecordAiUsageInput = {
  estimatedCostCents: number;
  metadata?: Record<string, unknown>;
  modelName: string;
  providerName: string;
  requestId?: string;
  requestKind: AiUsageRequestKind;
  usedLocalFallback: boolean;
  userId: string;
};

export class AiUsageLimitError extends Error {
  statusCode = 429;
  summary: AiUsageSummary;

  constructor(summary: AiUsageSummary) {
    super("AI usage limit reached. Real provider calls are paused until the budget window resets.");
    this.name = "AiUsageLimitError";
    this.summary = summary;
  }
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function centsFromSum(result: { _sum: { estimatedCostCents: number | null } }) {
  return result._sum.estimatedCostCents ?? 0;
}

function providerState() {
  const state = getPrimaryAiProviderState();

  return {
    modelName: state.modelName,
    providerName: state.providerName,
    status: state.connectionStatus
  };
}

export function estimateAiCostCents(requestKind: AiUsageRequestKind, providerConnected = getPrimaryAiProviderState().connectionStatus === "Connected") {
  if (!providerConnected) {
    return env.AI_LOCAL_FALLBACK_ESTIMATED_COST_CENTS;
  }

  if (requestKind === "screen") {
    return env.AI_DECISION_ESTIMATED_COST_CENTS + env.AI_SCREEN_ESTIMATED_COST_CENTS;
  }

  if (requestKind === "chat") {
    return env.AI_DECISION_ESTIMATED_COST_CENTS + env.AI_CHAT_ESTIMATED_COST_CENTS;
  }

  return env.AI_DECISION_ESTIMATED_COST_CENTS;
}

export async function getAiUsageSummary(userId: string, now = new Date()): Promise<AiUsageSummary> {
  const [dailyUsage, monthlyUsage] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      _sum: { estimatedCostCents: true },
      where: {
        createdAt: { gte: startOfUtcDay(now) },
        userId
      }
    }),
    prisma.aiUsageEvent.aggregate({
      _sum: { estimatedCostCents: true },
      where: {
        createdAt: { gte: startOfUtcMonth(now) },
        userId
      }
    })
  ]);
  const dailyUsedCents = centsFromSum(dailyUsage);
  const monthlyUsedCents = centsFromSum(monthlyUsage);
  const provider = providerState();

  return {
    daily: {
      limitCents: env.AI_DAILY_COST_LIMIT_CENTS,
      remainingCents: Math.max(0, env.AI_DAILY_COST_LIMIT_CENTS - dailyUsedCents),
      usedCents: dailyUsedCents
    },
    monthly: {
      limitCents: env.AI_MONTHLY_COST_LIMIT_CENTS,
      remainingCents: Math.max(0, env.AI_MONTHLY_COST_LIMIT_CENTS - monthlyUsedCents),
      usedCents: monthlyUsedCents
    },
    mode: provider.status === "Connected" ? "real" : "mock",
    provider
  };
}

export async function assertAiUsageAllowed(userId: string, requestKind: AiUsageRequestKind): Promise<AiUsagePreflight> {
  const provider = providerState();
  const estimatedCostCents = estimateAiCostCents(requestKind, provider.status === "Connected");
  const summary = await getAiUsageSummary(userId);

  if (
    estimatedCostCents > 0
    && (
      summary.daily.usedCents + estimatedCostCents > summary.daily.limitCents
      || summary.monthly.usedCents + estimatedCostCents > summary.monthly.limitCents
    )
  ) {
    throw new AiUsageLimitError(summary);
  }

  return { estimatedCostCents, provider, summary };
}

export async function recordAiUsageEvent(input: RecordAiUsageInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  return tx.aiUsageEvent.create({
    data: {
      estimatedCostCents: input.estimatedCostCents,
      metadataJson: input.metadata ? stringifySecureJson(input.metadata) : undefined,
      modelName: input.modelName,
      providerName: input.providerName,
      requestId: input.requestId,
      requestKind: input.requestKind,
      usedLocalFallback: input.usedLocalFallback,
      userId: input.userId
    }
  });
}

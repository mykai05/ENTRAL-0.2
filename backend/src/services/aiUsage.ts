import type { Prisma } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../db.js";
import { stringifySecureJson } from "./secureJson.js";
import { getPrimaryAiProviderState } from "./aiProvider.js";

export type AiUsageRequestKind = "chat" | "development_status" | "development_write_refusal" | "screen";
export type AiUsageReservationStatus = "reserved" | "settled" | "failed";

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

export type AiUsageReservation = AiUsagePreflight & {
  id: string;
  requestId: string;
  requestKind: AiUsageRequestKind;
  status: AiUsageReservationStatus;
  userId: string;
};

type ReserveAiUsageInput = {
  metadata?: Record<string, unknown>;
  requestId: string;
  requestKind: AiUsageRequestKind;
  userId: string;
};

type SettleAiUsageInput = {
  metadata?: Record<string, unknown>;
  modelName: string;
  providerName: string;
  providerRequestId?: string;
  reservationId: string;
  requestId: string;
  usedLocalFallback: boolean;
  userId: string;
};

type FailAiUsageInput = {
  error: unknown;
  providerCallSucceeded?: boolean;
  providerRequestId?: string;
  reservationId: string;
  requestId: string;
  userId: string;
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

export class AiUsageIdempotencyError extends Error {
  statusCode = 409;

  constructor(message = "This AI idempotency key has already been used. The provider call was not repeated.") {
    super(message);
    this.name = "AiUsageIdempotencyError";
  }
}

export class AiUsageReservationStateError extends Error {
  constructor(message = "AI usage reservation is not in a settleable state.") {
    super(message);
    this.name = "AiUsageReservationStateError";
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

function usageSummary(dailyUsedCents: number, monthlyUsedCents: number, provider = providerState()): AiUsageSummary {
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

async function usageSums(userId: string, now: Date, tx: Prisma.TransactionClient | typeof prisma) {
  // Deliberately count reserved, settled, and failed rows within the rolling
  // day/month windows. A provider can consume billable tokens before a network
  // or persistence failure becomes observable, so refunding ambiguous failures
  // would reopen the concurrent overspend path this ledger closes. Expired
  // windows naturally release the reservation; request IDs remain tombstones
  // so a provider call is never repeated blindly.
  const [dailyUsage, monthlyUsage] = await Promise.all([
    tx.aiUsageEvent.aggregate({
      _sum: { estimatedCostCents: true },
      where: {
        createdAt: { gte: startOfUtcDay(now) },
        userId
      }
    }),
    tx.aiUsageEvent.aggregate({
      _sum: { estimatedCostCents: true },
      where: {
        createdAt: { gte: startOfUtcMonth(now) },
        userId
      }
    })
  ]);

  return {
    dailyUsedCents: centsFromSum(dailyUsage),
    monthlyUsedCents: centsFromSum(monthlyUsage)
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

export function resolveAiUsageRequestId(fallbackRequestId: string, headerValue: string | string[] | undefined) {
  const candidate = (Array.isArray(headerValue) ? headerValue[0] : headerValue)?.trim();
  if (!candidate) {
    return fallbackRequestId;
  }

  if (candidate.length < 8 || candidate.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(candidate)) {
    throw new AiUsageIdempotencyError("AI idempotency keys must be 8-200 characters using letters, numbers, dot, underscore, colon, or dash.");
  }

  return candidate;
}

export async function getAiUsageSummary(userId: string, now = new Date()): Promise<AiUsageSummary> {
  const { dailyUsedCents, monthlyUsedCents } = await usageSums(userId, now, prisma);
  return usageSummary(dailyUsedCents, monthlyUsedCents);
}

// Kept for callers that only need a read-only estimate. Provider-bound request
// paths must use reserveAiUsage before any provider call.
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

export async function reserveAiUsage(input: ReserveAiUsageInput): Promise<AiUsageReservation> {
  const requestId = input.requestId.trim();
  if (!requestId) {
    throw new AiUsageIdempotencyError("AI requests require a non-empty idempotency key.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`;

    const existing = await tx.aiUsageEvent.findUnique({
      where: {
        userId_requestId: {
          requestId,
          userId: input.userId
        }
      }
    });

    if (existing) {
      throw new AiUsageIdempotencyError();
    }

    const provider = providerState();
    const estimatedCostCents = estimateAiCostCents(input.requestKind, provider.status === "Connected");
    const now = new Date();
    const { dailyUsedCents, monthlyUsedCents } = await usageSums(input.userId, now, tx);
    const summary = usageSummary(dailyUsedCents, monthlyUsedCents, provider);

    if (
      estimatedCostCents > 0
      && (
        dailyUsedCents + estimatedCostCents > summary.daily.limitCents
        || monthlyUsedCents + estimatedCostCents > summary.monthly.limitCents
      )
    ) {
      throw new AiUsageLimitError(summary);
    }

    const reservation = await tx.aiUsageEvent.create({
      data: {
        estimatedCostCents,
        metadataJson: input.metadata ? stringifySecureJson(input.metadata) : undefined,
        modelName: provider.modelName,
        providerName: provider.providerName,
        requestId,
        requestKind: input.requestKind,
        status: "reserved",
        usedLocalFallback: provider.status !== "Connected",
        userId: input.userId
      }
    });

    return {
      estimatedCostCents,
      id: reservation.id,
      provider,
      requestId,
      requestKind: input.requestKind,
      status: "reserved",
      summary,
      userId: input.userId
    };
  });
}

export async function settleAiUsageReservation(input: SettleAiUsageInput) {
  const now = new Date();
  const update = await prisma.aiUsageEvent.updateMany({
    data: {
      failedAt: null,
      metadataJson: input.metadata ? stringifySecureJson(input.metadata) : undefined,
      modelName: input.modelName,
      providerName: input.providerName,
      providerRequestId: input.providerRequestId,
      settledAt: now,
      status: "settled",
      usedLocalFallback: input.usedLocalFallback
    },
    where: {
      id: input.reservationId,
      requestId: input.requestId,
      status: "reserved",
      userId: input.userId
    }
  });

  const event = await prisma.aiUsageEvent.findUnique({ where: { id: input.reservationId } });
  if (update.count === 1 || (event?.status === "settled" && event.requestId === input.requestId && event.userId === input.userId)) {
    return event;
  }

  throw new AiUsageReservationStateError();
}

export async function failAiUsageReservation(input: FailAiUsageInput) {
  const errorName = input.error instanceof Error ? input.error.name : "UnknownError";
  await prisma.aiUsageEvent.updateMany({
    data: {
      failedAt: new Date(),
      metadataJson: stringifySecureJson({
        errorName,
        providerCallSucceeded: input.providerCallSucceeded ?? false
      }),
      providerRequestId: input.providerRequestId,
      status: "failed"
    },
    where: {
      id: input.reservationId,
      requestId: input.requestId,
      status: "reserved",
      userId: input.userId
    }
  });
}

// Compatibility helper for non-provider events. New provider call paths must
// reserve first and settle the same row instead of creating after the call.
export async function recordAiUsageEvent(input: RecordAiUsageInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  return tx.aiUsageEvent.create({
    data: {
      estimatedCostCents: input.estimatedCostCents,
      metadataJson: input.metadata ? stringifySecureJson(input.metadata) : undefined,
      modelName: input.modelName,
      providerName: input.providerName,
      requestId: input.requestId,
      requestKind: input.requestKind,
      settledAt: new Date(),
      status: "settled",
      usedLocalFallback: input.usedLocalFallback,
      userId: input.userId
    }
  });
}

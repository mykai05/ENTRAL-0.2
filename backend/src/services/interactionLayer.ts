import {
  INTERACTION_CONTRACT_VERSION,
  INTERACTION_RELEASE_VERSION,
  TUTORIAL_ANCHOR_IDS,
  assertBusinessHealthResponse,
  assertTutorialProgress,
  assertTutorialProgressMutationResponse,
  type BusinessHealthResponse,
  type InteractionMode,
  type PortfolioSummaryResponse,
  type TutorialProgress,
  type TutorialProgressMutationResponse,
  type TutorialProgressUpdateRequest
} from "@entral/contracts";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

const tutorialAnchorCount = TUTORIAL_ANCHOR_IDS.length;

export class TutorialProgressConflictError extends Error {
  readonly code = "TUTORIAL_PROGRESS_CONFLICT";

  constructor() {
    super("Tutorial progress changed in another session. Reload the current progress before saving again.");
    this.name = "TutorialProgressConflictError";
  }
}

function freshnessState(observedAt: string, now = new Date()) {
  const ageMs = now.getTime() - Date.parse(observedAt);
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1_000
    ? "CURRENT" as const
    : Number.isFinite(ageMs)
      ? "STALE" as const
      : "UNKNOWN" as const;
}

export function buildBusinessHealthResponse(input: {
  readonly businessId: string | null;
  readonly mode: InteractionMode;
  readonly organizationId: string;
  readonly portfolio: PortfolioSummaryResponse;
  readonly now?: Date;
}): BusinessHealthResponse {
  const business = input.businessId
    ? input.portfolio.businesses.find((candidate) => candidate.business_id === input.businessId) ?? null
    : null;
  const freshness = freshnessState(input.portfolio.generated_at, input.now);
  const businessRequestedButUnavailable = Boolean(input.businessId && !business);
  if (businessRequestedButUnavailable) {
    throw new TutorialProgressConflictError();
  }

  const health = business
    ? {
        drivers: business.health_drivers,
        score: business.health_score,
        state: business.health_state,
        summary: freshness !== "CURRENT"
          ? `The last recorded health for ${business.business_name} was ${business.health_state.toLocaleLowerCase()}${business.health_score === null ? " with no recorded score" : ` at score ${business.health_score}`}. Current health is not asserted because the evidence is ${freshness.toLocaleLowerCase()}.`
          : input.mode === "EXECUTIVE"
            ? business.health_score === null
              ? `${business.business_name} is ${business.health_state.toLocaleLowerCase()}, but no canonical health score is recorded.`
              : `${business.business_name} is ${business.health_state.toLocaleLowerCase()} at recorded health score ${business.health_score}.`
            : `${business.business_name} is ${business.health_state.toLocaleLowerCase()}${business.health_score === null ? " with no recorded score" : ` at recorded health score ${business.health_score}`}; ${business.health_drivers.length} canonical health ${business.health_drivers.length === 1 ? "driver is" : "drivers are"} attached.`,
        value_status: business.health_score === null ? "UNAVAILABLE" as const : "RECORDED" as const
      }
    : {
        drivers: [],
        score: null,
        state: "UNKNOWN" as const,
        summary: "No single canonical portfolio health score is recorded. Select a business to review its recorded health state, score, and drivers.",
        value_status: "UNAVAILABLE" as const
      };
  const response: BusinessHealthResponse = {
    contract_version: INTERACTION_CONTRACT_VERSION,
    schema_version: 1,
    identity: {
      name: "ENTRAL",
      provider_independent: true,
      release_version: INTERACTION_RELEASE_VERSION,
      voice_version: "entral-voice-v1"
    },
    mode: input.mode,
    health,
    evidence: [{
      evidence_id: `canonical-portfolio:${input.portfolio.event_sequence}`,
      freshness,
      label: `Canonical portfolio event ${input.portfolio.event_sequence}`,
      observed_at: input.portfolio.generated_at,
      source_id: String(input.portfolio.event_sequence),
      source_type: "CANONICAL_PORTFOLIO"
    }],
    truth: {
      assumptions: business
        ? freshness === "CURRENT" ? [] : ["Current health is not inferred from stale or unknown evidence."]
        : ["Portfolio health is not inferred from the count of business health states."],
      business_id: business?.business_id ?? null,
      business_scope: business?.business_name ?? input.portfolio.scope.label,
      confidence: business?.health_score === null || !business || freshness !== "CURRENT" ? "UNAVAILABLE" : "RECORDED",
      evidence_freshness: {
        observed_at: input.portfolio.generated_at,
        state: freshness
      },
      next_action: business
        ? {
            action_id: "OPEN_CANONICAL_BUSINESS_RECORD",
            available: true,
            label: "Review the canonical business record",
            unavailable_reason: null
          }
        : {
            action_id: "SELECT_CANONICAL_BUSINESS",
            available: input.portfolio.businesses.length > 0,
            label: input.portfolio.businesses.length > 0 ? "Select a visible business" : "No visible business is available",
            unavailable_reason: input.portfolio.businesses.length > 0 ? null : "The current RLS scope contains no businesses."
          },
      organization_id: input.organizationId
    }
  };
  assertBusinessHealthResponse(response);
  return response;
}

type StoredTutorialProgress = {
  businessModelContext: string | null;
  commanderPackContext: string | null;
  completedAnchorIds: string[];
  completedAt: Date | null;
  currentAnchorId: string | null;
  firstLaunchSeen: boolean;
  mode: string;
  organizationId: string;
  planContext: string | null;
  releaseVersion: string;
  revision: number;
  roleContext: string;
  startedAt: Date;
  updatedAt: Date;
  userId: string;
};

function publicTutorialProgress(row: StoredTutorialProgress): TutorialProgress {
  const result = {
    business_model_context: row.businessModelContext,
    commander_pack_context: row.commanderPackContext,
    completed_anchor_ids: row.completedAnchorIds,
    completed_at: row.completedAt?.toISOString() ?? null,
    contract_version: INTERACTION_CONTRACT_VERSION,
    current_anchor_id: row.currentAnchorId,
    first_launch_seen: row.firstLaunchSeen,
    mode: row.mode,
    organization_id: row.organizationId,
    plan_context: row.planContext,
    release_version: row.releaseVersion,
    revision: row.revision,
    role_context: row.roleContext,
    schema_version: 1,
    started_at: row.startedAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    user_id: row.userId
  };
  assertTutorialProgress(result);
  return result;
}

function tutorialKey(userId: string, organizationId: string) {
  return {
    userId_organizationId_releaseVersion: {
      organizationId,
      releaseVersion: INTERACTION_RELEASE_VERSION,
      userId
    }
  } as const;
}

function tutorialReceiptKey(userId: string, organizationId: string, idempotencyKey: string) {
  return {
    userId_organizationId_releaseVersion_idempotencyKey: {
      idempotencyKey,
      organizationId,
      releaseVersion: INTERACTION_RELEASE_VERSION,
      userId
    }
  } as const;
}

type StoredTutorialReceipt = {
  action: string;
  createdAt: Date;
  id: string;
  idempotencyKey: string;
  organizationId: string;
  priorRevision: number;
  progressSnapshot: Prisma.JsonValue;
  resultingRevision: number;
  userId: string;
};

function publicTutorialMutation(
  receipt: StoredTutorialReceipt,
  idempotentReplay: boolean
): TutorialProgressMutationResponse {
  if (receipt.action !== "UPDATE" && receipt.action !== "RESET") {
    throw new Error("Stored Tutorial mutation action is invalid.");
  }
  assertTutorialProgress(receipt.progressSnapshot);
  const progress = receipt.progressSnapshot;
  const response: TutorialProgressMutationResponse = {
    idempotent_replay: idempotentReplay,
    progress,
    transition: {
      action: receipt.action,
      actor_user_id: receipt.userId,
      authorization: progress.role_context === "OWNER" ? "AUTHENTICATED_OWNER" : "AUTHENTICATED_MEMBER",
      budget: { amount_cents: 0, kind: "NO_EXTERNAL_SPEND" },
      business_id: null,
      evidence: [{ source_id: receipt.id, source_type: "TUTORIAL_PROGRESS" }],
      failure_behavior: "CONFLICT_NO_WRITE",
      idempotency_key: receipt.idempotencyKey,
      occurred_at: receipt.createdAt.toISOString(),
      organization_id: receipt.organizationId,
      prior_revision: receipt.priorRevision,
      reconciliation: "OPTIMISTIC_REVISION_AND_READBACK",
      release_version: INTERACTION_RELEASE_VERSION,
      resulting_revision: receipt.resultingRevision,
      reversible: true,
      tenant_id: receipt.organizationId,
      verification: "TRANSACTIONAL_READ_AFTER_WRITE"
    }
  };
  assertTutorialProgressMutationResponse(response);
  return response;
}

export const interactionLayerService = {
  async getTutorialProgress(input: {
    readonly organizationId: string;
    readonly role: "MEMBER" | "OWNER";
    readonly userId: string;
  }) {
    const row = await prisma.memberTutorialProgress.upsert({
      create: {
        businessModelContext: null,
        commanderPackContext: null,
        organizationId: input.organizationId,
        planContext: null,
        releaseVersion: INTERACTION_RELEASE_VERSION,
        roleContext: input.role,
        userId: input.userId
      },
      update: input.role === "OWNER" ? { roleContext: "OWNER" } : { roleContext: "MEMBER" },
      where: tutorialKey(input.userId, input.organizationId)
    });
    return publicTutorialProgress(row);
  },

  async updateTutorialProgress(input: {
    readonly organizationId: string;
    readonly role: "MEMBER" | "OWNER";
    readonly update: TutorialProgressUpdateRequest;
    readonly userId: string;
  }) {
    return prisma.$transaction(async (transaction) => {
      const receiptKey = tutorialReceiptKey(input.userId, input.organizationId, input.update.idempotency_key);
      const replay = await transaction.memberTutorialMutationReceipt.findUnique({ where: receiptKey });
      if (replay) return publicTutorialMutation(replay, true);
      const existingRow = await transaction.memberTutorialProgress.upsert({
        create: {
          businessModelContext: null,
          commanderPackContext: null,
          organizationId: input.organizationId,
          planContext: null,
          releaseVersion: INTERACTION_RELEASE_VERSION,
          roleContext: input.role,
          userId: input.userId
        },
        update: input.role === "OWNER" ? { roleContext: "OWNER" } : { roleContext: "MEMBER" },
        where: tutorialKey(input.userId, input.organizationId)
      });
      if (existingRow.revision !== input.update.expected_revision) throw new TutorialProgressConflictError();
      const completedAt = input.update.completed_anchor_ids.length === tutorialAnchorCount ? new Date() : null;
      const updated = await transaction.memberTutorialProgress.updateMany({
        data: {
          completedAnchorIds: [...input.update.completed_anchor_ids],
          completedAt,
          currentAnchorId: input.update.current_anchor_id,
          firstLaunchSeen: input.update.first_launch_seen,
          mode: input.update.mode,
          revision: { increment: 1 },
          roleContext: input.role
        },
        where: {
          ...tutorialKey(input.userId, input.organizationId).userId_organizationId_releaseVersion,
          revision: input.update.expected_revision
        }
      });
      if (updated.count !== 1) throw new TutorialProgressConflictError();
      const row = await transaction.memberTutorialProgress.findUniqueOrThrow({
        where: tutorialKey(input.userId, input.organizationId)
      });
      const progress = publicTutorialProgress(row);
      const occurredAt = new Date();
      const receipt = await transaction.memberTutorialMutationReceipt.create({
        data: {
          action: "UPDATE",
          createdAt: occurredAt,
          idempotencyKey: input.update.idempotency_key,
          organizationId: input.organizationId,
          priorRevision: input.update.expected_revision,
          progressSnapshot: progress as unknown as Prisma.InputJsonValue,
          releaseVersion: INTERACTION_RELEASE_VERSION,
          resultingRevision: progress.revision,
          userId: input.userId
        }
      });
      return publicTutorialMutation(receipt, false);
    });
  },

  async resetTutorialProgress(input: {
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
    readonly organizationId: string;
    readonly role: "MEMBER" | "OWNER";
    readonly userId: string;
  }) {
    return prisma.$transaction(async (transaction) => {
      const receiptKey = tutorialReceiptKey(input.userId, input.organizationId, input.idempotencyKey);
      const replay = await transaction.memberTutorialMutationReceipt.findUnique({ where: receiptKey });
      if (replay) return publicTutorialMutation(replay, true);
      const existingRow = await transaction.memberTutorialProgress.upsert({
        create: {
          businessModelContext: null,
          commanderPackContext: null,
          organizationId: input.organizationId,
          planContext: null,
          releaseVersion: INTERACTION_RELEASE_VERSION,
          roleContext: input.role,
          userId: input.userId
        },
        update: input.role === "OWNER" ? { roleContext: "OWNER" } : { roleContext: "MEMBER" },
        where: tutorialKey(input.userId, input.organizationId)
      });
      if (existingRow.revision !== input.expectedRevision) throw new TutorialProgressConflictError();
      const reset = await transaction.memberTutorialProgress.updateMany({
        data: {
          completedAnchorIds: [],
          completedAt: null,
          currentAnchorId: null,
          firstLaunchSeen: false,
          mode: "beginner",
          revision: { increment: 1 },
          roleContext: input.role,
          startedAt: new Date()
        },
        where: {
          ...tutorialKey(input.userId, input.organizationId).userId_organizationId_releaseVersion,
          revision: input.expectedRevision
        }
      });
      if (reset.count !== 1) throw new TutorialProgressConflictError();
      const row = await transaction.memberTutorialProgress.findUniqueOrThrow({
        where: tutorialKey(input.userId, input.organizationId)
      });
      const progress = publicTutorialProgress(row);
      const receipt = await transaction.memberTutorialMutationReceipt.create({
        data: {
          action: "RESET",
          idempotencyKey: input.idempotencyKey,
          organizationId: input.organizationId,
          priorRevision: input.expectedRevision,
          progressSnapshot: progress as unknown as Prisma.InputJsonValue,
          releaseVersion: INTERACTION_RELEASE_VERSION,
          resultingRevision: progress.revision,
          userId: input.userId
        }
      });
      return publicTutorialMutation(receipt, false);
    });
  }
};

import type {
  EntitySummary,
  GovernanceActionRequest,
  GovernanceActionType,
  RiskClass
} from "@entral/contracts";
import type {
  CanonicalGraphAssistantCommandInput,
  CanonicalGraphDimension,
  CanonicalGraphLayout
} from "../components/CanonicalGraphWorkspace";

export type InterpretedEntralRequest =
  | {
      readonly kind: "graph";
      readonly command: CanonicalGraphAssistantCommandInput;
      readonly response: string;
    }
  | {
      readonly kind: "governance";
      readonly entity: EntitySummary;
      readonly request: GovernanceActionRequest;
      readonly summary: string;
    };

type InterpretationContext = {
  readonly entities: readonly EntitySummary[];
  readonly humanUserId: string;
  readonly selectedEntityId: string | null;
  readonly scopeLabel: string;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function mentionedEntity(
  message: string,
  entities: readonly EntitySummary[],
  selectedEntityId: string | null
) {
  const target = normalized(message);
  const named = [...entities]
    .filter((entity) => entity.entity_type !== "ENTRAL")
    .sort((left, right) => right.name.length - left.name.length)
    .find((entity) => target.includes(normalized(entity.name)));
  return named
    ?? entities.find((entity) => entity.entity_id === selectedEntityId && entity.entity_type !== "ENTRAL")
    ?? null;
}

function graphCommand(message: string, entities: readonly EntitySummary[]): InterpretedEntralRequest | null {
  const value = normalized(message);
  const motionTargeted = /\b(graph|movement|motion|orbit|animation)\b/.test(value);
  if (motionTargeted && /\b(stop|pause|freeze)\b/.test(value)) {
    return {
      command: { paused: true, type: "motion" },
      kind: "graph",
      response: "Graph movement paused. Agent activity and canonical synchronization continue."
    };
  }
  if (motionTargeted && /\b(resume|start|unfreeze)\b/.test(value)) {
    return {
      command: { paused: false, type: "motion" },
      kind: "graph",
      response: "Graph movement resumed. This changes only the visual field."
    };
  }
  if (/\b(side[- ]by[- ]side|two columns?)\b/.test(value)) {
    return {
      command: { layout: "side-by-side" satisfies CanonicalGraphLayout, type: "layout" },
      kind: "graph",
      response: "The Universe workspace is now side by side."
    };
  }
  if (/\b(stack|stacked|one column)\b/.test(value) && /\b(graph|layout|view)\b/.test(value)) {
    return {
      command: { layout: "stacked" satisfies CanonicalGraphLayout, type: "layout" },
      kind: "graph",
      response: "The Universe workspace is now stacked."
    };
  }
  if (/\b(exit|close|leave)\b/.test(value) && /\bfull\s*screen\b/.test(value)) {
    return {
      command: { dimension: null, type: "fullscreen" },
      kind: "graph",
      response: "Full screen closed."
    };
  }
  const fullscreenDimension: CanonicalGraphDimension | null = /\b2d\b/.test(value)
    ? "2d"
    : /\b3d\b/.test(value) ? "3d" : null;
  if (fullscreenDimension && /\b(full\s*screen|maximi[sz]e|expand)\b/.test(value)) {
    return {
      command: { dimension: fullscreenDimension, type: "fullscreen" },
      kind: "graph",
      response: `${fullscreenDimension.toUpperCase()} Graph opened full screen.`
    };
  }
  if (/\b(collapse|minimi[sz]e|hide)\b/.test(value) && /\b(info|details|inspector|box|card)\b/.test(value)) {
    return {
      command: { collapsed: true, type: "collapse-inspector" },
      kind: "graph",
      response: "The 3D entity card is compact and keeps the selected entity name visible."
    };
  }
  if (/\b(expand|show|open)\b/.test(value) && /\b(info|details|inspector|box|card)\b/.test(value)) {
    return {
      command: { collapsed: false, type: "collapse-inspector" },
      kind: "graph",
      response: "The selected 3D entity details are expanded."
    };
  }
  if (/\b(select|focus|find|show)\b/.test(value)) {
    const target = mentionedEntity(value, entities, null);
    if (target) {
      return {
        command: { entityId: target.entity_id, type: "select" },
        kind: "graph",
        response: `${target.name} is now the shared selection in both graphs and Infrastructure.`
      };
    }
  }
  return null;
}

function proposalDetails(message: string, entity: EntitySummary): {
  actionType: GovernanceActionType;
  proposedChanges: Record<string, string>;
  requestedOutcome: string;
  riskClass: RiskClass;
  rollbackPlan: Record<string, string | null>;
  summary: string;
} | null {
  const value = normalized(message);
  const modelMatch = value.match(/\b(?:model|model class)\s+(?:to\s+)?([a-z0-9][a-z0-9._/-]{1,79})\b/i);
  if (modelMatch?.[1]) {
    return {
      actionType: "MODEL_CHANGE",
      proposedChanges: { model_class: modelMatch[1] },
      requestedOutcome: `Change ${entity.name} model class to ${modelMatch[1]}.`,
      riskClass: "MEDIUM",
      rollbackPlan: { model_class: entity.model_class },
      summary: `Change ${entity.name}'s model class from ${entity.model_class ?? "unassigned"} to ${modelMatch[1]}.`
    };
  }
  const computeMatch = value.match(/\b(?:compute|compute tier)\s+(?:to\s+)?([a-z0-9][a-z0-9._/-]{1,79})\b/i);
  if (computeMatch?.[1]) {
    return {
      actionType: "RECONFIGURE",
      proposedChanges: { compute_tier: computeMatch[1] },
      requestedOutcome: `Change ${entity.name} compute tier to ${computeMatch[1]}.`,
      riskClass: "HIGH",
      rollbackPlan: { compute_tier: entity.compute_tier },
      summary: `Change ${entity.name}'s compute tier from ${entity.compute_tier ?? "unassigned"} to ${computeMatch[1]}.`
    };
  }
  if (/\b(pause|stop|disable)\b/.test(value) && /\b(agent|entity|selected|this)\b/.test(value)) {
    return {
      actionType: "PAUSE",
      proposedChanges: { containment_policy: "FINISH_IN_FLIGHT", status: "PAUSED" },
      requestedOutcome: `Pause ${entity.name}.`,
      riskClass: "MEDIUM",
      rollbackPlan: { action: "RESUME", previous_status: entity.status },
      summary: `Pause ${entity.name}.`
    };
  }
  if (/\b(resume|restart|enable)\b/.test(value) && /\b(agent|entity|selected|this)\b/.test(value)) {
    return {
      actionType: "RESUME",
      proposedChanges: { containment_policy: "FINISH_IN_FLIGHT", status: "ACTIVE" },
      requestedOutcome: `Resume ${entity.name}.`,
      riskClass: "MEDIUM",
      rollbackPlan: { action: "PAUSE", previous_status: entity.status },
      summary: `Resume ${entity.name}.`
    };
  }
  return null;
}

export function interpretEntralRequest(
  message: string,
  context: InterpretationContext,
  createId = () => crypto.randomUUID(),
  now = () => new Date()
): InterpretedEntralRequest | null {
  const local = graphCommand(message, context.entities);
  if (local) return local;

  const entity = mentionedEntity(message, context.entities, context.selectedEntityId);
  if (!entity) return null;
  const proposal = proposalDetails(message, entity);
  if (!proposal) return null;

  const actionId = createId();
  const boundedHumanRequest = message.trim().slice(0, 1_600);
  const businessId = entity.assigned_business_id;
  const scope = businessId
    ? {
        business_id: businessId,
        display_label: context.scopeLabel,
        entity_id: entity.entity_id,
        scope_id: businessId,
        scope_type: "BUSINESS" as const
      }
    : {
        display_label: context.scopeLabel,
        entity_id: entity.entity_id,
        scope_id: context.humanUserId,
        scope_type: "USER" as const
      };
  const request: GovernanceActionRequest = {
    action_id: actionId,
    action_type: proposal.actionType,
    actor_id: context.humanUserId,
    actor_type: "HUMAN",
    authority_basis: {
      channel: "MEMBER_ENTRAL_ASSISTANT",
      explicit_confirmation_required: true,
      target_version: entity.version
    },
    business_id: businessId,
    confidence: 1,
    expected_version: entity.version,
    idempotency_key: `member-assistant:${actionId}`,
    proposed_changes: proposal.proposedChanges,
    reason: `Human-requested change through the contextual ENTRAL assistant: ${boundedHumanRequest}`,
    requested_at: now().toISOString(),
    requested_outcome: proposal.requestedOutcome,
    risk_class: proposal.riskClass,
    rollback_plan: proposal.rollbackPlan,
    scope,
    target_id: entity.entity_id,
    target_type: "ENTITY",
    verification_plan: {
      checks: [
        "Re-read the target version and canonical configuration.",
        "Validate authority, model, tool, policy, budget, and business-scope compatibility.",
        "Emit canonical event, audit, rollback, and verification receipts before reporting success."
      ]
    }
  };
  return { entity, kind: "governance", request, summary: proposal.summary };
}

import type { EntitySummary, JsonValue } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertJsonValue,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const MEMBER_ENTRAL_SURFACES = ["dashboard", "graph", "infrastructure"] as const;
export type MemberEntralSurface = (typeof MEMBER_ENTRAL_SURFACES)[number];

export interface MemberEntralAssistantContextInput {
  readonly surface: MemberEntralSurface;
  readonly business_id: string | null;
  readonly selected_entity_id: string | null;
  readonly observed_event_sequence: number;
}

export interface MemberEntralAssistantMessageRequest {
  readonly conversation_id?: string;
  readonly message: string;
  readonly context: MemberEntralAssistantContextInput;
}

export interface MemberEntralAssistantResolvedContext {
  readonly surface: MemberEntralSurface;
  readonly business_id: string | null;
  readonly selected_entity: EntitySummary | null;
  readonly event_sequence: number;
  readonly scope_label: string;
}

export interface MemberEntralAssistantMessageResponse {
  readonly conversation_id: string;
  readonly message_id: string;
  readonly content: string;
  readonly created_at: string;
  readonly user_message: {
    readonly message_id: string;
    readonly content: string;
    readonly created_at: string;
  };
  readonly context: MemberEntralAssistantResolvedContext;
  readonly action_plan: JsonValue;
}

function assertNullableUuid(value: unknown, field: string): void {
  if (value !== null) assertUuid(value, field);
}

export function parseMemberEntralAssistantMessageResponse(
  value: unknown
): MemberEntralAssistantMessageResponse {
  assertRecord(value, "member_entral_assistant_response");
  assertNonEmptyString(value.conversation_id, "member_entral_assistant_response.conversation_id", 160);
  assertNonEmptyString(value.message_id, "member_entral_assistant_response.message_id", 160);
  assertNonEmptyString(value.content, "member_entral_assistant_response.content", 20_000);
  assertIsoDate(value.created_at, "member_entral_assistant_response.created_at");
  assertRecord(value.user_message, "member_entral_assistant_response.user_message");
  assertNonEmptyString(value.user_message.message_id, "member_entral_assistant_response.user_message.message_id", 160);
  assertNonEmptyString(value.user_message.content, "member_entral_assistant_response.user_message.content", 4_000);
  assertIsoDate(value.user_message.created_at, "member_entral_assistant_response.user_message.created_at");
  assertRecord(value.context, "member_entral_assistant_response.context");
  if (!(MEMBER_ENTRAL_SURFACES as readonly unknown[]).includes(value.context.surface)) {
    throw new ContractError("INVALID_ASSISTANT_SURFACE", "member_entral_assistant_response.context.surface is invalid");
  }
  assertNullableUuid(value.context.business_id, "member_entral_assistant_response.context.business_id");
  assertSafeNonNegativeInteger(
    value.context.event_sequence,
    "member_entral_assistant_response.context.event_sequence"
  );
  assertNonEmptyString(value.context.scope_label, "member_entral_assistant_response.context.scope_label", 500);
  if (value.context.selected_entity !== null) {
    assertRecord(value.context.selected_entity, "member_entral_assistant_response.context.selected_entity");
    assertUuid(
      value.context.selected_entity.entity_id,
      "member_entral_assistant_response.context.selected_entity.entity_id"
    );
  }
  assertJsonValue(value.action_plan, "member_entral_assistant_response.action_plan");
  return value as unknown as MemberEntralAssistantMessageResponse;
}

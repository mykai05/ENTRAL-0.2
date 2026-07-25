import type { EntityRole, JsonValue } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertJsonValue,
  assertNonEmptyString,
  assertOperationalRoute,
  assertRecord,
  assertUuid,
  isEntityRole
} from "./validation.js";

export interface QueueJobEnvelope<TPayload extends JsonValue = JsonValue> {
  readonly contract_version: "1.0.0";
  readonly job_id: string;
  readonly job_type: string;
  readonly idempotency_key: string;
  readonly correlation_id: string;
  readonly enqueued_at: string;
  readonly payload: TPayload;
}

export interface OperationalMessage<TPayload extends JsonValue = JsonValue> {
  readonly contract_version: "1.0.0";
  readonly message_id: string;
  readonly sender_role: EntityRole;
  readonly sender_id: string;
  readonly recipient_role: EntityRole;
  readonly recipient_id: string;
  readonly correlation_id: string;
  readonly sent_at: string;
  readonly payload: TPayload;
}

export function assertQueueJobEnvelope(value: unknown): asserts value is QueueJobEnvelope {
  assertRecord(value, "queue_job");
  if (value.contract_version !== "1.0.0") {
    throw new ContractError("CONTRACT_VERSION", "queue_job.contract_version must be 1.0.0");
  }
  assertUuid(value.job_id, "queue_job.job_id");
  assertNonEmptyString(value.job_type, "queue_job.job_type", 120);
  assertNonEmptyString(value.idempotency_key, "queue_job.idempotency_key", 255);
  if (value.idempotency_key.trim().length < 12) {
    throw new ContractError("IDEMPOTENCY_KEY", "queue_job.idempotency_key must be at least 12 characters");
  }
  assertUuid(value.correlation_id, "queue_job.correlation_id");
  assertIsoDate(value.enqueued_at, "queue_job.enqueued_at");
  if (!Object.hasOwn(value, "payload")) throw new ContractError("MISSING_PAYLOAD", "queue_job.payload is required");
  assertJsonValue(value.payload, "queue_job.payload");
}

export function assertOperationalMessage(value: unknown): asserts value is OperationalMessage {
  assertRecord(value, "message");
  if (value.contract_version !== "1.0.0") {
    throw new ContractError("CONTRACT_VERSION", "message.contract_version must be 1.0.0");
  }
  assertUuid(value.message_id, "message.message_id");
  if (!isEntityRole(value.sender_role) || !isEntityRole(value.recipient_role)) {
    throw new ContractError("INVALID_ENTITY_ROLE", "message roles must be canonical");
  }
  assertOperationalRoute(value.sender_role, value.recipient_role);
  assertUuid(value.sender_id, "message.sender_id");
  assertUuid(value.recipient_id, "message.recipient_id");
  assertUuid(value.correlation_id, "message.correlation_id");
  assertIsoDate(value.sent_at, "message.sent_at");
  if (!Object.hasOwn(value, "payload")) throw new ContractError("MISSING_PAYLOAD", "message.payload is required");
  assertJsonValue(value.payload, "message.payload");
}

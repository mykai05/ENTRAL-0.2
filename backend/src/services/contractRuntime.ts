import {
  assertQueueJobEnvelope,
  type JsonValue,
  type QueueJobEnvelope
} from "@entral/contracts";
import { randomUUID } from "node:crypto";

export function createQueueJobEnvelope<TPayload extends JsonValue>(
  jobType: string,
  payload: TPayload,
  idempotencyKey: string
): QueueJobEnvelope<TPayload> {
  const envelope: QueueJobEnvelope<TPayload> = {
    contract_version: "1.0.0",
    job_id: randomUUID(),
    job_type: jobType,
    idempotency_key: idempotencyKey,
    correlation_id: randomUUID(),
    enqueued_at: new Date().toISOString(),
    payload
  };
  assertQueueJobEnvelope(envelope);
  return envelope;
}

export function parseQueueTaskId(value: unknown, expectedJobType: string): string {
  assertQueueJobEnvelope(value);
  if (value.job_type !== expectedJobType) {
    throw new Error(`Queue job type ${value.job_type} cannot be consumed as ${expectedJobType}.`);
  }
  const payload = value.payload;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(`${expectedJobType} queue payload must be an object.`);
  }
  const taskId = payload.taskId;
  if (typeof taskId !== "string" || taskId.trim().length === 0) {
    throw new Error(`${expectedJobType} queue payload requires taskId.`);
  }
  return taskId;
}

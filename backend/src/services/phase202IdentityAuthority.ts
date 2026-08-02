import {
  assertAutonomyEnvelope,
  parseAuthorityEvaluationRequest,
  type AuthorityEvaluationRequest,
  type AuthorityEvaluationResult,
  type AuthorityDomain,
  type AutonomyEnvelope,
  type IdentityActorReference,
  type TenantOwnershipContext
} from "@entral/contracts";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma, withTenantSession, type VerifiedTenantIdentity } from "../db.js";
import { recordAuditLog } from "./audit.js";

export type HumanActorContext = {
  actor: IdentityActorReference;
  ownership: TenantOwnershipContext | null;
  legacyTeamId: string | null;
  membershipRole: string | null;
};

export async function resolveHumanActorContext(
  userId: string,
  tenantId: string,
  requestId?: string,
  database: PrismaClient = prisma
): Promise<HumanActorContext> {
  return withTenantSession(database, {
    actionReason: "identity.authority.context.resolve",
    authSubject: userId,
    requestId,
    tenantId
  }, async (transaction, identity) => {
    const [actor, assignment, boundary, membership] = await Promise.all([
      transaction.identityActor.findUnique({ where: { id: identity.actorId } }),
      transaction.tenantActorAssignment.findUnique({
        where: { actorId_tenantId: { actorId: identity.actorId, tenantId: identity.tenantId } }
      }),
      transaction.tenantBoundary.findUnique({ where: { id: identity.tenantId } }),
      transaction.teamMember.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          team: {
            memberAccessEnabled: true,
            organizationId: identity.organizationId,
            tenantId: identity.tenantId
          }
        },
        orderBy: [{ joinedAt: "asc" }, { teamId: "asc" }]
      })
    ]);
    if (!actor || actor.actorType !== "HUMAN" || actor.status !== "ACTIVE" || actor.humanUserId !== userId) {
      throw new Error("ACTIVE_HUMAN_ACTOR_REQUIRED");
    }
    if (!assignment || assignment.organizationId !== identity.organizationId
      || assignment.status !== "ACTIVE" || assignment.role !== identity.role) {
      throw new Error("ACTIVE_TENANT_ACTOR_ASSIGNMENT_REQUIRED");
    }
    if (!boundary || boundary.organizationId !== identity.organizationId || boundary.status !== "ACTIVE") {
      throw new Error("ACTIVE_TENANT_BOUNDARY_REQUIRED");
    }
    return {
      actor: {
        actor_id: actor.id,
        actor_type: "HUMAN",
        human_user_id: userId,
        service_subject: null,
        agent_id: null
      },
      legacyTeamId: membership?.teamId ?? null,
      membershipRole: assignment.role,
      ownership: {
        organization_id: identity.organizationId,
        tenant_id: identity.tenantId,
        business_id: null,
        environment: boundary.environment as TenantOwnershipContext["environment"],
        data_residency: boundary.dataResidency
      }
    };
  });
}

const rolePermissions: Readonly<Record<string, ReadonlySet<string>>> = {
  OWNER: new Set(["IDENTITY", "TENANCY", "OPERATIONS", "FINANCE", "INTEGRATIONS", "SUPPORT"]),
  TENANT_ADMIN: new Set(["IDENTITY", "TENANCY", "OPERATIONS", "INTEGRATIONS", "SUPPORT"]),
  MEMBER: new Set(["OPERATIONS"]),
  SUPPORT: new Set(["SUPPORT"]),
  SERVICE: new Set(["OPERATIONS", "INTEGRATIONS"]),
  AGENT: new Set(["OPERATIONS"])
};

const riskRank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;

export type DurableAuthorityContext = {
  actor: IdentityActorReference;
  authorityDomains: readonly AuthorityDomain[];
  ownership: TenantOwnershipContext;
  role: string;
};

function sameActor(left: IdentityActorReference, right: IdentityActorReference) {
  return left.actor_id === right.actor_id
    && left.actor_type === right.actor_type
    && left.human_user_id === right.human_user_id
    && left.service_subject === right.service_subject
    && left.agent_id === right.agent_id;
}

function sameOwnership(left: TenantOwnershipContext, right: TenantOwnershipContext) {
  return left.organization_id === right.organization_id
    && left.tenant_id === right.tenant_id
    && left.business_id === right.business_id
    && left.environment === right.environment
    && left.data_residency === right.data_residency;
}

export async function evaluateBoundHumanAuthority(
  transaction: Prisma.TransactionClient,
  identity: VerifiedTenantIdentity,
  input: {
    action: string;
    actionRisk: AuthorityEvaluationRequest["action_risk"];
    authSubject: string;
    authorityDomain: AuthorityEvaluationRequest["authority_domain"];
    businessId?: string | null;
    dataClassification: AuthorityEvaluationRequest["data_classification"];
    requestId: string;
    stepUpVerified: boolean;
  }
) {
  const [actor, assignment, boundary, business] = await Promise.all([
    transaction.identityActor.findUnique({ where: { id: identity.actorId } }),
    transaction.tenantActorAssignment.findUnique({
      where: { actorId_tenantId: { actorId: identity.actorId, tenantId: identity.tenantId } }
    }),
    transaction.tenantBoundary.findUnique({ where: { id: identity.tenantId } }),
    input.businessId ? transaction.businessBoundary.findUnique({ where: { id: input.businessId } }) : Promise.resolve(null)
  ]);
  if (!actor || actor.actorType !== "HUMAN" || actor.humanUserId !== input.authSubject
    || actor.status !== "ACTIVE" || !assignment || assignment.status !== "ACTIVE"
    || assignment.organizationId !== identity.organizationId || assignment.role !== identity.role
    || !boundary || boundary.status !== "ACTIVE" || boundary.organizationId !== identity.organizationId) {
    throw new Error("DURABLE_AUTHORITY_CONTEXT_UNAVAILABLE");
  }
  if (input.businessId && (!business || business.status !== "ACTIVE"
    || business.organizationId !== identity.organizationId || business.tenantId !== identity.tenantId
    || business.environment !== boundary.environment || business.dataResidency !== boundary.dataResidency)) {
    throw new Error("DURABLE_BUSINESS_CONTEXT_UNAVAILABLE");
  }
  const durableActor: IdentityActorReference = {
    actor_id: actor.id,
    actor_type: "HUMAN",
    human_user_id: actor.humanUserId,
    service_subject: null,
    agent_id: null
  };
  const durableOwnership: TenantOwnershipContext = {
    organization_id: identity.organizationId,
    tenant_id: identity.tenantId,
    business_id: input.businessId ?? null,
    environment: boundary.environment as TenantOwnershipContext["environment"],
    data_residency: boundary.dataResidency
  };
  return evaluateAuthority({
    contract_version: "1.0.0",
    schema_version: 1,
    request_id: input.requestId,
    idempotency_key: input.requestId,
    actor: durableActor,
    ownership: durableOwnership,
    role: assignment.role,
    authority_domain: input.authorityDomain,
    data_classification: input.dataClassification,
    action: input.action,
    action_risk: input.actionRisk,
    requested_at: new Date().toISOString()
  }, {
    durableContext: {
      actor: durableActor,
      authorityDomains: assignment.authorityDomains.filter(
        (domain): domain is AuthorityDomain => ["IDENTITY", "TENANCY", "OPERATIONS", "FINANCE", "INTEGRATIONS", "SUPPORT"].includes(domain)
      ),
      ownership: durableOwnership,
      role: assignment.role
    },
    stepUpVerified: input.stepUpVerified
  });
}

export function evaluateAuthority(
  input: AuthorityEvaluationRequest,
  options: {
    durableContext?: DurableAuthorityContext;
    stepUpVerified: boolean;
    envelope?: AutonomyEnvelope;
    now?: Date;
  } = { stepUpVerified: false }
): AuthorityEvaluationResult {
  const request = parseAuthorityEvaluationRequest(input);
  const now = options.now ?? new Date();
  const evaluatedAt = now.toISOString();
  const evidence: string[] = [
    `actor:${request.actor.actor_id}`,
    `tenant:${request.ownership.tenant_id}`,
    `policy:phase202-rbac-abac-v1`
  ];
  const durable = options.durableContext;
  if (!durable) {
    return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "DENY", reason_code: "DURABLE_AUTHORITY_CONTEXT_REQUIRED", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence };
  }
  if (!sameActor(request.actor, durable.actor) || !sameOwnership(request.ownership, durable.ownership)
    || request.role !== durable.role) {
    return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "DENY", reason_code: "DURABLE_AUTHORITY_CONTEXT_MISMATCH", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence };
  }
  evidence.push(`durable-role:${durable.role}`);
  const domains = rolePermissions[durable.role] ?? new Set<string>();
  if (!domains.has(request.authority_domain) || !durable.authorityDomains.includes(request.authority_domain)) {
    return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "DENY", reason_code: "ROLE_DOMAIN_DENIED", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence };
  }
  if (request.actor.actor_type === "AGENT" || request.actor.actor_type === "SERVICE") {
    if (!options.envelope) {
      return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "DENY", reason_code: "AUTONOMY_ENVELOPE_REQUIRED", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence };
    }
    assertAutonomyEnvelope(options.envelope);
    const envelope = options.envelope;
    const expired = Date.parse(envelope.expires_at) <= now.getTime()
      || Date.parse(envelope.created_at) > now.getTime();
    const scopeMismatch = !sameOwnership(envelope.ownership, request.ownership)
      || !sameActor(envelope.actor, request.actor)
      || (request.ownership.business_id !== null && !envelope.data_scope.includes(`business:${request.ownership.business_id}`) && !envelope.data_scope.includes("business:all"));
    if (expired || scopeMismatch || !envelope.allowed_action_types.includes(request.action)) {
      return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "DENY", reason_code: expired ? "AUTONOMY_ENVELOPE_EXPIRED" : "AUTONOMY_SCOPE_DENIED", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence: [...evidence, `envelope:${envelope.envelope_id}:v${envelope.version}`] };
    }
    evidence.push(`envelope:${envelope.envelope_id}:v${envelope.version}`);
  }
  if (request.data_classification === "RESTRICTED" || riskRank[request.action_risk] >= riskRank.HIGH) {
    if (!options.stepUpVerified) {
      return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "STEP_UP_REQUIRED", reason_code: "RECENT_MFA_STEP_UP_REQUIRED", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence };
    }
    evidence.push("step-up:verified");
  }
  return { contract_version: "1.0.0", schema_version: 1, request_id: request.request_id, decision: "ALLOW", reason_code: "RBAC_ABAC_ALLOW", policy_version: "phase202-rbac-abac-v1", evaluated_at: evaluatedAt, evidence };
}

export async function createAutonomyEnvelope(
  envelope: AutonomyEnvelope,
  requestId: string,
  authSubject: string,
  database: PrismaClient = prisma
) {
  assertAutonomyEnvelope(envelope);
  const now = Date.now();
  if (Date.parse(envelope.created_at) > now || Date.parse(envelope.expires_at) <= now) {
    throw new Error("AUTONOMY_ENVELOPE_NOT_ACTIVE");
  }
  return withTenantSession(database, {
    tenantId: envelope.ownership.tenant_id,
    authSubject,
    actionReason: "autonomy.envelope.create",
    requestId
  }, async (transaction, identity) => {
    if (identity.organizationId !== envelope.ownership.organization_id
      || identity.tenantId !== envelope.ownership.tenant_id
      || identity.role !== "OWNER") {
      throw new Error("AUTONOMY_ENVELOPE_IDENTITY_MISMATCH");
    }
    const [boundary, targetRows, business] = await Promise.all([
      transaction.tenantBoundary.findUnique({ where: { id: identity.tenantId } }),
      transaction.$queryRaw<Array<{
        actorId: string;
        actorType: string;
        humanUserId: string | null;
        serviceSubject: string | null;
        agentId: string | null;
        role: string;
        status: string;
      }>>`
        SELECT * FROM entral.phase202_resolve_autonomy_target(
          ${envelope.actor.actor_id}::uuid,${identity.tenantId}::uuid,${identity.organizationId}::uuid
        )
      `,
      envelope.ownership.business_id === null ? Promise.resolve(null) : transaction.businessBoundary.findUnique({
        where: { id: envelope.ownership.business_id }
      })
    ]);
    const target = targetRows[0];
    if (!boundary || boundary.status !== "ACTIVE"
      || boundary.organizationId !== identity.organizationId
      || boundary.environment !== envelope.ownership.environment
      || boundary.dataResidency !== envelope.ownership.data_residency) {
      throw new Error("AUTONOMY_ENVELOPE_TENANT_SCOPE_MISMATCH");
    }
    if (!target || target.status !== "ACTIVE" || !sameActor(envelope.actor, {
      actor_id: target.actorId,
      actor_type: target.actorType as IdentityActorReference["actor_type"],
      human_user_id: target.humanUserId,
      service_subject: target.serviceSubject,
      agent_id: target.agentId
    })) {
      throw new Error("AUTONOMY_ENVELOPE_ACTOR_SCOPE_MISMATCH");
    }
    if (envelope.ownership.business_id !== null && (
      !business || business.status !== "ACTIVE"
      || business.organizationId !== identity.organizationId
      || business.tenantId !== identity.tenantId
      || business.environment !== envelope.ownership.environment
      || business.dataResidency !== envelope.ownership.data_residency
    )) {
      throw new Error("AUTONOMY_ENVELOPE_BUSINESS_SCOPE_MISMATCH");
    }
    const record = await transaction.autonomyEnvelopeRecord.create({
      data: {
        envelopeId: envelope.envelope_id,
        organizationId: identity.organizationId,
        tenantId: identity.tenantId,
        businessId: envelope.ownership.business_id,
        actorId: envelope.actor.actor_id,
        version: envelope.version,
        allowedActionTypes: [...envelope.allowed_action_types],
        toolScope: [...envelope.tool_scope],
        dataScope: [...envelope.data_scope],
        budgetCurrency: envelope.budget.currency,
        maximumMinorUnits: BigInt(envelope.budget.maximum_minor_units),
        reversible: envelope.reversible,
        verification: envelope.verification,
        escalation: envelope.escalation,
        expiresAt: new Date(envelope.expires_at),
        createdAt: new Date(envelope.created_at)
      }
    });
    await recordAuditLog({
      action: "autonomy.envelope.created",
      actorUserId: authSubject,
      metadata: {
        envelopeId: envelope.envelope_id,
        envelopeVersion: envelope.version,
        targetActorId: envelope.actor.actor_id,
        tenantId: identity.tenantId
      },
      requestId,
      severity: "high",
      targetId: record.recordId,
      targetType: "autonomy_envelope"
    }, transaction);
    return record;
  });
}

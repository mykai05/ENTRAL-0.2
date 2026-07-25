import type { EntityRole } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertValidParentRole,
  isEntityRole
} from "./validation.js";

export type MemberOrganizationRole = "MEMBER" | "OWNER";
export type MemberCommandRank = EntityRole;
export type MemberCommandStatus = "error" | "idle" | "offline" | "thinking" | "waiting" | "working";

export interface MemberOrganization {
  readonly id: string;
  readonly joinedAt: string;
  readonly memberCount: number;
  readonly memberLimit: number;
  readonly name: string;
  readonly role: MemberOrganizationRole;
  readonly slug: string;
}

export interface MemberOrganizationsResponse {
  readonly organizations: readonly MemberOrganization[];
  readonly user: {
    readonly email: string;
    readonly id: string;
    readonly name: string;
  };
}

export interface MemberAvailability {
  readonly available: false;
  readonly reason: string;
  readonly state?: "not_configured";
}

export interface MemberCommandNode {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly rank: MemberCommandRank;
  readonly status: MemberCommandStatus;
}

export interface MemberCommandHierarchy {
  readonly nodes: readonly MemberCommandNode[];
}

export interface MemberOverviewResponse {
  readonly availability: {
    readonly subscription: MemberAvailability;
  };
  readonly members: readonly {
    readonly id: string;
    readonly joinedAt: string;
    readonly name: string;
    readonly role: MemberOrganizationRole;
  }[];
  readonly organization: {
    readonly id: string;
    readonly memberCount: number;
    readonly memberLimit: number;
    readonly name: string;
    readonly role: MemberOrganizationRole;
    readonly slug: string;
  };
  readonly recentTasks: readonly {
    readonly assignedTo: { readonly id: string; readonly name: string } | null;
    readonly dueDate: string | null;
    readonly id: string;
    readonly status: string;
    readonly title: string;
    readonly updatedAt: string;
  }[];
  readonly taskSummary: {
    readonly done: number;
    readonly inProgress: number;
    readonly overdue: number;
    readonly todo: number;
    readonly total: number;
  };
  readonly workspace: {
    readonly businessHealth: {
      readonly score: number;
      readonly status: "stable" | "watch" | "attention";
      readonly summary: string;
    } | null;
    readonly commandHierarchy?: MemberCommandHierarchy | null;
    readonly findingsAndRecommendations: readonly {
      readonly detail: string;
      readonly id: string;
      readonly recommendation: string;
      readonly severity: "information" | "opportunity" | "risk";
      readonly title: string;
    }[];
    readonly monthlyOperatingSummary: {
      readonly accomplishments: readonly string[];
      readonly headline: string;
      readonly nextPriorities: readonly string[];
      readonly period: string;
      readonly summary: string;
    } | null;
    readonly objectivesAndPriorities: readonly {
      readonly id: string;
      readonly priority: "high" | "medium" | "low";
      readonly progress: number;
      readonly status: "planned" | "active" | "complete";
      readonly title: string;
    }[];
    readonly publishedAt: string;
    readonly version: number;
  } | null;
}

const memberStatuses: readonly MemberCommandStatus[] = ["error", "idle", "offline", "thinking", "waiting", "working"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertMemberRole(value: unknown, field: string): asserts value is MemberOrganizationRole {
  if (value !== "MEMBER" && value !== "OWNER") {
    throw new ContractError("INVALID_MEMBER_ROLE", `${field} must be MEMBER or OWNER`);
  }
}

function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new ContractError("INVALID_ARRAY", `${field} must be an array`);
}

function assertDateString(value: unknown, field: string): asserts value is string {
  assertIsoDate(value, field);
}

function assertEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  field: string
): asserts value is TValue {
  if (typeof value !== "string" || !allowed.includes(value as TValue)) {
    throw new ContractError("INVALID_ENUM", `${field} is not a canonical value`);
  }
}

function assertIntegerRange(value: unknown, field: string, minimum: number, maximum: number): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ContractError("INVALID_INTEGER", `${field} must be an integer between ${minimum} and ${maximum}`);
  }
}

export function assertMemberCommandHierarchy(value: unknown): asserts value is MemberCommandHierarchy {
  assertRecord(value, "commandHierarchy");
  assertArray(value.nodes, "commandHierarchy.nodes");
  if (value.nodes.length === 0 || value.nodes.length > 5_000) {
    throw new ContractError("INVALID_HIERARCHY_SIZE", "commandHierarchy.nodes must contain 1 to 5000 nodes");
  }

  const nodes = new Map<string, MemberCommandNode>();
  for (const [index, rawNode] of value.nodes.entries()) {
    assertRecord(rawNode, `commandHierarchy.nodes[${index}]`);
    assertNonEmptyString(rawNode.id, `commandHierarchy.nodes[${index}].id`, 160);
    assertNonEmptyString(rawNode.name, `commandHierarchy.nodes[${index}].name`, 200);
    if (rawNode.parentId !== null) {
      assertNonEmptyString(rawNode.parentId, `commandHierarchy.nodes[${index}].parentId`, 160);
    }
    if (!isEntityRole(rawNode.rank)) {
      throw new ContractError("INVALID_ENTITY_ROLE", `${String(rawNode.rank)} is not a canonical hierarchy rank`);
    }
    if (typeof rawNode.status !== "string" || !memberStatuses.includes(rawNode.status as MemberCommandStatus)) {
      throw new ContractError("INVALID_COMMAND_STATUS", `${String(rawNode.status)} is not a member command status`);
    }
    if (nodes.has(rawNode.id)) {
      throw new ContractError("DUPLICATE_HIERARCHY_ID", `Duplicate hierarchy node id: ${rawNode.id}`);
    }
    nodes.set(rawNode.id, {
      id: rawNode.id,
      name: rawNode.name,
      parentId: rawNode.parentId,
      rank: rawNode.rank,
      status: rawNode.status as MemberCommandStatus
    });
  }

  const roots = [...nodes.values()].filter((node) => node.parentId === null);
  if (roots.length !== 1 || roots[0]?.rank !== "ENTRAL") {
    throw new ContractError("INVALID_HIERARCHY_ROOT", "The hierarchy must contain exactly one ENTRAL root");
  }

  for (const node of nodes.values()) {
    const parent = node.parentId === null ? null : nodes.get(node.parentId);
    if (node.parentId !== null && parent === undefined) {
      throw new ContractError("MISSING_HIERARCHY_PARENT", `${node.id} references a missing parent`);
    }
    assertValidParentRole(node.rank, parent?.rank ?? null);
  }
}

function assertOrganization(value: unknown, field: string, joinedAtRequired: boolean): void {
  assertRecord(value, field);
  assertNonEmptyString(value.id, `${field}.id`, 160);
  assertNonEmptyString(value.name, `${field}.name`, 160);
  assertNonEmptyString(value.slug, `${field}.slug`, 160);
  assertSafeNonNegativeInteger(value.memberCount, `${field}.memberCount`);
  assertIntegerRange(value.memberLimit, `${field}.memberLimit`, 1, 5);
  assertMemberRole(value.role, `${field}.role`);
  if (joinedAtRequired) assertDateString(value.joinedAt, `${field}.joinedAt`);
}

export function assertMemberOrganizationsResponse(value: unknown): asserts value is MemberOrganizationsResponse {
  assertRecord(value, "memberOrganizations");
  assertArray(value.organizations, "memberOrganizations.organizations");
  value.organizations.forEach((organization, index) => {
    assertOrganization(organization, `memberOrganizations.organizations[${index}]`, true);
  });
  assertRecord(value.user, "memberOrganizations.user");
  assertNonEmptyString(value.user.email, "memberOrganizations.user.email", 320);
  if (!EMAIL_RE.test(value.user.email)) {
    throw new ContractError("INVALID_EMAIL", "memberOrganizations.user.email must be an email address");
  }
  assertNonEmptyString(value.user.id, "memberOrganizations.user.id", 160);
  assertNonEmptyString(value.user.name, "memberOrganizations.user.name", 160);
}

export function assertMemberOverviewResponse(value: unknown): asserts value is MemberOverviewResponse {
  assertRecord(value, "memberOverview");
  assertRecord(value.availability, "memberOverview.availability");
  assertRecord(value.availability.subscription, "memberOverview.availability.subscription");
  if (value.availability.subscription.available !== false) {
    throw new ContractError("INVALID_AVAILABILITY", "subscription.available must be false until implemented");
  }
  assertNonEmptyString(value.availability.subscription.reason, "memberOverview.availability.subscription.reason", 500);
  if (
    value.availability.subscription.state !== undefined &&
    value.availability.subscription.state !== "not_configured"
  ) {
    throw new ContractError("INVALID_AVAILABILITY", "subscription.state must be not_configured when present");
  }

  assertOrganization(value.organization, "memberOverview.organization", false);
  assertArray(value.members, "memberOverview.members");
  value.members.forEach((member, index) => {
    assertRecord(member, `memberOverview.members[${index}]`);
    assertNonEmptyString(member.id, `memberOverview.members[${index}].id`, 160);
    assertNonEmptyString(member.name, `memberOverview.members[${index}].name`, 160);
    assertMemberRole(member.role, `memberOverview.members[${index}].role`);
    assertDateString(member.joinedAt, `memberOverview.members[${index}].joinedAt`);
  });

  assertArray(value.recentTasks, "memberOverview.recentTasks");
  value.recentTasks.forEach((task, index) => {
    assertRecord(task, `memberOverview.recentTasks[${index}]`);
    assertNonEmptyString(task.id, `memberOverview.recentTasks[${index}].id`, 160);
    assertNonEmptyString(task.title, `memberOverview.recentTasks[${index}].title`, 500);
    assertNonEmptyString(task.status, `memberOverview.recentTasks[${index}].status`, 80);
    assertDateString(task.updatedAt, `memberOverview.recentTasks[${index}].updatedAt`);
    if (task.dueDate !== null) assertDateString(task.dueDate, `memberOverview.recentTasks[${index}].dueDate`);
    if (task.assignedTo !== null) {
      assertRecord(task.assignedTo, `memberOverview.recentTasks[${index}].assignedTo`);
      assertNonEmptyString(task.assignedTo.id, `memberOverview.recentTasks[${index}].assignedTo.id`, 160);
      assertNonEmptyString(task.assignedTo.name, `memberOverview.recentTasks[${index}].assignedTo.name`, 160);
    }
  });

  assertRecord(value.taskSummary, "memberOverview.taskSummary");
  for (const field of ["done", "inProgress", "overdue", "todo", "total"] as const) {
    assertSafeNonNegativeInteger(value.taskSummary[field], `memberOverview.taskSummary.${field}`);
  }

  if (value.workspace === null) return;
  assertRecord(value.workspace, "memberOverview.workspace");
  assertSafeNonNegativeInteger(value.workspace.version, "memberOverview.workspace.version");
  if (value.workspace.version < 1) {
    throw new ContractError("INVALID_VERSION", "memberOverview.workspace.version must be at least 1");
  }
  assertDateString(value.workspace.publishedAt, "memberOverview.workspace.publishedAt");
  assertArray(value.workspace.objectivesAndPriorities, "memberOverview.workspace.objectivesAndPriorities");
  if (value.workspace.objectivesAndPriorities.length > 12) {
    throw new ContractError("INVALID_ARRAY_SIZE", "memberOverview.workspace.objectivesAndPriorities may contain at most 12 records");
  }
  value.workspace.objectivesAndPriorities.forEach((objective, index) => {
    const field = `memberOverview.workspace.objectivesAndPriorities[${index}]`;
    assertRecord(objective, field);
    assertNonEmptyString(objective.id, `${field}.id`, 80);
    assertNonEmptyString(objective.title, `${field}.title`, 180);
    assertEnum(objective.priority, ["high", "medium", "low"], `${field}.priority`);
    assertEnum(objective.status, ["planned", "active", "complete"], `${field}.status`);
    assertIntegerRange(objective.progress, `${field}.progress`, 0, 100);
  });
  assertArray(value.workspace.findingsAndRecommendations, "memberOverview.workspace.findingsAndRecommendations");
  if (value.workspace.findingsAndRecommendations.length > 20) {
    throw new ContractError("INVALID_ARRAY_SIZE", "memberOverview.workspace.findingsAndRecommendations may contain at most 20 records");
  }
  value.workspace.findingsAndRecommendations.forEach((finding, index) => {
    const field = `memberOverview.workspace.findingsAndRecommendations[${index}]`;
    assertRecord(finding, field);
    assertNonEmptyString(finding.id, `${field}.id`, 80);
    assertNonEmptyString(finding.title, `${field}.title`, 180);
    assertNonEmptyString(finding.detail, `${field}.detail`, 1_000);
    assertNonEmptyString(finding.recommendation, `${field}.recommendation`, 1_000);
    assertEnum(finding.severity, ["information", "opportunity", "risk"], `${field}.severity`);
  });
  if (value.workspace.businessHealth !== null) {
    assertRecord(value.workspace.businessHealth, "memberOverview.workspace.businessHealth");
    assertIntegerRange(value.workspace.businessHealth.score, "memberOverview.workspace.businessHealth.score", 0, 100);
    assertEnum(
      value.workspace.businessHealth.status,
      ["stable", "watch", "attention"],
      "memberOverview.workspace.businessHealth.status"
    );
    assertNonEmptyString(value.workspace.businessHealth.summary, "memberOverview.workspace.businessHealth.summary", 500);
  }
  if (value.workspace.monthlyOperatingSummary !== null) {
    const summary = value.workspace.monthlyOperatingSummary;
    assertRecord(summary, "memberOverview.workspace.monthlyOperatingSummary");
    assertNonEmptyString(summary.headline, "memberOverview.workspace.monthlyOperatingSummary.headline", 180);
    assertNonEmptyString(summary.summary, "memberOverview.workspace.monthlyOperatingSummary.summary", 1_500);
    if (typeof summary.period !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(summary.period)) {
      throw new ContractError("INVALID_PERIOD", "memberOverview.workspace.monthlyOperatingSummary.period must be YYYY-MM");
    }
    assertArray(summary.accomplishments, "memberOverview.workspace.monthlyOperatingSummary.accomplishments");
    assertArray(summary.nextPriorities, "memberOverview.workspace.monthlyOperatingSummary.nextPriorities");
    if (summary.accomplishments.length > 8 || summary.nextPriorities.length > 8) {
      throw new ContractError("INVALID_ARRAY_SIZE", "monthly summary lists may contain at most 8 entries");
    }
    summary.accomplishments.forEach((item, index) => {
      assertNonEmptyString(item, `memberOverview.workspace.monthlyOperatingSummary.accomplishments[${index}]`, 240);
    });
    summary.nextPriorities.forEach((item, index) => {
      assertNonEmptyString(item, `memberOverview.workspace.monthlyOperatingSummary.nextPriorities[${index}]`, 240);
    });
  }
  if (value.workspace.commandHierarchy !== undefined && value.workspace.commandHierarchy !== null) {
    assertMemberCommandHierarchy(value.workspace.commandHierarchy);
  }
}

export function parseMemberOrganizationsResponse(value: unknown): MemberOrganizationsResponse {
  assertMemberOrganizationsResponse(value);
  return {
    organizations: value.organizations.map((organization) => ({
      id: organization.id,
      joinedAt: organization.joinedAt,
      memberCount: organization.memberCount,
      memberLimit: organization.memberLimit,
      name: organization.name,
      role: organization.role,
      slug: organization.slug
    })),
    user: {
      email: value.user.email,
      id: value.user.id,
      name: value.user.name
    }
  };
}

export function parseMemberOverviewResponse(value: unknown): MemberOverviewResponse {
  assertMemberOverviewResponse(value);
  return {
    availability: {
      subscription: {
        available: false,
        reason: value.availability.subscription.reason,
        ...(value.availability.subscription.state === "not_configured"
          ? { state: "not_configured" as const }
          : {})
      }
    },
    members: value.members.map((member) => ({
      id: member.id,
      joinedAt: member.joinedAt,
      name: member.name,
      role: member.role
    })),
    organization: {
      id: value.organization.id,
      memberCount: value.organization.memberCount,
      memberLimit: value.organization.memberLimit,
      name: value.organization.name,
      role: value.organization.role,
      slug: value.organization.slug
    },
    recentTasks: value.recentTasks.map((task) => ({
      assignedTo: task.assignedTo === null
        ? null
        : { id: task.assignedTo.id, name: task.assignedTo.name },
      dueDate: task.dueDate,
      id: task.id,
      status: task.status,
      title: task.title,
      updatedAt: task.updatedAt
    })),
    taskSummary: {
      done: value.taskSummary.done,
      inProgress: value.taskSummary.inProgress,
      overdue: value.taskSummary.overdue,
      todo: value.taskSummary.todo,
      total: value.taskSummary.total
    },
    workspace: value.workspace === null
      ? null
      : {
          businessHealth: value.workspace.businessHealth === null
            ? null
            : {
                score: value.workspace.businessHealth.score,
                status: value.workspace.businessHealth.status,
                summary: value.workspace.businessHealth.summary
              },
          ...(value.workspace.commandHierarchy === undefined
            ? {}
            : {
                commandHierarchy: value.workspace.commandHierarchy === null
                  ? null
                  : {
                      nodes: value.workspace.commandHierarchy.nodes.map((node) => ({
                        id: node.id,
                        name: node.name,
                        parentId: node.parentId,
                        rank: node.rank,
                        status: node.status
                      }))
                    }
              }),
          findingsAndRecommendations: value.workspace.findingsAndRecommendations.map((finding) => ({
            detail: finding.detail,
            id: finding.id,
            recommendation: finding.recommendation,
            severity: finding.severity,
            title: finding.title
          })),
          monthlyOperatingSummary: value.workspace.monthlyOperatingSummary === null
            ? null
            : {
                accomplishments: [...value.workspace.monthlyOperatingSummary.accomplishments],
                headline: value.workspace.monthlyOperatingSummary.headline,
                nextPriorities: [...value.workspace.monthlyOperatingSummary.nextPriorities],
                period: value.workspace.monthlyOperatingSummary.period,
                summary: value.workspace.monthlyOperatingSummary.summary
              },
          objectivesAndPriorities: value.workspace.objectivesAndPriorities.map((objective) => ({
            id: objective.id,
            priority: objective.priority,
            progress: objective.progress,
            status: objective.status,
            title: objective.title
          })),
          publishedAt: value.workspace.publishedAt,
          version: value.workspace.version
        }
  };
}

import type { MemberCommandRank, MemberCommandStatus, MemberOverviewResponse } from "../lib/member";
import { createMemberStarterHierarchy } from "../lib/member-command-hierarchy";

export type MemberGraphBranch = "core" | "commander" | "findings" | "general" | "health" | "marshal" | "priorities" | "soldier" | "summary" | "team" | "work";
export type MemberGraphKind =
  | "accomplishment"
  | "commander"
  | "core"
  | "finding"
  | "findings"
  | "general"
  | "health"
  | "health-assessment"
  | "member"
  | "marshal"
  | "next-priority"
  | "priorities"
  | "priority"
  | "recommendation"
  | "summary"
  | "summary-record"
  | "soldier"
  | "team"
  | "task"
  | "task-rollup"
  | "work";
export type MemberGraphStatus = "active" | "attention" | "quiet" | "stable" | "watch";

export type MemberGraphNode = {
  branch: MemberGraphBranch;
  depth: number;
  detail: string;
  id: string;
  kind: MemberGraphKind;
  label: string;
  metric: string;
  parentId: string | null;
  status: MemberGraphStatus;
  supportingItems: string[];
  x: number;
  y: number;
};

export type MemberGraphEdge = {
  from: string;
  id: string;
  kind: "assignment" | "hierarchy";
  to: string;
};

export type MemberGraphModel = {
  edges: MemberGraphEdge[];
  hierarchySource: "published" | "starter";
  nodes: MemberGraphNode[];
};

const hubPositions: Record<"findings" | "health" | "priorities" | "summary" | "team" | "work", { x: number; y: number }> = {
  health: { x: 50, y: 27 },
  priorities: { x: 70, y: 38 },
  work: { x: 70, y: 62 },
  team: { x: 50, y: 73 },
  summary: { x: 30, y: 62 },
  findings: { x: 30, y: 38 }
};

function edge(from: string, to: string, kind: MemberGraphEdge["kind"] = "hierarchy"): MemberGraphEdge {
  return { from, id: `${kind}:${from}--${to}`, kind, to };
}

function leafPosition(index: number, total: number) {
  const capacities = [18, 28, 40];
  const radii = [31, 40, 47];
  let ring = 0;
  let ringIndex = index;
  let remaining = total;

  while (ring < capacities.length - 1 && ringIndex >= capacities[ring]) {
    ringIndex -= capacities[ring];
    remaining -= capacities[ring];
    ring += 1;
  }

  const ringCount = Math.min(capacities[ring], remaining);
  const angle = (-90 + ring * 5 + (360 / Math.max(1, ringCount)) * ringIndex) * (Math.PI / 180);
  const radius = radii[ring];

  return {
    x: Number((50 + Math.cos(angle) * radius).toFixed(4)),
    y: Number((50 + Math.sin(angle) * radius).toFixed(4))
  };
}

function taskStatus(status: string): MemberGraphStatus {
  if (status === "IN_PROGRESS") return "active";
  if (status === "DONE") return "stable";
  if (status === "TODO") return "watch";
  return "quiet";
}

function priorityStatus(status: "active" | "complete" | "planned", priority: "high" | "low" | "medium"): MemberGraphStatus {
  if (status === "active") return "active";
  if (status === "complete") return "stable";
  return priority === "high" ? "watch" : "quiet";
}

function findingStatus(severity: "information" | "opportunity" | "risk"): MemberGraphStatus {
  if (severity === "risk") return "attention";
  if (severity === "opportunity") return "watch";
  return "stable";
}

function roleLabel(role: "MEMBER" | "OWNER") {
  return role === "OWNER" ? "Owner" : "Member";
}

function commandStatus(status: MemberCommandStatus): MemberGraphStatus {
  if (status === "error") return "attention";
  if (status === "working" || status === "thinking") return "active";
  if (status === "waiting") return "watch";
  if (status === "offline") return "quiet";
  return "stable";
}

function rankDepth(rank: MemberCommandRank) {
  return { commander: 3, emperor: 0, general: 2, marshal: 1, soldier: 4 }[rank];
}

function rankLabel(rank: MemberCommandRank) {
  return rank === "emperor" ? "Central command" : `${rank[0].toUpperCase()}${rank.slice(1)}`;
}

function makeHub(input: Omit<MemberGraphNode, "x" | "y"> & { branch: keyof typeof hubPositions }): MemberGraphNode {
  return {
    ...input,
    ...hubPositions[input.branch]
  };
}

export function buildMemberGraphModel(overview: MemberOverviewResponse): MemberGraphModel {
  const health = overview.workspace?.businessHealth ?? null;
  const priorities = overview.workspace?.objectivesAndPriorities ?? [];
  const findings = overview.workspace?.findingsAndRecommendations ?? [];
  const summary = overview.workspace?.monthlyOperatingSummary ?? null;
  const activePriorities = priorities.filter((priority) => priority.status === "active");
  const riskFindings = findings.filter((finding) => finding.severity === "risk");
  const publishedHierarchy = overview.workspace?.commandHierarchy;
  const hierarchy = publishedHierarchy ?? createMemberStarterHierarchy(overview.organization.name);
  const hierarchySource = publishedHierarchy ? "published" as const : "starter" as const;
  const root = hierarchy.nodes.find((node) => node.rank === "emperor" && node.parentId === null) ?? hierarchy.nodes[0];
  const graphId = (id: string) => id === root.id ? "core" : `command:${id}`;
  const nodes: MemberGraphNode[] = hierarchy.nodes.map((node) => ({
    branch: node.rank === "emperor" ? "core" : node.rank,
    depth: rankDepth(node.rank),
    detail: node.rank === "emperor"
      ? `The strategic center of ${overview.organization.name}'s organization-scoped command universe.`
      : `${node.name} is a member-visible ${node.rank} in this organization's chain of command.`,
    id: graphId(node.id),
    kind: node.rank === "emperor" ? "core" : node.rank,
    label: node.name,
    metric: rankLabel(node.rank),
    parentId: node.parentId ? graphId(node.parentId) : null,
    status: commandStatus(node.status),
    supportingItems: [
      hierarchySource === "published" ? "Published organization hierarchy" : "Organization starter hierarchy",
      `${overview.organization.memberCount} of ${overview.organization.memberLimit} member seats`,
      node.rank === "emperor" ? "ENTRAL routes work through Marshals, Generals, Commanders, and Soldiers" : `Operating status: ${node.status}`
    ],
    x: 50,
    y: 50
  }));
  const primaryGeneral = nodes.find((node) => node.branch === "general") ?? nodes.find((node) => node.branch === "marshal") ?? nodes[0];
  const signalDepth = primaryGeneral.depth + 1;

  nodes.push(
    makeHub({
      branch: "health",
      depth: signalDepth,
      detail: health?.summary ?? "No approved business-health assessment has been published yet.",
      id: "health",
      kind: "health",
      label: "Business health",
      metric: health ? `${health.score}/100` : "Awaiting data",
      parentId: primaryGeneral.id,
      status: health?.status ?? "quiet",
      supportingItems: health ? [`Status: ${health.status}`] : ["Ready for the first approved assessment"]
    }),
    makeHub({
      branch: "priorities",
      depth: signalDepth,
      detail: priorities.length
        ? "Every approved objective and priority connected to this organization."
        : "No approved objectives or priorities have been published yet.",
      id: "priorities",
      kind: "priorities",
      label: "Priorities",
      metric: priorities.length ? `${activePriorities.length} active / ${priorities.length} total` : "Awaiting data",
      parentId: primaryGeneral.id,
      status: activePriorities.length ? "active" : priorities.length ? "stable" : "quiet",
      supportingItems: priorities.length
        ? priorities.slice(0, 5).map((priority) => `${priority.title} - ${priority.progress}%`)
        : ["Ready for organization priorities"]
    }),
    makeHub({
      branch: "work",
      depth: signalDepth,
      detail: overview.taskSummary.total
        ? "All work records currently released to this member view."
        : "No member-visible work records are available yet.",
      id: "work",
      kind: "work",
      label: "Visible work",
      metric: overview.taskSummary.total ? `${overview.taskSummary.inProgress} in progress / ${overview.taskSummary.total} total` : "No records",
      parentId: primaryGeneral.id,
      status: overview.taskSummary.overdue > 0 ? "attention" : overview.taskSummary.inProgress > 0 ? "active" : overview.taskSummary.total > 0 ? "stable" : "quiet",
      supportingItems: [
        ...overview.recentTasks.slice(0, 4).map((task) => `${task.title} - ${task.status.replaceAll("_", " ").toLowerCase()}`),
        overview.taskSummary.overdue ? `${overview.taskSummary.overdue} overdue` : "No overdue work"
      ]
    }),
    makeHub({
      branch: "team",
      depth: signalDepth,
      detail: "People with verified access to this organization workspace.",
      id: "team",
      kind: "team",
      label: "Organization team",
      metric: `${overview.members.length} member${overview.members.length === 1 ? "" : "s"}`,
      parentId: primaryGeneral.id,
      status: overview.members.length ? "stable" : "quiet",
      supportingItems: overview.members.length
        ? overview.members.slice(0, 5).map((member) => `${member.name} - ${member.role}`)
        : ["No organization members are available"]
    }),
    makeHub({
      branch: "summary",
      depth: signalDepth,
      detail: summary?.summary ?? "No approved monthly operating summary has been published yet.",
      id: "summary",
      kind: "summary",
      label: "Operating summary",
      metric: summary?.period ?? "Awaiting data",
      parentId: primaryGeneral.id,
      status: summary ? "stable" : "quiet",
      supportingItems: summary
        ? [summary.headline, ...summary.accomplishments.map((item) => `Accomplishment: ${item}`), ...summary.nextPriorities.map((item) => `Next: ${item}`)]
        : ["Ready for the first monthly summary"]
    }),
    makeHub({
      branch: "findings",
      depth: signalDepth,
      detail: findings.length
        ? "Every approved finding and recommendation connected to this organization."
        : "No approved findings or recommendations have been published yet.",
      id: "findings",
      kind: "findings",
      label: "Findings",
      metric: findings.length ? `${findings.length} published` : "Awaiting data",
      parentId: primaryGeneral.id,
      status: riskFindings.length ? "attention" : findings.length ? "watch" : "quiet",
      supportingItems: findings.length
        ? findings.slice(0, 5).map((finding) => `${finding.title} - ${finding.severity}`)
        : ["Ready for approved findings"]
    })
  );

  if (health) {
    nodes.push({
      branch: "health",
      depth: signalDepth + 1,
      detail: health.summary,
      id: "health:assessment",
      kind: "health-assessment",
      label: "Latest assessment",
      metric: `${health.score}/100`,
      parentId: "health",
      status: health.status,
      supportingItems: [`Status: ${health.status}`],
      x: 50,
      y: 50
    });
  }

  priorities.forEach((priority, index) => {
    nodes.push({
      branch: "priorities",
      depth: signalDepth + 1,
      detail: `${priority.priority} priority. ${priority.progress}% complete.`,
      id: `priority:${index}:${priority.id}`,
      kind: "priority",
      label: priority.title,
      metric: `${priority.progress}% complete`,
      parentId: "priorities",
      status: priorityStatus(priority.status, priority.priority),
      supportingItems: [`Status: ${priority.status}`, `Priority: ${priority.priority}`],
      x: 50,
      y: 50
    });
  });

  overview.recentTasks.forEach((task, index) => {
    nodes.push({
      branch: "work",
      depth: signalDepth + 1,
      detail: "A member-visible task released to this organization workspace.",
      id: `task:${index}:${task.id}`,
      kind: "task",
      label: task.title,
      metric: task.status.replaceAll("_", " ").toLowerCase(),
      parentId: "work",
      status: taskStatus(task.status),
      supportingItems: [task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : "Unassigned", task.dueDate ? `Due ${task.dueDate.slice(0, 10)}` : "No due date"],
      x: 50,
      y: 50
    });
  });

  const additionalTaskCount = Math.max(0, overview.taskSummary.total - overview.recentTasks.length);
  if (additionalTaskCount > 0) {
    nodes.push({
      branch: "work",
      depth: signalDepth + 1,
      detail: "These member-visible task records are included in the organization totals, but individual details are not part of the current overview response.",
      id: "work:additional",
      kind: "task-rollup",
      label: "Additional visible work",
      metric: `${additionalTaskCount} record${additionalTaskCount === 1 ? "" : "s"}`,
      parentId: "work",
      status: "quiet",
      supportingItems: ["Included in organization totals", "Individual details are not included in this overview response"],
      x: 50,
      y: 50
    });
  }

  overview.members.forEach((member, index) => {
    nodes.push({
      branch: "team",
      depth: signalDepth + 1,
      detail: "A verified member of this organization workspace.",
      id: `member:${index}:${member.id}`,
      kind: "member",
      label: member.name,
      metric: roleLabel(member.role),
      parentId: "team",
      status: member.role === "OWNER" ? "active" : "stable",
      supportingItems: [`Role: ${roleLabel(member.role)}`, `Joined ${member.joinedAt.slice(0, 10)}`],
      x: 50,
      y: 50
    });
  });

  findings.forEach((finding, index) => {
    const findingId = `finding:${index}:${finding.id}`;
    nodes.push({
      branch: "findings",
      depth: signalDepth + 1,
      detail: finding.detail,
      id: findingId,
      kind: "finding",
      label: finding.title,
      metric: finding.severity,
      parentId: "findings",
      status: findingStatus(finding.severity),
      supportingItems: [`Recommendation: ${finding.recommendation}`],
      x: 50,
      y: 50
    });
    nodes.push({
      branch: "findings",
      depth: signalDepth + 2,
      detail: finding.recommendation,
      id: `recommendation:${index}:${finding.id}`,
      kind: "recommendation",
      label: `${finding.title} recommendation`,
      metric: "Recommended action",
      parentId: findingId,
      status: findingStatus(finding.severity),
      supportingItems: [`Related finding: ${finding.title}`],
      x: 50,
      y: 50
    });
  });

  if (summary) {
    const summaryId = `summary:record:${summary.period}`;
    nodes.push({
      branch: "summary",
      depth: signalDepth + 1,
      detail: summary.summary,
      id: summaryId,
      kind: "summary-record",
      label: summary.headline,
      metric: summary.period,
      parentId: "summary",
      status: "stable",
      supportingItems: [`${summary.accomplishments.length} accomplishments`, `${summary.nextPriorities.length} next priorities`],
      x: 50,
      y: 50
    });
    summary.accomplishments.forEach((item, index) => {
      nodes.push({
        branch: "summary",
        depth: signalDepth + 2,
        detail: item,
        id: `summary:accomplishment:${index}`,
        kind: "accomplishment",
        label: item,
        metric: "Accomplishment",
        parentId: summaryId,
        status: "stable",
        supportingItems: [`Operating period: ${summary.period}`],
        x: 50,
        y: 50
      });
    });
    summary.nextPriorities.forEach((item, index) => {
      nodes.push({
        branch: "summary",
        depth: signalDepth + 2,
        detail: item,
        id: `summary:next:${index}`,
        kind: "next-priority",
        label: item,
        metric: "Next priority",
        parentId: summaryId,
        status: "active",
        supportingItems: [`Operating period: ${summary.period}`],
        x: 50,
        y: 50
      });
    });
  }

  const leafNodes = nodes.filter((node) => node.depth >= 2);
  leafNodes.forEach((node, index) => Object.assign(node, leafPosition(index, leafNodes.length)));

  const edges = nodes.filter((node) => node.parentId).map((node) => edge(node.parentId!, node.id));
  overview.recentTasks.forEach((task, taskIndex) => {
    if (!task.assignedTo) return;
    const memberIndex = overview.members.findIndex((member) => member.id === task.assignedTo?.id);
    if (memberIndex < 0) return;
    edges.push(edge(`task:${taskIndex}:${task.id}`, `member:${memberIndex}:${task.assignedTo.id}`, "assignment"));
  });
  return { edges, hierarchySource, nodes };
}

export function buildMemberSummaryNeurons(overview: MemberOverviewResponse) {
  const summaryBranches: MemberGraphBranch[] = ["core", "health", "priorities", "work", "team", "summary", "findings"];
  return buildMemberGraphModel(overview).nodes.filter((node) => summaryBranches.includes(node.branch) && (node.kind === "core" || node.kind === node.branch));
}

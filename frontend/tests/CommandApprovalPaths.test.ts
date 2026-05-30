import { describe, expect, it } from "vitest";
import {
  buildArchiveAuthorizationSummary,
  buildCreateNodeAuthorizationSummary,
  buildMoveAuthorizationSummary,
  buildWorkflowAuthorizationSummary
} from "../lib/command-authorization";
import { type CommandMemory, type CommandStatus, type CommandTask, type NodeType } from "../lib/command-os";
import {
  assignCommandTask,
  commandOSReducer,
  validateCommandOSState,
  type CommandNodeLike,
  type CommandOSState
} from "../lib/command-os-store";
import { createMerchLaunchWorkflowTasks, merchLaunchWorkflowSteps } from "../lib/merch-workflow";

type TestNode = CommandNodeLike & {
  title: string;
};

function memory(role: string): CommandMemory {
  return {
    instructions: `Operate as ${role}.`,
    notes: [],
    recentTasks: [],
    role,
    taskResults: []
  };
}

function node(id: string, commandType: NodeType, parentId: string | null, overrides: Partial<TestNode> = {}): TestNode {
  return {
    children: [],
    commandType,
    currentTask: null,
    groupId: commandType === "emperor" ? "core" : commandType === "marshal" ? id : overrides.groupId ?? "marshal-1",
    id,
    logs: [],
    memory: memory(commandType),
    name: id,
    parentId,
    status: "idle",
    taskHistory: [],
    title: commandType,
    type: commandType === "emperor" ? "core" : "agent",
    ...overrides
  };
}

function task(overrides: Partial<CommandTask> = {}): CommandTask {
  return {
    assignedEntityId: "soldier-1",
    completedAt: null,
    createdAt: "2026-05-30T00:00:00.000Z",
    delegationPath: ["entral", "marshal-1", "general-1", "commander-1", "soldier-1"],
    description: "Approved command task",
    history: [],
    id: "task-1",
    name: "Approved command task",
    status: "assigned",
    updatedAt: "2026-05-30T00:00:00.000Z",
    ...overrides
  };
}

function baseState(): CommandOSState<TestNode> {
  return validateCommandOSState({
    edges: [],
    groups: [
      { color: "#00F0FF", id: "core", name: "ENTRAL" },
      { color: "#39FF14", id: "marshal-1", name: "Marshal 1" },
      { color: "#00BFFF", id: "marshal-2", name: "Marshal 2" }
    ],
    nodes: [
      node("entral", "emperor", null, { name: "ENTRAL", title: "Central Command" }),
      node("marshal-1", "marshal", "entral", { name: "Marshal 1", title: "Marshal" }),
      node("marshal-2", "marshal", "entral", { name: "Marshal 2", title: "Marshal" }),
      node("general-1", "general", "marshal-1", { name: "Iron House Gym General", title: "General" }),
      node("commander-1", "commander", "general-1", { name: "Design Commander", title: "Commander" }),
      node("soldier-1", "soldier", "commander-1", { name: "Typography Soldier", title: "Soldier" })
    ],
    tasks: []
  });
}

function merchWorkflowNodes() {
  const commanderSpecs = [
    ["Client Intake Commander", ["Business Profile Soldier", "Audience Soldier", "Notes Soldier"]],
    ["Brand Commander", ["Brand Voice Soldier"]],
    ["Niche Research Commander", ["Niche Scanner Soldier", "Product Opportunity Soldier"]],
    ["Design Commander", ["Design Concept Soldier", "Prompt Soldier"]],
    ["Listing Commander", ["Title Soldier"]],
    ["Compliance Commander", ["Trademark Risk Soldier"]],
    ["Store Launch Commander", ["Shopify Setup Soldier", "Launch QA Soldier"]],
    ["Reporting Commander", ["Weekly Report Soldier", "Opportunity Report Soldier"]]
  ] as const;

  const nodes: Array<{ id: string; name: string; parentId: string | null; status: CommandStatus; type: NodeType }> = [
    { id: "entral", name: "ENTRAL", parentId: null, status: "thinking" as const, type: "emperor" as const },
    { id: "merch-marshal", name: "Merch Marshal", parentId: "entral", status: "idle" as const, type: "marshal" as const },
    { id: "iron-house-gym", name: "Iron House Gym General", parentId: "merch-marshal", status: "idle" as const, type: "general" as const }
  ];

  for (const [commanderName, soldiers] of commanderSpecs) {
    const commanderId = commanderName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    nodes.push({ id: commanderId, name: commanderName, parentId: "iron-house-gym", status: "idle" as const, type: "commander" as const });

    for (const soldierName of soldiers) {
      const soldierId = soldierName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      nodes.push({ id: `${commanderId}-${soldierId}`, name: soldierName, parentId: commanderId, status: "idle" as const, type: "soldier" as const });
    }
  }

  return nodes;
}

describe("Command approval paths", () => {
  it("applies an authorized General creation only under a Marshal", () => {
    const state = baseState();
    const authorization = buildCreateNodeAuthorizationSummary({
      nodeName: "Veteran Apparel General",
      nodeType: "general",
      parentName: "Marshal 1"
    });
    const approved = commandOSReducer(state, {
      node: node("veteran-apparel", "general", "entral", {
        groupId: "marshal-1",
        name: "Veteran Apparel General",
        title: "General"
      }),
      parentId: "entral",
      state,
      type: "createGeneralUnderMarshal"
    });

    expect(authorization).toContain("Authorize creation?");
    expect(approved.nodes.find((item) => item.id === "veteran-apparel")?.parentId).toBe("marshal-1");
    expect(approved.nodes.find((item) => item.id === "entral")?.children).not.toContain("veteran-apparel");
  });

  it("applies an authorized General move and repairs task command paths", () => {
    const state = assignCommandTask(baseState(), task(), baseState());
    const authorization = buildMoveAuthorizationSummary({
      currentParentName: "Marshal 1",
      descendantCount: 2,
      entityName: "Iron House Gym General",
      newParentName: "Marshal 2"
    });
    const moved = commandOSReducer(state, {
      generalId: "general-1",
      marshalId: "marshal-2",
      state,
      type: "moveGeneralToMarshal"
    });

    expect(authorization).toContain("Authorize reassignment?");
    expect(moved.nodes.find((item) => item.id === "general-1")?.parentId).toBe("marshal-2");
    expect(moved.tasks[0].delegationPath).toEqual(["entral", "marshal-2", "general-1", "commander-1", "soldier-1"]);
    expect(moved.tasks[0].marshalId).toBe("marshal-2");
  });

  it("keeps archive approval non-destructive and delete approval destructive", () => {
    const state = assignCommandTask(baseState(), task(), baseState());
    const authorization = buildArchiveAuthorizationSummary({
      descendantCount: 3,
      entityName: "Marshal 1",
      entityTitle: "Marshal",
      parentName: "ENTRAL"
    });
    const archived = commandOSReducer(state, {
      marshalId: "marshal-1",
      state,
      type: "archiveMarshal"
    });
    const deleted = commandOSReducer(archived, {
      entityId: "marshal-1",
      state: archived,
      type: "deleteEntityWithValidation"
    });

    expect(authorization).toContain("Authorize archive?");
    expect(archived.nodes.find((item) => item.id === "marshal-1")?.status).toBe("offline");
    expect(archived.nodes.some((item) => item.id === "soldier-1")).toBe(true);
    expect(deleted.nodes.some((item) => item.id === "marshal-1" || item.id === "soldier-1")).toBe(false);
    expect(["marshal-1", "general-1", "commander-1", "soldier-1"]).not.toContain(deleted.tasks[0].assignedEntityId);
    expect(deleted.tasks[0].delegationPath).not.toEqual(expect.arrayContaining(["marshal-1", "general-1", "commander-1", "soldier-1"]));
    expect(deleted.nodes.some((item) => item.id === deleted.tasks[0].assignedEntityId)).toBe(true);
    expect(deleted.tasks[0].history.at(-1)).toContain("Entity removal cleaned task references");
  });

  it("previews and applies Merch workflow authorization through valid command paths", () => {
    const preview = createMerchLaunchWorkflowTasks(merchWorkflowNodes(), {
      now: "2026-05-30T00:00:00.000Z",
      workflowName: "Iron House Gym Merch Launch"
    });
    const authorization = buildWorkflowAuthorizationSummary({
      assignedSoldierCount: new Set(preview.tasks.map((item) => item.assignedEntityId)).size,
      missingLanes: preview.missingSteps.map((step) => step.name),
      taskCount: preview.tasks.length,
      workflowName: "Iron House Gym Merch Launch"
    });

    expect(authorization).toContain("Authorize workflow generation?");
    expect(preview.missingSteps).toEqual([]);
    expect(preview.tasks).toHaveLength(merchLaunchWorkflowSteps.length);
    expect(preview.tasks.every((item) => item.delegationPath[0] === "entral")).toBe(true);
    expect(preview.tasks.every((item) => item.marshalId === "merch-marshal")).toBe(true);
    expect(preview.tasks.every((item) => item.generalId === "iron-house-gym")).toBe(true);
    expect(preview.tasks.every((item) => item.commanderId && item.soldierId)).toBe(true);
  });
});

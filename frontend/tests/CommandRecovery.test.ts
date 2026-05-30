import { describe, expect, it } from "vitest";
import { getCommandRecoverySummary } from "../lib/command-recovery";
import { type CommandMemory, type CommandTask, type NodeType } from "../lib/command-os";
import { type CommandNodeLike, type CommandOSState, validateCommandOSState } from "../lib/command-os-store";

type TestNode = CommandNodeLike & {
  title: string;
};

function memory(role: string, notes: string[] = []): CommandMemory {
  return {
    instructions: `Operate as ${role}.`,
    notes,
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
    groupId: commandType === "emperor" ? "core" : commandType === "marshal" ? id : "primary-marshal",
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
    assignedEntityId: "legacy-soldier",
    completedAt: null,
    createdAt: "2026-05-30T00:00:00.000Z",
    delegationPath: ["entral", "primary-marshal", "legacy-general", "legacy-commander", "legacy-soldier"],
    description: "Recovered task",
    history: [],
    id: "task-1",
    name: "Recovered task",
    status: "pending",
    updatedAt: "2026-05-30T00:00:00.000Z",
    ...overrides
  };
}

describe("Command recovery summaries", () => {
  it("detects recovered legacy hierarchy and summarizes review impact", () => {
    const state: CommandOSState<TestNode> = validateCommandOSState({
      edges: [],
      groups: [{ color: "#00F0FF", id: "core", name: "ENTRAL" }],
      nodes: [
        node("entral", "emperor", null),
        node("legacy-general", "general", "entral", { name: "Legacy General" }),
        node("legacy-commander", "commander", "legacy-general", { name: "Legacy Commander" }),
        node("legacy-soldier", "soldier", "legacy-commander", { name: "Legacy Soldier" })
      ],
      tasks: [task({
        delegationPath: ["entral", "legacy-general", "legacy-commander", "legacy-soldier"],
        history: ["Recovered task ownership after deleted entity. Reassigned to Legacy Soldier."]
      })]
    });
    const summary = getCommandRecoverySummary(state);

    expect(summary.hasRecoveryMarshal).toBe(true);
    expect(summary.marshalId).toBe("primary-marshal");
    expect(summary.recoveredGeneralCount).toBe(1);
    expect(summary.recoveredEntityCount).toBe(3);
    expect(summary.repairedTaskCount).toBe(1);
    expect(summary.advice[0]).toContain("Review the recovered Marshal");
  });

  it("does not show recovery UI for normal command state", () => {
    const state: CommandOSState<TestNode> = validateCommandOSState({
      edges: [],
      groups: [
        { color: "#00F0FF", id: "core", name: "ENTRAL" },
        { color: "#39FF14", id: "merch-marshal", name: "Merch Marshal" }
      ],
      nodes: [
        node("entral", "emperor", null),
        node("merch-marshal", "marshal", "entral", { groupId: "merch-marshal", name: "Merch Marshal" }),
        node("iron-house", "general", "merch-marshal", { groupId: "merch-marshal", name: "Iron House Gym General" })
      ],
      tasks: []
    });
    const summary = getCommandRecoverySummary(state);

    expect(summary.hasRecoveryMarshal).toBe(false);
    expect(summary.recoveredEntityCount).toBe(0);
    expect(summary.repairedTaskCount).toBe(0);
  });
});

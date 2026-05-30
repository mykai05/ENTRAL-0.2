import { describe, expect, it } from "vitest";
import {
  assignCommandTask,
  commandOSReducer,
  moveCommandEntity,
  removeCommandEntity,
  validateCommandOSState,
  type CommandNodeLike,
  type CommandOSState
} from "../lib/command-os-store";
import { type CommandMemory, type CommandTask, type NodeType } from "../lib/command-os";

type TestNode = CommandNodeLike & {
  title: string;
};

function memory(role: string): CommandMemory {
  return {
    instructions: `Act as ${role}.`,
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
    groupId: commandType === "emperor" ? "core" : commandType === "marshal" ? id : "marshal-1",
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
    createdAt: "2026-05-28T00:00:00.000Z",
    delegationPath: ["entral", "marshal-1", "general-1", "commander-1", "soldier-1"],
    description: "Test task",
    history: [],
    id: "task-1",
    name: "Test task",
    status: "pending",
    updatedAt: "2026-05-28T00:00:00.000Z",
    ...overrides
  };
}

function baseState(): CommandOSState<TestNode> {
  return validateCommandOSState({
    edges: [],
    groups: [
      { color: "#00F0FF", id: "core", name: "ENTRAL" },
      { color: "#39FF14", id: "marshal-1", name: "Marshal 1" }
    ],
    nodes: [
      node("entral", "emperor", null),
      node("marshal-1", "marshal", "entral"),
      node("general-1", "general", "marshal-1"),
      node("commander-1", "commander", "general-1"),
      node("commander-2", "commander", "general-1"),
      node("soldier-1", "soldier", "commander-1")
    ],
    tasks: []
  });
}

describe("Command OS store", () => {
  it("repairs entity creation into valid parent-child links", () => {
    const state = baseState();
    const created = node("soldier-2", "soldier", "commander-1");
    const repaired = validateCommandOSState({
      ...state,
      nodes: [...state.nodes, created]
    }, { fallback: state });

    expect(repaired.nodes.find((item) => item.id === "soldier-2")?.parentId).toBe("commander-1");
    expect(repaired.nodes.find((item) => item.id === "commander-1")?.children).toContain("soldier-2");
    expect(repaired.edges.some((edge) => edge.source === "commander-1" && edge.target === "soldier-2")).toBe(true);
  });

  it("deletes entities, descendants, and stale task references", () => {
    const state = assignCommandTask(baseState(), task(), baseState());
    const { state: next, removedIds } = removeCommandEntity(state, "commander-1", baseState());

    expect(removedIds).toEqual(expect.arrayContaining(["commander-1", "soldier-1"]));
    expect(next.nodes.some((item) => item.id === "commander-1" || item.id === "soldier-1")).toBe(false);
    expect(next.tasks[0].assignedEntityId).not.toBe("soldier-1");
    expect(next.tasks[0].delegationPath).not.toContain("commander-1");
  });

  it("reassigns entities only into valid hierarchy positions", () => {
    const state = baseState();
    const moved = moveCommandEntity(state, "soldier-1", "commander-2", state);
    const invalid = moveCommandEntity(moved.state, "soldier-1", "general-1", state);

    expect(moved.moved).toBe(true);
    expect(moved.state.nodes.find((item) => item.id === "soldier-1")?.parentId).toBe("commander-2");
    expect(moved.state.nodes.find((item) => item.id === "soldier-1")?.parentCommanderId).toBe("commander-2");
    expect(moved.state.nodes.find((item) => item.id === "soldier-1")?.parentGeneralId).toBe("general-1");
    expect(moved.state.nodes.find((item) => item.id === "soldier-1")?.parentMarshalId).toBe("marshal-1");
    expect(invalid.moved).toBe(false);
    expect(invalid.state.nodes.find((item) => item.id === "soldier-1")?.parentId).toBe("commander-2");
  });

  it("keeps task ownership valid when assigning tasks", () => {
    const state = baseState();
    const assigned = assignCommandTask(state, task({ assignedEntityId: "soldier-1" }), state);

    expect(assigned.tasks[0].assignedEntityId).toBe("soldier-1");
    expect(assigned.tasks[0].delegationPath).toEqual(["entral", "marshal-1", "general-1", "commander-1", "soldier-1"]);
    expect(assigned.tasks[0].marshalId).toBe("marshal-1");
    expect(assigned.tasks[0].generalId).toBe("general-1");
    expect(assigned.tasks[0].commanderId).toBe("commander-1");
    expect(assigned.tasks[0].soldierId).toBe("soldier-1");
  });

  it("repairs broken delegation chains", () => {
    const repaired = assignCommandTask(baseState(), task({
      assignedEntityId: "soldier-1",
      delegationPath: ["deleted-general", "soldier-1"]
    }), baseState());

    expect(repaired.tasks[0].delegationPath).toEqual(["entral", "marshal-1", "general-1", "commander-1", "soldier-1"]);
  });

  it("migrates legacy Generals under a recovery Marshal", () => {
    const legacy = validateCommandOSState({
      edges: [],
      groups: [{ color: "#00F0FF", id: "core", name: "ENTRAL" }],
      nodes: [
        node("entral", "emperor", null),
        node("legacy-general", "general", "entral", { groupId: "legacy-general" }),
        node("legacy-commander", "commander", "legacy-general", { groupId: "legacy-general" }),
        node("legacy-soldier", "soldier", "legacy-commander", { groupId: "legacy-general" })
      ],
      tasks: [task({ assignedEntityId: "legacy-soldier", delegationPath: ["entral", "legacy-general", "legacy-commander", "legacy-soldier"] })]
    });

    expect(legacy.nodes.find((item) => item.id === "primary-marshal")?.parentId).toBe("entral");
    expect(legacy.nodes.find((item) => item.id === "legacy-general")?.parentId).toBe("primary-marshal");
    expect(legacy.tasks[0].delegationPath).toEqual(["entral", "primary-marshal", "legacy-general", "legacy-commander", "legacy-soldier"]);
    expect(legacy.tasks[0].marshalId).toBe("primary-marshal");
  });

  it("enforces Marshal hierarchy invariants through reducer actions", () => {
    const state = baseState();
    const invalidGeneralMove = commandOSReducer(state, {
      entityId: "general-1",
      parentId: "entral",
      state,
      type: "reassignEntityWithValidation"
    });
    const invalidCommanderMove = commandOSReducer(state, {
      entityId: "commander-1",
      parentId: "marshal-1",
      state,
      type: "reassignEntityWithValidation"
    });
    const invalidSoldierMove = commandOSReducer(state, {
      entityId: "soldier-1",
      parentId: "general-1",
      state,
      type: "reassignEntityWithValidation"
    });

    expect(invalidGeneralMove.nodes.find((item) => item.id === "general-1")?.parentId).toBe("marshal-1");
    expect(invalidCommanderMove.nodes.find((item) => item.id === "commander-1")?.parentId).toBe("general-1");
    expect(invalidSoldierMove.nodes.find((item) => item.id === "soldier-1")?.parentId).toBe("commander-1");
  });

  it("supports Marshal creation, updates, archive, and General reassignment actions", () => {
    const state = baseState();
    const marshal = node("marshal-2", "marshal", "entral", { name: "Marshal 2" });
    const created = commandOSReducer(state, {
      node: marshal,
      state,
      type: "createMarshal"
    });
    const moved = commandOSReducer(created, {
      generalId: "general-1",
      marshalId: "marshal-2",
      state: created,
      type: "moveGeneralToMarshal"
    });
    const updated = commandOSReducer(moved, {
      changes: { name: "Renamed Marshal" } as Partial<TestNode>,
      marshalId: "marshal-2",
      state: moved,
      type: "updateMarshal"
    });
    const archived = commandOSReducer(updated, {
      marshalId: "marshal-2",
      state: updated,
      type: "archiveMarshal"
    });

    expect(created.nodes.find((item) => item.id === "marshal-2")?.parentId).toBe("entral");
    expect(moved.nodes.find((item) => item.id === "general-1")?.parentId).toBe("marshal-2");
    expect(updated.nodes.find((item) => item.id === "marshal-2")?.name).toBe("Renamed Marshal");
    expect(archived.nodes.find((item) => item.id === "marshal-2")?.status).toBe("offline");
  });

  it("survives persistence round trips", () => {
    const state = validateCommandOSState({
      ...baseState(),
      nodes: [
        ...baseState().nodes,
        node("soldier-2", "soldier", "commander-2", {
          memory: {
            ...memory("persistent soldier"),
            notes: ["Persist me"]
          }
        })
      ]
    }, { fallback: baseState() });
    const hydrated = validateCommandOSState(JSON.parse(JSON.stringify(state)) as CommandOSState<TestNode>, { fallback: baseState() });

    expect(hydrated.nodes.find((item) => item.id === "soldier-2")?.memory.notes).toContain("Persist me");
  });

  it("recovers interrupted active tasks during hydration", () => {
    const state = assignCommandTask(baseState(), task({ status: "running" }), baseState());
    const runningState = {
      ...state,
      nodes: state.nodes.map((item) => item.id === "soldier-1"
        ? { ...item, currentTask: "Test task", status: "working" as const }
        : item)
    };
    const hydrated = commandOSReducer(runningState, {
      fallback: baseState(),
      state: runningState,
      type: "hydrate"
    });

    expect(hydrated.tasks[0].status).toBe("failed");
    expect(hydrated.nodes.find((item) => item.id === "soldier-1")?.currentTask).toBeNull();
    expect(hydrated.nodes.find((item) => item.id === "soldier-1")?.status).toBe("waiting");
  });

  it("keeps pending planned tasks stable during hydration", () => {
    const state = assignCommandTask(baseState(), task({ status: "pending" }), baseState());
    const hydrated = commandOSReducer(state, {
      fallback: baseState(),
      state,
      type: "hydrate"
    });

    expect(hydrated.tasks[0].status).toBe("pending");
    expect(hydrated.tasks[0].completedAt).toBeNull();
  });

  it("prevents active tasks from staying assigned to offline entities", () => {
    const state = validateCommandOSState({
      ...baseState(),
      nodes: baseState().nodes.map((item) => item.id === "soldier-1" ? { ...item, status: "offline" } : item),
      tasks: [task({ assignedEntityId: "soldier-1", status: "assigned" })]
    }, { fallback: baseState() });

    expect(state.tasks[0].assignedEntityId).not.toBe("soldier-1");
    expect(state.tasks[0].history.at(-1)).toContain("offline");
  });
});

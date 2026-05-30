import { describe, expect, it } from "vitest";
import { buildCommandOSReport, buildCommandOSReportRecord, type CommandReportNode } from "../lib/command-reports";
import type { CommandTask } from "../lib/command-os";

const memory = {
  instructions: "Report upward.",
  notes: [],
  recentTasks: [],
  role: "Test role",
  taskResults: []
};

const nodes: CommandReportNode[] = [
  {
    children: ["merch-marshal"],
    commandType: "emperor",
    currentTask: null,
    health: 100,
    id: "entral",
    memory,
    name: "ENTRAL",
    parentId: null,
    status: "thinking",
    taskHistory: [],
    title: "Central Command"
  },
  {
    children: ["iron-house-general"],
    commandType: "marshal",
    currentTask: null,
    health: 97,
    id: "merch-marshal",
    memory,
    name: "Merch Marshal",
    parentId: "entral",
    status: "working",
    taskHistory: [],
    title: "Marshal"
  },
  {
    businessName: "Iron House Gym",
    children: ["design-commander"],
    commandType: "general",
    currentTask: "Prepare launch collection.",
    health: 92,
    id: "iron-house-general",
    memory,
    name: "Iron House Gym General",
    parentId: "merch-marshal",
    status: "working",
    taskHistory: ["Business structure created"],
    title: "General"
  },
  {
    children: ["typography-soldier"],
    commandType: "commander",
    currentTask: null,
    health: 89,
    id: "design-commander",
    memory,
    name: "Design Commander",
    parentId: "iron-house-general",
    status: "idle",
    taskHistory: [],
    title: "Commander"
  },
  {
    children: [],
    commandType: "soldier",
    currentTask: "Draft typography direction.",
    health: 91,
    id: "typography-soldier",
    memory,
    name: "Typography Soldier",
    parentId: "design-commander",
    status: "working",
    taskHistory: ["Draft typography direction"],
    title: "Soldier"
  }
];

const tasks: CommandTask[] = [
  {
    assignedEntityId: "typography-soldier",
    assignedEntityType: "soldier",
    commanderId: "design-commander",
    commanderName: "Design Commander",
    completedAt: null,
    createdAt: "2026-05-30T00:00:00.000Z",
    delegationPath: ["entral", "merch-marshal", "iron-house-general", "design-commander", "typography-soldier"],
    description: "Draft typography direction.",
    generalId: "iron-house-general",
    generalName: "Iron House Gym General",
    history: [],
    id: "task-1",
    marshalId: "merch-marshal",
    marshalName: "Merch Marshal",
    name: "Draft typography direction",
    reportHistory: [],
    soldierId: "typography-soldier",
    soldierName: "Typography Soldier",
    status: "assigned",
    updatedAt: "2026-05-30T00:00:00.000Z"
  }
];

describe("buildCommandOSReport", () => {
  it("creates a structured report with command path and scoped task data", () => {
    const report = buildCommandOSReport({ nodes, targetId: "iron-house-general", tasks });

    expect(report.situation).toContain("General Report");
    expect(report.situation).toContain("Iron House Gym General");
    expect(report.analysis).toContain("Command path: ENTRAL / Merch Marshal / Iron House Gym General");
    expect(report.analysis).toContain("Latest task: Draft typography direction");
    expect(report.nextActions?.length).toBeGreaterThan(0);
  });

  it("states insufficient data when an entity has no tasks or descendants", () => {
    const report = buildCommandOSReport({
      nodes: [nodes[0], { ...nodes[1], children: [], taskHistory: [] }],
      targetId: "merch-marshal",
      tasks: []
    });

    expect(report.recommendation).toContain("Insufficient operational data");
    expect(report.nextActions).toContain("Create a business General under this Marshal.");
  });

  it("creates report records with source, destination, and command path ids", () => {
    const record = buildCommandOSReportRecord({
      createdAt: "2026-05-30T12:00:00.000Z",
      nodes,
      targetId: "typography-soldier",
      tasks
    });

    expect(record).toMatchObject({
      commanderId: "design-commander",
      destinationEntityId: "design-commander",
      destinationEntityType: "commander",
      generalId: "iron-house-general",
      marshalId: "merch-marshal",
      soldierId: "typography-soldier",
      sourceEntityId: "typography-soldier",
      sourceEntityType: "soldier"
    });
    expect(record?.nextActions.length).toBeGreaterThan(0);
  });
});

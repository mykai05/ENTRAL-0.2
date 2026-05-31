import { describe, expect, it } from "vitest";
import { collectCommandReports, publicCommandOSSnapshot } from "../src/services/commandOSPersistence.js";
import { commandOSSnapshotSchema } from "../src/schemas.js";

const report = {
  analysis: "One Commander is awaiting a Soldier update.",
  commanderId: "design-commander",
  createdAt: "2026-05-30T12:00:00.000Z",
  destinationEntityId: "entral",
  destinationEntityType: "emperor" as const,
  generalId: "iron-house-general",
  id: "report-1",
  marshalId: "merch-marshal",
  nextActions: ["Review Design Commander.", "Request Soldier status."],
  recommendation: "Keep the task in review until approval is received.",
  situation: "Merch Marshal report available.",
  soldierId: null,
  sourceEntityId: "design-commander",
  sourceEntityType: "commander" as const
};

const state = commandOSSnapshotSchema.parse({
  source: "dashboard",
  state: {
    edges: [{ id: "e-entral-merch", label: "marshal link", source: "entral", target: "merch-marshal" }],
    groups: [{ color: "#00F0FF", id: "core", name: "ENTRAL Core" }],
    nodes: [
      {
        children: ["merch-marshal"],
        commandType: "emperor",
        currentTask: null,
        groupId: "core",
        id: "entral",
        logs: [],
        memory: {
          instructions: "Oversee command.",
          notes: [],
          recentTasks: [],
          role: "Strategic Command",
          taskResults: []
        },
        name: "ENTRAL",
        parentId: null,
        reportHistory: [report],
        reports: [report],
        status: "thinking",
        taskHistory: [],
        type: "core"
      }
    ],
    tasks: [
      {
        assignedEntityId: "design-commander",
        assignedEntityType: "commander",
        commanderId: "design-commander",
        createdAt: "2026-05-30T12:00:00.000Z",
        delegationPath: ["entral", "merch-marshal", "iron-house-general", "design-commander"],
        description: "Prepare report.",
        generalId: "iron-house-general",
        history: [],
        id: "task-1",
        marshalId: "merch-marshal",
        name: "Prepare report",
        reportHistory: [report],
        status: "completed",
        updatedAt: "2026-05-30T12:10:00.000Z"
      }
    ]
  }
});

describe("Command OS persistence", () => {
  it("deduplicates report records collected from nodes and tasks", () => {
    const reports = collectCommandReports(state.state);

    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe("report-1");
    expect(reports[0].reportCreatedAt.toISOString()).toBe("2026-05-30T12:00:00.000Z");
  });

  it("returns parsed public snapshot state", () => {
    const publicSnapshot = publicCommandOSSnapshot({
      createdAt: new Date("2026-05-30T12:00:00.000Z"),
      id: "snapshot-1",
      source: "dashboard",
      stateJson: JSON.stringify(state.state),
      stateVersion: 3,
      updatedAt: new Date("2026-05-30T12:10:00.000Z")
    });

    expect(publicSnapshot.stateVersion).toBe(3);
    expect(publicSnapshot.state.nodes[0].id).toBe("entral");
  });
});

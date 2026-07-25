import { describe, expect, it } from "vitest";
import { type CommandStatus, type NodeType } from "../lib/command-os";
import { createMerchLaunchWorkflowTasks, merchLaunchWorkflowSteps } from "../lib/merch-workflow";

const operationalSoldiers = [
  "Client Intake Soldier",
  "Niche Research Soldier",
  "Brand Soldier",
  "Design Soldier",
  "Listing Soldier",
  "Compliance Soldier",
  "Store Launch Soldier",
  "Marketing Soldier",
  "Reporting Soldier"
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createMerchWorkflowFixture() {
  const nodes: Array<{ id: string; name: string; parentId: string | null; status: CommandStatus; type: NodeType }> = [
    { id: "entral", name: "ENTRAL", parentId: null, status: "thinking" as const, type: "emperor" as const },
    { id: "merch-marshal", name: "Merch Marshal", parentId: "entral", status: "idle" as const, type: "marshal" as const },
    { id: "pod-general", name: "POD General", parentId: "merch-marshal", status: "idle" as const, type: "general" as const },
    { id: "iron-house-commander", name: "Iron House Gym Commander", parentId: "pod-general", status: "idle" as const, type: "commander" as const }
  ];

  for (const soldierName of operationalSoldiers) {
    nodes.push({
      id: `iron-house-commander-${slugify(soldierName)}`,
      name: soldierName,
      parentId: "iron-house-commander",
      status: "idle" as const,
      type: "soldier" as const
    });
  }

  return nodes;
}

describe("Merch launch workflow", () => {
  it("creates one delegated task for every launch workflow step", () => {
    const nodes = createMerchWorkflowFixture();
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z",
      workflowName: "Northline Merch Store Launch"
    });

    expect(result.missingSteps).toEqual([]);
    expect(result.tasks).toHaveLength(merchLaunchWorkflowSteps.length);
    expect(result.tasks.map((task) => task.name)).toEqual([
      "01. Client Intake",
      "02. Brand Analysis",
      "03. Audience Research",
      "04. Niche Research",
      "05. Product Planning",
      "06. Design Concept Generation",
      "07. Design Prompt Generation",
      "08. Listing Draft Generation",
      "09. Compliance Review",
      "10. Client Approval",
      "11. Store Build",
      "12. Launch",
      "13. Reporting",
      "14. Optimization"
    ]);
  });

  it("routes workflow reports upward through Soldier, Commander, General, Marshal, and ENTRAL", () => {
    const nodes = createMerchWorkflowFixture();
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z"
    });
    const designPrompt = result.tasks.find((task) => task.name === "07. Design Prompt Generation");

    expect(designPrompt?.assignedEntityId).toContain("design-soldier");
    expect(designPrompt?.delegationPath).toEqual([
      "entral",
      "merch-marshal",
      "pod-general",
      "iron-house-commander",
      "iron-house-commander-design-soldier"
    ]);
    expect(designPrompt?.history.at(-1)).toBe("[REPORT] Report path established: Design Soldier -> Iron House Gym Commander -> POD General -> Merch Marshal -> ENTRAL.");
    expect(designPrompt?.marshalId).toBe("merch-marshal");
    expect(designPrompt?.generalId).toBe("pod-general");
    expect(designPrompt?.commanderName).toBe("Iron House Gym Commander");
    expect(designPrompt?.status).toBe("pending");
  });

  it("flags missing operational functions instead of assigning broken tasks", () => {
    const nodes = createMerchWorkflowFixture().filter((node) => node.name !== "Compliance Soldier");
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z"
    });

    expect(result.missingSteps.map((step) => step.name)).toContain("Compliance Review");
    expect(result.tasks.some((task) => task.name === "09. Compliance Review")).toBe(false);
  });

  it("does not route workflow tasks through offline operational Soldiers", () => {
    const nodes = createMerchWorkflowFixture().map((node) => (
      node.name === "Design Soldier" ? { ...node, status: "offline" as const } : node
    ));
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z"
    });

    expect(result.missingSteps.map((step) => step.name)).toEqual(
      expect.arrayContaining(["Design Concept Generation", "Design Prompt Generation"])
    );
    expect(result.tasks.some((task) => task.name === "06. Design Concept Generation")).toBe(false);
    expect(result.tasks.some((task) => task.name === "07. Design Prompt Generation")).toBe(false);
  });
});

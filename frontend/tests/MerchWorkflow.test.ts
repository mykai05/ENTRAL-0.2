import { describe, expect, it } from "vitest";
import { createDefaultCommandHierarchy } from "../lib/command-os";
import { createMerchLaunchWorkflowTasks, merchLaunchWorkflowSteps } from "../lib/merch-workflow";

describe("Merch launch workflow", () => {
  it("creates one delegated task for every launch workflow step", () => {
    const nodes = createDefaultCommandHierarchy();
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
    const nodes = createDefaultCommandHierarchy();
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z"
    });
    const designPrompt = result.tasks.find((task) => task.name === "07. Design Prompt Generation");

    expect(designPrompt?.assignedEntityId).toContain("prompt-soldier");
    expect(designPrompt?.delegationPath).toEqual([
      "entral",
      "merch-marshal",
      "entral-general",
      "design-commander",
      "design-commander-prompt-soldier"
    ]);
    expect(designPrompt?.history.at(-1)).toBe("[REPORT] Report path established: Prompt Soldier -> Design Commander -> ENTRAL General -> Merch Marshal -> ENTRAL.");
    expect(designPrompt?.marshalId).toBe("merch-marshal");
    expect(designPrompt?.generalId).toBe("entral-general");
  });

  it("flags missing workflow lanes instead of assigning broken tasks", () => {
    const nodes = createDefaultCommandHierarchy().filter((node) => node.name !== "Compliance Commander");
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z"
    });

    expect(result.missingSteps.map((step) => step.name)).toContain("Compliance Review");
    expect(result.tasks.some((task) => task.name === "09. Compliance Review")).toBe(false);
  });

  it("does not route workflow tasks through offline commanders", () => {
    const nodes = createDefaultCommandHierarchy().map((node) => (
      node.name === "Design Commander" ? { ...node, status: "offline" as const } : node
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

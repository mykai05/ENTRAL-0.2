import { describe, expect, it } from "vitest";
import { type CommandStatus, type NodeType } from "../lib/command-os";
import { createMerchLaunchWorkflowTasks, merchLaunchWorkflowSteps } from "../lib/merch-workflow";

const merchCommanders = [
  ["Client Intake Commander", ["Business Profile Soldier", "Audience Soldier", "Offer Soldier", "Notes Soldier"]],
  ["Niche Research Commander", ["Niche Scanner Soldier", "Competitor Research Soldier", "Buyer Emotion Soldier", "Product Opportunity Soldier"]],
  ["Brand Commander", ["Brand Voice Soldier", "Color Direction Soldier", "Style Direction Soldier", "Collection Theme Soldier"]],
  ["Design Commander", ["Design Concept Soldier", "Prompt Soldier", "Typography Soldier", "Mockup Soldier", "Variation Soldier"]],
  ["Listing Commander", ["Title Soldier", "Description Soldier", "Tags Soldier", "SEO Soldier", "Materials Soldier"]],
  ["Compliance Commander", ["Trademark Risk Soldier", "Copyright Risk Soldier", "AI Disclosure Soldier", "Production Partner Soldier", "Prohibited Content Soldier"]],
  ["Store Launch Commander", ["Etsy Setup Soldier", "Printify Setup Soldier", "Shopify Setup Soldier", "Product Publish Checklist Soldier", "Launch QA Soldier"]],
  ["Marketing Commander", ["Instagram Caption Soldier", "TikTok Script Soldier", "Email Launch Soldier", "QR Flyer Soldier", "Promo Calendar Soldier"]],
  ["Reporting Commander", ["Weekly Report Soldier", "Sales Report Soldier", "Product Performance Soldier", "Opportunity Report Soldier"]]
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createMerchWorkflowFixture() {
  const nodes: Array<{ id: string; name: string; parentId: string | null; status: CommandStatus; type: NodeType }> = [
    { id: "entral", name: "ENTRAL", parentId: null, status: "thinking" as const, type: "emperor" as const },
    { id: "merch-marshal", name: "Merch Marshal", parentId: "entral", status: "idle" as const, type: "marshal" as const },
    { id: "entral-general", name: "ENTRAL General", parentId: "merch-marshal", status: "idle" as const, type: "general" as const }
  ];

  for (const [commanderName, soldiers] of merchCommanders) {
    const commanderId = slugify(commanderName);
    nodes.push({
      id: commanderId,
      name: commanderName,
      parentId: "entral-general",
      status: "idle" as const,
      type: "commander" as const
    });

    for (const soldierName of soldiers) {
      nodes.push({
        id: `${commanderId}-${slugify(soldierName)}`,
        name: soldierName,
        parentId: commanderId,
        status: "idle" as const,
        type: "soldier" as const
      });
    }
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
    const nodes = createMerchWorkflowFixture().filter((node) => node.name !== "Compliance Commander");
    const result = createMerchLaunchWorkflowTasks(nodes, {
      now: "2026-05-29T00:00:00.000Z"
    });

    expect(result.missingSteps.map((step) => step.name)).toContain("Compliance Review");
    expect(result.tasks.some((task) => task.name === "09. Compliance Review")).toBe(false);
  });

  it("does not route workflow tasks through offline commanders", () => {
    const nodes = createMerchWorkflowFixture().map((node) => (
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

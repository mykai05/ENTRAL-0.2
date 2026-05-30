import { describe, expect, it } from "vitest";
import {
  buildArchiveAuthorizationSummary,
  buildBusinessTemplateAuthorizationSummary,
  buildCreateNodeAuthorizationSummary,
  buildMoveAuthorizationSummary,
  buildWorkflowAuthorizationSummary,
  commandTitleFor
} from "../lib/command-authorization";

describe("command authorization summaries", () => {
  it("builds single-node creation previews with hierarchy impact", () => {
    expect(commandTitleFor("commander")).toBe("Commander");
    expect(buildCreateNodeAuthorizationSummary({
      nodeName: "Design Commander",
      nodeType: "commander",
      parentName: "Iron House Gym General"
    })).toBe([
      "Objective interpreted: Create Commander.",
      "Name: Design Commander",
      "Parent: Iron House Gym General",
      "Command path impact: 1 new Commander will be added under Iron House Gym General.",
      "Authorize creation?"
    ].join("\n"));
  });

  it("builds business template previews with optional context", () => {
    expect(buildBusinessTemplateAuthorizationSummary({
      businessName: "Iron House Gym",
      commanderCount: 8,
      contextLines: ["Industry: Fitness", "Audience: Gym members"],
      marshalName: "Merch Marshal",
      soldierCount: 36,
      templateLabel: "POD / Merch Business"
    })).toContain("Business General: Iron House Gym General");
    expect(buildBusinessTemplateAuthorizationSummary({
      businessName: "Iron House Gym General",
      commanderCount: 8,
      contextLines: [],
      marshalName: "Merch Marshal",
      soldierCount: 36,
      templateLabel: "POD / Merch Business"
    })).toContain("Context: no optional business context entered.");
  });

  it("builds move and archive previews with singular and plural child impact", () => {
    expect(buildMoveAuthorizationSummary({
      currentParentName: "Design Commander",
      descendantCount: 1,
      entityName: "Typography Soldier",
      newParentName: "Listing Commander"
    })).toContain("Child impact: 1 descendant will keep reporting through Typography Soldier.");

    expect(buildArchiveAuthorizationSummary({
      descendantCount: 3,
      entityName: "Merch Marshal",
      entityTitle: "Marshal",
      parentName: "ENTRAL"
    })).toContain("Child impact: 3 descendants will remain preserved but inactive under this archived entity.");
  });

  it("builds workflow previews with missing lane detail", () => {
    expect(buildWorkflowAuthorizationSummary({
      assignedSoldierCount: 7,
      missingLanes: ["Client Approval", "Launch"],
      taskCount: 12,
      workflowName: "Merch Launch"
    })).toBe([
      "Objective interpreted: Generate Merch/POD workflow.",
      "Workflow: Merch Launch",
      "Planned tasks: 12",
      "Assigned Soldiers: 7",
      "Missing lanes: Client Approval, Launch",
      "This will create task records and update entity memory/status in local Command OS state.",
      "Authorize workflow generation?"
    ].join("\n"));
  });
});

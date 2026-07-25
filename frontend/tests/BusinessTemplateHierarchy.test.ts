import { describe, expect, it } from "vitest";
import { businessTemplateHierarchyPlan } from "../components/NeuronsCommandCenter";

describe("business template hierarchy planning", () => {
  it("places the niche on General, one business on Commander, and prior lanes on Soldier", () => {
    const template: Parameters<typeof businessTemplateHierarchyPlan>[0] = {
      color: "#00F0FF",
      commanders: [
        { name: "Client Intake Commander", soldiers: ["Business Profile Soldier", "Audience Soldier"] },
        { name: "Design Commander", soldiers: ["Prompt Soldier", "Typography Soldier"] }
      ],
      description: "Test template",
      generalType: "POD Store",
      id: "test-template",
      label: "POD / Merch Business",
      marshalName: "Commerce Marshal",
      marshalType: "Merch Theater",
      starterCommands: []
    };

    expect(businessTemplateHierarchyPlan(template, {
      businessName: "Iron House Gym",
      industry: "Fitness"
    })).toEqual({
      businessName: "Iron House Gym",
      commanderName: "Iron House Gym Commander",
      generalName: "Fitness General",
      nicheLabel: "Fitness",
      operationalSoldiers: [
        {
          name: "Client Intake Soldier",
          supportingWork: ["Business Profile", "Audience"]
        },
        {
          name: "Design Soldier",
          supportingWork: ["Prompt", "Typography"]
        }
      ]
    });
  });

  it("derives the niche General from the template when the operator omits industry", () => {
    const template: Parameters<typeof businessTemplateHierarchyPlan>[0] = {
      color: "#00BFFF",
      commanders: [{ name: "Operations Commander", soldiers: ["Checklist Soldier"] }],
      description: "Test template",
      generalType: "Agency Client",
      id: "agency",
      label: "Website Agency",
      marshalName: "Digital Services Marshal",
      marshalType: "Website Theater",
      starterCommands: []
    };

    const plan = businessTemplateHierarchyPlan(template, {
      businessName: "FutureFocused Web Works Commander",
      industry: ""
    });

    expect(plan.generalName).toBe("Agency Client General");
    expect(plan.commanderName).toBe("FutureFocused Web Works Commander");
    expect(plan.operationalSoldiers).toHaveLength(1);
  });
});

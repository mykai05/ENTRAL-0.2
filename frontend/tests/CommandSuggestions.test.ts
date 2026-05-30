import { describe, expect, it } from "vitest";
import { getContextCommandSuggestions, getInspectorSuggestedActions } from "../lib/command-suggestions";

describe("Command OS suggestions", () => {
  it("guides first-time users toward help, Marshal creation, and business setup", () => {
    expect(getContextCommandSuggestions({
      businessGeneralCount: 0,
      isBusinessWizardOpen: false,
      pendingAuthorization: false,
      selectedNode: { commandType: "emperor", name: "ENTRAL" }
    })).toEqual(expect.arrayContaining([
      "Help",
      "Create Merch Marshal",
      "Help me create my first business",
      "Show business templates"
    ]));
  });

  it("prioritizes approval actions while an authorization is pending", () => {
    expect(getContextCommandSuggestions({
      businessGeneralCount: 1,
      isBusinessWizardOpen: false,
      pendingAuthorization: true,
      selectedNode: { commandType: "general", name: "Iron House Gym General" }
    })).toEqual(["Approve", "Cancel", "Show help"]);
  });

  it("returns hierarchy-aware inspector actions", () => {
    expect(getInspectorSuggestedActions({ commandType: "marshal", name: "Merch Marshal" })).toEqual([
      { command: "Create my first business", label: "Create Business General" },
      { command: "Report on Merch Marshal", label: "Marshal Report" },
      { command: "Show active Generals", label: "Show Active" }
    ]);

    expect(getInspectorSuggestedActions({
      commandType: "soldier",
      name: "Typography Soldier",
      parentCommanderName: "Design Commander"
    })).toEqual(expect.arrayContaining([
      { command: "Open Design Commander", label: "Parent Commander" }
    ]));
  });
});

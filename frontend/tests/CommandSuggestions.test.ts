import { describe, expect, it } from "vitest";
import { getContextCommandSuggestions, getInspectorSuggestedActions } from "../lib/command-suggestions";

describe("Command OS suggestions", () => {
  it("guides first-time users toward creation commands without duplicating visible CTAs", () => {
    expect(getContextCommandSuggestions({
      businessGeneralCount: 0,
      isBusinessWizardOpen: false,
      pendingAuthorization: false,
      selectedNode: { commandType: "emperor", name: "ENTRAL" }
    })).toEqual(expect.arrayContaining([
      "Create Merch Marshal",
      "Create POD business named Iron House Gym",
      "Create Website business named FutureFocused Web Works",
      "Show business templates",
      "Explain gravity controls"
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
    expect(getInspectorSuggestedActions({ commandType: "marshal", name: "Merch Marshal" })).toEqual(expect.arrayContaining([
      { command: "Create my first business", label: "Create Business General" },
      { command: "Report on Merch Marshal", label: "Marshal Report" },
      { command: "Set Merch Marshal gravity to 300%", label: "Tune Gravity" },
      { command: "Clear Merch Marshal gravity", label: "Clear Gravity" },
      { command: "Show active Generals", label: "Show Active" }
    ]));

    expect(getInspectorSuggestedActions({
      commandType: "soldier",
      name: "Typography Soldier",
      parentCommanderName: "Design Commander"
    })).toEqual(expect.arrayContaining([
      { command: "Set Typography Soldier gravity to 300%", label: "Tune Gravity" },
      { command: "Open Design Commander", label: "Parent Commander" }
    ]));
  });

  it("surfaces graph gravity controls in context suggestions", () => {
    expect(getContextCommandSuggestions({
      businessGeneralCount: 1,
      isBusinessWizardOpen: false,
      pendingAuthorization: false,
      selectedNode: { businessName: "Iron House Gym", commandType: "general", name: "Iron House Gym General" }
    })).toEqual(expect.arrayContaining([
      "Set selected gravity to 300%",
      "Nudge selected gravity up",
      "Loosen selected gravity",
      "Set all Generals gravity to 220%",
      "Set selected branch gravity to 220%",
      "Clear selected gravity"
    ]));

    expect(getContextCommandSuggestions({
      businessGeneralCount: 1,
      isBusinessWizardOpen: false,
      pendingAuthorization: false,
      selectedNode: { commandType: "emperor", name: "ENTRAL" }
    })).toEqual(expect.arrayContaining([
      "Explain gravity controls",
      "Set global gravity to 300%",
      "Set global gravity to 1000%",
      "Nudge global gravity up",
      "Loosen global gravity",
      "Set all gravity to 300%",
      "Set all gravity to 900%",
      "Nudge all gravity up",
      "Set all Soldiers gravity to 250%",
      "Nudge Soldiers gravity down",
      "Set every entity gravity to 300%",
      "Clear all gravity overrides"
    ]));
  });
});

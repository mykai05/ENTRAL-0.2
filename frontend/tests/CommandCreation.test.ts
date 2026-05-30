import { describe, expect, it } from "vitest";
import { creationBlockedTransmission, hierarchyNameFromCommandText, nextCommandPlaceholderName } from "../lib/command-creation";

const nodes = [
  { commandType: "marshal" as const, id: "marshal-1", name: "Marshal 1" },
  { commandType: "general" as const, id: "general-1", name: "General 1" },
  { commandType: "soldier" as const, id: "soldier-1", name: "Soldier 1" },
  { commandType: "soldier" as const, id: "soldier-2", name: "Soldier 2" }
];

describe("command creation helpers", () => {
  it("generates the next placeholder name by hierarchy type", () => {
    expect(nextCommandPlaceholderName("marshal", nodes)).toBe("Marshal 2");
    expect(nextCommandPlaceholderName("commander", nodes)).toBe("Commander 1");
    expect(nextCommandPlaceholderName("soldier", nodes)).toBe("Soldier 3");
  });

  it("extracts explicit hierarchy names from natural language", () => {
    expect(hierarchyNameFromCommandText("Create a Design Commander under Iron House Gym", "commander", nodes)).toBe("Design Commander");
    expect(hierarchyNameFromCommandText("Create Typography Soldier under Design Commander", "soldier", nodes)).toBe("Typography Soldier");
    expect(hierarchyNameFromCommandText("Create General for Iron House Gym", "general", nodes)).toBe("Iron House Gym General");
  });

  it("explains missing parent requirements with official v0.3 terminology", () => {
    expect(creationBlockedTransmission("general")).toMatchObject({
      recommendation: "Do not create Generals directly under ENTRAL.",
      situation: "General creation blocked by hierarchy requirements."
    });
    expect(creationBlockedTransmission("soldier").analysis).toContain("must belong to a Commander");
  });
});

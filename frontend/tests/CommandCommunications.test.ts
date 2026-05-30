import { describe, expect, it } from "vitest";
import {
  commandSourceLabel,
  commandSpeakerFromPrefix,
  commandSpeakerFromNodeType,
  formatCommandReport,
  statusLineForTransmission,
  stripCommandSourcePrefix
} from "../lib/command-communications";

describe("command communications", () => {
  it("formats command reports with operational sections", () => {
    expect(formatCommandReport({
      analysis: "Primary route is available.",
      nextActions: ["Assign Commander.", "Deploy Soldier."],
      recommendation: "Proceed through delegation chain.",
      situation: "Objective acknowledged."
    })).toContain("Situation:\nObjective acknowledged.");
  });

  it("labels every hierarchy speaker explicitly", () => {
    expect(commandSourceLabel("emperor")).toBe("[ENTRAL]");
    expect(commandSourceLabel("marshal")).toBe("[MARSHAL]");
    expect(commandSourceLabel("general")).toBe("[GENERAL]");
    expect(commandSourceLabel("commander")).toBe("[COMMANDER]");
    expect(commandSourceLabel("soldier")).toBe("[SOLDIER]");
    expect(commandSourceLabel("operator")).toBe("[OPERATOR]");
  });

  it("maps node types to speaking levels", () => {
    expect(commandSpeakerFromNodeType("marshal")).toBe("marshal");
    expect(commandSpeakerFromNodeType("general")).toBe("general");
    expect(commandSpeakerFromNodeType(null)).toBe("emperor");
  });

  it("reads and strips source prefixes from model transmissions", () => {
    expect(commandSpeakerFromPrefix("[MARSHAL]\nTheater ready.")).toBe("marshal");
    expect(commandSpeakerFromPrefix("[COMMANDER]\nTask received.")).toBe("commander");
    expect(stripCommandSourcePrefix("[ENTRAL]\nSituation:\nOnline.")).toBe("Situation:\nOnline.");
  });

  it("extracts a compact status line from reports", () => {
    expect(statusLineForTransmission("Situation:\nCommand online.\n\nAnalysis:\nStable.")).toBe("Command online.");
  });
});

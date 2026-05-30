import { describe, expect, it } from "vitest";
import {
  normalizeWakeWordCommand,
  sanitizeVoiceSettings,
  shouldSpeakTransmission,
  speechTextForTransmission
} from "../lib/voice-command";

describe("voice command utilities", () => {
  it("defaults to reports-only speech mode", () => {
    expect(sanitizeVoiceSettings({}).mode).toBe("reports");
  });

  it("routes wake-word commands when enabled", () => {
    expect(normalizeWakeWordCommand("ENTRAL, status report", true)).toEqual({
      accepted: true,
      command: "status report"
    });
    expect(normalizeWakeWordCommand("Marshal, report on Merch Marshal", true)).toEqual({
      accepted: true,
      command: "report on Merch Marshal"
    });
  });

  it("rejects commands without wake word when gated", () => {
    expect(normalizeWakeWordCommand("status report", true).accepted).toBe(false);
  });

  it("speaks only reports in reports mode", () => {
    expect(shouldSpeakTransmission("reports", "Situation:\nOperational readiness report.")).toBe(true);
    expect(shouldSpeakTransmission("reports", "Graph controls expanded.")).toBe(false);
  });

  it("prepares hierarchy source labels for speech", () => {
    expect(speechTextForTransmission("[MARSHAL]", "Situation:\nTheater ready.")).toContain("MARSHAL");
    expect(speechTextForTransmission("[GENERAL]", "Situation:\nBusiness ready.")).toContain("GENERAL");
  });
});

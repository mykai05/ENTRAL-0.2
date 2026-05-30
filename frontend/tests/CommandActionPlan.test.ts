import { describe, expect, it } from "vitest";
import { planCommandAction } from "../lib/command-action-plan";

describe("command action planning", () => {
  it("routes authorization language before other command handling", () => {
    expect(planCommandAction("Approve")).toMatchObject({
      kind: "approve_authorization"
    });
    expect(planCommandAction("Cancel")).toMatchObject({
      kind: "cancel_authorization"
    });
  });

  it("routes first-time user navigation commands to visible command centers", () => {
    expect(planCommandAction("show tasks")).toMatchObject({
      kind: "open_tasks"
    });
    expect(planCommandAction("open reports")).toMatchObject({
      kind: "open_reports"
    });
    expect(planCommandAction("show my businesses")).toMatchObject({
      kind: "open_businesses"
    });
  });

  it("routes hierarchy and status commands without treating them like generic chat", () => {
    expect(planCommandAction("show hierarchy")).toMatchObject({
      kind: "show_hierarchy"
    });
    expect(planCommandAction("show active Generals")).toMatchObject({
      kind: "show_active"
    });
    expect(planCommandAction("show failing operations")).toMatchObject({
      kind: "show_alerts"
    });
  });

  it("keeps guide commands distinct from normal voice settings", () => {
    expect(planCommandAction("show mobile guide")).toMatchObject({
      kind: "open_mobile_guide"
    });
    expect(planCommandAction("start voice guide")).toMatchObject({
      kind: "open_voice_settings"
    });
    expect(planCommandAction("start tutorial")).toMatchObject({
      kind: "open_tutorial"
    });
  });
});

import { describe, expect, it } from "vitest";
import { classifyAiRequest, createAiActionPlan, createAiAuditEntry } from "../lib/ai-brain";

describe("AI Brain request planning", () => {
  it("requires authorization for outbound email requests", () => {
    const classification = classifyAiRequest("Email the client a launch update through Gmail.");
    const plan = createAiActionPlan("Email the client a launch update through Gmail.");

    expect(classification.detectedIntent).toBe("email_request");
    expect(classification.requiredTools).toContain("gmail");
    expect(classification.authorizationRequirement).toBe("required");
    expect(plan.authorizationRequired).toBe(true);
  });

  it("routes merch/POD requests through connected tool planning", () => {
    const plan = createAiActionPlan("Create a Shopify POD store launch workflow with Printify products.");

    expect(plan.intent).toBe("merch_pod_workflow");
    expect(plan.toolsRequired).toEqual(expect.arrayContaining(["shopify", "printify"]));
    expect(plan.entitiesAffected).toEqual(expect.arrayContaining(["Marshal", "General", "Commander"]));
    expect(plan.authorizationRequired).toBe(true);
  });

  it("keeps normal conversation ungated", () => {
    const plan = createAiActionPlan("Hello, what is ENTRAL?");

    expect(plan.intent).toBe("conversation");
    expect(plan.toolsRequired).toEqual([]);
    expect(plan.authorizationRequired).toBe(false);
  });

  it("creates audit entries without claiming execution", () => {
    const plan = createAiActionPlan("Send an email to the client.");
    const auditEntry = createAiAuditEntry({ plan });

    expect(auditEntry.actionPlanId).toBe(plan.planId);
    expect(auditEntry.authorizationStatus).toBe("pending");
    expect(auditEntry.executionResult).toContain("No external action executed");
  });
});

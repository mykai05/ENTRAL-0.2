import { describe, expect, it } from "vitest";
import { classifyCommandIntent } from "../lib/command-intent";

describe("command intent classification", () => {
  it("recognizes help requests instead of treating help like a generic report", () => {
    expect(classifyCommandIntent("help")).toMatchObject({
      kind: "help_request",
      requiresAuthorization: false
    });
    expect(classifyCommandIntent("what can you do")).toMatchObject({
      kind: "help_request"
    });
  });

  it("recognizes structural creation requests as authorization-gated", () => {
    expect(classifyCommandIntent("Create a Merch Marshal")).toMatchObject({
      entityType: "marshal",
      kind: "entity_creation_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("Create a Typography Soldier under Design Commander")).toMatchObject({
      entityType: "soldier",
      kind: "entity_creation_request",
      requiresAuthorization: true
    });
  });

  it("recognizes business and template requests", () => {
    expect(classifyCommandIntent("I want to start a POD business")).toMatchObject({
      kind: "business_creation_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("I want to build a website agency")).toMatchObject({
      kind: "business_creation_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("create a website operation")).toMatchObject({
      kind: "business_creation_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("start an ecommerce brand")).toMatchObject({
      kind: "business_creation_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("show business templates")).toMatchObject({
      kind: "template_request",
      requiresAuthorization: false
    });
  });

  it("recognizes reports, navigation, tasks, and authorization responses", () => {
    expect(classifyCommandIntent("report on Merch Marshal").kind).toBe("report_request");
    expect(classifyCommandIntent("open Iron House Gym").kind).toBe("navigation_request");
    expect(classifyCommandIntent("Assign task to Design Commander").kind).toBe("task_request");
    expect(classifyCommandIntent("Approve").kind).toBe("authorization_approval");
    expect(classifyCommandIntent("Cancel").kind).toBe("authorization_cancel");
  });

  it("marks risky updates and workflows as authorization-gated", () => {
    expect(classifyCommandIntent("Move SEO Soldier under Listing Commander")).toMatchObject({
      kind: "entity_update_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("Archive this General")).toMatchObject({
      kind: "entity_deletion_request",
      requiresAuthorization: true
    });
    expect(classifyCommandIntent("Start merch store launch workflow")).toMatchObject({
      kind: "task_request",
      requiresAuthorization: true
    });
  });
});

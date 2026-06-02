import { describe, expect, it } from "vitest";
import { buildMockToolExecution, buildToolTestResult, defaultToolRegistry, requiredToolsForMessage, toolById, toolsByCategory } from "../lib/tool-registry";

describe("Tool Registry", () => {
  it("maps natural requests to required tools", () => {
    const tools = requiredToolsForMessage("Deploy to Vercel, push to GitHub, and draft an email.");

    expect(tools).toEqual(expect.arrayContaining(["vercel", "github", "gmail"]));
  });

  it("groups tools by category", () => {
    const grouped = toolsByCategory();
    const openai = toolById("openai");

    expect(grouped.AI.length).toBeGreaterThan(0);
    expect(grouped.Development.length).toBeGreaterThan(0);
    expect(grouped.Deployment.length).toBeGreaterThan(0);
    expect(openai?.providerName).toBe("OpenAI");
    expect(openai?.missingEnvVars).toContain("OPENAI_API_KEY");
    expect(toolById("github")?.readOnly).toBe(true);
    expect(toolById("vercel")?.writeActionsEnabled).toBe(false);
  });

  it("prepares safe mock execution results", () => {
    const tool = toolById("shopify");

    expect(tool).toBeDefined();
    const result = buildMockToolExecution(tool!, "Create a store draft.");

    expect(result.message).toContain("mock execution prepared");
    expect(result.simulatedResult).toContain("Create a store draft");
  });

  it("does not mark missing credentials as connected", () => {
    const tool = toolById("github");

    expect(tool).toBeDefined();
    const result = buildToolTestResult(tool!);

    expect(result.success).toBe(false);
    expect(result.readOnly).toBe(true);
    expect(result.message).toContain("Required credentials");
  });

  it("keeps tool copy explicit about mock mode and approval gates", () => {
    const registryCopy = JSON.stringify(defaultToolRegistry).toLowerCase();

    expect(registryCopy).not.toMatch(/\btor\b/);
    expect(toolById("shopify")?.description).toContain("after approval");
    expect(toolById("social-publisher")?.description).toContain("explicit approval");
  });
});

import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  assignAgentTaskSchema,
  createAutomationJobSchema,
  createAgentSchema,
  createAgentScheduleSchema,
  loginSchema,
  createPolicySchema,
  screenInsightSchema,
  signupSchema,
  taskListQuerySchema
} from "../src/schemas.js";

describe("validation schemas", () => {
  it("normalizes signup email addresses", () => {
    const result = signupSchema.parse({
      name: "Ada Lovelace",
      email: " ADA@Example.COM ",
      password: "a-secure-password"
    });

    expect(result.email).toBe("ada@example.com");
  });

  it("rejects short signup passwords", () => {
    expect(() => signupSchema.parse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "short"
    })).toThrow();
  });

  it("allows compact login payloads", () => {
    const result = loginSchema.parse({
      email: "ada@example.com",
      password: "secret"
    });

    expect(result.email).toBe("ada@example.com");
  });

  it("caps task pagination at 50 rows", () => {
    expect(() => taskListQuerySchema.parse({ pageSize: "51" })).toThrow();
  });

  it("rejects empty chat messages", () => {
    expect(() => chatMessageSchema.parse({ message: "   " })).toThrow();
  });

  it("rejects script tags in chat messages", () => {
    expect(() => chatMessageSchema.parse({ message: "<script>alert('x')</script>" })).toThrow(/script/i);
  });

  it("treats a null chat conversation id as a new conversation", () => {
    const result = chatMessageSchema.parse({
      conversationId: null,
      message: "Start a fresh chat."
    });

    expect(result.conversationId).toBeUndefined();
  });

  it("validates screen insight payloads without storing image data", () => {
    const result = screenInsightSchema.parse({
      conversationId: null,
      message: "What do you see on my screen?",
      screenshot: "data:image/jpeg;base64,aGVsbG8="
    });

    expect(result.conversationId).toBeUndefined();
    expect(result.screenshot).toContain("data:image/jpeg;base64,");
  });

  it("validates scrape automation jobs", () => {
    const result = createAutomationJobSchema.parse({
      type: "scrape",
      payload: {
        url: "http://localhost:3000",
        selector: "h1"
      }
    });

    expect(result.payload.selector).toBe("h1");
  });

  it("validates agent profiles and task assignments", () => {
    const agent = createAgentSchema.parse({
      name: "Researcher",
      role: "Find and summarize useful context",
      capabilities: ["research", "summarize"]
    });
    const task = assignAgentTaskSchema.parse({
      title: "Research target account",
      action: "research",
      payload: {
        instructions: "Find public details and summarize them.",
        sourceType: "manual"
      }
    });

    expect(agent.capabilities).toContain("research");
    expect(agent.runInBackground).toBe(true);
    expect(task.action).toBe("research");
  });

  it("validates autonomous agent schedules", () => {
    const schedule = createAgentScheduleSchema.parse({
      title: "Daily account pulse",
      action: "research",
      intervalMinutes: 15,
      payload: {
        instructions: "Summarize changes once per day."
      },
      runImmediately: true
    });

    expect(schedule.payload.sourceType).toBe("schedule");
  });

  it("validates policy rules", () => {
    const policy = createPolicySchema.parse({
      name: "Block private keys",
      severity: "high",
      rule: {
        kind: "blocked_keywords",
        keywords: ["private key"]
      }
    });

    expect(policy.effect).toBe("block");
  });
});

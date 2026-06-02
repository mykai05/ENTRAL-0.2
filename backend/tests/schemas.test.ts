import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  assignAgentTaskSchema,
  createClientMerchStoreSchema,
  createAutomationJobSchema,
  createAgentSchema,
  createAgentScheduleSchema,
  createPodProductSchema,
  complianceCheckSchema,
  generateProductBatchSchema,
  growthApprovalPacketParamsSchema,
  loginSchema,
  merchReportParamsSchema,
  pricingCalculatorSchema,
  requestGrowthApprovalSchema,
  reviewGrowthApprovalSchema,
  createPolicySchema,
  commandOSSnapshotSchema,
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

  it("validates a compact Command OS snapshot payload", () => {
    const result = commandOSSnapshotSchema.parse({
      source: "dashboard",
      state: {
        edges: [],
        groups: [{ color: "#00F0FF", id: "core", name: "ENTRAL Core" }],
        nodes: [
          {
            children: [],
            commandType: "emperor",
            currentTask: null,
            groupId: "core",
            id: "entral",
            logs: ["ENTRAL online."],
            memory: {
              instructions: "Preserve command memory.",
              notes: [],
              recentTasks: [],
              role: "Strategic Command",
              taskResults: []
            },
            name: "ENTRAL",
            parentId: null,
            status: "thinking",
            taskHistory: [],
            type: "core"
          }
        ],
        tasks: []
      }
    });

    expect(result.state.nodes[0].commandType).toBe("emperor");
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

  it("validates client merch stores with controlled launch states", () => {
    const store = createClientMerchStoreSchema.parse({
      clientName: "Northline Fitness",
      businessName: "Northline Gym",
      contactName: "Jordan Lee",
      email: " JORDAN@NORTHLINE.COM ",
      industry: "Fitness",
      audience: "Local gym members and online training clients",
      brandStyle: "Bold monochrome streetwear with electric accent colors",
      productTypes: ["T-shirts", "Hoodies"],
      designCount: 12,
      setupFee: 499,
      monthlyFee: 99,
      profitShare: 15,
      approvalStatus: "Designs Pending",
      launchStatus: "Designing",
      commandMarshalId: "merch-marshal",
      commandMarshalName: "Merch Marshal",
      commandGeneralId: "iron-house-gym-general",
      commandGeneralName: "Iron House Gym General"
    });

    expect(store.email).toBe("jordan@northline.com");
    expect(store.storePlatform).toBe("Etsy");
    expect(store.podProvider).toBe("Printify");
    expect(store.launchStatus).toBe("Designing");
    expect(store.commandMarshalName).toBe("Merch Marshal");
    expect(store.commandGeneralName).toBe("Iron House Gym General");
  });

  it("rejects invalid client merch store status values", () => {
    expect(() => createClientMerchStoreSchema.parse({
      clientName: "Northline Fitness",
      businessName: "Northline Gym",
      contactName: "Jordan Lee",
      email: "jordan@northline.com",
      industry: "Fitness",
      audience: "Local gym members",
      brandStyle: "Bold",
      approvalStatus: "Approved"
    })).toThrow();
  });

  it("validates POD products with controlled production status", () => {
    const product = createPodProductSchema.parse({
      storeId: "clx0b5v8g000008l58v3n0wz0",
      productName: "Founders Club Hoodie",
      productType: "Hoodie",
      targetAudience: "Gym founders and premium coaching clients",
      designTheme: "Minimal command typography",
      designConcept: "A clean front badge with a bold back statement",
      designPrompt: "Create a premium matte black hoodie graphic with subtle cyan command-line accents.",
      typographyDirection: "Condensed sans serif, uppercase, high spacing",
      colorDirection: "Black, ivory, and electric cyan",
      tags: ["fitness", "founder", "premium"],
      aiDisclosureNeeded: true,
      productionPartnerDisclosureNeeded: true,
      status: "Awaiting Approval",
      commandMarshalId: "merch-marshal",
      commandMarshalName: "Merch Marshal",
      commandGeneralId: "iron-house-gym-general",
      commandGeneralName: "Iron House Gym General",
      commandCommanderId: "design-commander",
      commandCommanderName: "Design Commander",
      commandSoldierId: "prompt-soldier",
      commandSoldierName: "Prompt Soldier"
    });

    expect(product.status).toBe("Awaiting Approval");
    expect(product.supplierCost).toBe(0);
    expect(product.tags).toContain("premium");
    expect(product.commandMarshalName).toBe("Merch Marshal");
    expect(product.commandGeneralName).toBe("Iron House Gym General");
  });

  it("rejects invalid POD product status values", () => {
    expect(() => createPodProductSchema.parse({
      storeId: "clx0b5v8g000008l58v3n0wz0",
      productName: "Founders Club Hoodie",
      productType: "Hoodie",
      targetAudience: "Gym founders",
      designTheme: "Minimal",
      designConcept: "Front badge",
      designPrompt: "Create a hoodie design.",
      typographyDirection: "Bold uppercase",
      colorDirection: "Black and cyan",
      status: "Ready"
    })).toThrow();
  });

  it("allows rejected POD products in the approval queue", () => {
    const product = createPodProductSchema.parse({
      storeId: "clx0b5v8g000008l58v3n0wz0",
      productName: "Founders Club Hoodie",
      productType: "Hoodie",
      targetAudience: "Gym founders",
      designTheme: "Minimal",
      designConcept: "Front badge",
      designPrompt: "Create a hoodie design.",
      typographyDirection: "Bold uppercase",
      colorDirection: "Black and cyan",
      status: "Rejected"
    });

    expect(product.status).toBe("Rejected");
  });

  it("validates product batch generator inputs with fixed batch sizes", () => {
    const batch = generateProductBatchSchema.parse({
      audience: "Local gym members and online training clients",
      priceRange: {
        max: 48,
        min: 24
      },
      productCount: 10,
      productTypes: ["T-shirts", "Hoodies"],
      riskTolerance: "Medium",
      storeId: "clx0b5v8g000008l58v3n0wz0",
      styleDirection: "Bold monochrome streetwear with electric accent colors"
    });

    expect(batch.productCount).toBe(10);
    expect(batch.productTypes).toContain("Hoodies");
  });

  it("rejects unsupported product batch sizes", () => {
    expect(() => generateProductBatchSchema.parse({
      audience: "Local gym members",
      priceRange: {
        max: 48,
        min: 24
      },
      productCount: 7,
      productTypes: ["T-shirts"],
      storeId: "clx0b5v8g000008l58v3n0wz0",
      styleDirection: "Bold monochrome streetwear"
    })).toThrow();
  });

  it("validates compliance checks, pricing inputs, and merch report params", () => {
    const compliance = complianceCheckSchema.parse({
      aiDisclosureNeeded: true,
      productionPartnerDisclosureNeeded: true,
      productName: "Original Gym Shirt",
      tags: ["fitness", "training"],
      typographyDirection: "Clean uppercase"
    });
    const pricing = pricingCalculatorSchema.parse({
      adSpendEstimate: 2,
      preset: "Etsy",
      retailPrice: 32,
      shippingCost: 4.95,
      supplierCost: 9.8
    });
    const reportParams = merchReportParamsSchema.parse({
      reportType: "Client Update Report",
      storeId: "clx0b5v8g000008l58v3n0wz0"
    });

    expect(compliance.productName).toBe("Original Gym Shirt");
    expect(pricing.preset).toBe("Etsy");
    expect(reportParams.reportType).toBe("Client Update Report");
  });

  it("validates growth approval scheduling and review inputs", () => {
    const approvalRequest = requestGrowthApprovalSchema.parse({
      note: "Review before any social, Shopify, ad, or analytics work leaves ENTRAL.",
      scheduledFor: "2026-06-03T16:00:00.000Z"
    });
    const params = growthApprovalPacketParamsSchema.parse({
      packetId: "clx0b5v8g000008l58v3n0wz1",
      storeId: "clx0b5v8g000008l58v3n0wz0"
    });
    const review = reviewGrowthApprovalSchema.parse({
      note: "Approved for preparation only; external execution remains locked."
    });

    expect(approvalRequest.scheduledFor).toBe("2026-06-03T16:00:00.000Z");
    expect(params.packetId).toBe("clx0b5v8g000008l58v3n0wz1");
    expect(review.note).toContain("external execution remains locked");
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

  it("validates background agent schedules", () => {
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

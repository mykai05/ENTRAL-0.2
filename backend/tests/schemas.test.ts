import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  assignAgentTaskSchema,
  applyBrowserOperationsRecoverySchema,
  applyRevenueBusinessFleetGapAccelerationSchema,
  applyRevenueBusinessFleetLiveLaunchPackageSchema,
  applyRevenueBusinessFleetSeedGapSchema,
  applyRevenueBusinessFleetLaunchWaveSchema,
  createClientMerchStoreSchema,
  createAutomationJobSchema,
  createAgentSchema,
  createAgentScheduleSchema,
  applyPortfolioCommandCenterSchema,
  applyFinancialReleaseGovernanceSchema,
  ingestFinancialScalingExecutionLedgerSchema,
  applyFinancialScalingSpendControlSchema,
  applyFinancialOrchestratorSchema,
  applyFacelessContentPipelineSchema,
  applyRevenueDigitalProductSchema,
  applyRevenueLaunchHandoffSchema,
  applyRevenueLaunchHandoffControlSchema,
  applyRevenueLaunchClosureLedgerSchema,
  applyRevenueLiveConnectorReadinessSchema,
  applyRevenueLaunchOperationsPackSchema,
  applyRevenuePerformanceRotationSchema,
  applyRevenueAutopilotSchema,
  applySignalIntakeSchema,
  createPodProductSchema,
  complianceCheckSchema,
  generateProductBatchSchema,
  growthApprovalPacketParamsSchema,
  ingestRevenuePerformanceSchema,
  loginSchema,
  merchReportParamsSchema,
  applyRevenueLaunchPipelineSchema,
  applyRevenueListingOptimizationSchema,
  applyRevenueRotationSchema,
  applyRevenueStoreSetupSchema,
  pricingCalculatorSchema,
  providerPayloadQuerySchema,
  portfolioCommandCenterQuerySchema,
  financialOrchestratorQuerySchema,
  financialPayoutIntentParamsSchema,
  financialScalingBudgetPacketParamsSchema,
  facelessContentPipelineQuerySchema,
  ingestFacelessContentPerformanceSchema,
  revenueAutopilotQuerySchema,
  revenueDigitalProductQuerySchema,
  revenueLaunchHandoffQuerySchema,
  revenueLaunchHandoffControlParamsSchema,
  revenueLaunchHandoffControlQuerySchema,
  revenueLaunchClosureLedgerQuerySchema,
  revenueLiveConnectorReadinessQuerySchema,
  revenueLaunchOperationsPackQuerySchema,
  applyRevenueLaunchChecklistActionBridgeSchema,
  applyRevenueLaunchSprintSchema,
  applyRevenueFirstBusinessLaunchSchema,
  applyRevenueFirstCashSprintSchema,
  revenueLaunchChecklistActionBridgeQuerySchema,
  revenueLaunchChecklistQuerySchema,
  revenueLaunchReadinessQuerySchema,
  revenueFirstBusinessLaunchQuerySchema,
  revenueFirstCashReadinessQuerySchema,
  revenueFirstCashSprintQuerySchema,
  revenueLaunchPipelineQuerySchema,
  revenueListingOptimizationQuerySchema,
  revenueAssetControlLedgerQuerySchema,
  revenueAssetReviewQueueQuerySchema,
  revenueBusinessFleetLaunchGateQuerySchema,
  revenueBusinessFleetSchedulerQuerySchema,
  revenueEngineQuerySchema,
  revenuePerformanceQuerySchema,
  revenueStoreSetupQuerySchema,
  reviewFinancialPayoutIntentSchema,
  reviewFinancialScalingBudgetPacketSchema,
  requestProviderPayloadApprovalSchema,
  requestGrowthApprovalSchema,
  reviewGrowthApprovalSchema,
  signalIntakeQuerySchema,
  createPolicySchema,
  commandOSSnapshotSchema,
  browserOperationsQuerySchema,
  executeRevenueAutopilotSchema,
  applyRevenueOpportunityControlSchema,
  applyRevenueOpportunityFactorySchema,
  applyRevenueSignalConnectorSchema,
  applyRevenueSignalConnectorApprovalSchema,
  applyRevenueSignalImportJobSchema,
  applyRevenueSignalImportHandoffSchema,
  revenueSignalConnectorQuerySchema,
  revenueSignalConnectorApprovalParamsSchema,
  revenueSignalConnectorApprovalQuerySchema,
  revenueSignalImportHandoffQuerySchema,
  reviewRevenueSignalConnectorApprovalSchema,
  revenueOpportunityControlParamsSchema,
  revenueOpportunityControlQuerySchema,
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

  it("validates browser operations query and recovery gates", () => {
    const query = browserOperationsQuerySchema.parse({
      includeCompleted: "true",
      maxRecoveryJobs: "8",
      staleRunningMinutes: "45",
      windowHours: "48"
    });

    const recovery = applyBrowserOperationsRecoverySchema.parse({
      confirm: "APPLY INTERNAL BROWSER RECOVERY ACTIONS",
      dryRun: true,
      maxRecoveryJobs: 4
    });

    expect(query.includeCompleted).toBe(true);
    expect(query.maxRecoveryJobs).toBe(8);
    expect(query.staleRunningMinutes).toBe(45);
    expect(query.windowHours).toBe(48);
    expect(recovery.dryRun).toBe(true);
    expect(recovery.maxRecoveryJobs).toBe(4);
    expect(() => applyBrowserOperationsRecoverySchema.parse({
      confirm: "APPLY",
      dryRun: false
    })).toThrow();
  });

  it("validates signal intake options and approved read-only confirmation", () => {
    const query = signalIntakeQuerySchema.parse({
      includeSamplePayloads: "false",
      maxSignals: "12",
      windowDays: "14"
    });
    const intake = applySignalIntakeSchema.parse({
      commerceSignals: [{
        grossRevenue: 240,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        source: "etsy",
        storeId: "clx0b5v8g000008l58v3n0wz0",
        unitsSold: 8,
        visits: 320
      }],
      confirm: "INGEST APPROVED READ-ONLY SIGNALS",
      dryRun: true,
      paymentSignals: [{
        availableBalance: 180,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        provider: "stripe"
      }]
    });

    expect(query.includeSamplePayloads).toBe(false);
    expect(query.maxSignals).toBe(12);
    expect(query.windowDays).toBe(14);
    expect(intake.dryRun).toBe(true);
    expect(intake.commerceSignals[0].platformFees).toBe(0);
    expect(intake.paymentSignals[0].currency).toBe("USD");
    expect(() => applySignalIntakeSchema.parse({
      confirm: "INGEST APPROVED READ-ONLY SIGNALS"
    })).toThrow();
    expect(() => applySignalIntakeSchema.parse({
      confirm: "INGEST",
      paymentSignals: [{
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z"
      }]
    })).toThrow();
  });

  it("validates read-only signal connector options and manifest recording", () => {
    const query = revenueSignalConnectorQuerySchema.parse({
      includeCommerce: "false",
      includeContent: "true",
      includePayments: "true",
      maxConnectors: "9",
      onlyReady: "true",
      windowDays: "21"
    });
    const apply = applyRevenueSignalConnectorSchema.parse({
      confirm: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
      dryRun: true,
      manifestIds: ["readonly_signal_connector:commerce:etsy:store_1:product_1"],
      note: "Record approved manifests only."
    });

    expect(query.includeCommerce).toBe(false);
    expect(query.includeContent).toBe(true);
    expect(query.includePayments).toBe(true);
    expect(query.maxConnectors).toBe(9);
    expect(query.onlyReady).toBe(true);
    expect(query.windowDays).toBe(21);
    expect(apply.dryRun).toBe(true);
    expect(apply.manifestIds).toHaveLength(1);
    expect(() => applyRevenueSignalConnectorSchema.parse({
      confirm: "RECORD",
      manifestIds: []
    })).toThrow();
    expect(() => revenueSignalConnectorQuerySchema.parse({
      maxConnectors: 0
    })).toThrow();
  });

  it("validates durable signal connector approval and import-job gates", () => {
    const query = revenueSignalConnectorApprovalQuerySchema.parse({
      includeArchived: "true",
      maxRecords: "25",
      onlyReady: "true"
    });
    const queue = applyRevenueSignalConnectorApprovalSchema.parse({
      confirm: "QUEUE READONLY SIGNAL CONNECTOR APPROVALS",
      dryRun: true,
      manifestIds: ["readonly_signal_connector:commerce:etsy:store_1:product_1"],
      note: "Queue approval."
    });
    const params = revenueSignalConnectorApprovalParamsSchema.parse({
      approvalId: "approval_1"
    });
    const review = reviewRevenueSignalConnectorApprovalSchema.parse({
      action: "approve",
      confirm: "APPROVE READONLY SIGNAL CONNECTOR",
      note: "Approved for internal import job queueing."
    });
    const importJobs = applyRevenueSignalImportJobSchema.parse({
      approvalIds: ["approval_1"],
      confirm: "QUEUE READONLY SIGNAL IMPORT JOBS",
      dryRun: true
    });
    const handoffQuery = revenueSignalImportHandoffQuerySchema.parse({
      includeArchived: "false",
      maxJobs: "12",
      maxSignals: "20",
      windowDays: "14"
    });
    const handoff = applyRevenueSignalImportHandoffSchema.parse({
      confirm: "INGEST QUEUED READONLY SIGNAL IMPORT JOBS",
      dryRun: true,
      importJobIds: ["signal_import_job_1"],
      maxJobs: 12,
      maxSignals: 20
    });

    expect(query.includeArchived).toBe(true);
    expect(query.maxRecords).toBe(25);
    expect(query.onlyReady).toBe(true);
    expect(queue.dryRun).toBe(true);
    expect(queue.manifestIds).toHaveLength(1);
    expect(params.approvalId).toBe("approval_1");
    expect(review.action).toBe("approve");
    expect(importJobs.approvalIds).toEqual(["approval_1"]);
    expect(handoffQuery.maxJobs).toBe(12);
    expect(handoffQuery.maxSignals).toBe(20);
    expect(handoffQuery.windowDays).toBe(14);
    expect(handoff.importJobIds).toEqual(["signal_import_job_1"]);
    expect(() => applyRevenueSignalConnectorApprovalSchema.parse({
      confirm: "QUEUE",
      dryRun: true
    })).toThrow();
    expect(() => reviewRevenueSignalConnectorApprovalSchema.parse({
      action: "reject",
      confirm: "APPROVE READONLY SIGNAL CONNECTOR"
    })).toThrow();
    expect(() => applyRevenueSignalImportJobSchema.parse({
      confirm: "QUEUE IMPORTS"
    })).toThrow();
    expect(() => applyRevenueSignalImportHandoffSchema.parse({
      confirm: "INGEST",
      importJobIds: []
    })).toThrow();
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

  it("validates revenue engine thresholds and rotation confirmation", () => {
    const query = revenueEngineQuerySchema.parse({
      maxRotationUpdates: "10",
      minProductMargin: "25",
      minProductProfit: "8"
    });
    const rotation = applyRevenueRotationSchema.parse({
      confirm: "APPLY INTERNAL ROTATION",
      dryRun: true,
      scaleProductMargin: 40,
      scaleProductProfit: 14
    });

    expect(query.maxRotationUpdates).toBe(10);
    expect(query.minProductMargin).toBe(25);
    expect(rotation.dryRun).toBe(true);
    expect(rotation.scaleProductProfit).toBe(14);
    expect(() => applyRevenueRotationSchema.parse({ confirm: "GO" })).toThrow();
  });

  it("validates business fleet scheduler capacity options", () => {
    const query = revenueBusinessFleetSchedulerQuerySchema.parse({
      launchWaveSize: "10",
      maxParallelLaunches: "10",
      qualityFloor: "72",
      shardCount: "64",
      targetBusinesses: "2500"
    });
    const apply = applyRevenueBusinessFleetLaunchWaveSchema.parse({
      businessIds: ["store-1"],
      confirm: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE",
      dryRun: true,
      launchWaveSize: 10
    });
    const seedGap = applyRevenueBusinessFleetSeedGapSchema.parse({
      confirm: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      dryRun: true,
      maxSeeds: "10",
      podProvider: "Printify",
      sourceKeys: ["entral-private-revenue-lane-1"]
    });
    const acceleration = applyRevenueBusinessFleetGapAccelerationSchema.parse({
      confirm: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
      dryRun: true,
      maxStores: "10",
      sourceKeys: ["entral-private-revenue-lane-1"]
    });
    const livePackage = applyRevenueBusinessFleetLiveLaunchPackageSchema.parse({
      confirm: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE",
      dryRun: true,
      maxStores: "10",
      sourceKeys: ["entral-private-revenue-lane-1"]
    });
    const launchGate = revenueBusinessFleetLaunchGateQuerySchema.parse({
      maxStores: "10",
      sourceKeys: "entral-private-revenue-lane-1,entral-private-revenue-lane-2"
    });

    expect(query).toMatchObject({
      launchWaveSize: 10,
      maxParallelLaunches: 10,
      qualityFloor: 72,
      shardCount: 64,
      targetBusinesses: 2500
    });
    expect(query.maxParallelScaleActions).toBe(25);
    expect(apply.businessIds).toEqual(["store-1"]);
    expect(apply.dryRun).toBe(true);
    expect(seedGap.dryRun).toBe(true);
    expect(seedGap.maxSeeds).toBe(10);
    expect(seedGap.sourceKeys).toEqual(["entral-private-revenue-lane-1"]);
    expect(acceleration.dryRun).toBe(true);
    expect(acceleration.includeLaunchPipeline).toBe(true);
    expect(acceleration.includeListingOptimization).toBe(true);
    expect(acceleration.includeStoreSetup).toBe(true);
    expect(acceleration.maxStores).toBe(10);
    expect(livePackage.includeProviderApprovals).toBe(true);
    expect(livePackage.includeHandoffPackets).toBe(true);
    expect(livePackage.includeOperationsPacks).toBe(true);
    expect(livePackage.maxStores).toBe(10);
    expect(launchGate.maxStores).toBe(10);
    expect(launchGate.sourceKeys).toEqual(["entral-private-revenue-lane-1", "entral-private-revenue-lane-2"]);
    expect(() => revenueBusinessFleetSchedulerQuerySchema.parse({ launchWaveSize: "0" })).toThrow();
    expect(() => revenueBusinessFleetSchedulerQuerySchema.parse({ shardCount: "300" })).toThrow();
    expect(() => revenueBusinessFleetSchedulerQuerySchema.parse({ targetBusinesses: "100001" })).toThrow();
    expect(() => applyRevenueBusinessFleetLaunchWaveSchema.parse({ confirm: "RUN" })).toThrow();
    expect(() => applyRevenueBusinessFleetSeedGapSchema.parse({ confirm: "CREATE" })).toThrow();
    expect(() => applyRevenueBusinessFleetSeedGapSchema.parse({
      confirm: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      maxSeeds: 26
    })).toThrow();
    expect(() => applyRevenueBusinessFleetGapAccelerationSchema.parse({ confirm: "RUN" })).toThrow();
    expect(() => applyRevenueBusinessFleetGapAccelerationSchema.parse({
      confirm: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
      maxStores: 26
    })).toThrow();
    expect(() => applyRevenueBusinessFleetLiveLaunchPackageSchema.parse({ confirm: "RECORD" })).toThrow();
    expect(() => applyRevenueBusinessFleetLiveLaunchPackageSchema.parse({
      confirm: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE",
      maxStores: 26
    })).toThrow();
    expect(() => revenueBusinessFleetLaunchGateQuerySchema.parse({ maxStores: 26 })).toThrow();
  });

  it("validates revenue asset control ledger filters", () => {
    const query = revenueAssetControlLedgerQuerySchema.parse({
      action: "watch",
      assetId: "product-2",
      assetType: "product",
      fromDate: "2026-06-01",
      includeOverridesOnly: "true",
      limit: "25",
      storeId: "store-2",
      toDate: "2026-06-03"
    });

    expect(query).toMatchObject({
      action: "watch",
      assetId: "product-2",
      assetType: "product",
      fromDate: "2026-06-01",
      includeOverridesOnly: true,
      limit: 25,
      storeId: "store-2",
      toDate: "2026-06-03"
    });
    expect(() => revenueAssetControlLedgerQuerySchema.parse({ action: "revise" })).toThrow();
    expect(() => revenueAssetControlLedgerQuerySchema.parse({ fromDate: "2026-06-04", toDate: "2026-06-03" })).toThrow();
    expect(() => revenueAssetControlLedgerQuerySchema.parse({ limit: "1000" })).toThrow();
  });

  it("validates revenue asset review queue options", () => {
    const query = revenueAssetReviewQueueQuerySchema.parse({
      includeWatch: "true",
      maxItems: "12",
      staleAfterDays: "21"
    });

    expect(query).toMatchObject({
      includeWatch: true,
      maxItems: 12,
      staleAfterDays: 21
    });
    expect(() => revenueAssetReviewQueueQuerySchema.parse({ maxItems: "200" })).toThrow();
    expect(() => revenueAssetReviewQueueQuerySchema.parse({ staleAfterDays: "0" })).toThrow();
  });

  it("validates portfolio command center options and confirmation", () => {
    const query = portfolioCommandCenterQuerySchema.parse({
      includeCommandHistory: "12",
      includeContent: "false",
      maxActions: "8",
      windowDays: "14"
    });
    const apply = applyPortfolioCommandCenterSchema.parse({
      confirm: "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS",
      dryRun: true,
      includeFinance: "false",
      maxActions: 5
    });

    expect(query.includeCommandHistory).toBe(12);
    expect(query.includeContent).toBe(false);
    expect(query.includeFinance).toBe(true);
    expect(query.maxActions).toBe(8);
    expect(query.windowDays).toBe(14);
    expect(apply.dryRun).toBe(true);
    expect(apply.includeFinance).toBe(false);
    expect(apply.maxActions).toBe(5);
    expect(() => applyPortfolioCommandCenterSchema.parse({ confirm: "APPLY" })).toThrow();
  });

  it("validates revenue autopilot options and confirmation", () => {
    const query = revenueAutopilotQuerySchema.parse({
      includeContent: "false",
      includeFinance: "true",
      includeSignalIntake: "false",
      maxActions: "9",
      mode: "velocity",
      windowDays: "14"
    });
    const apply = applyRevenueAutopilotSchema.parse({
      confirm: "RUN INTERNAL REVENUE AUTOPILOT",
      dryRun: true,
      includeFinance: "false",
      maxActions: 6,
      mode: "conservative"
    });
    const execute = executeRevenueAutopilotSchema.parse({
      actions: ["run_first_business_launch", "run_first_cash_sprint", "apply_listing_optimization", "seed_launch_products"],
      confirm: "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS",
      dryRun: true,
      maxSteps: "4",
      mode: "velocity"
    });

    expect(query.includeContent).toBe(false);
    expect(query.includeFinance).toBe(true);
    expect(query.includeSignalIntake).toBe(false);
    expect(query.maxActions).toBe(9);
    expect(query.mode).toBe("velocity");
    expect(query.windowDays).toBe(14);
    expect(apply.dryRun).toBe(true);
    expect(apply.includeFinance).toBe(false);
    expect(apply.maxActions).toBe(6);
    expect(apply.mode).toBe("conservative");
    expect(execute.actions).toEqual(["run_first_business_launch", "run_first_cash_sprint", "apply_listing_optimization", "seed_launch_products"]);
    expect(execute.includeDraftCreation).toBe(false);
    expect(execute.includeLaunchApprovalPackets).toBe(false);
    expect(execute.maxSteps).toBe(4);
    expect(execute.mode).toBe("velocity");
    expect(() => applyRevenueAutopilotSchema.parse({ confirm: "RUN" })).toThrow();
    expect(() => executeRevenueAutopilotSchema.parse({ confirm: "EXECUTE" })).toThrow();
  });

  it("validates revenue opportunity factory defaults and confirmation", () => {
    const input = applyRevenueOpportunityFactorySchema.parse({
      businessName: "Signal Forge",
      confirm: "CREATE INTERNAL REVENUE OPPORTUNITY",
      dryRun: true,
      idea: "Private operational merch line for funding ENTRAL product advancement",
      productCount: "5"
    });

    expect(input.businessName).toBe("Signal Forge");
    expect(input.dryRun).toBe(true);
    expect(input.podProvider).toBe("Printify");
    expect(input.priceRange).toEqual({ max: 64, min: 18 });
    expect(input.productCount).toBe(5);
    expect(input.productTypes).toEqual([]);
    expect(input.riskTolerance).toBe("Low");
    expect(input.storePlatform).toBe("Etsy");
    expect(() => applyRevenueOpportunityFactorySchema.parse({
      confirm: "CREATE",
      idea: "Private operational merch line"
    })).toThrow();
  });

  it("validates revenue opportunity control options, params, and confirmation", () => {
    const query = revenueOpportunityControlQuerySchema.parse({
      includeKilled: "true",
      maxOpportunities: "12",
      minApprovedProducts: "3",
      minListingReadyProducts: "4",
      minProductDrafts: "6",
      minReadinessForHandoff: "80",
      windowDays: "21"
    });
    const params = revenueOpportunityControlParamsSchema.parse({
      opportunityId: "revenue_opp_1"
    });
    const apply = applyRevenueOpportunityControlSchema.parse({
      confirm: "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL",
      dryRun: true,
      note: "Move to watch until another signal lands.",
      status: "watch"
    });

    expect(query.includeKilled).toBe(true);
    expect(query.maxOpportunities).toBe(12);
    expect(query.minApprovedProducts).toBe(3);
    expect(query.minListingReadyProducts).toBe(4);
    expect(query.minProductDrafts).toBe(6);
    expect(query.minReadinessForHandoff).toBe(80);
    expect(query.windowDays).toBe(21);
    expect(params.opportunityId).toBe("revenue_opp_1");
    expect(apply.dryRun).toBe(true);
    expect(apply.overrideReadiness).toBe(false);
    expect(apply.status).toBe("watch");
    expect(() => applyRevenueOpportunityControlSchema.parse({
      confirm: "UPDATE",
      status: "watch"
    })).toThrow();
    expect(() => applyRevenueOpportunityControlSchema.parse({
      confirm: "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL",
      status: "external_publish"
    })).toThrow();
  });

  it("validates revenue launch pipeline options and confirmation", () => {
    const query = revenueLaunchPipelineQuerySchema.parse({
      maxStores: "4",
      minApprovedProducts: "3",
      productCount: "10",
      riskTolerance: "Low"
    });
    const launchApply = applyRevenueLaunchPipelineSchema.parse({
      confirm: "CREATE INTERNAL LAUNCH QUEUE",
      dryRun: true,
      minPortfolioProductsPerStore: 8,
      productCount: 5
    });

    expect(query.maxStores).toBe(4);
    expect(query.minApprovedProducts).toBe(3);
    expect(query.productCount).toBe(10);
    expect(launchApply.dryRun).toBe(true);
    expect(launchApply.riskTolerance).toBe("Low");
    expect(() => applyRevenueLaunchPipelineSchema.parse({ confirm: "CREATE" })).toThrow();
  });

  it("validates revenue launch readiness board query options", () => {
    const query = revenueLaunchReadinessQuerySchema.parse({
      includeApprovalHistory: "false",
      maxStores: "8",
      minLaunchReadiness: "62",
      minProviderReadiness: "77"
    });

    expect(query.includeApprovalHistory).toBe(false);
    expect(query.maxStores).toBe(8);
    expect(query.minLaunchReadiness).toBe(62);
    expect(query.minProviderReadiness).toBe(77);
    expect(() => revenueLaunchReadinessQuerySchema.parse({
      maxStores: 0
    })).toThrow();
  });

  it("validates revenue launch checklist query options", () => {
    const query = revenueLaunchChecklistQuerySchema.parse({
      includeCompleted: "false",
      maxItems: "18",
      minPriorityScore: "42",
      windowDays: "21"
    });

    expect(query.includeCompleted).toBe(false);
    expect(query.maxItems).toBe(18);
    expect(query.minPriorityScore).toBe(42);
    expect(query.windowDays).toBe(21);
    expect(() => revenueLaunchChecklistQuerySchema.parse({
      maxItems: 0
    })).toThrow();
    expect(() => revenueLaunchChecklistQuerySchema.parse({
      minPriorityScore: 101
    })).toThrow();
  });

  it("validates revenue launch checklist action bridge query and dispatch gate", () => {
    const query = revenueLaunchChecklistActionBridgeQuerySchema.parse({
      includeCompleted: "false",
      maxActions: "4",
      maxItems: "18",
      minPriorityScore: "42",
      windowDays: "21"
    });
    const apply = applyRevenueLaunchChecklistActionBridgeSchema.parse({
      actionIds: ["store_1:ingest_import_handoff:signal_import_handoff"],
      confirm: "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
      dryRun: false,
      note: "Dispatch ready internal bridge actions only."
    });

    expect(query.includeCompleted).toBe(false);
    expect(query.maxActions).toBe(4);
    expect(query.maxItems).toBe(18);
    expect(query.minPriorityScore).toBe(42);
    expect(query.windowDays).toBe(21);
    expect(apply.actionIds).toHaveLength(1);
    expect(apply.dryRun).toBe(false);
    expect(() => revenueLaunchChecklistActionBridgeQuerySchema.parse({
      maxActions: 26
    })).toThrow();
    expect(() => applyRevenueLaunchChecklistActionBridgeSchema.parse({
      confirm: "DISPATCH",
      dryRun: true
    })).toThrow();
  });

  it("validates revenue launch sprint factory and cycle gate", () => {
    const sprint = applyRevenueLaunchSprintSchema.parse({
      businessName: "Sprint Forge",
      confirm: "RUN INTERNAL REVENUE LAUNCH SPRINT",
      dryRun: false,
      idea: "Private POD revenue sprint for validating internal launch orchestration.",
      maxActions: "5",
      maxCycles: "3",
      productCount: 10,
      productTypes: ["T-shirt", "Sticker"],
      riskTolerance: "Low"
    });

    expect(sprint.dryRun).toBe(false);
    expect(sprint.idea).toContain("Private POD");
    expect(sprint.maxActions).toBe(5);
    expect(sprint.maxCycles).toBe(3);
    expect(sprint.productCount).toBe(10);
    expect(sprint.storePlatform).toBe("Etsy");
    expect(() => applyRevenueLaunchSprintSchema.parse({
      confirm: "RUN",
      idea: "Private POD revenue sprint for validating internal launch orchestration."
    })).toThrow();
    expect(() => applyRevenueLaunchSprintSchema.parse({
      confirm: "RUN INTERNAL REVENUE LAUNCH SPRINT",
      maxCycles: 9
    })).toThrow();
  });

  it("validates first-cash readiness and sprint controls", () => {
    const readiness = revenueFirstCashReadinessQuerySchema.parse({
      includeBlocked: "false",
      maxCandidates: "6",
      targetDaysToFirstCash: "5"
    });
    const sprint = revenueFirstCashSprintQuerySchema.parse({
      includeBlocked: "true",
      maxCandidates: "8",
      maxSprintActions: "4",
      targetDaysToFirstCash: "7"
    });
    const apply = applyRevenueFirstCashSprintSchema.parse({
      confirm: "RUN INTERNAL FIRST CASH SPRINT",
      dryRun: false,
      maxSprintActions: 3,
      note: "Run ready first-cash bridge actions only.",
      sprintActionIds: ["first_cash:store_1:optimize_listings"]
    });
    const firstBusiness = revenueFirstBusinessLaunchQuerySchema.parse({
      maxCandidates: "7"
    });
    const firstBusinessApply = applyRevenueFirstBusinessLaunchSchema.parse({
      confirm: "RUN INTERNAL FIRST BUSINESS LAUNCH PATH",
      dryRun: true,
      maxCandidates: 7,
      sprintActionIds: ["first_cash:store_1:optimize_listings"]
    });

    expect(readiness.includeBlocked).toBe(false);
    expect(readiness.maxCandidates).toBe(6);
    expect(readiness.targetDaysToFirstCash).toBe(5);
    expect(sprint.maxSprintActions).toBe(4);
    expect(apply.dryRun).toBe(false);
    expect(apply.sprintActionIds).toHaveLength(1);
    expect(firstBusiness.maxCandidates).toBe(7);
    expect(firstBusinessApply.dryRun).toBe(true);
    expect(firstBusinessApply.sprintActionIds).toHaveLength(1);
    expect(() => revenueFirstCashSprintQuerySchema.parse({
      maxSprintActions: 26
    })).toThrow();
    expect(() => revenueFirstBusinessLaunchQuerySchema.parse({
      maxCandidates: 26
    })).toThrow();
    expect(() => applyRevenueFirstCashSprintSchema.parse({
      confirm: "RUN"
    })).toThrow();
    expect(() => applyRevenueFirstBusinessLaunchSchema.parse({
      confirm: "RUN"
    })).toThrow();
  });

  it("validates revenue launch handoff packet query options", () => {
    const query = revenueLaunchHandoffQuerySchema.parse({
      includeBlocked: "false",
      maxBundles: "7",
      minConnectorReadiness: "81",
      minLaunchReadiness: "72",
      minProviderReadiness: "79"
    });

    expect(query.includeBlocked).toBe(false);
    expect(query.maxBundles).toBe(7);
    expect(query.minConnectorReadiness).toBe(81);
    expect(query.minLaunchReadiness).toBe(72);
    expect(query.minProviderReadiness).toBe(79);
    expect(() => revenueLaunchHandoffQuerySchema.parse({
      maxBundles: 0
    })).toThrow();

    const apply = applyRevenueLaunchHandoffSchema.parse({
      confirm: "RECORD INTERNAL LAUNCH HANDOFF PACKETS",
      dryRun: true,
      maxBundles: "4"
    });

    expect(apply.dryRun).toBe(true);
    expect(apply.maxBundles).toBe(4);
    expect(() => applyRevenueLaunchHandoffSchema.parse({
      confirm: "RECORD"
    })).toThrow();
  });

  it("validates revenue launch operations pack query and audit gate", () => {
    const query = revenueLaunchOperationsPackQuerySchema.parse({
      includeBlocked: "false",
      maxPacks: "6",
      minConnectorReadiness: "82",
      minLaunchReadiness: "76",
      minProviderReadiness: "79"
    });
    const apply = applyRevenueLaunchOperationsPackSchema.parse({
      confirm: "RECORD INTERNAL LAUNCH OPERATIONS PACKS",
      dryRun: false,
      storeIds: ["store_1"],
      note: "Record selected manual launch pack."
    });

    expect(query.includeBlocked).toBe(false);
    expect(query.maxPacks).toBe(6);
    expect(query.minConnectorReadiness).toBe(82);
    expect(query.minLaunchReadiness).toBe(76);
    expect(query.minProviderReadiness).toBe(79);
    expect(apply.dryRun).toBe(false);
    expect(apply.storeIds).toEqual(["store_1"]);
    expect(() => revenueLaunchOperationsPackQuerySchema.parse({
      maxPacks: 0
    })).toThrow();
    expect(() => applyRevenueLaunchOperationsPackSchema.parse({
      confirm: "RECORD"
    })).toThrow();
  });

  it("validates revenue launch closure ledger query and audit gate", () => {
    const query = revenueLaunchClosureLedgerQuerySchema.parse({
      expectedOrderValue: "39",
      includeBlocked: "false",
      maxEntries: "6",
      minClosureScore: "78",
      monitoringWindowDays: "10",
      targetFirstWeekRevenue: "500"
    });
    const apply = applyRevenueLaunchClosureLedgerSchema.parse({
      confirm: "RECORD INTERNAL LAUNCH CLOSURE LEDGER",
      dryRun: false,
      note: "Record selected launch closure scorecard.",
      storeIds: ["store_1"]
    });

    expect(query.expectedOrderValue).toBe(39);
    expect(query.includeBlocked).toBe(false);
    expect(query.maxEntries).toBe(6);
    expect(query.minClosureScore).toBe(78);
    expect(query.monitoringWindowDays).toBe(10);
    expect(query.targetFirstWeekRevenue).toBe(500);
    expect(apply.dryRun).toBe(false);
    expect(apply.storeIds).toEqual(["store_1"]);
    expect(() => revenueLaunchClosureLedgerQuerySchema.parse({
      maxEntries: 0
    })).toThrow();
    expect(() => applyRevenueLaunchClosureLedgerSchema.parse({
      confirm: "RECORD"
    })).toThrow();
  });

  it("validates revenue live connector readiness query and audit gate", () => {
    const query = revenueLiveConnectorReadinessQuerySchema.parse({
      includeBlocked: "false",
      maxEntries: "7",
      minClosureScore: "82",
      minReadOnlyConnectors: "2",
      requireOperationsPackAudit: "false",
      requirePerformanceEvidence: "true"
    });
    const apply = applyRevenueLiveConnectorReadinessSchema.parse({
      confirm: "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY",
      dryRun: false,
      note: "Record selected live connector readiness registry entry.",
      storeIds: ["store_1"]
    });

    expect(query.includeBlocked).toBe(false);
    expect(query.maxEntries).toBe(7);
    expect(query.minClosureScore).toBe(82);
    expect(query.minReadOnlyConnectors).toBe(2);
    expect(query.requireOperationsPackAudit).toBe(false);
    expect(query.requirePerformanceEvidence).toBe(true);
    expect(apply.dryRun).toBe(false);
    expect(apply.storeIds).toEqual(["store_1"]);
    expect(() => revenueLiveConnectorReadinessQuerySchema.parse({
      maxEntries: 0
    })).toThrow();
    expect(() => applyRevenueLiveConnectorReadinessSchema.parse({
      confirm: "RECORD"
    })).toThrow();
  });

  it("validates revenue launch handoff control options and status updates", () => {
    const query = revenueLaunchHandoffControlQuerySchema.parse({
      includeArchived: "true",
      maxPackets: "12",
      minConnectorReadiness: "84"
    });
    const params = revenueLaunchHandoffControlParamsSchema.parse({
      packetId: "packet_1"
    });
    const apply = applyRevenueLaunchHandoffControlSchema.parse({
      confirm: "UPDATE INTERNAL LAUNCH HANDOFF CONTROL",
      dryRun: true,
      note: "Internal status review only.",
      status: "ready_for_manual_handoff"
    });

    expect(query.includeArchived).toBe(true);
    expect(query.maxPackets).toBe(12);
    expect(query.minConnectorReadiness).toBe(84);
    expect(params.packetId).toBe("packet_1");
    expect(apply.status).toBe("ready_for_manual_handoff");
    expect(apply.dryRun).toBe(true);
    expect(() => applyRevenueLaunchHandoffControlSchema.parse({
      confirm: "UPDATE",
      status: "ready_for_manual_handoff"
    })).toThrow();
    expect(() => applyRevenueLaunchHandoffControlSchema.parse({
      confirm: "UPDATE INTERNAL LAUNCH HANDOFF CONTROL",
      status: "published"
    })).toThrow();
  });

  it("validates digital product portfolio options and confirmation", () => {
    const query = revenueDigitalProductQuerySchema.parse({
      includeLeadMagnets: "false",
      maxStores: "3",
      minDigitalProductsPerStore: "4",
      productsPerStore: "10",
      riskTolerance: "Medium"
    });
    const apply = applyRevenueDigitalProductSchema.parse({
      confirm: "CREATE INTERNAL DIGITAL PRODUCT QUEUE",
      dryRun: true,
      productsPerStore: 5
    });

    expect(query.includeLeadMagnets).toBe(false);
    expect(query.maxStores).toBe(3);
    expect(query.minDigitalProductsPerStore).toBe(4);
    expect(query.productsPerStore).toBe(10);
    expect(query.riskTolerance).toBe("Medium");
    expect(apply.dryRun).toBe(true);
    expect(apply.riskTolerance).toBe("Low");
    expect(() => applyRevenueDigitalProductSchema.parse({ confirm: "CREATE" })).toThrow();
  });

  it("validates listing optimization options and confirmation", () => {
    const query = revenueListingOptimizationQuerySchema.parse({
      includePricingExperiments: "false",
      maxPriceIncreasePercent: "14",
      maxProducts: "6",
      minProfitMargin: "28",
      minVisitsForPerformanceExperiment: "80",
      variantsPerProduct: "4",
      windowDays: "21"
    });
    const apply = applyRevenueListingOptimizationSchema.parse({
      confirm: "APPLY INTERNAL LISTING OPTIMIZATION",
      dryRun: true,
      maxProducts: 3,
      variantsPerProduct: 2
    });

    expect(query.includePricingExperiments).toBe(false);
    expect(query.maxPriceIncreasePercent).toBe(14);
    expect(query.maxProducts).toBe(6);
    expect(query.minProfitMargin).toBe(28);
    expect(query.minVisitsForPerformanceExperiment).toBe(80);
    expect(query.variantsPerProduct).toBe(4);
    expect(query.windowDays).toBe(21);
    expect(apply.dryRun).toBe(true);
    expect(apply.includePricingExperiments).toBe(true);
    expect(apply.maxProducts).toBe(3);
    expect(apply.variantsPerProduct).toBe(2);
    expect(() => applyRevenueListingOptimizationSchema.parse({ confirm: "APPLY" })).toThrow();
  });

  it("validates store setup runbook options and confirmation", () => {
    const query = revenueStoreSetupQuerySchema.parse({
      includeCredentialScopes: "false",
      maxStores: "8",
      minApprovedProducts: "3",
      minConnectorReadiness: "82",
      minListingReadyProducts: "4"
    });
    const apply = applyRevenueStoreSetupSchema.parse({
      confirm: "APPLY INTERNAL STORE SETUP RUNBOOK",
      dryRun: true,
      maxStores: 4
    });

    expect(query.includeCredentialScopes).toBe(false);
    expect(query.maxStores).toBe(8);
    expect(query.minApprovedProducts).toBe(3);
    expect(query.minConnectorReadiness).toBe(82);
    expect(query.minListingReadyProducts).toBe(4);
    expect(apply.dryRun).toBe(true);
    expect(apply.includeCredentialScopes).toBe(true);
    expect(apply.maxStores).toBe(4);
    expect(() => applyRevenueStoreSetupSchema.parse({ confirm: "APPLY" })).toThrow();
  });

  it("validates financial orchestrator split policy and confirmation", () => {
    const query = financialOrchestratorQuerySchema.parse({
      bufferPercent: "20",
      includePayoutIntents: "false",
      minPayoutIntentAmount: "50",
      personalPercent: "30",
      reserveFloorAmount: "100",
      scalingPercent: "50",
      windowDays: "14"
    });
    const apply = applyFinancialOrchestratorSchema.parse({
      confirm: "APPLY INTERNAL FINANCIAL ORCHESTRATOR",
      dryRun: true
    });

    expect(query.bufferPercent).toBe(20);
    expect(query.includePayoutIntents).toBe(false);
    expect(query.minPayoutIntentAmount).toBe(50);
    expect(query.personalPercent).toBe(30);
    expect(query.reserveFloorAmount).toBe(100);
    expect(query.scalingPercent).toBe(50);
    expect(query.windowDays).toBe(14);
    expect(apply.dryRun).toBe(true);
    expect(apply.scalingPercent).toBe(50);
    expect(apply.personalPercent).toBe(25);
    expect(apply.bufferPercent).toBe(25);
    expect(() => applyFinancialOrchestratorSchema.parse({
      bufferPercent: 10,
      confirm: "APPLY INTERNAL FINANCIAL ORCHESTRATOR",
      personalPercent: 10,
      scalingPercent: 10
    })).toThrow();
    expect(() => applyFinancialOrchestratorSchema.parse({ confirm: "APPLY" })).toThrow();
  });

  it("validates financial payout intent review confirmation", () => {
    const params = financialPayoutIntentParamsSchema.parse({
      intentId: "intent_123"
    });
    const approve = reviewFinancialPayoutIntentSchema.parse({
      action: "approve",
      confirm: "APPROVE FINANCIAL PAYOUT INTENT",
      note: "Approved for manual handoff only."
    });
    const reject = reviewFinancialPayoutIntentSchema.parse({
      action: "reject",
      confirm: "REJECT FINANCIAL PAYOUT INTENT"
    });

    expect(params.intentId).toBe("intent_123");
    expect(approve.action).toBe("approve");
    expect(approve.note).toContain("manual handoff");
    expect(reject.action).toBe("reject");
    expect(() => reviewFinancialPayoutIntentSchema.parse({
      action: "approve",
      confirm: "REJECT FINANCIAL PAYOUT INTENT"
    })).toThrow();
    expect(() => reviewFinancialPayoutIntentSchema.parse({
      action: "reject",
      confirm: "APPROVE FINANCIAL PAYOUT INTENT"
    })).toThrow();
  });

  it("validates financial scaling budget packet review confirmation", () => {
    const params = financialScalingBudgetPacketParamsSchema.parse({
      packetId: "scale_budget_123"
    });
    const approve = reviewFinancialScalingBudgetPacketSchema.parse({
      action: "approve",
      confirm: "APPROVE FINANCIAL SCALING BUDGET",
      note: "Approved for internal manual handoff only."
    });
    const reject = reviewFinancialScalingBudgetPacketSchema.parse({
      action: "reject",
      confirm: "REJECT FINANCIAL SCALING BUDGET"
    });

    expect(params.packetId).toBe("scale_budget_123");
    expect(approve.action).toBe("approve");
    expect(approve.note).toContain("manual handoff");
    expect(reject.action).toBe("reject");
    expect(() => reviewFinancialScalingBudgetPacketSchema.parse({
      action: "approve",
      confirm: "REJECT FINANCIAL SCALING BUDGET"
    })).toThrow();
    expect(() => reviewFinancialScalingBudgetPacketSchema.parse({
      action: "reject",
      confirm: "APPROVE FINANCIAL SCALING BUDGET"
    })).toThrow();
  });

  it("validates financial release governance confirmation", () => {
    const apply = applyFinancialReleaseGovernanceSchema.parse({
      confirm: "RECORD FINANCIAL RELEASE GOVERNANCE",
      dryRun: true
    });

    expect(apply.dryRun).toBe(true);
    expect(() => applyFinancialReleaseGovernanceSchema.parse({
      confirm: "RECORD GOVERNANCE"
    })).toThrow();
  });

  it("validates financial scaling spend control confirmation", () => {
    const apply = applyFinancialScalingSpendControlSchema.parse({
      confirm: "RECORD FINANCIAL SCALING SPEND CONTROLS",
      dryRun: true
    });

    expect(apply.dryRun).toBe(true);
    expect(() => applyFinancialScalingSpendControlSchema.parse({
      confirm: "RECORD SPEND CONTROLS"
    })).toThrow();
  });

  it("validates financial scaling execution ledger ingestion", () => {
    const ingest = ingestFinancialScalingExecutionLedgerSchema.parse({
      confirm: "INGEST INTERNAL SCALING EXECUTION OUTCOMES",
      dryRun: true,
      entries: [{
        amountSpent: "18.50",
        grossRevenue: "92",
        netProfit: "-4.25",
        outcome: "stopped",
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        scalingSpendPacketId: "scale_spend_record_1",
        source: "manual",
        unitsSold: "0",
        visits: "140"
      }]
    });

    expect(ingest.dryRun).toBe(true);
    expect(ingest.entries[0]!.amountSpent).toBe(18.5);
    expect(ingest.entries[0]!.netProfit).toBe(-4.25);
    expect(ingest.entries[0]!.outcome).toBe("stopped");
    expect(() => ingestFinancialScalingExecutionLedgerSchema.parse({
      confirm: "INGEST OUTCOMES",
      entries: []
    })).toThrow();
    expect(() => ingestFinancialScalingExecutionLedgerSchema.parse({
      confirm: "INGEST INTERNAL SCALING EXECUTION OUTCOMES",
      entries: [{
        periodEnd: "2026-05-20T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        scalingSpendPacketId: "scale_spend_record_1"
      }]
    })).toThrow();
  });

  it("validates faceless content pipeline options and performance ingestion", () => {
    const query = facelessContentPipelineQuerySchema.parse({
      briefsPerStore: "2",
      targetChannels: "youtube_shorts,tiktok",
      windowDays: "14"
    });
    const apply = applyFacelessContentPipelineSchema.parse({
      confirm: "CREATE INTERNAL FACELESS CONTENT PIPELINE",
      dryRun: true
    });
    const ingest = ingestFacelessContentPerformanceSchema.parse({
      confirm: "INGEST INTERNAL CONTENT PERFORMANCE SNAPSHOTS",
      dryRun: true,
      snapshots: [{
        channel: "youtube_shorts",
        clicks: 22,
        conversions: 3,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        revenue: 60,
        views: 1200,
        watchSeconds: 15000
      }]
    });

    expect(query.briefsPerStore).toBe(2);
    expect(query.targetChannels).toEqual(["youtube_shorts", "tiktok"]);
    expect(query.windowDays).toBe(14);
    expect(apply.dryRun).toBe(true);
    expect(apply.targetChannels).toEqual(["youtube_shorts", "tiktok", "instagram_reels"]);
    expect(ingest.snapshots[0].source).toBe("manual");
    expect(ingest.snapshots[0].cost).toBe(0);
    expect(() => applyFacelessContentPipelineSchema.parse({ confirm: "CREATE CONTENT" })).toThrow();
    expect(() => ingestFacelessContentPerformanceSchema.parse({
      confirm: "INGEST INTERNAL CONTENT PERFORMANCE SNAPSHOTS",
      snapshots: [{
        periodEnd: "2026-05-01T00:00:00.000Z",
        periodStart: "2026-06-01T00:00:00.000Z"
      }]
    })).toThrow();
  });

  it("validates revenue performance snapshots and rotation confirmation", () => {
    const query = revenuePerformanceQuerySchema.parse({
      maxAdSpendRatio: "55",
      minScaleConversionRate: "2.5",
      source: "shopify",
      windowDays: "14"
    });
    const ingest = ingestRevenuePerformanceSchema.parse({
      confirm: "INGEST INTERNAL PERFORMANCE SNAPSHOTS",
      dryRun: true,
      snapshots: [{
        adSpend: 8,
        grossRevenue: 120,
        netProfit: 72,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        source: "manual",
        storeId: "clx0b5v8g000008l58v3n0wz0",
        unitsSold: 4,
        visits: 120
      }]
    });
    const rotation = applyRevenuePerformanceRotationSchema.parse({
      confirm: "APPLY PERFORMANCE ROTATION",
      dryRun: true,
      minKillProfitVelocity: -10
    });

    expect(query.maxAdSpendRatio).toBe(55);
    expect(query.source).toBe("shopify");
    expect(query.windowDays).toBe(14);
    expect(ingest.snapshots[0].platformFees).toBe(0);
    expect(ingest.snapshots[0].source).toBe("manual");
    expect(rotation.minKillProfitVelocity).toBe(-10);
    expect(() => ingestRevenuePerformanceSchema.parse({ confirm: "INGEST", snapshots: [] })).toThrow();
    expect(() => applyRevenuePerformanceRotationSchema.parse({ confirm: "APPLY" })).toThrow();
  });

  it("validates provider payload query options", () => {
    const query = providerPayloadQuerySchema.parse({
      includeUnapproved: "true",
      maxProducts: "7"
    });
    const approvalRequest = requestProviderPayloadApprovalSchema.parse({
      includeUnapproved: false,
      maxProducts: 4,
      note: "Review provider payload package before any connector setup.",
      scheduledFor: "2026-06-03T16:00:00.000Z"
    });
    const defaultQuery = providerPayloadQuerySchema.parse({});

    expect(query.includeUnapproved).toBe(true);
    expect(query.maxProducts).toBe(7);
    expect(approvalRequest.includeUnapproved).toBe(false);
    expect(approvalRequest.maxProducts).toBe(4);
    expect(approvalRequest.scheduledFor).toBe("2026-06-03T16:00:00.000Z");
    expect(defaultQuery.includeUnapproved).toBe(false);
    expect(defaultQuery.maxProducts).toBe(5);
    expect(() => providerPayloadQuerySchema.parse({ maxProducts: 0 })).toThrow();
    expect(() => requestProviderPayloadApprovalSchema.parse({ scheduledFor: "tomorrow" })).toThrow();
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

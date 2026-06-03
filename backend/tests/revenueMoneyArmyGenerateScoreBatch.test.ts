import { describe, expect, it } from "vitest";
import {
  buildRevenueAssetPortfolio,
  buildRevenueEnginePlan,
  type RevenueEngineProductSnapshot,
  type RevenueEngineStoreSnapshot
} from "../src/services/revenueEngine.js";
import { buildRevenueMoneyArmyGenerateScoreBatchPlan } from "../src/services/revenueMoneyArmyGenerateScoreBatch.js";
import {
  buildRevenueFirstBusinessAutonomousLaunchPlan,
  buildRevenueFirstBusinessExecutionPlan,
  buildRevenueFirstBusinessInternalLaunchPlan,
  buildRevenueFirstBusinessLiveExecutorPlan,
  buildRevenueFirstStorePreparationPlan
} from "../src/services/revenueFirstStorePreparation.js";

const store: RevenueEngineStoreSnapshot = {
  approvalStatus: "Launch Approved",
  audience: "independent gym members and local training clients",
  brandStyle: "bold black-and-green training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 480,
  id: "store_scale",
  industry: "fitness",
  launchStatus: "Optimizing",
  productTypes: ["T-shirt", "Hoodie", "Sticker"],
  revenue: 1200,
  storePlatform: "Shopify"
};

function product(input: Partial<RevenueEngineProductSnapshot> & { id: string }): RevenueEngineProductSnapshot {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Original internal merch draft. Verify trademarks before publishing.",
    designConcept: "Original typography for a brand-owned merch lane.",
    designPrompt: "Create original art with no protected marks or copied work.",
    designTheme: "Original operator series",
    estimatedProfit: 16,
    id: input.id,
    listingDescription: "Original product listing.",
    listingTitle: "Original Product",
    productName: "Original Product",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    profitMargin: 42,
    retailPrice: 38,
    status: "Approved",
    storeId: store.id,
    tags: ["original", "fitness"],
    ...input
  };
}

describe("Revenue Money Army Generate & Score Batch", () => {
  it("generates 10-50 internal candidates and scores each through the rotation engine", () => {
    const products = [
      product({ id: "product-source-1", productName: "Core Tee" }),
      product({ id: "product-source-2", productName: "Operator Hoodie", productType: "Hoodie", retailPrice: 58 })
    ];
    const currentPortfolio = buildRevenueAssetPortfolio(buildRevenueEnginePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products,
      stores: [store]
    }));
    const plan = buildRevenueMoneyArmyGenerateScoreBatchPlan({
      currentPortfolio,
      options: {
        candidateCount: 12,
        generatedAt: "2026-06-02T12:30:00.000Z",
        riskTolerance: "Low"
      },
      products,
      stores: [store]
    });

    expect(plan).toMatchObject({
      externalExecution: false,
      mode: "Money Army Generate & Score Batch",
      providerContacted: false,
      totals: {
        generated: 12,
        requested: 12,
        sourceStores: 1
      }
    });
    expect(plan.candidates).toHaveLength(12);
    expect(plan.rotationRecommendations).toHaveLength(12);
    expect(plan.candidates.every((candidate) => (
      candidate.auditOnly
      && candidate.externalExecution === false
      && candidate.providerContacted === false
      && candidate.organicContentTieIn.approvalState === "internal_draft_only"
    ))).toBe(true);
    expect(plan.rotationRecommendations.every((recommendation) => (
      ["scale", "watch", "pause", "kill"].includes(recommendation.recommendation)
    ))).toBe(true);
    expect(plan.currentPortfolio.totals.assets).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage).toMatchObject({
      externalExecution: false,
      mode: "First Business Launch Package",
      providerContacted: false,
      status: expect.any(String)
    });
    expect(plan.firstBusinessLaunchPackage?.products.length).toBeGreaterThanOrEqual(5);
    expect(plan.firstBusinessLaunchPackage?.products.length).toBeLessThanOrEqual(10);
    expect(plan.firstBusinessLaunchPackage?.products[0]?.internalDesignDraft).toMatchObject({
      aiProviderUsed: false,
      externalGeneration: false,
      providerContacted: false
    });
    expect(plan.firstBusinessLaunchPackage?.products[0]?.internalDesignDraft.assetChecklist.length).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage?.contentIdeas.length).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage?.organicFirstMoves.length).toBeGreaterThan(0);
    expect(plan.firstBusinessLaunchPackage?.approvalChecklist.map((item) => item.category)).toContain("designs");
    expect(plan.firstBusinessLaunchPackage?.manualApprovalGates.join(" ")).toContain("Approve");
    const preparation = buildRevenueFirstStorePreparationPlan({
      approvedAt: "2026-06-02T12:45:00.000Z",
      note: "Approved internally from test.",
      packagePlan: plan.firstBusinessLaunchPackage!
    });
    expect(preparation).toMatchObject({
      externalExecution: false,
      mode: "Prepare First Store",
      providerContacted: false,
      status: "ready_to_execute_internal"
    });
    expect(preparation.approval).toMatchObject({
      auditOnly: true,
      externalExecution: false,
      providerContacted: false,
      status: "approved_internal"
    });
    expect(preparation.products.length).toBe(plan.firstBusinessLaunchPackage?.products.length);
    expect(preparation.products.every((product) => product.executionState === "approved_internal_ready")).toBe(true);
    expect(preparation.blockedExternalActions.join(" ")).toContain("marketplace");
    const internalLaunch = buildRevenueFirstBusinessInternalLaunchPlan({
      launchedAt: "2026-06-02T13:00:00.000Z",
      note: "Approved for Launch and final internal execution packet created from dashboard controls.",
      preparationPlan: preparation
    });
    expect(internalLaunch).toMatchObject({
      externalExecution: false,
      mode: "Launch First Business",
      providerContacted: false,
      status: "approved_for_launch_internal"
    });
    expect(internalLaunch.launchApproval).toMatchObject({
      auditOnly: true,
      externalExecution: false,
      providerContacted: false,
      status: "approved_for_launch_internal"
    });
    expect(internalLaunch.productSetupQueue.length).toBeGreaterThanOrEqual(3);
    expect(internalLaunch.productSetupQueue.length).toBeLessThanOrEqual(5);
    expect(internalLaunch.productSetupQueue.every((product) => product.launchState === "queued_internal_product_setup")).toBe(true);
    expect(internalLaunch.finalExecutionPacket).toMatchObject({
      approvalState: "approved_for_launch_internal",
      externalExecution: false,
      providerContacted: false
    });
    expect(internalLaunch.finalExecutionPacket.products.length).toBe(internalLaunch.productSetupQueue.length);
    expect(internalLaunch.contentDraftQueue.every((idea) => idea.executionLocked)).toBe(true);
    expect(internalLaunch.organicMoveQueue.every((move) => move.launchState === "queued_internal_organic_move")).toBe(true);
    expect(internalLaunch.evidenceLedgerFields).toContain("manualNetProfit");
    expect(internalLaunch.blockedExternalActions.join(" ")).toContain("Publishing a live store");
    const execution = buildRevenueFirstBusinessExecutionPlan({
      executedAt: "2026-06-02T13:15:00.000Z",
      launchPlan: internalLaunch,
      note: "Execute First Business manual and semi-automated launch prep created from dashboard controls."
    });
    expect(execution).toMatchObject({
      externalExecution: false,
      mode: "Execute First Business",
      providerContacted: false,
      status: "ready_to_launch_first_business"
    });
    expect(execution.readyState).toMatchObject({
      externalExecution: false,
      label: "Ready to Launch First Business",
      manualLaunchReady: true,
      providerContacted: false,
      semiAutomatedPreparationReady: true
    });
    expect(execution.finalExecutionPacket.products.length).toBe(internalLaunch.finalExecutionPacket.products.length);
    expect(execution.firstLaunchReadinessGate).toMatchObject({
      externalExecution: false,
      label: "First Launch Readiness Gate",
      providerContacted: false,
      status: "ready_for_manual_launch_approval"
    });
    expect(execution.firstLaunchReadinessGate.totals.blocked).toBe(0);
    expect(execution.listingProductPack).toHaveLength(execution.finalExecutionPacket.products.length);
    expect(execution.listingProductPack[0]).toMatchObject({
      externalExecution: false,
      providerContacted: false,
      status: "ready_internal"
    });
    expect(execution.listingProductPack[0]?.seoKeywords.length).toBeGreaterThan(0);
    expect(execution.launchHandoffPacket).toMatchObject({
      explicitLiveApprovalRequired: true,
      externalExecution: false,
      providerContacted: false,
      status: "ready_for_operator_review"
    });
    expect(execution.launchHandoffPacket.products).toHaveLength(execution.listingProductPack.length);
    expect(execution.firstWeekTrackingPlan.metricFields.map((field) => field.id)).toContain("manualNetProfit");
    expect(execution.firstWeekTrackingPlan.rotationReview.output).toBe("feed_revenue_engine_scale_watch_pause_kill");
    expect(execution.manualLaunchRunbook.every((step) => step.status === "ready_manual")).toBe(true);
    expect(execution.semiAutomatedPreparationQueue.every((step) => step.externalExecution === false)).toBe(true);
    expect(execution.revenueStartPlan.paidSpendLocked).toBe(true);
    const autonomousLaunch = buildRevenueFirstBusinessAutonomousLaunchPlan({
      executedAt: "2026-06-02T13:30:00.000Z",
      executionPlan: execution,
      note: "Autonomous first-business launch prep created from dashboard controls."
    });
    expect(autonomousLaunch).toMatchObject({
      autonomousUntilPayment: true,
      externalExecution: false,
      mode: "Autonomous First Business Launch Prep",
      paymentExecution: false,
      providerContacted: false,
      status: "autonomous_ready_payment_gated"
    });
    expect(autonomousLaunch.storeBuildPlan.status).toBe("autonomous_internal_ready");
    expect(autonomousLaunch.productCreationPlan).toHaveLength(execution.listingProductPack.length);
    expect(autonomousLaunch.productCreationPlan.every((product) => product.connectorPayloadStatus === "prepared_not_sent")).toBe(true);
    expect(autonomousLaunch.supplierPlan.candidates.length).toBeGreaterThan(1);
    expect(autonomousLaunch.supplierPlan.selectedSupplier.providerContacted).toBe(false);
    expect(autonomousLaunch.connectionPlan.connectorManifests.every((manifest) => manifest.providerContacted === false)).toBe(true);
    expect(autonomousLaunch.adCampaignDrafts.every((draft) => draft.spendState === "payment_required" && draft.budgetApprovalRequired)).toBe(true);
    expect(autonomousLaunch.paymentApprovalQueue.map((approval) => approval.approvalType)).toContain("ad_spend");
    expect(autonomousLaunch.autonomyMatrix.map((item) => item.lane)).toContain("ad_spend_activation");
    expect(autonomousLaunch.finalOperatorGate.requiredApprovals.join(" ")).toContain("Ad/Growth");
    const liveExecutor = buildRevenueFirstBusinessLiveExecutorPlan({
      autonomousLaunch,
      generatedAt: "2026-06-02T13:45:00.000Z",
      liveUnlockPhraseAccepted: false,
      note: "Controlled live executor prepared from dashboard controls."
    });
    expect(liveExecutor).toMatchObject({
      actualExternalActionsExecuted: false,
      externalExecution: false,
      mode: "Controlled Live First Business Executor",
      paymentExecution: false,
      providerContacted: false,
      status: "ready_for_owner_unlock"
    });
    expect(liveExecutor.ownerUnlock).toMatchObject({
      connectorApproval: false,
      externalExecution: false,
      paymentExecution: false,
      phraseAccepted: false,
      providerContacted: false,
      publicLaunchApproval: false,
      status: "waiting_owner"
    });
    expect(liveExecutor.credentialReadiness.length).toBeGreaterThan(0);
    expect(liveExecutor.providerActionManifests.every((manifest) => manifest.payloadState === "prepared_not_sent" && manifest.providerContacted === false)).toBe(true);
    expect(liveExecutor.liveRunbook.some((step) => step.executionState === "blocked_owner_unlock")).toBe(true);
    expect(liveExecutor.paymentLockedQueue.length).toBeGreaterThan(0);
    expect(liveExecutor.blockedExternalActions.join(" ")).toContain("Payment processor");
    const armedLiveExecutor = buildRevenueFirstBusinessLiveExecutorPlan({
      adDraftApproval: true,
      autonomousLaunch,
      connectorApproval: true,
      generatedAt: "2026-06-02T13:50:00.000Z",
      liveUnlockPhraseAccepted: true,
      publicLaunchApproval: true
    });
    expect(armedLiveExecutor.status).toBe("armed_non_payment_live_run");
    expect(armedLiveExecutor.actualExternalActionsExecuted).toBe(false);
    expect(armedLiveExecutor.externalExecution).toBe(false);
    expect(armedLiveExecutor.providerContacted).toBe(false);
    expect(armedLiveExecutor.paymentExecution).toBe(false);
    expect(armedLiveExecutor.ownerUnlock.status).toBe("accepted_non_payment");
    expect(armedLiveExecutor.liveRunbook.some((step) => step.executionState === "ready_live_non_payment")).toBe(true);
    expect(armedLiveExecutor.liveRunbook.some((step) => step.executionState === "payment_locked")).toBe(true);
    expect(armedLiveExecutor.totals.paymentLockedSteps).toBeGreaterThan(0);
    expect(armedLiveExecutor.rollbackPlan.length).toBeGreaterThan(0);
    expect(plan.scalePressure.pressureScore).toBeGreaterThanOrEqual(0);
    expect(plan.killPressure.pressureScore).toBeGreaterThanOrEqual(0);
    expect(plan.blockedExternalActions).toContain("Posting faceless content externally");
  });
});

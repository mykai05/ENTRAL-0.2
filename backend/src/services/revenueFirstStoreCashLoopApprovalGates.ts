import {
  buildRevenuePortfolioDashboardFirstWeekSignalCoverage,
  buildRevenuePortfolioDashboardLaunchEvidenceCoverage,
  requiredFirstStoreLaunchEvidenceCategories,
  type RevenuePortfolioDashboardCashLoopEvidenceReceipt,
  type RevenuePortfolioDashboardFirstWeekSignalCoverage,
  type RevenuePortfolioDashboardLaunchEvidenceCoverage,
  type RevenuePortfolioDashboardPlan
} from "./revenuePortfolioDashboard.js";

type RevenueWinnerClonePacket = RevenuePortfolioDashboardPlan["firstStoreCashLoop"]["winnerScaleLadder"]["clonePackets"][number];

export type RevenueWinnerClonePacketApprovalGate = {
  allowed: boolean;
  blockers: string[];
  dashboardStoreId: string | null;
  firstRevenueCaptured: boolean;
  firstWeekSignalCoverage: RevenuePortfolioDashboardFirstWeekSignalCoverage;
  launchEvidenceCoverage: RevenuePortfolioDashboardLaunchEvidenceCoverage;
  manualLaunchEvidenceRecorded: boolean;
  manualSignalRecorded: boolean;
  ownerApprovalRecorded: boolean;
  packet: RevenueWinnerClonePacket | null;
  storeName: string | null;
  targetStoreId: string | null;
};

export type RevenueFirstStoreManualSignalCaptureGate = {
  allowed: boolean;
  blockers: string[];
  dashboardStoreId: string | null;
  launchEvidenceCoverage: RevenuePortfolioDashboardLaunchEvidenceCoverage;
  manualLaunchEvidenceRecorded: boolean;
  ownerApprovalRecorded: boolean;
  storeName: string | null;
  targetStoreId: string | null;
};

export function cashLoopEvidenceReceiptMatchesStore(
  receipt: RevenuePortfolioDashboardCashLoopEvidenceReceipt,
  storeId?: string | null
) {
  if (!storeId) return false;

  return receipt.storeId === storeId || receipt.targetId === storeId;
}

export function hasRevenueCashLoopEvidenceReceipt(
  receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[],
  evidenceType: RevenuePortfolioDashboardCashLoopEvidenceReceipt["evidenceType"],
  storeId?: string | null
) {
  return receipts.some((receipt) => receipt.evidenceType === evidenceType && cashLoopEvidenceReceiptMatchesStore(receipt, storeId));
}

function hasWinnerCloneApprovalReceipt(
  receipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[],
  storeId: string | null,
  targetStores: 10 | 25 | 100
) {
  return receipts.some((receipt) => (
    receipt.evidenceType === "winner_clone_packet_approval"
    && receipt.targetStores === targetStores
    && cashLoopEvidenceReceiptMatchesStore(receipt, storeId)
  ));
}

export function buildRevenueFirstStoreManualSignalCaptureGate(input: {
  cashLoopEvidenceReceipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[];
  dashboard: RevenuePortfolioDashboardPlan;
  requestedStoreId?: string | null;
}): RevenueFirstStoreManualSignalCaptureGate {
  const dashboardStoreId = input.dashboard.firstStoreCashLoop.firstCashStatus?.storeId
    ?? input.dashboard.firstStoreCashLoop.launchReadiness.storeId
    ?? input.dashboard.firstStoreCashLoop.firstRevenueProof.storeId
    ?? null;
  const targetStoreId = input.requestedStoreId ?? dashboardStoreId;
  const storeName = input.dashboard.firstStoreCashLoop.firstCashStatus?.storeName
    ?? input.dashboard.firstStoreCashLoop.launchReadiness.storeName
    ?? input.dashboard.firstStoreCashLoop.firstRevenueProof.storeName
    ?? input.dashboard.firstStoreCashLoop.manualLaunchPacket.store?.name
    ?? null;
  const ownerApprovalRecorded = hasRevenueCashLoopEvidenceReceipt(input.cashLoopEvidenceReceipts, "owner_launch_approval", targetStoreId);
  const launchEvidenceCoverage = buildRevenuePortfolioDashboardLaunchEvidenceCoverage(
    input.cashLoopEvidenceReceipts.filter((receipt) => cashLoopEvidenceReceiptMatchesStore(receipt, targetStoreId))
  );
  const manualLaunchEvidenceRecorded = launchEvidenceCoverage.ready;
  const blockers = [
    targetStoreId ? null : "No first-store target is available on the current cash-loop dashboard.",
    ownerApprovalRecorded ? null : "Record owner manual live-launch approval receipt before recording first-week revenue signals.",
    manualLaunchEvidenceRecorded ? null : `Record required first-store manual launch evidence before recording first-week revenue signals: ${launchEvidenceCoverage.missingCategories.map((category) => category.replace(/_/g, " ")).join(", ") || requiredFirstStoreLaunchEvidenceCategories.map((category) => category.replace(/_/g, " ")).join(", ")}.`,
    input.dashboard.firstStoreCashLoop.firstWeekRevenueLoop.status === "ready_for_manual_signal_capture"
      ? null
      : `First-week revenue loop is ${input.dashboard.firstStoreCashLoop.firstWeekRevenueLoop.status.replace(/_/g, " ")}.`,
    input.requestedStoreId && dashboardStoreId && input.requestedStoreId !== dashboardStoreId
      ? `Requested store ${input.requestedStoreId} does not match the current first-store packet ${dashboardStoreId}.`
      : null
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    allowed: blockers.length === 0,
    blockers,
    dashboardStoreId,
    launchEvidenceCoverage,
    manualLaunchEvidenceRecorded,
    ownerApprovalRecorded,
    storeName,
    targetStoreId
  };
}

export function buildRevenueWinnerClonePacketApprovalGate(input: {
  cashLoopEvidenceReceipts: RevenuePortfolioDashboardCashLoopEvidenceReceipt[];
  dashboard: RevenuePortfolioDashboardPlan;
  requestedStoreId?: string | null;
  targetStores: number;
}): RevenueWinnerClonePacketApprovalGate {
  const packet = input.dashboard.firstStoreCashLoop.winnerScaleLadder.clonePackets.find((candidate) => candidate.targetStores === input.targetStores) ?? null;
  const dashboardStoreId = input.dashboard.firstStoreCashLoop.firstCashStatus?.storeId
    ?? input.dashboard.firstStoreCashLoop.launchReadiness.storeId
    ?? input.dashboard.firstStoreCashLoop.firstRevenueProof.storeId
    ?? null;
  const targetStoreId = input.requestedStoreId ?? dashboardStoreId;
  const storeName = input.dashboard.firstStoreCashLoop.firstCashStatus?.storeName
    ?? input.dashboard.firstStoreCashLoop.launchReadiness.storeName
    ?? input.dashboard.firstStoreCashLoop.firstRevenueProof.storeName
    ?? input.dashboard.firstStoreCashLoop.manualLaunchPacket.store?.name
    ?? null;
  const ownerApprovalRecorded = hasRevenueCashLoopEvidenceReceipt(input.cashLoopEvidenceReceipts, "owner_launch_approval", targetStoreId);
  const launchEvidenceCoverage = buildRevenuePortfolioDashboardLaunchEvidenceCoverage(
    input.cashLoopEvidenceReceipts.filter((receipt) => cashLoopEvidenceReceiptMatchesStore(receipt, targetStoreId))
  );
  const firstWeekSignalCoverage = buildRevenuePortfolioDashboardFirstWeekSignalCoverage(
    input.cashLoopEvidenceReceipts.filter((receipt) => cashLoopEvidenceReceiptMatchesStore(receipt, targetStoreId))
  );
  const manualLaunchEvidenceRecorded = launchEvidenceCoverage.ready;
  const manualSignalRecorded = hasRevenueCashLoopEvidenceReceipt(input.cashLoopEvidenceReceipts, "manual_signal_snapshot", targetStoreId);
  const firstRevenueCaptured = input.dashboard.firstStoreCashLoop.firstRevenueProof.firstRevenueCaptured;
  const tenStoreCloneApprovalRecorded = hasWinnerCloneApprovalReceipt(input.cashLoopEvidenceReceipts, targetStoreId, 10);
  const twentyFiveStoreCloneApprovalRecorded = hasWinnerCloneApprovalReceipt(input.cashLoopEvidenceReceipts, targetStoreId, 25);
  const tenKMilestone = input.dashboard.firstStoreCashLoop.revenueMilestonePath.milestones.find((milestone) => milestone.label === "$10k/month") ?? null;
  const targetStoreStageBlockers = [
    input.targetStores === 25 && !tenStoreCloneApprovalRecorded
      ? "Record the 10-store internal winner clone packet approval before approving the 25-store bridge."
      : null,
    input.targetStores === 100 && !tenStoreCloneApprovalRecorded
      ? "Record the 10-store internal winner clone packet approval before approving the 100-store bridge."
      : null,
    input.targetStores === 100 && !twentyFiveStoreCloneApprovalRecorded
      ? "Record the 25-store internal winner clone packet approval before approving the 100-store bridge."
      : null,
    input.targetStores === 100 && tenKMilestone?.status !== "achieved"
      ? "$10k/month proof must be achieved before approving the 100-store bridge."
      : null
  ];
  const blockers = [
    targetStoreId ? null : "No first-store target is available on the current cash-loop dashboard.",
    packet ? null : `No ${input.targetStores}-store winner clone packet is available on the current dashboard.`,
    packet && packet.status === "approval_required" ? null : packet ? `The ${input.targetStores}-store winner clone packet is ${packet.status.replace(/_/g, " ")}.` : null,
    ownerApprovalRecorded ? null : "Record owner manual live-launch approval receipt before approving an internal winner clone packet.",
    manualLaunchEvidenceRecorded ? null : `Record required first-store manual launch evidence before approving an internal winner clone packet: ${launchEvidenceCoverage.missingCategories.map((category) => category.replace(/_/g, " ")).join(", ") || requiredFirstStoreLaunchEvidenceCategories.map((category) => category.replace(/_/g, " ")).join(", ")}.`,
    manualSignalRecorded ? null : "Record first-store manual revenue signal proof before approving an internal winner clone packet.",
    firstWeekSignalCoverage.ready ? null : `Record required first-week signal coverage before approving an internal winner clone packet: ${firstWeekSignalCoverage.summary}`,
    firstRevenueCaptured ? null : "First real revenue must be visible before clone packet approval.",
    ...targetStoreStageBlockers,
    input.requestedStoreId && dashboardStoreId && input.requestedStoreId !== dashboardStoreId
      ? `Requested store ${input.requestedStoreId} does not match the current first-store packet ${dashboardStoreId}.`
      : null
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    allowed: blockers.length === 0 && Boolean(packet),
    blockers,
    dashboardStoreId,
    firstRevenueCaptured,
    firstWeekSignalCoverage,
    launchEvidenceCoverage,
    manualLaunchEvidenceRecorded,
    manualSignalRecorded,
    ownerApprovalRecorded,
    packet,
    storeName,
    targetStoreId
  };
}

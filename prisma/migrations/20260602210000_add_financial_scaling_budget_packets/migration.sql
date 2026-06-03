-- CreateTable
CREATE TABLE "FinancialScalingBudgetPacket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "splitPolicyId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxPerAssetAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retainedScalingCapital" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalScalingCapital" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitVelocity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBand" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'approval_required',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "approvalGateJson" TEXT NOT NULL,
    "blockedActionsJson" TEXT NOT NULL,
    "metadataJson" TEXT,
    "auditLogId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialScalingBudgetPacket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialScalingBudgetPacket_dedupeKey_key" ON "FinancialScalingBudgetPacket"("dedupeKey");

-- CreateIndex
CREATE INDEX "FinancialScalingBudgetPacket_userId_status_idx" ON "FinancialScalingBudgetPacket"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialScalingBudgetPacket_userId_assetType_assetId_idx" ON "FinancialScalingBudgetPacket"("userId", "assetType", "assetId");

-- CreateIndex
CREATE INDEX "FinancialScalingBudgetPacket_userId_storeId_idx" ON "FinancialScalingBudgetPacket"("userId", "storeId");

-- CreateIndex
CREATE INDEX "FinancialScalingBudgetPacket_createdAt_idx" ON "FinancialScalingBudgetPacket"("createdAt");

-- AddForeignKey
ALTER TABLE "FinancialScalingBudgetPacket" ADD CONSTRAINT "FinancialScalingBudgetPacket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialScalingBudgetPacket" ADD CONSTRAINT "FinancialScalingBudgetPacket_splitPolicyId_fkey" FOREIGN KEY ("splitPolicyId") REFERENCES "FinancialSplitPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

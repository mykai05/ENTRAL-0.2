-- CreateTable
CREATE TABLE "FinancialScalingSpendPacket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scalingBudgetPacketId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxSpendAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "approvalState" TEXT NOT NULL DEFAULT 'approval_required',
    "releaseState" TEXT NOT NULL DEFAULT 'locked_review',
    "purpose" TEXT NOT NULL,
    "controlsJson" TEXT NOT NULL,
    "blockedActionsJson" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialScalingSpendPacket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialScalingSpendPacket_dedupeKey_key" ON "FinancialScalingSpendPacket"("dedupeKey");

-- CreateIndex
CREATE INDEX "FinancialScalingSpendPacket_userId_releaseState_idx" ON "FinancialScalingSpendPacket"("userId", "releaseState");

-- CreateIndex
CREATE INDEX "FinancialScalingSpendPacket_userId_category_idx" ON "FinancialScalingSpendPacket"("userId", "category");

-- CreateIndex
CREATE INDEX "FinancialScalingSpendPacket_userId_assetType_assetId_idx" ON "FinancialScalingSpendPacket"("userId", "assetType", "assetId");

-- CreateIndex
CREATE INDEX "FinancialScalingSpendPacket_userId_storeId_idx" ON "FinancialScalingSpendPacket"("userId", "storeId");

-- CreateIndex
CREATE INDEX "FinancialScalingSpendPacket_createdAt_idx" ON "FinancialScalingSpendPacket"("createdAt");

-- AddForeignKey
ALTER TABLE "FinancialScalingSpendPacket" ADD CONSTRAINT "FinancialScalingSpendPacket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialScalingSpendPacket" ADD CONSTRAINT "FinancialScalingSpendPacket_scalingBudgetPacketId_fkey" FOREIGN KEY ("scalingBudgetPacketId") REFERENCES "FinancialScalingBudgetPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

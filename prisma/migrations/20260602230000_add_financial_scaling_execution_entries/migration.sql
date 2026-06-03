CREATE TABLE "FinancialScalingExecutionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scalingSpendPacketId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "assetId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitsSold" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'watch',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialScalingExecutionEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialScalingExecutionEntry_userId_outcome_idx" ON "FinancialScalingExecutionEntry"("userId", "outcome");
CREATE INDEX "FinancialScalingExecutionEntry_userId_category_idx" ON "FinancialScalingExecutionEntry"("userId", "category");
CREATE INDEX "FinancialScalingExecutionEntry_userId_assetType_assetId_idx" ON "FinancialScalingExecutionEntry"("userId", "assetType", "assetId");
CREATE INDEX "FinancialScalingExecutionEntry_userId_storeId_idx" ON "FinancialScalingExecutionEntry"("userId", "storeId");
CREATE INDEX "FinancialScalingExecutionEntry_scalingSpendPacketId_idx" ON "FinancialScalingExecutionEntry"("scalingSpendPacketId");
CREATE INDEX "FinancialScalingExecutionEntry_createdAt_idx" ON "FinancialScalingExecutionEntry"("createdAt");

ALTER TABLE "FinancialScalingExecutionEntry" ADD CONSTRAINT "FinancialScalingExecutionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialScalingExecutionEntry" ADD CONSTRAINT "FinancialScalingExecutionEntry_scalingSpendPacketId_fkey" FOREIGN KEY ("scalingSpendPacketId") REFERENCES "FinancialScalingSpendPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialScalingExecutionEntry" ADD CONSTRAINT "FinancialScalingExecutionEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialScalingExecutionEntry" ADD CONSTRAINT "FinancialScalingExecutionEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PodProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "FinancialSplitPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Financial Orchestrator Split',
    "scalingPercent" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "personalPercent" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "bufferPercent" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "minPayoutIntentAmount" DECIMAL(12,2) NOT NULL DEFAULT 25,
    "reserveFloorAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialSplitPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "revenuePerformanceSnapshotId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocatableProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "scalingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "personalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bufferAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPayoutIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "splitPolicyId" TEXT,
    "category" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'Stripe Treasury + Connect',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'approval_required',
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "dedupeKey" TEXT NOT NULL,
    "metadataJson" TEXT,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPayoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialSplitPolicy_userId_status_idx" ON "FinancialSplitPolicy"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialSplitPolicy_userId_createdAt_idx" ON "FinancialSplitPolicy"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialLedgerEntry_revenuePerformanceSnapshotId_key" ON "FinancialLedgerEntry"("revenuePerformanceSnapshotId");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_userId_periodEnd_idx" ON "FinancialLedgerEntry"("userId", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_storeId_periodEnd_idx" ON "FinancialLedgerEntry"("storeId", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_productId_periodEnd_idx" ON "FinancialLedgerEntry"("productId", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_source_periodEnd_idx" ON "FinancialLedgerEntry"("source", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPayoutIntent_dedupeKey_key" ON "FinancialPayoutIntent"("dedupeKey");

-- CreateIndex
CREATE INDEX "FinancialPayoutIntent_userId_status_idx" ON "FinancialPayoutIntent"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialPayoutIntent_userId_category_idx" ON "FinancialPayoutIntent"("userId", "category");

-- CreateIndex
CREATE INDEX "FinancialPayoutIntent_createdAt_idx" ON "FinancialPayoutIntent"("createdAt");

-- AddForeignKey
ALTER TABLE "FinancialSplitPolicy" ADD CONSTRAINT "FinancialSplitPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PodProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_revenuePerformanceSnapshotId_fkey" FOREIGN KEY ("revenuePerformanceSnapshotId") REFERENCES "RevenuePerformanceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPayoutIntent" ADD CONSTRAINT "FinancialPayoutIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPayoutIntent" ADD CONSTRAINT "FinancialPayoutIntent_splitPolicyId_fkey" FOREIGN KEY ("splitPolicyId") REFERENCES "FinancialSplitPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

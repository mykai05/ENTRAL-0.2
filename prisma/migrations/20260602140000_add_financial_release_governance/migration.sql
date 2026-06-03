-- CreateTable
CREATE TABLE "FinancialBudgetReleasePacket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payoutIntentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxReleaseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "approvalState" TEXT NOT NULL DEFAULT 'approval_required',
    "releaseState" TEXT NOT NULL DEFAULT 'locked_review',
    "purpose" TEXT NOT NULL,
    "controlsJson" TEXT NOT NULL,
    "blockedActionsJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialBudgetReleasePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReconciliationReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'payout_review',
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rejectedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reportJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialReconciliationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialBudgetReleasePacket_payoutIntentId_key" ON "FinancialBudgetReleasePacket"("payoutIntentId");

-- CreateIndex
CREATE INDEX "FinancialBudgetReleasePacket_userId_releaseState_idx" ON "FinancialBudgetReleasePacket"("userId", "releaseState");

-- CreateIndex
CREATE INDEX "FinancialBudgetReleasePacket_userId_category_idx" ON "FinancialBudgetReleasePacket"("userId", "category");

-- CreateIndex
CREATE INDEX "FinancialBudgetReleasePacket_createdAt_idx" ON "FinancialBudgetReleasePacket"("createdAt");

-- CreateIndex
CREATE INDEX "FinancialReconciliationReport_userId_createdAt_idx" ON "FinancialReconciliationReport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialReconciliationReport_userId_status_idx" ON "FinancialReconciliationReport"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialReconciliationReport_source_createdAt_idx" ON "FinancialReconciliationReport"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "FinancialBudgetReleasePacket" ADD CONSTRAINT "FinancialBudgetReleasePacket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialBudgetReleasePacket" ADD CONSTRAINT "FinancialBudgetReleasePacket_payoutIntentId_fkey" FOREIGN KEY ("payoutIntentId") REFERENCES "FinancialPayoutIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReconciliationReport" ADD CONSTRAINT "FinancialReconciliationReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

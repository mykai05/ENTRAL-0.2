CREATE TABLE "RevenueMoneyArmyBatchRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "batchKey" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'recorded',
  "dryRun" BOOLEAN NOT NULL DEFAULT false,
  "sourceKeysJson" TEXT NOT NULL,
  "beforeTotalsJson" TEXT NOT NULL,
  "afterTotalsJson" TEXT NOT NULL,
  "resultSummary" TEXT NOT NULL,
  "resultJson" TEXT,
  "externalExecution" BOOLEAN NOT NULL DEFAULT false,
  "providerContacted" BOOLEAN NOT NULL DEFAULT false,
  "auditLogId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RevenueMoneyArmyBatchRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueMoneyArmyBatchRun_batchKey_key" ON "RevenueMoneyArmyBatchRun"("batchKey");
CREATE INDEX "RevenueMoneyArmyBatchRun_userId_createdAt_idx" ON "RevenueMoneyArmyBatchRun"("userId", "createdAt");
CREATE INDEX "RevenueMoneyArmyBatchRun_userId_stage_status_idx" ON "RevenueMoneyArmyBatchRun"("userId", "stage", "status");
CREATE INDEX "RevenueMoneyArmyBatchRun_auditLogId_idx" ON "RevenueMoneyArmyBatchRun"("auditLogId");

ALTER TABLE "RevenueMoneyArmyBatchRun"
  ADD CONSTRAINT "RevenueMoneyArmyBatchRun_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

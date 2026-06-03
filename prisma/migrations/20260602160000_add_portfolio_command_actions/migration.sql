-- CreateTable
CREATE TABLE "PortfolioCommandAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "reason" TEXT NOT NULL,
    "recommendedStatus" TEXT,
    "commandHash" TEXT NOT NULL,
    "controlJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCommandAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioCommandAction_userId_status_idx" ON "PortfolioCommandAction"("userId", "status");

-- CreateIndex
CREATE INDEX "PortfolioCommandAction_userId_targetType_targetId_idx" ON "PortfolioCommandAction"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "PortfolioCommandAction_userId_action_idx" ON "PortfolioCommandAction"("userId", "action");

-- CreateIndex
CREATE INDEX "PortfolioCommandAction_createdAt_idx" ON "PortfolioCommandAction"("createdAt");

-- AddForeignKey
ALTER TABLE "PortfolioCommandAction" ADD CONSTRAINT "PortfolioCommandAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

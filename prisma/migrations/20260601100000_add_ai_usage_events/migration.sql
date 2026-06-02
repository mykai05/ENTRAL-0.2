-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestKind" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "usedLocalFallback" BOOLEAN NOT NULL DEFAULT false,
    "requestId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_requestKind_createdAt_idx" ON "AiUsageEvent"("userId", "requestKind", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_requestId_idx" ON "AiUsageEvent"("requestId");

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RevenueAssetControlRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT,
    "productId" TEXT,
    "assetId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "requestedAction" TEXT NOT NULL,
    "scoringRecommendation" TEXT NOT NULL,
    "finalRank" INTEGER NOT NULL DEFAULT 0,
    "economicsScore" INTEGER NOT NULL DEFAULT 0,
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "riskPenalty" INTEGER NOT NULL DEFAULT 0,
    "velocity" INTEGER NOT NULL DEFAULT 0,
    "scoreBand" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "nextInternalState" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "statusChangeRequired" BOOLEAN NOT NULL DEFAULT false,
    "auditOnly" BOOLEAN NOT NULL DEFAULT true,
    "override" BOOLEAN NOT NULL DEFAULT false,
    "warningsJson" TEXT NOT NULL,
    "controlJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueAssetControlRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevenueAssetControlRecord_userId_requestedAction_idx" ON "RevenueAssetControlRecord"("userId", "requestedAction");
CREATE INDEX "RevenueAssetControlRecord_userId_scoringRecommendation_idx" ON "RevenueAssetControlRecord"("userId", "scoringRecommendation");
CREATE INDEX "RevenueAssetControlRecord_userId_assetType_assetId_idx" ON "RevenueAssetControlRecord"("userId", "assetType", "assetId");
CREATE INDEX "RevenueAssetControlRecord_userId_storeId_idx" ON "RevenueAssetControlRecord"("userId", "storeId");
CREATE INDEX "RevenueAssetControlRecord_productId_idx" ON "RevenueAssetControlRecord"("productId");
CREATE INDEX "RevenueAssetControlRecord_auditLogId_idx" ON "RevenueAssetControlRecord"("auditLogId");
CREATE INDEX "RevenueAssetControlRecord_createdAt_idx" ON "RevenueAssetControlRecord"("createdAt");

ALTER TABLE "RevenueAssetControlRecord" ADD CONSTRAINT "RevenueAssetControlRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueAssetControlRecord" ADD CONSTRAINT "RevenueAssetControlRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RevenueAssetControlRecord" ADD CONSTRAINT "RevenueAssetControlRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PodProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

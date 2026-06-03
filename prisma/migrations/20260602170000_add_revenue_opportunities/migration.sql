CREATE TABLE "RevenueOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT,
    "sourceKey" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "planJson" TEXT NOT NULL,
    "totalsJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueOpportunity_userId_sourceKey_key" ON "RevenueOpportunity"("userId", "sourceKey");
CREATE INDEX "RevenueOpportunity_userId_status_idx" ON "RevenueOpportunity"("userId", "status");
CREATE INDEX "RevenueOpportunity_storeId_idx" ON "RevenueOpportunity"("storeId");
CREATE INDEX "RevenueOpportunity_createdAt_idx" ON "RevenueOpportunity"("createdAt");

ALTER TABLE "RevenueOpportunity" ADD CONSTRAINT "RevenueOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueOpportunity" ADD CONSTRAINT "RevenueOpportunity_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

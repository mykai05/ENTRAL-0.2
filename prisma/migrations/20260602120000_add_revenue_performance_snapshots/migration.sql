CREATE TABLE "RevenuePerformanceSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "visits" INTEGER NOT NULL DEFAULT 0,
  "unitsSold" INTEGER NOT NULL DEFAULT 0,
  "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "platformFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "productionCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "adSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "digitalDeliveryCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RevenuePerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevenuePerformanceSnapshot_userId_periodEnd_idx" ON "RevenuePerformanceSnapshot"("userId", "periodEnd");
CREATE INDEX "RevenuePerformanceSnapshot_storeId_periodEnd_idx" ON "RevenuePerformanceSnapshot"("storeId", "periodEnd");
CREATE INDEX "RevenuePerformanceSnapshot_productId_periodEnd_idx" ON "RevenuePerformanceSnapshot"("productId", "periodEnd");
CREATE INDEX "RevenuePerformanceSnapshot_source_periodEnd_idx" ON "RevenuePerformanceSnapshot"("source", "periodEnd");

ALTER TABLE "RevenuePerformanceSnapshot"
  ADD CONSTRAINT "RevenuePerformanceSnapshot_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevenuePerformanceSnapshot"
  ADD CONSTRAINT "RevenuePerformanceSnapshot_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevenuePerformanceSnapshot"
  ADD CONSTRAINT "RevenuePerformanceSnapshot_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "PodProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

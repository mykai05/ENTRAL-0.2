CREATE TABLE "ShopifyConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT,
  "shopDomain" TEXT NOT NULL,
  "apiVersion" TEXT NOT NULL DEFAULT '2026-04',
  "status" TEXT NOT NULL DEFAULT 'active',
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "credentialJson" TEXT NOT NULL,
  "tokenLastFour" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShopifyConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopifyConnection_userId_shopDomain_key" ON "ShopifyConnection"("userId", "shopDomain");
CREATE INDEX "ShopifyConnection_userId_status_idx" ON "ShopifyConnection"("userId", "status");
CREATE INDEX "ShopifyConnection_storeId_status_idx" ON "ShopifyConnection"("storeId", "status");
CREATE INDEX "ShopifyConnection_shopDomain_idx" ON "ShopifyConnection"("shopDomain");

ALTER TABLE "ShopifyConnection"
  ADD CONSTRAINT "ShopifyConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopifyConnection"
  ADD CONSTRAINT "ShopifyConnection_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

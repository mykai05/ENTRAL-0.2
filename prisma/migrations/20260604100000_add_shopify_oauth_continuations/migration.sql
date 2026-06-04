CREATE TABLE "ShopifyOAuthContinuation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "stateNonce" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payloadJson" TEXT NOT NULL,
    "auditLogId" TEXT,
    "resultAuditLogId" TEXT,
    "resultSummary" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyOAuthContinuation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopifyOAuthContinuation_stateNonce_key" ON "ShopifyOAuthContinuation"("stateNonce");
CREATE INDEX "ShopifyOAuthContinuation_userId_status_idx" ON "ShopifyOAuthContinuation"("userId", "status");
CREATE INDEX "ShopifyOAuthContinuation_storeId_status_idx" ON "ShopifyOAuthContinuation"("storeId", "status");
CREATE INDEX "ShopifyOAuthContinuation_expiresAt_idx" ON "ShopifyOAuthContinuation"("expiresAt");

ALTER TABLE "ShopifyOAuthContinuation"
ADD CONSTRAINT "ShopifyOAuthContinuation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopifyOAuthContinuation"
ADD CONSTRAINT "ShopifyOAuthContinuation_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

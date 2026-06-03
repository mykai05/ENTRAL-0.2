CREATE TABLE "RevenueLaunchHandoffPacket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "approvedPacketId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued_review',
    "action" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "connectorStatus" TEXT,
    "connectorReadinessScore" INTEGER NOT NULL DEFAULT 0,
    "launchReadinessScore" INTEGER NOT NULL DEFAULT 0,
    "providerReadinessScore" INTEGER NOT NULL DEFAULT 0,
    "manifestCount" INTEGER NOT NULL DEFAULT 0,
    "artifactSlotCount" INTEGER NOT NULL DEFAULT 0,
    "credentialScopesJson" TEXT NOT NULL,
    "providersJson" TEXT NOT NULL,
    "blockersJson" TEXT NOT NULL,
    "blockedActionsJson" TEXT NOT NULL,
    "bundleJson" TEXT,
    "summary" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueLaunchHandoffPacket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueLaunchHandoffPacket_dedupeKey_key" ON "RevenueLaunchHandoffPacket"("dedupeKey");
CREATE INDEX "RevenueLaunchHandoffPacket_userId_status_idx" ON "RevenueLaunchHandoffPacket"("userId", "status");
CREATE INDEX "RevenueLaunchHandoffPacket_storeId_status_idx" ON "RevenueLaunchHandoffPacket"("storeId", "status");
CREATE INDEX "RevenueLaunchHandoffPacket_userId_action_idx" ON "RevenueLaunchHandoffPacket"("userId", "action");
CREATE INDEX "RevenueLaunchHandoffPacket_createdAt_idx" ON "RevenueLaunchHandoffPacket"("createdAt");

ALTER TABLE "RevenueLaunchHandoffPacket" ADD CONSTRAINT "RevenueLaunchHandoffPacket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueLaunchHandoffPacket" ADD CONSTRAINT "RevenueLaunchHandoffPacket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

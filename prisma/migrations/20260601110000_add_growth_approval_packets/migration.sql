CREATE TABLE "GrowthApprovalPacket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "mode" TEXT NOT NULL DEFAULT 'Mock Mode',
  "packetJson" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "requestAuditLogId" TEXT,
  "reviewAuditLogId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GrowthApprovalPacket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthApprovalPacket_userId_status_idx" ON "GrowthApprovalPacket"("userId", "status");
CREATE INDEX "GrowthApprovalPacket_storeId_status_idx" ON "GrowthApprovalPacket"("storeId", "status");
CREATE INDEX "GrowthApprovalPacket_scheduledFor_idx" ON "GrowthApprovalPacket"("scheduledFor");
CREATE INDEX "GrowthApprovalPacket_createdAt_idx" ON "GrowthApprovalPacket"("createdAt");

ALTER TABLE "GrowthApprovalPacket"
  ADD CONSTRAINT "GrowthApprovalPacket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrowthApprovalPacket"
  ADD CONSTRAINT "GrowthApprovalPacket_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrowthApprovalPacket"
  ADD CONSTRAINT "GrowthApprovalPacket_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

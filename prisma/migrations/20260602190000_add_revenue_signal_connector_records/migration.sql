CREATE TABLE "RevenueSignalConnectorApproval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "transformTarget" TEXT NOT NULL,
    "storeId" TEXT,
    "storeName" TEXT,
    "productId" TEXT,
    "contentBriefId" TEXT,
    "manifestJson" TEXT NOT NULL,
    "samplePayloadJson" TEXT,
    "signalPreviewJson" TEXT NOT NULL,
    "blockedActionsJson" TEXT NOT NULL,
    "credentialEnvVarsJson" TEXT NOT NULL,
    "readOnlyScopesJson" TEXT NOT NULL,
    "endpointTemplatesJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "requestAuditLogId" TEXT,
    "reviewAuditLogId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueSignalConnectorApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevenueSignalImportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued_review',
    "transformTarget" TEXT NOT NULL,
    "samplePayloadJson" TEXT,
    "signalPreviewJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "providerContacted" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueSignalImportJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueSignalConnectorApproval_userId_dedupeKey_key" ON "RevenueSignalConnectorApproval"("userId", "dedupeKey");
CREATE INDEX "RevenueSignalConnectorApproval_userId_status_idx" ON "RevenueSignalConnectorApproval"("userId", "status");
CREATE INDEX "RevenueSignalConnectorApproval_userId_lane_idx" ON "RevenueSignalConnectorApproval"("userId", "lane");
CREATE INDEX "RevenueSignalConnectorApproval_userId_provider_idx" ON "RevenueSignalConnectorApproval"("userId", "provider");
CREATE INDEX "RevenueSignalConnectorApproval_createdAt_idx" ON "RevenueSignalConnectorApproval"("createdAt");

CREATE UNIQUE INDEX "RevenueSignalImportJob_userId_approvalId_key" ON "RevenueSignalImportJob"("userId", "approvalId");
CREATE INDEX "RevenueSignalImportJob_userId_status_idx" ON "RevenueSignalImportJob"("userId", "status");
CREATE INDEX "RevenueSignalImportJob_userId_lane_idx" ON "RevenueSignalImportJob"("userId", "lane");
CREATE INDEX "RevenueSignalImportJob_userId_provider_idx" ON "RevenueSignalImportJob"("userId", "provider");
CREATE INDEX "RevenueSignalImportJob_createdAt_idx" ON "RevenueSignalImportJob"("createdAt");

ALTER TABLE "RevenueSignalConnectorApproval" ADD CONSTRAINT "RevenueSignalConnectorApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueSignalImportJob" ADD CONSTRAINT "RevenueSignalImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueSignalImportJob" ADD CONSTRAINT "RevenueSignalImportJob_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "RevenueSignalConnectorApproval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

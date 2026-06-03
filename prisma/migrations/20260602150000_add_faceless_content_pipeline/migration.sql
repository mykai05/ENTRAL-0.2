-- CreateTable
CREATE TABLE "FacelessContentBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft_queued',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targetChannelsJson" TEXT NOT NULL,
    "conceptJson" TEXT NOT NULL,
    "scriptJson" TEXT NOT NULL,
    "storyboardJson" TEXT NOT NULL,
    "voiceoverJson" TEXT NOT NULL,
    "videoJson" TEXT NOT NULL,
    "uploadPackageJson" TEXT NOT NULL,
    "providerReadinessJson" TEXT NOT NULL,
    "blockedActionsJson" TEXT NOT NULL,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "auditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacelessContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacelessContentPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentBriefId" TEXT,
    "storeId" TEXT,
    "productId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "channel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "watchSeconds" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "externalExecution" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacelessContentPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacelessContentBrief_dedupeKey_key" ON "FacelessContentBrief"("dedupeKey");

-- CreateIndex
CREATE INDEX "FacelessContentBrief_userId_status_idx" ON "FacelessContentBrief"("userId", "status");

-- CreateIndex
CREATE INDEX "FacelessContentBrief_storeId_createdAt_idx" ON "FacelessContentBrief"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "FacelessContentBrief_productId_idx" ON "FacelessContentBrief"("productId");

-- CreateIndex
CREATE INDEX "FacelessContentBrief_createdAt_idx" ON "FacelessContentBrief"("createdAt");

-- CreateIndex
CREATE INDEX "FacelessContentPerformanceSnapshot_userId_periodEnd_idx" ON "FacelessContentPerformanceSnapshot"("userId", "periodEnd");

-- CreateIndex
CREATE INDEX "FacelessContentPerformanceSnapshot_contentBriefId_periodEnd_idx" ON "FacelessContentPerformanceSnapshot"("contentBriefId", "periodEnd");

-- CreateIndex
CREATE INDEX "FacelessContentPerformanceSnapshot_storeId_periodEnd_idx" ON "FacelessContentPerformanceSnapshot"("storeId", "periodEnd");

-- CreateIndex
CREATE INDEX "FacelessContentPerformanceSnapshot_productId_periodEnd_idx" ON "FacelessContentPerformanceSnapshot"("productId", "periodEnd");

-- CreateIndex
CREATE INDEX "FacelessContentPerformanceSnapshot_channel_periodEnd_idx" ON "FacelessContentPerformanceSnapshot"("channel", "periodEnd");

-- CreateIndex
CREATE INDEX "FacelessContentPerformanceSnapshot_source_periodEnd_idx" ON "FacelessContentPerformanceSnapshot"("source", "periodEnd");

-- AddForeignKey
ALTER TABLE "FacelessContentBrief" ADD CONSTRAINT "FacelessContentBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacelessContentBrief" ADD CONSTRAINT "FacelessContentBrief_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacelessContentBrief" ADD CONSTRAINT "FacelessContentBrief_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PodProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacelessContentPerformanceSnapshot" ADD CONSTRAINT "FacelessContentPerformanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacelessContentPerformanceSnapshot" ADD CONSTRAINT "FacelessContentPerformanceSnapshot_contentBriefId_fkey" FOREIGN KEY ("contentBriefId") REFERENCES "FacelessContentBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacelessContentPerformanceSnapshot" ADD CONSTRAINT "FacelessContentPerformanceSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacelessContentPerformanceSnapshot" ADD CONSTRAINT "FacelessContentPerformanceSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PodProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

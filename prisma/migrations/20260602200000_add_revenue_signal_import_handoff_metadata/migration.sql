ALTER TABLE "RevenueSignalImportJob" ADD COLUMN "handoffAuditLogId" TEXT;
ALTER TABLE "RevenueSignalImportJob" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "RevenueSignalImportJob" ADD COLUMN "intakeResultJson" TEXT;

-- CreateTable
CREATE TABLE "AutomationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payloadJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutomationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AutomationJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AutomationJob_userId_createdAt_idx" ON "AutomationJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationJob_status_scheduledAt_idx" ON "AutomationJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AutomationLog_jobId_createdAt_idx" ON "AutomationLog"("jobId", "createdAt");

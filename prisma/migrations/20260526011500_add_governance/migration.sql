-- Phase 5 governance, autonomy scheduling, and audit history.
ALTER TABLE "AgentTask" ADD COLUMN "scheduleId" TEXT;

CREATE TABLE "AgentSchedule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "intervalMinutes" INTEGER NOT NULL,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentSchedule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Policy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "effect" TEXT NOT NULL DEFAULT 'block',
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "ruleJson" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Policy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "outcome" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "entryJson" TEXT NOT NULL,
  "entryHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "AgentSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AgentTask_scheduleId_idx" ON "AgentTask"("scheduleId");
CREATE INDEX "AgentSchedule_userId_status_idx" ON "AgentSchedule"("userId", "status");
CREATE INDEX "AgentSchedule_agentId_status_idx" ON "AgentSchedule"("agentId", "status");
CREATE INDEX "AgentSchedule_status_nextRunAt_idx" ON "AgentSchedule"("status", "nextRunAt");
CREATE INDEX "Policy_enabled_severity_idx" ON "Policy"("enabled", "severity");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

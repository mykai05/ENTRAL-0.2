CREATE TABLE "MemberAgentRun" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "idempotencyKey" TEXT NOT NULL,
    "requestJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberAgentRun_teamId_idempotencyKey_key" ON "MemberAgentRun"("teamId", "idempotencyKey");
CREATE INDEX "MemberAgentRun_teamId_createdAt_idx" ON "MemberAgentRun"("teamId", "createdAt");
CREATE INDEX "MemberAgentRun_status_createdAt_idx" ON "MemberAgentRun"("status", "createdAt");
CREATE INDEX "MemberAgentRun_requestedById_createdAt_idx" ON "MemberAgentRun"("requestedById", "createdAt");

ALTER TABLE "MemberAgentRun" ADD CONSTRAINT "MemberAgentRun_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberAgentRun" ADD CONSTRAINT "MemberAgentRun_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

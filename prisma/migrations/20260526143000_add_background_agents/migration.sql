ALTER TABLE "User" ADD COLUMN "lastDashboardSeenAt" TIMESTAMP(3);

ALTER TABLE "Agent" ADD COLUMN "runInBackground" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Agent" ADD COLUMN "lastActivitySeenAt" TIMESTAMP(3);

CREATE INDEX "Agent_userId_runInBackground_idx" ON "Agent"("userId", "runInBackground");

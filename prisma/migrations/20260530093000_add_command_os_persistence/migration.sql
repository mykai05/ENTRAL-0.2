CREATE TABLE "CommandOSSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stateVersion" INTEGER NOT NULL DEFAULT 1,
  "stateJson" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'dashboard',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommandOSSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandOSReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "sourceEntityType" TEXT NOT NULL,
  "destinationEntityId" TEXT NOT NULL,
  "destinationEntityType" TEXT NOT NULL,
  "marshalId" TEXT,
  "generalId" TEXT,
  "commanderId" TEXT,
  "soldierId" TEXT,
  "situation" TEXT NOT NULL,
  "analysis" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "nextActionsJson" TEXT NOT NULL,
  "reportCreatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommandOSReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommandOSSnapshot_userId_key" ON "CommandOSSnapshot"("userId");
CREATE INDEX "CommandOSSnapshot_updatedAt_idx" ON "CommandOSSnapshot"("updatedAt");

CREATE UNIQUE INDEX "CommandOSReport_userId_reportId_key" ON "CommandOSReport"("userId", "reportId");
CREATE INDEX "CommandOSReport_userId_reportCreatedAt_idx" ON "CommandOSReport"("userId", "reportCreatedAt");
CREATE INDEX "CommandOSReport_marshalId_idx" ON "CommandOSReport"("marshalId");
CREATE INDEX "CommandOSReport_generalId_idx" ON "CommandOSReport"("generalId");
CREATE INDEX "CommandOSReport_sourceEntityId_idx" ON "CommandOSReport"("sourceEntityId");

ALTER TABLE "CommandOSSnapshot"
ADD CONSTRAINT "CommandOSSnapshot_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommandOSReport"
ADD CONSTRAINT "CommandOSReport_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

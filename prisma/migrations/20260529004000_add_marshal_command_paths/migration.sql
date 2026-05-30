ALTER TABLE "ClientMerchStore"
ADD COLUMN "commandMarshalId" TEXT,
ADD COLUMN "commandMarshalName" TEXT,
ADD COLUMN "commandGeneralId" TEXT,
ADD COLUMN "commandGeneralName" TEXT;

CREATE INDEX "ClientMerchStore_userId_commandMarshalId_idx" ON "ClientMerchStore"("userId", "commandMarshalId");
CREATE INDEX "ClientMerchStore_userId_commandGeneralId_idx" ON "ClientMerchStore"("userId", "commandGeneralId");

ALTER TABLE "PodProduct"
ADD COLUMN "commandMarshalId" TEXT,
ADD COLUMN "commandMarshalName" TEXT,
ADD COLUMN "commandGeneralId" TEXT,
ADD COLUMN "commandGeneralName" TEXT,
ADD COLUMN "commandCommanderId" TEXT,
ADD COLUMN "commandCommanderName" TEXT,
ADD COLUMN "commandSoldierId" TEXT,
ADD COLUMN "commandSoldierName" TEXT;

CREATE INDEX "PodProduct_commandMarshalId_idx" ON "PodProduct"("commandMarshalId");
CREATE INDEX "PodProduct_commandGeneralId_idx" ON "PodProduct"("commandGeneralId");

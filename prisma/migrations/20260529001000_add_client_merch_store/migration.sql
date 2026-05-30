CREATE TYPE "MerchStorePlatform" AS ENUM ('Etsy', 'Shopify', 'Other');

CREATE TYPE "MerchPodProvider" AS ENUM ('Printify', 'Printful', 'Other');

CREATE TYPE "MerchApprovalStatus" AS ENUM (
  'Not Started',
  'Research Approved',
  'Designs Pending',
  'Designs Approved',
  'Listings Approved',
  'Launch Approved'
);

CREATE TYPE "MerchLaunchStatus" AS ENUM (
  'Lead',
  'Discovery',
  'Researching',
  'Designing',
  'Awaiting Approval',
  'Building Store',
  'Launched',
  'Optimizing',
  'Paused',
  'Archived'
);

CREATE TABLE "ClientMerchStore" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "industry" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "brandStyle" TEXT NOT NULL,
  "storePlatform" "MerchStorePlatform" NOT NULL DEFAULT 'Etsy',
  "podProvider" "MerchPodProvider" NOT NULL DEFAULT 'Printify',
  "productTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "designCount" INTEGER NOT NULL DEFAULT 0,
  "setupFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "monthlyFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "profitShare" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "approvalStatus" "MerchApprovalStatus" NOT NULL DEFAULT 'Not Started',
  "launchStatus" "MerchLaunchStatus" NOT NULL DEFAULT 'Lead',
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estimatedProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientMerchStore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientMerchStore_userId_launchStatus_idx" ON "ClientMerchStore"("userId", "launchStatus");
CREATE INDEX "ClientMerchStore_userId_approvalStatus_idx" ON "ClientMerchStore"("userId", "approvalStatus");
CREATE INDEX "ClientMerchStore_userId_createdAt_idx" ON "ClientMerchStore"("userId", "createdAt");
CREATE INDEX "ClientMerchStore_email_idx" ON "ClientMerchStore"("email");

ALTER TABLE "ClientMerchStore"
  ADD CONSTRAINT "ClientMerchStore_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

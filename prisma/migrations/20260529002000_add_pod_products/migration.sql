CREATE TYPE "PodProductStatus" AS ENUM (
  'Idea',
  'Prompt Ready',
  'Designed',
  'Mockup Created',
  'Listing Drafted',
  'Compliance Review',
  'Awaiting Approval',
  'Approved',
  'Published',
  'Needs Revision',
  'Archived'
);

CREATE TABLE "PodProduct" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productType" TEXT NOT NULL,
  "targetAudience" TEXT NOT NULL,
  "designTheme" TEXT NOT NULL,
  "designConcept" TEXT NOT NULL,
  "designPrompt" TEXT NOT NULL,
  "typographyDirection" TEXT NOT NULL,
  "colorDirection" TEXT NOT NULL,
  "mockupNotes" TEXT,
  "supplierCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "retailPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estimatedPlatformFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estimatedProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "profitMargin" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "listingTitle" TEXT,
  "listingDescription" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "complianceNotes" TEXT,
  "aiDisclosureNeeded" BOOLEAN NOT NULL DEFAULT false,
  "productionPartnerDisclosureNeeded" BOOLEAN NOT NULL DEFAULT false,
  "status" "PodProductStatus" NOT NULL DEFAULT 'Idea',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PodProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PodProduct_storeId_status_idx" ON "PodProduct"("storeId", "status");
CREATE INDEX "PodProduct_storeId_createdAt_idx" ON "PodProduct"("storeId", "createdAt");
CREATE INDEX "PodProduct_productType_idx" ON "PodProduct"("productType");

ALTER TABLE "PodProduct"
  ADD CONSTRAINT "PodProduct_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "ClientMerchStore"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

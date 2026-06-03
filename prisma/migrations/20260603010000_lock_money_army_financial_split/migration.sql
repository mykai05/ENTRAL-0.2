ALTER TABLE "FinancialSplitPolicy"
  ALTER COLUMN "scalingPercent" SET DEFAULT 25,
  ALTER COLUMN "personalPercent" SET DEFAULT 50,
  ALTER COLUMN "bufferPercent" SET DEFAULT 25;

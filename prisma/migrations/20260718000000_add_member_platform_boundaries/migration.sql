-- Existing task records remain private until an internal, audited workflow
-- explicitly approves them for member visibility.
ALTER TABLE "Task" ADD COLUMN "memberVisible" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the internal access that every pre-migration Entral account already
-- had. Accounts created after this migration default to member-only.
ALTER TABLE "User" ADD COLUMN "internalAccess" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "internalAccess" = true;

-- A Team membership does not itself authorize the member application. Every
-- existing and new organization starts disabled until an administrator records
-- an explicit provisioning decision.
ALTER TABLE "Team" ADD COLUMN "memberAccessEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Entral Base allows no more than five full member accounts. The application
-- serializes membership provisioning on the Team row; this constraint keeps
-- the configured allowance from ever being widened beyond the approved plan.
ALTER TABLE "Team" ADD COLUMN "memberSeatLimit" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Team" ADD CONSTRAINT "Team_memberSeatLimit_check" CHECK ("memberSeatLimit" BETWEEN 1 AND 5);

CREATE FUNCTION "enforceEntralBaseMemberSeat"() RETURNS TRIGGER AS $$
DECLARE
  access_enabled BOOLEAN;
  seat_limit INTEGER;
  current_members INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."teamId" = NEW."teamId" THEN
    RETURN NEW;
  END IF;

  SELECT "memberAccessEnabled", "memberSeatLimit"
    INTO access_enabled, seat_limit
    FROM "Team"
    WHERE "id" = NEW."teamId"
    FOR UPDATE;

  IF access_enabled THEN
    SELECT COUNT(*) INTO current_members FROM "TeamMember" WHERE "teamId" = NEW."teamId";
    IF current_members >= seat_limit THEN
      RAISE EXCEPTION 'Entral Base member seat limit reached' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TeamMember_entralBaseSeatLimit"
  BEFORE INSERT OR UPDATE OF "teamId" ON "TeamMember"
  FOR EACH ROW EXECUTE FUNCTION "enforceEntralBaseMemberSeat"();

CREATE FUNCTION "enforceEntralBaseAccessSeatLimit"() RETURNS TRIGGER AS $$
DECLARE
  current_members INTEGER;
BEGIN
  IF NEW."memberAccessEnabled" THEN
    SELECT COUNT(*) INTO current_members FROM "TeamMember" WHERE "teamId" = NEW."id";
    IF current_members > NEW."memberSeatLimit" THEN
      RAISE EXCEPTION 'Entral Base member seat limit exceeded' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Team_entralBaseAccessSeatLimit"
  BEFORE UPDATE OF "memberAccessEnabled", "memberSeatLimit" ON "Team"
  FOR EACH ROW EXECUTE FUNCTION "enforceEntralBaseAccessSeatLimit"();

-- Bind recovery artifacts to the session surface that requested them. Existing
-- unconsumed artifacts retain the legacy internal classification.
ALTER TABLE "EmailVerificationToken" ADD COLUMN "flow" TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE "PasswordResetToken" ADD COLUMN "flow" TEXT NOT NULL DEFAULT 'internal';

-- One compact, typed, published snapshot is the complete member-facing
-- planning/operating boundary for each organization. Internal source data is
-- never queried directly by member routes.
CREATE TABLE "MemberWorkspaceSnapshot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberWorkspaceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberWorkspaceSnapshot_teamId_key" ON "MemberWorkspaceSnapshot"("teamId");
CREATE INDEX "MemberWorkspaceSnapshot_teamId_publishedAt_idx" ON "MemberWorkspaceSnapshot"("teamId", "publishedAt");
CREATE INDEX "MemberWorkspaceSnapshot_publishedById_publishedAt_idx" ON "MemberWorkspaceSnapshot"("publishedById", "publishedAt");

ALTER TABLE "MemberWorkspaceSnapshot" ADD CONSTRAINT "MemberWorkspaceSnapshot_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberWorkspaceSnapshot" ADD CONSTRAINT "MemberWorkspaceSnapshot_publishedById_fkey"
  FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_teamId_memberVisible_status_idx" ON "Task"("teamId", "memberVisible", "status");

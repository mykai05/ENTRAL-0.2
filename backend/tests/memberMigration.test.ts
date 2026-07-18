import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("member platform migration semantics", () => {
  it("preserves legacy internal access while defaulting new accounts and organizations closed", () => {
    const migration = readFileSync(
      new URL("../../prisma/migrations/20260718000000_add_member_platform_boundaries/migration.sql", import.meta.url),
      "utf8"
    );

    expect(migration).toContain('ALTER TABLE "User" ADD COLUMN "internalAccess" BOOLEAN NOT NULL DEFAULT false;');
    expect(migration).toContain('UPDATE "User" SET "internalAccess" = true;');
    expect(migration).toContain('ALTER TABLE "Team" ADD COLUMN "memberAccessEnabled" BOOLEAN NOT NULL DEFAULT false;');
    expect(migration).toContain('ALTER TABLE "Team" ADD COLUMN "memberSeatLimit" INTEGER NOT NULL DEFAULT 5;');
    expect(migration).toContain('CHECK ("memberSeatLimit" BETWEEN 1 AND 5)');
    expect(migration).toContain('CREATE TRIGGER "TeamMember_entralBaseSeatLimit"');
    expect(migration).toContain('CREATE TRIGGER "Team_entralBaseAccessSeatLimit"');
    expect(migration).toContain('CREATE TABLE "MemberWorkspaceSnapshot"');
    expect(migration).toContain('CREATE UNIQUE INDEX "MemberWorkspaceSnapshot_teamId_key"');
    expect(migration).toContain('ALTER TABLE "Task" ADD COLUMN "memberVisible" BOOLEAN NOT NULL DEFAULT false;');
    expect(migration).toContain('ALTER TABLE "EmailVerificationToken" ADD COLUMN "flow" TEXT NOT NULL DEFAULT \'internal\';');
    expect(migration).toContain('ALTER TABLE "PasswordResetToken" ADD COLUMN "flow" TEXT NOT NULL DEFAULT \'internal\';');
  });
});

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(testDatabaseUrl && process.env.RUN_POSTGRES_INTEGRATION === "1");

describe.skipIf(!integrationEnabled)("Entral Base PostgreSQL seat enforcement", () => {
  it("rejects direct and concurrent sixth-seat inserts after the real migration", async () => {
    const databaseUrl = new URL(testDatabaseUrl!);
    if (!databaseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const databaseName = `entral_member_seat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const isolatedUrl = new URL(databaseUrl);
    isolatedUrl.pathname = `/${databaseName}`;
    isolatedUrl.searchParams.delete("schema");
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    let client: PrismaClient | null = null;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
      const migration = spawnSync(process.execPath, [
        prismaCli,
        "migrate",
        "deploy",
        "--schema",
        "prisma/schema.prisma"
      ], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: isolatedUrl.toString() }
      });
      if (migration.status !== 0) {
        throw new Error(`Disposable PostgreSQL migration failed: ${migration.stderr || migration.stdout}`);
      }

      client = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      const users = await Promise.all(Array.from({ length: 12 }, (_, index) => client!.user.create({
        data: {
          email: `seat-${databaseName}-${index}@example.test`,
          name: `Seat User ${index}`,
          passwordHash: "not-a-real-password-hash"
        }
      })));
      const actors = await Promise.all(users.map((user) => client!.identityActor.create({
        data: { actorType: "HUMAN", humanUserId: user.id }
      })));
      const createScopedTeam = async (data: {
        memberAccessEnabled: boolean;
        memberSeatLimit: number;
        name: string;
        slug: string;
      }, ownerIndex: number) => {
        const team = await client!.team.create({ data });
        await client!.tenantBoundary.create({
          data: {
            dataResidency: team.dataResidency,
            environment: team.environment,
            id: team.tenantId,
            legacyTeamId: team.id,
            organizationId: team.organizationId
          }
        });
        await client!.tenantActorAssignment.create({
          data: {
            actorId: actors[ownerIndex]!.id,
            authorityDomains: ["IDENTITY", "TENANCY", "OPERATIONS"],
            organizationId: team.organizationId,
            role: "OWNER",
            tenantId: team.tenantId
          }
        });
        await client!.teamMember.create({
          data: { role: "OWNER", teamId: team.id, userId: users[ownerIndex]!.id }
        });
        return team;
      };
      const assignMember = (team: Awaited<ReturnType<typeof createScopedTeam>>, userIndex: number) => (
        client!.tenantActorAssignment.create({
          data: {
            actorId: actors[userIndex]!.id,
            authorityDomains: ["OPERATIONS"],
            organizationId: team.organizationId,
            role: "MEMBER",
            tenantId: team.tenantId
          }
        })
      );
      const createMember = (team: Awaited<ReturnType<typeof createScopedTeam>>, userIndex: number) => (
        client!.teamMember.create({ data: { teamId: team.id, userId: users[userIndex]!.id } })
      );

      const directTeam = await createScopedTeam(
        { memberAccessEnabled: true, memberSeatLimit: 5, name: "Direct Seat Test", slug: `direct-${databaseName}` },
        0
      );
      for (const userIndex of [1, 2, 3, 4]) {
        await assignMember(directTeam, userIndex);
        await createMember(directTeam, userIndex);
      }
      await assignMember(directTeam, 5);
      await expect(createMember(directTeam, 5)).rejects.toThrow();
      await expect(client.teamMember.count({ where: { teamId: directTeam.id } })).resolves.toBe(5);

      const disabledOverLimitTeam = await createScopedTeam(
        { memberAccessEnabled: false, memberSeatLimit: 5, name: "Disabled Over-limit Test", slug: `disabled-${databaseName}` },
        0
      );
      for (const userIndex of [1, 2, 3, 4, 5]) {
        await assignMember(disabledOverLimitTeam, userIndex);
        await createMember(disabledOverLimitTeam, userIndex);
      }
      await expect(client.team.update({
        data: { memberAccessEnabled: true },
        where: { id: disabledOverLimitTeam.id }
      })).rejects.toThrow();
      await expect(client.team.findUnique({
        select: { memberAccessEnabled: true },
        where: { id: disabledOverLimitTeam.id }
      })).resolves.toEqual({ memberAccessEnabled: false });

      const concurrentTeam = await createScopedTeam(
        { memberAccessEnabled: true, memberSeatLimit: 5, name: "Concurrent Seat Test", slug: `concurrent-${databaseName}` },
        6
      );
      for (const userIndex of [7, 8, 9]) {
        await assignMember(concurrentTeam, userIndex);
        await createMember(concurrentTeam, userIndex);
      }
      await Promise.all([assignMember(concurrentTeam, 10), assignMember(concurrentTeam, 11)]);
      const competingSeats = await Promise.allSettled([
        createMember(concurrentTeam, 10),
        createMember(concurrentTeam, 11)
      ]);

      expect(competingSeats.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(competingSeats.filter((result) => result.status === "rejected")).toHaveLength(1);
      await expect(client.teamMember.count({ where: { teamId: concurrentTeam.id } })).resolves.toBe(5);
    } finally {
      await client?.$disconnect();
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
      );
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.$disconnect();
    }
  }, 60_000);
});

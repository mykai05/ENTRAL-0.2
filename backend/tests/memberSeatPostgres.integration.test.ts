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

      const directTeam = await client.team.create({
        data: { memberAccessEnabled: true, memberSeatLimit: 5, name: "Direct Seat Test", slug: `direct-${databaseName}` }
      });
      for (const user of users.slice(0, 5)) {
        await client.teamMember.create({ data: { teamId: directTeam.id, userId: user.id } });
      }
      await expect(client.teamMember.create({
        data: { teamId: directTeam.id, userId: users[5].id }
      })).rejects.toThrow();
      await expect(client.teamMember.count({ where: { teamId: directTeam.id } })).resolves.toBe(5);

      const disabledOverLimitTeam = await client.team.create({
        data: { memberAccessEnabled: false, memberSeatLimit: 5, name: "Disabled Over-limit Test", slug: `disabled-${databaseName}` }
      });
      for (const user of users.slice(0, 6)) {
        await client.teamMember.create({ data: { teamId: disabledOverLimitTeam.id, userId: user.id } });
      }
      await expect(client.team.update({
        data: { memberAccessEnabled: true },
        where: { id: disabledOverLimitTeam.id }
      })).rejects.toThrow();
      await expect(client.team.findUnique({
        select: { memberAccessEnabled: true },
        where: { id: disabledOverLimitTeam.id }
      })).resolves.toEqual({ memberAccessEnabled: false });

      const concurrentTeam = await client.team.create({
        data: { memberAccessEnabled: true, memberSeatLimit: 5, name: "Concurrent Seat Test", slug: `concurrent-${databaseName}` }
      });
      for (const user of users.slice(6, 10)) {
        await client.teamMember.create({ data: { teamId: concurrentTeam.id, userId: user.id } });
      }
      const competingSeats = await Promise.allSettled([
        client.teamMember.create({ data: { teamId: concurrentTeam.id, userId: users[10].id } }),
        client.teamMember.create({ data: { teamId: concurrentTeam.id, userId: users[11].id } })
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

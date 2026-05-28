import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import type { SignupInput } from "../schemas.js";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function normalizeUserRole(role: string): "USER" | "ADMIN" {
  return role === "ADMIN" ? "ADMIN" : "USER";
}

export function capitalizeDisplayName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return {
    id: user.id,
    name: capitalizeDisplayName(user.name),
    email: user.email,
    role: normalizeUserRole(user.role)
  };
}

export async function createUserWithTeam(input: SignupInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const displayName = capitalizeDisplayName(input.name);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: displayName,
          email: input.email,
          passwordHash
        }
      });

      const team = await tx.team.create({
        data: {
          name: `${displayName}'s Team`,
          slug: `${slugify(displayName) || "team"}-${user.id.slice(-6)}`,
          members: {
            create: {
              user: {
                connect: {
                  id: user.id
                }
              },
              role: "OWNER"
            }
          }
        }
      });

      return { user, team };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("EMAIL_TAKEN");
    }

    throw error;
  }
}

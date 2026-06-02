import { createHash, randomBytes } from "node:crypto";

const authTokenByteLength = 32;

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthToken() {
  const token = randomBytes(authTokenByteLength).toString("base64url");

  return {
    token,
    tokenHash: hashAuthToken(token)
  };
}

export function dateHoursFromNow(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

export function hasTokenExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function hashForAudit(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

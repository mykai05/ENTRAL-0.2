import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

type EncryptedEnvelope = {
  __entralEncrypted: true;
  alg: "aes-256-gcm";
  data: string;
  iv: string;
  tag: string;
  v: 1;
};

function encryptionKey() {
  if (!env.DATA_ENCRYPTION_KEY) {
    return null;
  }

  return createHash("sha256").update(env.DATA_ENCRYPTION_KEY).digest();
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return Boolean(
    value &&
    typeof value === "object" &&
    "__entralEncrypted" in value &&
    (value as { __entralEncrypted?: unknown }).__entralEncrypted === true
  );
}

export function stringifySecureJson(value: unknown) {
  const plaintext = JSON.stringify(value);
  const key = encryptionKey();

  if (!key) {
    return plaintext;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    __entralEncrypted: true,
    alg: "aes-256-gcm",
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    v: 1
  };

  return JSON.stringify(envelope);
}

export function parseSecureJson<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  const parsed = JSON.parse(value) as unknown;

  if (!isEncryptedEnvelope(parsed)) {
    return parsed as T;
  }

  const key = encryptionKey();

  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY is required to read encrypted data.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final()
  ]).toString("utf8");

  return JSON.parse(decrypted) as T;
}

export function stableJsonHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

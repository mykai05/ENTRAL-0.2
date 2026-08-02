import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

type EncryptedEnvelopeV1 = {
  __entralEncrypted: true;
  alg: "aes-256-gcm";
  data: string;
  iv: string;
  tag: string;
  v: 1;
};

type EncryptedEnvelopeV2 = {
  __entralEncrypted: true;
  alg: "aes-256-gcm";
  data: string;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  iv: string;
  keyVersion: string;
  tag: string;
  v: 2;
};

export type SecretEnvelopeContext = {
  secretReferenceId: string;
  organizationId: string | null;
  tenantId: string | null;
  businessId: string | null;
  actorId: string;
  provider: string;
  purpose: string;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  recordVersion: number;
};

type EncryptedEnvelope = EncryptedEnvelopeV1 | EncryptedEnvelopeV2;

function encryptionKey() {
  if (!env.DATA_ENCRYPTION_KEY) {
    return null;
  }

  return createHash("sha256").update(env.DATA_ENCRYPTION_KEY).digest();
}

function encryptionKeyring() {
  const keyring = new Map<string, Buffer>();
  if (env.DATA_ENCRYPTION_KEYRING_JSON) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(env.DATA_ENCRYPTION_KEYRING_JSON);
    } catch {
      throw new Error("DATA_ENCRYPTION_KEYRING_JSON must be valid JSON.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("DATA_ENCRYPTION_KEYRING_JSON must be an object of key versions.");
    }
    for (const [version, key] of Object.entries(parsed)) {
      if (!/^[A-Za-z0-9._-]{1,40}$/.test(version) || typeof key !== "string" || key.length < 16) {
        throw new Error("DATA_ENCRYPTION_KEYRING_JSON contains an invalid key version.");
      }
      keyring.set(version, createHash("sha256").update(key).digest());
    }
  }
  if (env.DATA_ENCRYPTION_KEY) {
    keyring.set(env.DATA_ENCRYPTION_KEY_VERSION, createHash("sha256").update(env.DATA_ENCRYPTION_KEY).digest());
  }
  return keyring;
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.__entralEncrypted !== true || candidate.alg !== "aes-256-gcm") return false;
  if (![candidate.data, candidate.iv, candidate.tag].every((item) => typeof item === "string" && item.length > 0)) return false;
  if (candidate.v === 1) return true;
  return candidate.v === 2
    && typeof candidate.keyVersion === "string"
    && candidate.keyVersion.length > 0
    && ["DEVELOPMENT", "STAGING", "PRODUCTION"].includes(String(candidate.environment));
}

function canonicalSecretAad(context: SecretEnvelopeContext, keyVersion: string) {
  return Buffer.from(JSON.stringify([
    "entral-secret-v2",
    context.secretReferenceId,
    context.organizationId,
    context.tenantId,
    context.businessId,
    context.actorId,
    context.provider,
    context.purpose,
    context.environment,
    context.recordVersion,
    keyVersion
  ]), "utf8");
}

export function secureJsonEncryptionConfigured() {
  return Boolean(env.DATA_ENCRYPTION_KEY);
}

export function isEncryptedSecureJson(value: string | null | undefined) {
  if (!value) return false;

  try {
    return isEncryptedEnvelope(JSON.parse(value) as unknown);
  } catch {
    return false;
  }
}

export function stringifySecureJson(value: unknown) {
  const plaintext = JSON.stringify(value);
  const key = encryptionKey();

  if (!key) {
    if (env.NODE_ENV === "production") {
      throw new Error("Production secure JSON writes require DATA_ENCRYPTION_KEY.");
    }
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

export function stringifySecretEnvelope(value: unknown, context: SecretEnvelopeContext) {
  if (context.environment !== env.SECRET_BROKER_ENVIRONMENT || !Number.isSafeInteger(context.recordVersion) || context.recordVersion < 1) {
    throw new Error("Secret envelope context is invalid for this environment.");
  }
  const key = encryptionKeyring().get(env.DATA_ENCRYPTION_KEY_VERSION);
  if (!key) {
    throw new Error("Secret broker encryption key is unavailable; plaintext fallback is forbidden.");
  }
  const plaintext = JSON.stringify(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const aad = canonicalSecretAad(context, env.DATA_ENCRYPTION_KEY_VERSION);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const envelope: EncryptedEnvelopeV2 = {
    __entralEncrypted: true,
    alg: "aes-256-gcm",
    data: encrypted.toString("base64"),
    environment: env.SECRET_BROKER_ENVIRONMENT,
    iv: iv.toString("base64"),
    keyVersion: env.DATA_ENCRYPTION_KEY_VERSION,
    tag: cipher.getAuthTag().toString("base64"),
    v: 2
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

  if (parsed.v === 2) throw new Error("Versioned secret envelopes require strict broker context.");

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

export function parseSecretEnvelope<T>(value: string, context: SecretEnvelopeContext): T {
  const parsed = JSON.parse(value) as unknown;
  if (!isEncryptedEnvelope(parsed) || parsed.v !== 2) throw new Error("Secret broker value is not a valid encrypted envelope.");
  if (parsed.environment !== context.environment || context.environment !== env.SECRET_BROKER_ENVIRONMENT) {
    throw new Error("Encrypted secret belongs to a different environment.");
  }
  const key = encryptionKeyring().get(parsed.keyVersion);
  if (!key) throw new Error(`Encryption key version ${parsed.keyVersion} is unavailable.`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
  decipher.setAAD(canonicalSecretAad(context, parsed.keyVersion));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(decrypted) as T;
}

export function secretEnvelopeMetadata(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!isEncryptedEnvelope(parsed) || parsed.v !== 2) {
    throw new Error("Value is not a versioned secret envelope.");
  }
  return {
    environment: parsed.environment,
    keyVersion: parsed.keyVersion,
    version: parsed.v
  } as const;
}

export function stableJsonHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

import { isIP } from "node:net";

const blockedWebhookHosts = new Set([
  "localhost",
  "metadata.google.internal"
]);

export function canonicalHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function ipv4Octets(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return parts as [number, number, number, number];
}

function isGlobalIpv4(hostname: string) {
  const parts = ipv4Octets(hostname);

  if (!parts) return false;

  const [a, b, c] = parts;

  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function parseIpv6(hostname: string) {
  const host = canonicalHostname(hostname);

  if (host.includes("%")) return null;

  const halves = host.split("::");

  if (halves.length > 2) return null;

  const expandSide = (side: string) => {
    if (!side) return [] as number[];

    const pieces = side.split(":");
    const words: number[] = [];

    for (const piece of pieces) {
      if (piece.includes(".")) {
        const ipv4 = ipv4Octets(piece);

        if (!ipv4) return null;

        words.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
        continue;
      }

      if (!/^[0-9a-f]{1,4}$/i.test(piece)) return null;
      words.push(Number.parseInt(piece, 16));
    }

    return words;
  };
  const left = expandSide(halves[0] ?? "");
  const right = expandSide(halves[1] ?? "");

  if (!left || !right) return null;

  if (halves.length === 1) return left.length === 8 ? left : null;

  const omitted = 8 - left.length - right.length;

  if (omitted < 1) return null;

  return [...left, ...Array.from({ length: omitted }, () => 0), ...right];
}

function isGlobalIpv6(hostname: string) {
  const words = parseIpv6(hostname);

  if (!words) return false;

  const allZero = words.every((word) => word === 0);
  const loopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const ipv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const ipv4Compatible = words.slice(0, 6).every((word) => word === 0);

  if (allZero || loopback) return false;

  if (ipv4Mapped || ipv4Compatible) {
    const embedded = `${words[6]! >> 8}.${words[6]! & 0xff}.${words[7]! >> 8}.${words[7]! & 0xff}`;
    return isGlobalIpv4(embedded);
  }

  return !(
    (words[0]! & 0xfe00) === 0xfc00 ||
    (words[0]! & 0xffc0) === 0xfe80 ||
    (words[0]! & 0xffc0) === 0xfec0 ||
    (words[0]! & 0xff00) === 0xff00 ||
    (words[0] === 0x0100 && words.slice(1, 4).every((word) => word === 0)) ||
    (words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 0x0001) ||
    (words[0] === 0x2001 && words[1] === 0x0002) ||
    (words[0] === 0x2001 && words[1] === 0x0db8) ||
    (words[0] === 0x2001 && (words[1]! & 0xfff0) === 0x0010) ||
    (words[0] === 0x2001 && (words[1]! & 0xfff0) === 0x0020) ||
    words[0] === 0x2002 ||
    (words[0]! & 0xfff0) === 0x3ff0 ||
    words[0] === 0x5f00
  );
}

export function isGlobalUnicastIpAddress(address: string) {
  const normalized = canonicalHostname(address);
  const family = isIP(normalized);

  if (family === 4) return isGlobalIpv4(normalized);
  if (family === 6) return isGlobalIpv6(normalized);

  return false;
}

export function assertSafePublicHttpUrl(rawUrl: string, label = "URL") {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not contain embedded credentials.`);
  }

  const hostname = canonicalHostname(parsed.hostname);
  const ipFamily = isIP(hostname);

  if (
    blockedWebhookHosts.has(hostname) ||
    hostname.endsWith(".localhost") ||
    !hostname.includes(".") ||
    (ipFamily !== 0 && !isGlobalUnicastIpAddress(hostname))
  ) {
    throw new Error(`${label} must target a public host.`);
  }

  return parsed;
}

export function assertSafeOutboundWebhookUrl(rawUrl: string) {
  return assertSafePublicHttpUrl(rawUrl, "Webhook URL");
}

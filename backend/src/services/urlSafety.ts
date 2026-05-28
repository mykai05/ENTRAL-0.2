const blockedWebhookHosts = new Set([
  "localhost",
  "metadata.google.internal"
]);

function stripIpv6Brackets(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string) {
  const host = stripIpv6Brackets(hostname);
  return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
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

  const hostname = stripIpv6Brackets(parsed.hostname);

  if (
    blockedWebhookHosts.has(hostname) ||
    hostname.endsWith(".localhost") ||
    !hostname.includes(".") ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    throw new Error(`${label} must target a public host.`);
  }

  return parsed;
}

export function assertSafeOutboundWebhookUrl(rawUrl: string) {
  return assertSafePublicHttpUrl(rawUrl, "Webhook URL");
}

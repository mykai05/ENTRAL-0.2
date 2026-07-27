import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { IncomingHttpHeaders, RequestOptions } from "node:http";
import { assertSafePublicHttpUrl, canonicalHostname, isGlobalUnicastIpAddress } from "./urlSafety.js";

const sensitiveRedirectHeaders = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-shopify-access-token"
]);

export type SafeOutboundAddress = {
  address: string;
  family: 4 | 6;
};

export type SafeOutboundResponse = {
  body: Buffer;
  headers: Record<string, string>;
  status: number;
  url: string;
};

type SafeOutboundResolver = (hostname: string) => Promise<SafeOutboundAddress[]>;

export async function resolvePublicAddresses(hostname: string, resolver?: SafeOutboundResolver) {
  const canonical = canonicalHostname(hostname);
  const addresses = resolver
    ? await resolver(canonical)
    : (await dnsLookup(canonical, { all: true, verbatim: true })) as SafeOutboundAddress[];

  if (addresses.length === 0) {
    throw new Error("Outbound host did not resolve to an address.");
  }

  if (addresses.some(({ address }) => !isGlobalUnicastIpAddress(address))) {
    throw new Error("Outbound host resolved to a non-public address.");
  }

  return addresses;
}

function responseHeaders(headers: IncomingHttpHeaders) {
  return Object.fromEntries(Object.entries(headers).flatMap(([name, value]) => {
    if (value === undefined) return [];
    return [[name, Array.isArray(value) ? value.join(", ") : value]];
  }));
}

function requestHeaders(headers: Record<string, string> | undefined, previousOrigin: string | null, nextOrigin: string) {
  return Object.fromEntries(Object.entries(headers ?? {}).filter(([name]) => {
    const normalized = name.toLowerCase();

    if (normalized === "host" || normalized === "content-length" || normalized === "connection") return false;
    return previousOrigin === null || previousOrigin === nextOrigin || !sensitiveRedirectHeaders.has(normalized);
  }));
}

async function requestOnce(input: {
  body: Buffer | null;
  deadline: number;
  headers?: Record<string, string>;
  maxResponseBytes: number;
  method: string;
  previousOrigin: string | null;
  resolver?: SafeOutboundResolver;
  url: URL;
}): Promise<SafeOutboundResponse> {
  const addresses = await resolvePublicAddresses(input.url.hostname, input.resolver);
  const selected = addresses.find(({ family }) => family === 4) ?? addresses[0]!;
  const remainingMs = input.deadline - Date.now();

  if (remainingMs <= 0) throw new Error("Outbound request timed out.");

  return new Promise<SafeOutboundResponse>((resolve, reject) => {
    const requester = input.url.protocol === "https:" ? httpsRequest : httpRequest;
    const options: RequestOptions = {
      agent: false,
      family: selected.family,
      headers: requestHeaders(input.headers, input.previousOrigin, input.url.origin),
      hostname: canonicalHostname(input.url.hostname),
      lookup: ((_hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
        callback(null, selected.address, selected.family);
      }) as RequestOptions["lookup"],
      method: input.method,
      path: `${input.url.pathname}${input.url.search}`,
      port: input.url.port || undefined,
      protocol: input.url.protocol,
      ...(input.url.protocol === "https:" ? { servername: canonicalHostname(input.url.hostname) } : {})
    };
    const request = requester(options, (response) => {
      const declaredLength = Number(response.headers["content-length"] ?? 0);

      if (Number.isFinite(declaredLength) && declaredLength > input.maxResponseBytes) {
        response.destroy();
        reject(new Error(`Outbound response exceeded ${input.maxResponseBytes} bytes.`));
        return;
      }

      const chunks: Buffer[] = [];
      let receivedBytes = 0;

      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.length;

        if (receivedBytes > input.maxResponseBytes) {
          response.destroy(new Error(`Outbound response exceeded ${input.maxResponseBytes} bytes.`));
          return;
        }

        chunks.push(buffer);
      });
      response.once("error", reject);
      response.once("end", () => {
        resolve({
          body: Buffer.concat(chunks),
          headers: responseHeaders(response.headers),
          status: response.statusCode ?? 0,
          url: input.url.toString()
        });
      });
    });

    request.setTimeout(remainingMs, () => request.destroy(new Error("Outbound request timed out.")));
    request.once("error", reject);

    if (input.body) request.write(input.body);
    request.end();
  });
}

export async function safeOutboundHttpRequest(rawUrl: string, options: {
  body?: Buffer | string | null;
  headers?: Record<string, string>;
  maxRedirects?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  method?: string;
  resolver?: SafeOutboundResolver;
  timeoutMs?: number;
  validateUrl?: (url: URL) => URL;
} = {}) {
  const maxRedirects = options.maxRedirects ?? 0;
  const maxRequestBytes = options.maxRequestBytes ?? 1_000_000;
  const maxResponseBytes = options.maxResponseBytes ?? 250_000;
  const deadline = Date.now() + (options.timeoutMs ?? 15_000);
  const validateUrl = options.validateUrl ?? ((url: URL) => assertSafePublicHttpUrl(url.toString(), "Outbound URL"));
  let current = validateUrl(assertSafePublicHttpUrl(rawUrl, "Outbound URL"));
  let body = options.body === undefined || options.body === null
    ? null
    : Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body);
  let method = (options.method ?? "GET").toUpperCase();
  let previousOrigin: string | null = null;

  if (body && body.length > maxRequestBytes) {
    throw new Error(`Outbound request body exceeded ${maxRequestBytes} bytes.`);
  }

  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await requestOnce({
      body,
      deadline,
      headers: options.headers,
      maxResponseBytes,
      method,
      previousOrigin,
      resolver: options.resolver,
      url: current
    });
    const location = response.headers.location;
    const isRedirect = [301, 302, 303, 307, 308].includes(response.status) && Boolean(location);

    if (!isRedirect) return response;

    if (redirectCount >= maxRedirects) {
      throw new Error("Outbound redirects are not allowed.");
    }

    const next = validateUrl(new URL(location!, current));
    previousOrigin = current.origin;
    current = next;

    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === "POST")) {
      method = "GET";
      body = null;
    }
  }
}

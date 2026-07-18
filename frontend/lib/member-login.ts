export const memberLoginBodyLimitBytes = 16 * 1024;

export function isJsonContentType(value: string | null) {
  return value?.toLowerCase().split(";", 1)[0]?.trim() === "application/json";
}

export async function readLimitedRequestBody(request: Request, limit = memberLoginBodyLimitBytes) {
  const declaredLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    return null;
  }

  if (!request.body) {
    return new Uint8Array();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function memberScopedLoginBody(body: Uint8Array) {
  try {
    const value = JSON.parse(new TextDecoder().decode(body));
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return null;
    }

    const credentials = value as Record<string, unknown>;
    return JSON.stringify({
      email: credentials.email,
      flow: "member",
      password: credentials.password
    });
  } catch {
    return null;
  }
}

export function withoutBearerToken(payload: unknown) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return payload;
  }

  const { token: _token, ...safePayload } = payload as Record<string, unknown>;
  return safePayload;
}

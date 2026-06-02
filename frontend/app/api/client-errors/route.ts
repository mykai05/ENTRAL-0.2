import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const payload = await request.json().catch(() => null);

  console.error("ENTRAL client error report", {
    payload,
    requestId
  });

  return NextResponse.json(
    {
      ok: true,
      requestId
    },
    {
      headers: {
        "x-request-id": requestId
      }
    }
  );
}

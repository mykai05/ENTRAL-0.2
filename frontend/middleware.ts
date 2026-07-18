import { NextRequest, NextResponse } from "next/server";

const retiredEntryPaths = new Set([
  "/forgot-password",
  "/onboarding",
  "/reset-password",
  "/signup",
  "/verify-email"
]);

const internalPresentationPaths = new Set([
  "/",
  "/admin",
  "/agents",
  "/automations",
  "/chat",
  "/dashboard"
]);

function decodedMemberSession(token: string | undefined) {
  if (!token) return false;

  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return false;

    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(paddedBase64)) as {
      aud?: string | string[];
      exp?: number;
      session?: string;
    };
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    return payload.session === "member"
      && audiences.includes("entral-member")
      && typeof payload.exp === "number"
      && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function isInternalPresentationPath(pathname: string) {
  return [...internalPresentationPaths].some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)));
}

export function middleware(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME ?? "entral_token";
  if (decodedMemberSession(request.cookies.get(cookieName)?.value) && (isInternalPresentationPath(request.nextUrl.pathname) || retiredEntryPaths.has(request.nextUrl.pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/member";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!retiredEntryPaths.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/agents/:path*",
    "/automations/:path*",
    "/chat/:path*",
    "/dashboard/:path*",
    "/forgot-password",
    "/onboarding",
    "/reset-password",
    "/signup",
    "/verify-email"
  ]
};

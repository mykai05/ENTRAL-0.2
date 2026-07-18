import { NextRequest, NextResponse } from "next/server";

const retiredEntryPaths = new Set([
  "/forgot-password",
  "/onboarding",
  "/reset-password",
  "/signup",
  "/verify-email"
]);

export function middleware(request: NextRequest) {
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
    "/forgot-password",
    "/onboarding",
    "/reset-password",
    "/signup",
    "/verify-email"
  ]
};

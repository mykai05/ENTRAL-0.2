import { NextRequest, NextResponse } from "next/server";

const cookieName = process.env.COOKIE_NAME ?? "entral_token";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(cookieName);
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isChat = request.nextUrl.pathname.startsWith("/chat");
  const isAutomations = request.nextUrl.pathname.startsWith("/automations");
  const isAgents = request.nextUrl.pathname.startsWith("/agents");
  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const isAuthPage = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup";

  if ((isDashboard || isChat || isAutomations || isAgents || isAdmin) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/chat",
    "/automations/:path*",
    "/automations",
    "/agents/:path*",
    "/agents",
    "/admin/:path*",
    "/admin",
    "/login",
    "/signup"
  ]
};

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { MemberDashboardClient } from "../../../components/MemberDashboardClient";
import { MemberServiceUnavailable } from "../../../components/MemberServiceUnavailable";
import { memberSignInPath } from "../../../lib/member";
import { loadMemberSession } from "../../../lib/member-session.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Full Organization Graph",
  description: "Organization-scoped Entral operating graph."
};

export default async function MemberGraphPage() {
  const requestHeaders = await headers();
  const session = await loadMemberSession(requestHeaders.get("cookie") ?? "");

  if (session.kind === "unauthenticated") {
    redirect(memberSignInPath("/member/graph"));
  }

  if (session.kind === "unavailable") {
    return <MemberServiceUnavailable message={session.message} requestId={session.requestId} />;
  }

  return <MemberDashboardClient initialSession={session.session} view="graph" />;
}

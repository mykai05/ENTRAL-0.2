import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { AccountSecurityControls } from "../../../../components/AccountSecurityControls";
import { MemberServiceUnavailable } from "../../../../components/MemberServiceUnavailable";
import { memberSignInPath } from "../../../../lib/member";
import { loadMemberSession } from "../../../../lib/member-session.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account security",
  description: "Authenticated Entral session, MFA, membership, and support-access controls."
};

export default async function MemberAccountSecurityPage() {
  const requestHeaders = await headers();
  const session = await loadMemberSession(requestHeaders.get("cookie") ?? "");

  if (session.kind === "unauthenticated") {
    redirect(memberSignInPath("/member/account/security"));
  }

  if (session.kind === "unavailable") {
    return <MemberServiceUnavailable message={session.message} requestId={session.requestId} />;
  }

  if (!session.session.organizations.length) {
    return <MemberServiceUnavailable message="Your account is verified but is not assigned to an Entral organization." />;
  }

  return <AccountSecurityControls />;
}

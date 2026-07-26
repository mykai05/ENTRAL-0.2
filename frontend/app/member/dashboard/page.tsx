import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { MemberCommandCenterClient } from "../../../components/MemberCommandCenterClient";
import { MemberServiceUnavailable } from "../../../components/MemberServiceUnavailable";
import { memberSignInPath } from "../../../lib/member";
import { loadMemberSession } from "../../../lib/member-session.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Authenticated Entral canonical portfolio dashboard."
};

export default async function MemberCommandCenterPage() {
  const requestHeaders = await headers();
  const session = await loadMemberSession(requestHeaders.get("cookie") ?? "");

  if (session.kind === "unauthenticated") {
    redirect(memberSignInPath("/member/dashboard"));
  }

  if (session.kind === "unavailable") {
    return <MemberServiceUnavailable message={session.message} requestId={session.requestId} />;
  }

  const organization = session.session.organizations[0];
  if (!organization) {
    return <MemberServiceUnavailable message="Your account is verified but is not assigned to an Entral organization." />;
  }

  return (
    <MemberCommandCenterClient
      initialDestination="dashboard"
      organizationId={organization.id}
      userId={session.session.user.id}
    />
  );
}

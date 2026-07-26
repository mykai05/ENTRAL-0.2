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
  title: "Infrastructure",
  description: "Authenticated Entral hierarchy and infrastructure records."
};

export default async function MemberInfrastructurePage() {
  const requestHeaders = await headers();
  const session = await loadMemberSession(requestHeaders.get("cookie") ?? "");

  if (session.kind === "unauthenticated") {
    redirect(memberSignInPath("/member/infrastructure"));
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
      initialDestination="infrastructure"
      initialSession={session.session}
    />
  );
}

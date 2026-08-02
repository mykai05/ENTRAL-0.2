import type { Metadata } from "next";
import React from "react";
import { BrandMark } from "../../../../components/BrandMark";
import { AccountInvitationAcceptance } from "../../../../components/AccountInvitationAcceptance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept Member Invitation",
  description: "Accept a secure invitation to an Entral organization.",
  referrer: "no-referrer",
  robots: {
    follow: false,
    index: false,
    nocache: true
  }
};

export default function MemberInvitationAcceptancePage() {
  return (
    <main className="member-auth-shell" id="main-content">
      <section className="member-auth-card">
        <div className="member-auth-brand">
          <BrandMark href="/member/sign-in" label="Entral sign in" />
          <span>Member invitation</span>
        </div>
        <AccountInvitationAcceptance />
      </section>
    </main>
  );
}

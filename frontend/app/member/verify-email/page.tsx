import type { Metadata } from "next";
import React from "react";
import { BrandMark } from "../../../components/BrandMark";
import { MemberVerificationClient } from "../../../components/MemberVerificationClient";
import { safeMemberReturnPath } from "../../../lib/member";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify an Entral member account email address."
};

export default async function MemberVerificationPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string | string[]; token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const returnTo = safeMemberReturnPath(params.next);

  return (
    <main className="member-auth-shell" id="main-content">
      <section className="member-auth-card">
        <div className="member-auth-brand"><BrandMark href="/member/sign-in" label="Entral sign in" /><span>Member access</span></div>
        <MemberVerificationClient returnTo={returnTo} token={token} />
      </section>
    </main>
  );
}

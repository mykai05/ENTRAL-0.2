import type { Metadata } from "next";
import React from "react";
import { BrandMark } from "../../../components/BrandMark";
import { MemberVerificationClient } from "../../../components/MemberVerificationClient";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify an Entral member account email address."
};

export default async function MemberVerificationPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <main className="member-auth-shell" id="main-content">
      <section className="member-auth-card">
        <div className="member-auth-brand"><BrandMark href="/member/sign-in" label="Entral sign in" /><span>Member access</span></div>
        <MemberVerificationClient token={token} />
      </section>
    </main>
  );
}

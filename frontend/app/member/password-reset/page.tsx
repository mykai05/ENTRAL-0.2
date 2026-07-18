import type { Metadata } from "next";
import React from "react";
import { BrandMark } from "../../../components/BrandMark";
import { MemberRecoveryClient } from "../../../components/MemberRecoveryClient";

export const metadata: Metadata = {
  title: "Password Recovery",
  description: "Recover access to a verified Entral member account."
};

export default async function MemberPasswordResetPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <main className="member-auth-shell" id="main-content">
      <section className="member-auth-card">
        <div className="member-auth-brand"><BrandMark href="/member/sign-in" /><span>Member access</span></div>
        <MemberRecoveryClient token={token} />
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import React from "react";
import { BrandMark } from "../../../components/BrandMark";
import { MemberSignInClient } from "../../../components/MemberSignInClient";
import { safeMemberReturnPath } from "../../../lib/member";

export const metadata: Metadata = {
  title: "Member Sign In",
  description: "Secure sign in for verified Entral organization members."
};

export default async function MemberSignInPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <main className="member-auth-shell" id="main-content">
      <section className="member-auth-card">
        <div className="member-auth-brand"><BrandMark href="/member/sign-in" label="Entral" /><span>Member access</span></div>
        <MemberSignInClient returnTo={safeMemberReturnPath(params.returnTo)} />
      </section>
    </main>
  );
}

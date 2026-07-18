import Link from "next/link";
import React from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { BrandMark } from "./BrandMark";

export function MemberServiceUnavailable({ message, requestId }: { message: string; requestId?: string }) {
  return (
    <main className="member-auth-shell" id="main-content">
      <section className="member-auth-card" role="alert">
        <div className="member-auth-brand"><BrandMark href="/member" /><span>Member workspace</span></div>
        <div className="member-service-error">
          <AlertCircle aria-hidden="true" size={28} />
          <h1>Member workspace unavailable</h1>
          <p>{message}</p>
          {requestId ? <code>Request {requestId}</code> : null}
          <Link className="member-auth-back" href="/member/sign-in"><ArrowLeft aria-hidden="true" size={16} />Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}

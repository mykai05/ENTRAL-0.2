import Link from "next/link";
import React from "react";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "../components/BrandMark";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="auth-panel launch-state">
        <BrandMark />
        <h1>Page not found</h1>
        <p>This route is not part of the active ENTRAL workspace.</p>
        <Link href="/dashboard" className="button button-primary">
          Return to dashboard
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}

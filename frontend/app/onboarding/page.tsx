import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { PublicBetaBrief } from "../../components/PublicBetaBrief";

type OnboardingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function safeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return undefined;
  }

  return next;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params?.next);
  const signInHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <main className="landing-shell onboarding-shell">
      <nav className="top-nav" aria-label="Onboarding navigation">
        <BrandMark />
        <div className="nav-actions">
          <Link href="/" className="nav-link">
            <ArrowLeft aria-hidden="true" size={18} />
            Home
          </Link>
          <Link href={signInHref} className="button button-secondary">
            Sign in
          </Link>
        </div>
      </nav>
      <PublicBetaBrief signInHref={signInHref} />
    </main>
  );
}

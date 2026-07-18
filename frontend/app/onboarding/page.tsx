import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { PublicBetaBrief } from "../../components/PublicBetaBrief";

export default function OnboardingPage() {
  return (
    <main className="landing-shell onboarding-shell">
      <nav className="top-nav" aria-label="Onboarding navigation">
        <BrandMark />
        <div className="nav-actions">
          <Link href="/" className="nav-link">
            <ArrowLeft aria-hidden="true" size={18} />
            Home
          </Link>
        </div>
      </nav>
      <PublicBetaBrief />
    </main>
  );
}

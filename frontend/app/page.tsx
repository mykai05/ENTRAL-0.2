import Link from "next/link";
import React from "react";
import { ArrowRight, CheckCircle2, LogIn, Network, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "../components/BrandMark";

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="top-nav" aria-label="Main navigation">
        <BrandMark />
        <div className="nav-actions">
          <Link href="/login" className="nav-link">
            <LogIn aria-hidden="true" size={18} />
            Sign in
          </Link>
          <Link href="/signup" className="button button-primary">
            Start
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </nav>

      <section className="hero-grid" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Command OS</p>
          <h1 id="hero-title">Entral</h1>
          <p>
            A private command center for directing agents, automations, merch operations, and governance from one account.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="button button-primary">
              Create account
              <ArrowRight aria-hidden="true" size={20} />
            </Link>
            <Link href="/login" className="button button-secondary">
              Sign in
            </Link>
          </div>
        </div>

        <div className="product-preview" aria-label="Command Center preview">
          <div className="preview-header">
            <span>Command Center</span>
            <strong>System ready</strong>
          </div>
          <div className="preview-bars">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-list">
            <div>
              <CheckCircle2 aria-hidden="true" size={22} />
              <span>Create an operator account</span>
            </div>
            <div>
              <Network aria-hidden="true" size={22} />
              <span>Open the live hierarchy</span>
            </div>
            <div>
              <Users aria-hidden="true" size={22} />
              <span>Issue directives to ENTRAL</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" size={22} />
              <span>Review governance and status</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

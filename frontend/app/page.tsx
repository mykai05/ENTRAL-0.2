import Link from "next/link";
import React from "react";
import { ArrowRight, CheckCircle2, ClipboardList, LogIn, ShieldCheck, Users } from "lucide-react";
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
          <p className="eyebrow">Phase 1 MVP</p>
          <h1 id="hero-title">Entral</h1>
          <p>
            A precise workspace for authenticated teams, persistent tasks, and disciplined execution.
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

        <div className="product-preview" aria-label="Dashboard preview">
          <div className="preview-header">
            <span>Today</span>
            <strong>3 active tasks</strong>
          </div>
          <div className="preview-bars">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-list">
            <div>
              <CheckCircle2 aria-hidden="true" size={22} />
              <span>Auth routes protected</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" size={22} />
              <span>JWT cookie issued</span>
            </div>
            <div>
              <Users aria-hidden="true" size={22} />
              <span>Teams stored in Postgres</span>
            </div>
            <div>
              <ClipboardList aria-hidden="true" size={22} />
              <span>Task list starts clean</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

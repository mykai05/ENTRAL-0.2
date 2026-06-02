import Link from "next/link";
import React from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  Layers3,
  LineChart,
  LockKeyhole,
  LogIn,
  Megaphone,
  ShieldCheck
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { PublicBetaBrief } from "../components/PublicBetaBrief";

const heroSignals = [
  "Real / Mock / Read-only labels",
  "Permission gates before external work",
  "Usage and cost guardrails",
  "Audit-ready operator decisions"
];

const operatingLoop = [
  {
    icon: Layers3,
    label: "Organize",
    text: "Map business goals, teams, tools, tasks, and operating context into one command structure."
  },
  {
    icon: ClipboardCheck,
    label: "Plan",
    text: "Turn directives into reviewable steps, handoffs, dependencies, and approval-ready work packets."
  },
  {
    icon: BarChart3,
    label: "Monitor",
    text: "Keep status, labels, reports, and connection health visible before operators trust any output."
  },
  {
    icon: ShieldCheck,
    label: "Prepare safely",
    text: "Draft growth, commerce, outreach, and operations actions without touching outside systems until approved."
  }
];

const boundaryCards = [
  {
    icon: LockKeyhole,
    label: "What ENTRAL will not do alone",
    text: "It does not post, buy ads, update stores, contact customers, or change external systems without scoped permission."
  },
  {
    icon: FileClock,
    label: "What ENTRAL records",
    text: "Sensitive actions are designed to move through permissions, usage limits, and logs before execution paths are enabled."
  },
  {
    icon: Megaphone,
    label: "How growth work is handled",
    text: "Content, social, Shopify, and campaign work starts as prepared drafts and launch checklists for human review."
  },
  {
    icon: LineChart,
    label: "How scaling stays controlled",
    text: "Analytics loops and recommendations stay visible, rate-limited, and approval-gated as integrations mature."
  }
];

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
          <Link href="/onboarding" className="button button-primary">
            Read brief
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-command-scene" aria-hidden="true">
          <div className="scene-grid" />
          <div className="scene-rail scene-rail-one" />
          <div className="scene-rail scene-rail-two" />
          <div className="scene-node scene-node-core"><span>ENTRAL</span></div>
          <div className="scene-node scene-node-plan"><span>Plan</span></div>
          <div className="scene-node scene-node-monitor"><span>Monitor</span></div>
          <div className="scene-node scene-node-approve"><span>Approve</span></div>
          <div className="scene-panel scene-panel-left">
            <span>Read-only preview</span>
            <strong>External systems locked</strong>
          </div>
          <div className="scene-panel scene-panel-right">
            <span>Operator queue</span>
            <strong>3 approvals pending</strong>
          </div>
          <div className="scene-panel scene-panel-bottom">
            <span>Cost guardrail</span>
            <strong>Usage visible before action</strong>
          </div>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Private beta</p>
          <h1 id="hero-title">Entral</h1>
          <p>
            An AI command center for organizing, planning, monitoring, and safely preparing business operations.
          </p>
          <p className="hero-context">
            Public entry starts with context: real account actions are labeled, mock or read-only systems stay marked,
            and external work requires approvals, logging, permissions, and cost controls.
          </p>
          <div className="hero-actions">
            <Link href="/onboarding" className="button button-primary">
              Read beta brief
              <ArrowRight aria-hidden="true" size={20} />
            </Link>
            <Link href="/login" className="button button-secondary">
              Sign in
            </Link>
          </div>
          <div className="hero-safety-strip" aria-label="Public safety guarantees">
            {heroSignals.map((signal) => (
              <span key={signal}>
                <CheckCircle2 aria-hidden="true" size={16} />
                {signal}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="public-explainer" aria-labelledby="public-explainer-title">
        <div className="section-heading">
          <p className="eyebrow">How it helps</p>
          <h2 id="public-explainer-title">One command layer for supervised business preparation.</h2>
          <p>
            ENTRAL is designed for operators who need clearer plans, safer handoffs, and visible status before work
            reaches customers, commerce tools, social channels, or ad platforms.
          </p>
        </div>

        <div className="explainer-grid">
          {operatingLoop.map(({ icon: Icon, label, text }) => (
            <article className="explainer-card" key={label}>
              <Icon aria-hidden="true" size={22} />
              <h3>{label}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-boundaries" aria-labelledby="public-boundaries-title">
        <div className="section-heading">
          <p className="eyebrow">Boundaries</p>
          <h2 id="public-boundaries-title">Powerful preparation, restrained execution.</h2>
        </div>
        <div className="boundary-grid">
          {boundaryCards.map(({ icon: Icon, label, text }) => (
            <article className="boundary-card" key={label}>
              <Icon aria-hidden="true" size={22} />
              <div>
                <h3>{label}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PublicBetaBrief />
    </main>
  );
}

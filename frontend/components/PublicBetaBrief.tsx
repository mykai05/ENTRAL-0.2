import Link from "next/link";
import React from "react";
import { ArrowRight, CheckCircle2, ClipboardCheck, Eye, LockKeyhole, ShieldCheck, TimerReset } from "lucide-react";

const modeLabels = [
  {
    icon: CheckCircle2,
    label: "Real",
    text: "Account creation, email verification, sign-in, and saved command-center state use production paths when the backend is connected."
  },
  {
    icon: Eye,
    label: "Mock",
    text: "Disconnected AI, automation, commerce, or provider workflows must show mock/fallback status before any generated result is trusted."
  },
  {
    icon: LockKeyhole,
    label: "Read-only",
    text: "Public previews and unconnected integrations can explain or prepare work, but they do not touch outside systems."
  }
];

const firstUseSteps = [
  "Review the private beta brief and safety model.",
  "Create an account, then verify your email.",
  "Enter the command center with real/mock/read-only labels visible.",
  "Connect external systems only when you are ready to grant scoped permission.",
  "Approve sensitive or costly actions before anything leaves ENTRAL."
];

const betaBoundaries = [
  "ENTRAL prepares business operations; it does not claim to run the business for you.",
  "Marketing, commerce, outreach, and ad actions begin as drafts, plans, or approval requests.",
  "Mock provider results are useful for exploration, but they are never presented as completed external work."
];

type PublicBetaBriefProps = {
  createHref?: string;
  showActions?: boolean;
  signInHref?: string;
};

export function PublicBetaBrief({
  createHref = "/signup",
  showActions = true,
  signInHref = "/login"
}: PublicBetaBriefProps) {
  return (
    <section className="public-brief" aria-labelledby="public-brief-title">
      <div className="brief-heading">
        <p className="eyebrow">Private beta brief</p>
        <h2 id="public-brief-title">Know what ENTRAL is before entering.</h2>
        <p>
          ENTRAL is an AI command center for organizing, planning, monitoring, and safely preparing business operations.
          It is built for supervised preparation and operational clarity, with explicit labels and approval gates.
        </p>
      </div>

      <div className="brief-mode-grid" aria-label="Mode labels">
        {modeLabels.map(({ icon: Icon, label, text }) => (
          <article className="brief-mode-panel" key={label}>
            <Icon aria-hidden="true" size={22} />
            <div>
              <h3>{label}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="brief-two-column">
        <section className="brief-section" aria-labelledby="first-use-title">
          <div className="brief-section-header">
            <ClipboardCheck aria-hidden="true" size={22} />
            <h3 id="first-use-title">First-use flow</h3>
          </div>
          <ol className="brief-steps">
            {firstUseSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="brief-section" aria-labelledby="guardrails-title">
          <div className="brief-section-header">
            <ShieldCheck aria-hidden="true" size={22} />
            <h3 id="guardrails-title">Guardrails</h3>
          </div>
          <ul className="brief-list">
            <li>External posting, commerce updates, outreach, and ad work require human approval.</li>
            <li>Sensitive actions are permission-checked, logged, and designed for cost limits.</li>
            <li>Unconnected integrations remain mock or read-only until credentials and policy are configured.</li>
          </ul>
        </section>
      </div>

      <section className="brief-section brief-boundary-section" aria-labelledby="beta-boundaries-title">
        <div className="brief-section-header">
          <TimerReset aria-hidden="true" size={22} />
          <h3 id="beta-boundaries-title">Beta boundaries</h3>
        </div>
        <ul className="brief-list">
          {betaBoundaries.map((boundary) => (
            <li key={boundary}>{boundary}</li>
          ))}
        </ul>
      </section>

      {showActions ? (
        <div className="brief-actions">
          <Link href={createHref} className="button button-primary">
            Create verified account
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <Link href={signInHref} className="button button-secondary">
            Sign in
          </Link>
        </div>
      ) : null}
    </section>
  );
}

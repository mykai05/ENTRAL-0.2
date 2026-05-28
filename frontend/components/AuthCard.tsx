import React, { type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "./BrandMark";

type AuthCardProps = {
  title: string;
  subtitle: string;
  footerLabel: string;
  footerHref: string;
  footerText: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, footerLabel, footerHref, footerText, children }: AuthCardProps) {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div>
          <div className="auth-brand-row">
            <BrandMark />
          </div>
          <h1 id="auth-title">{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
        <p className="auth-switch">
          {footerText} <Link href={footerHref}>{footerLabel}</Link>
        </p>
      </section>
    </main>
  );
}

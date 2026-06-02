"use client";

import React from "react";
import { CopyPlus } from "lucide-react";
import { Button } from "./Button";

export type AgentTemplate = {
  action: "research" | "sales_outreach" | "automation_review" | "chat_summary" | "general";
  capabilities: string;
  instructions: string;
  name: string;
  role: string;
  title: string;
};

const templates: AgentTemplate[] = [
  {
    action: "automation_review",
    capabilities: "scrape, monitor, summarize",
    instructions: "Scrape a configured public page, extract key changes, and summarize what moved.",
    name: "Price Scraper",
    role: "Monitor pricing pages and summarize changes",
    title: "Run price monitor"
  },
  {
    action: "research",
    capabilities: "research, summarize, brief",
    instructions: "Collect public signals and produce a concise daily research brief.",
    name: "Daily Research Brief",
    role: "Prepare recurring market and account intelligence",
    title: "Prepare daily brief"
  },
  {
    action: "sales_outreach",
    capabilities: "draft, personalize, outbound",
    instructions: "Draft a professional LinkedIn post based on the latest campaign context.",
    name: "LinkedIn Poster",
    role: "Create concise social posts for sales and brand updates",
    title: "Draft LinkedIn post"
  },
  {
    action: "chat_summary",
    capabilities: "summarize, extract, follow-up",
    instructions: "Summarize recent conversations and extract concrete next actions.",
    name: "Conversation Auditor",
    role: "Review chat history and identify follow-up work",
    title: "Summarize conversations"
  },
  {
    action: "research",
    capabilities: "account research, qualify, risks",
    instructions: "Research a target account, qualify fit, and identify risk signals.",
    name: "Account Qualifier",
    role: "Qualify prospects with public context",
    title: "Qualify target account"
  },
  {
    action: "automation_review",
    capabilities: "qa, browser, regression",
    instructions: "Run a browser workflow and report regressions, errors, and screenshots to review.",
    name: "QA Runner",
    role: "Check critical browser workflows",
    title: "Run QA workflow"
  },
  {
    action: "general",
    capabilities: "triage, classify, route",
    instructions: "Classify incoming work and route it to the right agent or queue.",
    name: "Queue Triage",
    role: "Route operational work to the right owner",
    title: "Triage queue"
  },
  {
    action: "research",
    capabilities: "security, policy, audit",
    instructions: "Review audit entries and identify risky background-agent patterns.",
    name: "Security Watch",
    role: "Watch governance logs and surface risky activity",
    title: "Review governance risk"
  }
];

export function AgentTemplateGallery({ onUseTemplate }: { onUseTemplate: (template: AgentTemplate) => void }) {
  return (
    <section className="template-gallery" id="templates" aria-label="Agent template gallery">
      <header>
        <div>
          <h2>Template Gallery</h2>
          <p>Guided presets for policy-gated workflows.</p>
        </div>
      </header>
      <div className="template-grid">
        {templates.map((template) => (
          <article className="template-card" key={template.name}>
            <div>
              <strong>{template.name}</strong>
              <span>{template.role}</span>
            </div>
            <p>{template.instructions}</p>
            <Button type="button" variant="secondary" onClick={() => onUseTemplate(template)}>
              <CopyPlus aria-hidden="true" size={18} />
              Use preset
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

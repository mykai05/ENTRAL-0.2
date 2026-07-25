"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, ExternalLink, HelpCircle, X } from "lucide-react";
import { useDialogFocus } from "../lib/dialog-focus";

type PaletteAction = {
  description: string;
  href?: string;
  id: string;
  keywords: string;
  label: string;
  run?: () => void;
};

const shortcuts = [
  { keys: "Cmd/Ctrl + K", label: "Open command palette" },
  { keys: "Cmd/Ctrl + ,", label: "Open theme settings" },
  { keys: "Cmd/Ctrl + /", label: "Open keyboard help" },
  { keys: "?", label: "Open keyboard help" },
  { keys: "Esc", label: "Close overlays or cancel current action" }
];

function fuzzyScore(query: string, candidate: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  if (!normalizedQuery) {
    return 1;
  }

  let queryIndex = 0;
  let score = 0;
  let streak = 0;

  for (let index = 0; index < normalizedCandidate.length && queryIndex < normalizedQuery.length; index += 1) {
    if (normalizedCandidate[index] === normalizedQuery[queryIndex]) {
      streak += 1;
      score += 2 + streak;
      queryIndex += 1;
    } else {
      streak = 0;
    }
  }

  return queryIndex === normalizedQuery.length ? score : 0;
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [query, setQuery] = useState("");
  const paletteRef = useDialogFocus<HTMLElement>(isOpen, () => setIsOpen(false));
  const helpRef = useDialogFocus<HTMLElement>(showHelp, () => setShowHelp(false));

  const actions = useMemo<PaletteAction[]>(() => [
    { description: "Open the portfolio summary and current work view", href: "/dashboard", id: "dashboard", keywords: "dashboard portfolio businesses work exceptions", label: "Dashboard" },
    { description: "Open the interactive hierarchy graph", href: "/graph", id: "graph", keywords: "open universe graph hierarchy visual", label: "OPEN UNIVERSE GRAPH" },
    { description: "Search hierarchy records and backend-connected operating modules", href: "/infrastructure", id: "infrastructure", keywords: "infrastructure records agents automations governance operations", label: "Infrastructure" },
    { description: "Open the real ENTRAL conversation inside Dashboard", href: "/dashboard?section=entral", id: "entral", keywords: "entral conversation chat assistant", label: "ENTRAL conversation" },
    { description: "Open backend-connected agent records inside Infrastructure", href: "/infrastructure?section=agents", id: "agents", keywords: "agents run assign schedules tasks", label: "Agent infrastructure" },
    { description: "Open backend-connected automation records inside Infrastructure", href: "/infrastructure?section=automations", id: "automations", keywords: "automation jobs browser tasks", label: "Automation infrastructure" },
    { description: "Open policies and audit records inside Infrastructure", href: "/infrastructure?section=governance", id: "governance", keywords: "governance policy audit admin", label: "Governance records" },
    { description: "Open backend-connected business operations inside Infrastructure", href: "/infrastructure?section=operations", id: "operations", keywords: "business merch products approvals stores operations", label: "Business operations" },
    { description: "Tune neon color, brightness, and onboarding", id: "settings", keywords: "theme customizer accent color settings tutorial academy", label: "Open settings", run: () => window.dispatchEvent(new Event("entral:open-settings")) },
    { description: "Open lessons, guided tasks, and progress tracking", id: "academy", keywords: "help onboarding guide tutorial beginner advanced academy training", label: "ENTRAL Academy", run: () => window.dispatchEvent(new Event("entral:open-academy")) },
    { description: "Replay the guided first-run walkthrough", id: "tutorial", keywords: "help onboarding guide tutorial beginner academy", label: "Replay walkthrough", run: () => window.dispatchEvent(new Event("entral:open-tutorial")) },
    { description: "Show every keyboard shortcut", id: "shortcuts", keywords: "keyboard help hotkeys commands", label: "Keyboard shortcuts", run: () => setShowHelp(true) }
  ], []);

  const filtered = useMemo(() => actions
    .map((action) => ({
      action,
      score: fuzzyScore(query, `${action.label} ${action.description} ${action.keywords}`)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.action), [actions, query]);

  useEffect(() => {
    function openPalette() {
      setQuery("");
      setShowHelp(false);
      setIsOpen(true);
    }

    function openShortcuts() {
      setIsOpen(false);
      setShowHelp(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setShowHelp(false);
        setQuery("");
        setIsOpen((current) => !current);
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        window.dispatchEvent(new Event("entral:open-settings"));
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        openShortcuts();
      }

      if (event.key === "?" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;

        if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
          event.preventDefault();
          openShortcuts();
        }
      }

      if (event.key === "Escape") {
        setIsOpen(false);
        setShowHelp(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("entral:open-command-palette", openPalette);
    window.addEventListener("entral:open-shortcuts", openShortcuts);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("entral:open-command-palette", openPalette);
      window.removeEventListener("entral:open-shortcuts", openShortcuts);
    };
  }, [router]);

  function runAction(action: PaletteAction) {
    action.run?.();

    if (action.href) {
      router.push(action.href);
    }

    setIsOpen(false);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filtered[0]) {
      event.preventDefault();
      runAction(filtered[0]);
    }
  }

  return (
    <>
      <button className="palette-trigger" data-academy="command-palette" type="button" onClick={() => setIsOpen(true)} aria-label="Open command palette">
        <Command aria-hidden="true" size={18} />
        <span>Command</span>
        <kbd>Ctrl K</kbd>
      </button>
      {isOpen ? (
        <div className="overlay-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section className="command-palette" ref={paletteRef} role="dialog" aria-label="Command palette" aria-modal="true" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button dialog-close-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close command palette">
              <X aria-hidden="true" size={18} />
            </button>
            <div className="command-input">
              <Command aria-hidden="true" size={20} />
              <label className="sr-only" htmlFor="command-palette-search">Search commands and pages</label>
              <input id="command-palette-search" data-dialog-initial-focus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleQueryKeyDown} placeholder="Search destinations, records, or settings..." />
            </div>
            <p className="command-palette-hint">Type what you want ENTRAL to do, then press Enter or click an action.</p>
            <div className="command-results">
              {filtered.length > 0 ? filtered.map((action, index) => (
                <button key={action.id} type="button" onClick={() => runAction(action)}>
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.description}</small>
                  </span>
                  {index === 0 ? <kbd>Enter</kbd> : <ExternalLink aria-hidden="true" size={16} />}
                </button>
              )) : (
                <p className="command-empty">No match yet. Try "dashboard", "graph", "infrastructure", "settings", or "academy".</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
      {showHelp ? (
        <div className="overlay-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section className="shortcut-panel" ref={helpRef} role="dialog" aria-label="Keyboard shortcuts" aria-modal="true" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <HelpCircle aria-hidden="true" size={22} />
              <h2>Keyboard Shortcuts</h2>
              <button className="icon-button" data-dialog-initial-focus type="button" onClick={() => setShowHelp(false)} aria-label="Close keyboard shortcuts">
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            {shortcuts.map((shortcut) => (
              <div key={shortcut.keys}>
                <kbd>{shortcut.keys}</kbd>
                <span>{shortcut.label}</span>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </>
  );
}

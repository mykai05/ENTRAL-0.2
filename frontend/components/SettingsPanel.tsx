"use client";

import React, { useEffect, useRef, useState } from "react";
import { Palette, RotateCcw, Settings, SlidersHorizontal, X } from "lucide-react";
import { Button } from "./Button";
import { neonPresets, useTheme } from "./ThemeProvider";
import { useOnboarding } from "./OnboardingTour";

const memoryKey = "entral-ai-memory-enabled";
const profileKey = "entral-account-settings";

export function SettingsPanel() {
  const { settings, updateSettings } = useTheme();
  const { openTour } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const profileSavedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMemoryEnabled(window.localStorage.getItem(memoryKey) === "true");

    try {
      const profile = JSON.parse(window.localStorage.getItem(profileKey) ?? "{}") as { email?: string; name?: string };
      setProfileName(profile.name ?? "");
      setProfileEmail(profile.email ?? "");
    } catch {
      setProfileName("");
      setProfileEmail("");
    }

    function openSettings() {
      setIsOpen(true);
    }

    window.addEventListener("entral:open-settings", openSettings);
    return () => {
      window.removeEventListener("entral:open-settings", openSettings);

      if (profileSavedTimerRef.current) {
        window.clearTimeout(profileSavedTimerRef.current);
      }
    };
  }, []);

  function updateMemory(enabled: boolean) {
    setMemoryEnabled(enabled);
    window.localStorage.setItem(memoryKey, String(enabled));
  }

  function resetTheme() {
    updateSettings({
      accentColor: neonPresets[0].color,
      brightness: 1,
      saturation: 1
    });
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  function saveAccountSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(profileKey, JSON.stringify({ email: profileEmail, name: profileName }));
    setProfileSaved(true);

    if (profileSavedTimerRef.current) {
      window.clearTimeout(profileSavedTimerRef.current);
    }

    profileSavedTimerRef.current = window.setTimeout(() => setProfileSaved(false), 1800);
  }

  return (
    <>
      <button className="settings-trigger" type="button" onClick={() => setIsOpen(true)} aria-label="Open settings">
        <Settings aria-hidden="true" size={18} />
        <span>Settings</span>
      </button>
      {isOpen ? (
        <div className="overlay-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section className="settings-panel" role="dialog" aria-label="Display and onboarding settings" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="panel-heading">
              <div>
                <p className="eyebrow">Personalize</p>
                <h2>Neon control room</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close settings">
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="settings-section">
              <div className="section-title-row">
                <Palette aria-hidden="true" size={18} />
                <h3>Global neon accent</h3>
              </div>
              <div className="color-preset-grid">
                {neonPresets.map((preset) => (
                  <button
                    aria-pressed={settings.accentColor.toLowerCase() === preset.color.toLowerCase()}
                    className="color-preset"
                    key={preset.color}
                    onClick={() => updateSettings({ accentColor: preset.color })}
                    style={{ "--preset-color": preset.color } as React.CSSProperties}
                    type="button"
                  >
                    <span aria-hidden="true" />
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="color-field">
                <span>RGB color wheel</span>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) => updateSettings({ accentColor: event.target.value })}
                  aria-label="Choose custom neon accent"
                />
              </label>
            </div>

            <form className="settings-section account-settings-form" onSubmit={saveAccountSettings}>
              <div className="section-title-row">
                <Settings aria-hidden="true" size={18} />
                <h3>Account</h3>
              </div>
              <label>
                <span>Profile name</span>
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label>
                <span>Current password</span>
                <input type="password" placeholder="Current password" autoComplete="current-password" />
              </label>
              <label>
                <span>New password</span>
                <input type="password" placeholder="New password" autoComplete="new-password" />
              </label>
              <div className="settings-actions">
                <Button type="submit" variant="secondary">Save account settings</Button>
                {profileSaved ? <span className="settings-saved" role="status">Saved locally</span> : null}
              </div>
            </form>

            <div className="settings-section">
              <div className="section-title-row">
                <SlidersHorizontal aria-hidden="true" size={18} />
                <h3>Glow tuning</h3>
              </div>
              <label className="range-field">
                <span>Brightness</span>
                <input
                  aria-label="Neon brightness"
                  max="1.45"
                  min="0.65"
                  onChange={(event) => updateSettings({ brightness: Number(event.target.value) })}
                  step="0.05"
                  type="range"
                  value={settings.brightness}
                />
                <strong>{Math.round(settings.brightness * 100)}%</strong>
              </label>
              <label className="range-field">
                <span>Saturation</span>
                <input
                  aria-label="Neon saturation"
                  max="1.55"
                  min="0.55"
                  onChange={(event) => updateSettings({ saturation: Number(event.target.value) })}
                  step="0.05"
                  type="range"
                  value={settings.saturation}
                />
                <strong>{Math.round(settings.saturation * 100)}%</strong>
              </label>
            </div>

            <div className="settings-section">
              <label className="switch-row">
                <span>
                  <strong>AI memory</strong>
                  <small>Keep long-term context enabled for future personalization.</small>
                </span>
                <input checked={memoryEnabled} onChange={(event) => updateMemory(event.target.checked)} type="checkbox" />
              </label>
            </div>

            <div className="settings-actions">
              <Button type="button" onClick={openTour} variant="secondary">
                Replay tutorial
              </Button>
              <Button type="button" onClick={resetTheme} variant="secondary">
                <RotateCcw aria-hidden="true" size={18} />
                Reset theme
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

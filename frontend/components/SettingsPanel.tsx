"use client";

import React, { useEffect, useRef, useState } from "react";
import { Brain, GraduationCap, Mic, Palette, RotateCcw, Settings, SlidersHorizontal, UserRound, Volume2, X } from "lucide-react";
import { AccountPrivacyControls } from "./AccountPrivacyControls";
import { Button } from "./Button";
import { ModeBadge } from "./ModeStatus";
import { neonPresets, useTheme } from "./ThemeProvider";
import { useOnboarding } from "./OnboardingTour";
import { speechModeLabels, useVoice } from "./VoiceProvider";

const memoryKey = "entral-ai-memory-enabled";
const profileKey = "entral-account-settings";
type SettingsTab = "appearance" | "account" | "assistant" | "voice" | "academy";

function readSettingsStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSettingsStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Account/settings preferences are optional local convenience data.
  }
}

export function SettingsPanel() {
  const { settings, updateSettings } = useTheme();
  const { mode, openLibrary, openTour, progress, setMode } = useOnboarding();
  const { isSpeechSupported, settings: voiceSettings, updateVoiceSettings, voices } = useVoice();
  const [isOpen, setIsOpen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const profileSavedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMemoryEnabled(readSettingsStorage(memoryKey) === "true");

    try {
      const profile = JSON.parse(readSettingsStorage(profileKey) ?? "{}") as { email?: string; name?: string };
      setProfileName(profile.name ?? "");
      setProfileEmail(profile.email ?? "");
    } catch {
      setProfileName("");
      setProfileEmail("");
    }

    function openSettings(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { tab?: SettingsTab } | undefined : undefined;
      setActiveTab(detail?.tab ?? "appearance");
      setIsOpen(true);
    }

    function closeSettings() {
      setIsOpen(false);
    }

    window.addEventListener("entral:open-settings", openSettings);
    window.addEventListener("entral:close-settings", closeSettings);
    return () => {
      window.removeEventListener("entral:open-settings", openSettings);
      window.removeEventListener("entral:close-settings", closeSettings);

      if (profileSavedTimerRef.current) {
        window.clearTimeout(profileSavedTimerRef.current);
      }
    };
  }, []);

  function updateMemory(enabled: boolean) {
    setMemoryEnabled(enabled);
    writeSettingsStorage(memoryKey, String(enabled));
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
    writeSettingsStorage(profileKey, JSON.stringify({ email: profileEmail, name: profileName }));
    setProfileSaved(true);

    if (profileSavedTimerRef.current) {
      window.clearTimeout(profileSavedTimerRef.current);
    }

    profileSavedTimerRef.current = window.setTimeout(() => setProfileSaved(false), 1800);
  }

  return (
    <>
      <button className="settings-trigger" data-academy="settings" type="button" onClick={() => setIsOpen(true)} aria-label="Open settings">
        <Settings aria-hidden="true" size={18} />
        <span>Settings</span>
      </button>
      {isOpen ? (
        <div className="overlay-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section className="settings-panel" role="dialog" aria-label="ENTRAL settings" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="panel-heading">
              <div>
                <p className="eyebrow">Control room</p>
                <h2>Settings</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close settings">
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="settings-tabs" role="tablist" aria-label="Settings categories">
              <button aria-selected={activeTab === "appearance"} className={activeTab === "appearance" ? "active" : ""} role="tab" type="button" onClick={() => setActiveTab("appearance")}>
                <Palette aria-hidden="true" size={16} />
                Appearance
              </button>
              <button aria-selected={activeTab === "account"} className={activeTab === "account" ? "active" : ""} role="tab" type="button" onClick={() => setActiveTab("account")}>
                <UserRound aria-hidden="true" size={16} />
                Account
              </button>
              <button aria-selected={activeTab === "assistant"} className={activeTab === "assistant" ? "active" : ""} role="tab" type="button" onClick={() => setActiveTab("assistant")}>
                <Brain aria-hidden="true" size={16} />
                Command AI
              </button>
              <button aria-selected={activeTab === "voice"} className={activeTab === "voice" ? "active" : ""} role="tab" type="button" onClick={() => setActiveTab("voice")}>
                <Volume2 aria-hidden="true" size={16} />
                Voice
              </button>
              <button aria-selected={activeTab === "academy"} className={activeTab === "academy" ? "active" : ""} role="tab" type="button" onClick={() => setActiveTab("academy")}>
                <GraduationCap aria-hidden="true" size={16} />
                Academy
              </button>
            </div>

            {activeTab === "appearance" ? (
              <>
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

                <div className="settings-actions">
                  <Button type="button" onClick={resetTheme} variant="secondary">
                    <RotateCcw aria-hidden="true" size={18} />
                    Reset theme
                  </Button>
                </div>
              </>
            ) : null}

            {activeTab === "account" ? (
              <>
                <form className="settings-section account-settings-form" onSubmit={saveAccountSettings}>
                  <div className="section-title-row">
                    <UserRound aria-hidden="true" size={18} />
                    <h3>Account</h3>
                    <ModeBadge mode="mock">Local profile</ModeBadge>
                  </div>
                  <p className="settings-helper">These profile fields are local browser preferences. Privacy export and account deletion below operate on real saved account data.</p>
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
                <AccountPrivacyControls />
              </>
            ) : null}

            {activeTab === "assistant" ? (
              <>
                <div className="settings-section">
                  <div className="section-title-row">
                    <Brain aria-hidden="true" size={18} />
                    <h3>Command AI behavior</h3>
                  </div>
                  <label className="switch-row">
                    <span>
                      <strong>AI memory</strong>
                      <small>Keep long-term context enabled for future personalization.</small>
                    </span>
                    <input checked={memoryEnabled} onChange={(event) => updateMemory(event.target.checked)} type="checkbox" />
                  </label>
                </div>
                <div className="settings-actions">
                  <Button type="button" onClick={() => openTour()} variant="secondary">
                    Replay tutorial
                  </Button>
                </div>
              </>
            ) : null}

            {activeTab === "voice" ? (
              <>
                <div className="settings-section">
                  <div className="section-title-row">
                    <Volume2 aria-hidden="true" size={18} />
                    <h3>Speech output</h3>
                  </div>
                  {!isSpeechSupported ? <p className="settings-helper" role="status">Speech output is not supported in this browser.</p> : null}
                  <label className="switch-row">
                    <span>
                      <strong>Enable speech</strong>
                      <small>ENTRAL speaks command reports according to the selected mode.</small>
                    </span>
                    <input checked={voiceSettings.mode !== "silent"} onChange={(event) => updateVoiceSettings({ mode: event.target.checked ? "reports" : "silent" })} type="checkbox" />
                  </label>
                  <label className="color-field">
                    <span>Speech mode</span>
                    <select value={voiceSettings.mode} onChange={(event) => updateVoiceSettings({ mode: event.target.value as typeof voiceSettings.mode })}>
                      {(["silent", "reports", "full"] as const).map((speechMode) => (
                        <option key={speechMode} value={speechMode}>{speechModeLabels[speechMode]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="color-field">
                    <span>Voice selection</span>
                    <select value={voiceSettings.voiceURI} onChange={(event) => updateVoiceSettings({ voiceURI: event.target.value })}>
                      <option value="">System default voice</option>
                      {voices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
                      ))}
                    </select>
                  </label>
                  <label className="range-field">
                    <span>Volume</span>
                    <input aria-label="Speech volume" max="1" min="0" onChange={(event) => updateVoiceSettings({ volume: Number(event.target.value) })} step="0.05" type="range" value={voiceSettings.volume} />
                    <strong>{Math.round(voiceSettings.volume * 100)}%</strong>
                  </label>
                  <label className="range-field">
                    <span>Speed</span>
                    <input aria-label="Speaking speed" max="1.35" min="0.65" onChange={(event) => updateVoiceSettings({ rate: Number(event.target.value) })} step="0.05" type="range" value={voiceSettings.rate} />
                    <strong>{voiceSettings.rate.toFixed(2)}x</strong>
                  </label>
                </div>
                <div className="settings-section">
                  <div className="section-title-row">
                    <Mic aria-hidden="true" size={18} />
                    <h3>Voice command input</h3>
                  </div>
                  <label className="switch-row">
                    <span>
                      <strong>Push-to-talk</strong>
                      <small>Hold or press the microphone button before speaking a directive.</small>
                    </span>
                    <input checked={voiceSettings.pushToTalk} onChange={(event) => updateVoiceSettings({ pushToTalk: event.target.checked })} type="checkbox" />
                  </label>
                  <label className="switch-row">
                    <span>
                      <strong>Wake word gate</strong>
                      <small>Only route recognized speech that begins with ENTRAL or Commander.</small>
                    </span>
                    <input checked={voiceSettings.wakeWordEnabled} onChange={(event) => updateVoiceSettings({ wakeWordEnabled: event.target.checked })} type="checkbox" />
                  </label>
                </div>
              </>
            ) : null}

            {activeTab === "academy" ? (
              <>
                <div className="settings-section">
                  <div className="section-title-row">
                    <GraduationCap aria-hidden="true" size={18} />
                    <h3>ENTRAL Academy</h3>
                  </div>
                  <p className="settings-helper">Progress: {progress.completed} of {progress.total} lessons complete.</p>
                  <label className="switch-row academy-mode-setting">
                    <span>
                      <strong>Beginner mode</strong>
                      <small>Shorter path focused on the essentials.</small>
                    </span>
                    <input checked={mode === "beginner"} onChange={() => setMode("beginner")} name="academy-mode" type="radio" />
                  </label>
                  <label className="switch-row academy-mode-setting">
                    <span>
                      <strong>Advanced mode</strong>
                      <small>Adds recovery, governance, and power-user workflows.</small>
                    </span>
                    <input checked={mode === "advanced"} onChange={() => setMode("advanced")} name="academy-mode" type="radio" />
                  </label>
                </div>
                <div className="settings-actions">
                  <Button type="button" onClick={() => openTour()} variant="secondary">
                    Start walkthrough
                  </Button>
                  <Button type="button" onClick={openLibrary} variant="secondary">
                    Open tutorial library
                  </Button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

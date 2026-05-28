"use client";

import React, { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark";

export type NeonPreset = {
  color: string;
  label: string;
};

export const neonPresets: NeonPreset[] = [
  { color: "#00F0FF", label: "Cyan" },
  { color: "#FF00FF", label: "Magenta" },
  { color: "#00BFFF", label: "Blue" },
  { color: "#39FF14", label: "Green" },
  { color: "#9B5CFF", label: "Purple" }
];

type ThemeSettings = {
  accentColor: string;
  brightness: number;
  saturation: number;
};

type ThemeContextValue = {
  settings: ThemeSettings;
  theme: Theme;
  toggleTheme: () => void;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "entral-theme";
const settingsKey = "entral-theme-settings";
const defaultSettings: ThemeSettings = {
  accentColor: neonPresets[0].color,
  brightness: 1,
  saturation: 1
};

function sanitizeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : defaultSettings.accentColor;
}

function readStoredSettings(): ThemeSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(settingsKey) ?? "{}") as Partial<ThemeSettings>;

    return {
      accentColor: sanitizeColor(parsed.accentColor),
      brightness: typeof parsed.brightness === "number" ? Math.min(Math.max(parsed.brightness, 0.65), 1.45) : defaultSettings.brightness,
      saturation: typeof parsed.saturation === "number" ? Math.min(Math.max(parsed.saturation, 0.55), 1.55) : defaultSettings.saturation
    };
  } catch {
    return defaultSettings;
  }
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);

  return {
    b: bigint & 255,
    g: (bigint >> 8) & 255,
    r: (bigint >> 16) & 255
  };
}

function applyTheme(settings: ThemeSettings) {
  const { r, g, b } = hexToRgb(settings.accentColor);
  document.documentElement.classList.add("dark");
  document.documentElement.classList.remove("light");
  document.documentElement.dataset.theme = "dark";
  document.documentElement.style.setProperty("--neon-accent", settings.accentColor);
  document.documentElement.style.setProperty("--neon-accent-rgb", `${r}, ${g}, ${b}`);
  document.documentElement.style.setProperty("--neon-brightness", String(settings.brightness));
  document.documentElement.style.setProperty("--neon-saturation", String(settings.saturation));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);

  useEffect(() => {
    const nextSettings = readStoredSettings();
    setSettings(nextSettings);
    applyTheme(nextSettings);
    window.localStorage.setItem(storageKey, "dark");
  }, []);

  useEffect(() => {
    applyTheme(settings);
    window.localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<ThemeContextValue>(() => ({
    settings,
    theme: "dark",
    toggleTheme: () => applyTheme(settings),
    updateSettings: (nextSettings) => setSettings((current) => ({ ...current, ...nextSettings }))
  }), [settings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return value;
}

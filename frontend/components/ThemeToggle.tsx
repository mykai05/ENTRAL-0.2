"use client";

import React from "react";
import { Moon } from "lucide-react";

export function ThemeToggle() {
  return (
    <button className="theme-toggle" type="button" disabled aria-label="Dark theme enabled">
      <Moon aria-hidden="true" size={18} />
      <span>Dark</span>
    </button>
  );
}

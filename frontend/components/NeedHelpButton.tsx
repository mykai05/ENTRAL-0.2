"use client";

import Link from "next/link";
import React from "react";
import { HelpCircle } from "lucide-react";

const helpPrompt = "Help me get started";

export function NeedHelpButton() {
  return (
    <Link
      className="need-help-button"
      data-academy="need-help"
      href={`/chat?prompt=${encodeURIComponent(helpPrompt)}`}
      aria-label="Need help? Open chat with a starter prompt"
    >
      <HelpCircle aria-hidden="true" size={18} />
      Need help?
    </Link>
  );
}

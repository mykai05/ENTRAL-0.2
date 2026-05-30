"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel launch-state">
        <BrandMark />
        <h1>Workspace error</h1>
        <p>ENTRAL hit a recoverable error. Your workspace was not intentionally changed.</p>
        <Button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" size={18} />
          Try again
        </Button>
      </section>
    </main>
  );
}

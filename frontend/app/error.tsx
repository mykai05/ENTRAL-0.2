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
        <h1>Something slipped</h1>
        <p>ENTRAL caught the error and kept the workspace intact.</p>
        <Button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" size={18} />
          Try again
        </Button>
      </section>
    </main>
  );
}

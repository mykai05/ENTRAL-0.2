"use client";

import React, { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ENTRAL route error", {
      digest: error.digest,
      message: error.message,
      name: error.name
    });
  }, [error]);

  return (
    <main className="auth-shell">
      <section className="auth-panel launch-state">
        <BrandMark />
        <h1>Workspace error</h1>
        <p>ENTRAL hit a recoverable error. Your workspace was not intentionally changed, and external actions remain gated.</p>
        {error.digest ? <code className="error-digest">Reference {error.digest}</code> : null}
        <Button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" size={18} />
          Try again
        </Button>
      </section>
    </main>
  );
}

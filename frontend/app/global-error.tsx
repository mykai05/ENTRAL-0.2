"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ENTRAL global render error", {
      digest: error.digest,
      message: error.message,
      name: error.name
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="auth-shell">
          <section className="auth-panel launch-state" role="alert">
            <AlertTriangle aria-hidden="true" size={30} />
            <h1>ENTRAL stayed online</h1>
            <p>
              The workspace recovered from a root render error. Real account actions may be unavailable until reload; external
              actions remain logged, permission-checked, and approval-gated.
            </p>
            {error.digest ? <code className="error-digest">Reference {error.digest}</code> : null}
            <button className="button button-primary" type="button" onClick={reset}>
              <RotateCcw aria-hidden="true" size={18} />
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

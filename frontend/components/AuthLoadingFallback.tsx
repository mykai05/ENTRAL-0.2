import React from "react";

export function AuthLoadingFallback({ label = "Loading secure account form..." }: { label?: string }) {
  return (
    <p className="auth-loading-fallback" role="status" aria-live="polite">
      {label}
    </p>
  );
}

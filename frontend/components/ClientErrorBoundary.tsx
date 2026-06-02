"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { BrandMark } from "./BrandMark";

type ClientErrorBoundaryProps = {
  children: React.ReactNode;
};

type ClientErrorBoundaryState = {
  errorMessage: string;
  hasError: boolean;
};

function reportClientError(error: Error, errorInfo: React.ErrorInfo) {
  const payload = JSON.stringify({
    componentStack: errorInfo.componentStack?.slice(0, 1800),
    message: error.message.slice(0, 500),
    name: error.name,
    path: typeof window === "undefined" ? "" : window.location.pathname,
    timestamp: new Date().toISOString()
  });

  if (typeof window === "undefined") {
    return;
  }

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/client-errors", blob);
    return;
  }

  void fetch("/api/client-errors", {
    body: payload,
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST"
  }).catch(() => undefined);
}

export class ClientErrorBoundary extends React.Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  state: ClientErrorBoundaryState = {
    errorMessage: "",
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return {
      errorMessage: error.message,
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ENTRAL client render error", error, errorInfo);
    reportClientError(error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="auth-shell">
        <section className="auth-panel launch-state client-error-fallback" role="alert">
          <BrandMark />
          <AlertTriangle aria-hidden="true" size={28} />
          <h1>Workspace recovered</h1>
          <p>
            ENTRAL caught a screen error before the workspace could go blank. Real account actions may be unavailable until
            this view reloads; mock and read-only safeguards remain in place.
          </p>
          {this.state.errorMessage ? <code>{this.state.errorMessage}</code> : null}
          <Button type="button" onClick={() => this.setState({ errorMessage: "", hasError: false })}>
            <RotateCcw aria-hidden="true" size={18} />
            Try again
          </Button>
        </section>
      </main>
    );
  }
}

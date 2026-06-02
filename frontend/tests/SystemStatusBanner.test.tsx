import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemStatusBanner } from "../components/SystemStatusBanner";

describe("SystemStatusBanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("stays hidden when frontend and backend health are good", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));

    render(<SystemStatusBanner />);

    await waitFor(() => {
      expect(screen.queryByText("System health degraded")).not.toBeInTheDocument();
    });
  });

  it("shows a degraded status without blocking the page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        backend: { configured: true, ok: false, status: 502 },
        frontend: { ok: true },
        ok: false,
        requestId: "health-test"
      }),
      { status: 502 }
    )));

    render(<SystemStatusBanner />);

    expect(await screen.findByText("System health degraded")).toBeInTheDocument();
    expect(screen.getByText(/Real account actions may fail/i)).toBeInTheDocument();
    expect(screen.getByText("Request health-test")).toBeInTheDocument();
  });
});

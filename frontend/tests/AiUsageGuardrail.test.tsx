import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiUsageGuardrail } from "../components/AiUsageGuardrail";
import { ApiError } from "../lib/api";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn()
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    apiFetch: mocks.apiFetch
  };
});

function usage(mode: "mock" | "real") {
  return {
    summary: {
      daily: { limitCents: 100, remainingCents: 100, usedCents: 0 },
      monthly: { limitCents: 1000, remainingCents: 1000, usedCents: 0 },
      mode,
      provider: {
        modelName: mode === "real" ? "connected-model" : "local-fallback",
        providerName: mode === "real" ? "OpenAI" : "Local fallback",
        status: mode === "real" ? "connected" : "not connected"
      }
    }
  };
}

describe("AiUsageGuardrail", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
  });

  it("keeps directive actions unavailable for a mock provider", async () => {
    const onProviderReadyChange = vi.fn();
    mocks.apiFetch.mockResolvedValueOnce(usage("mock"));

    render(<AiUsageGuardrail onProviderReadyChange={onProviderReadyChange} />);

    expect(await screen.findByText("Mock provider")).toBeInTheDocument();
    await waitFor(() => expect(onProviderReadyChange).toHaveBeenLastCalledWith(false));
  });

  it("enables directive actions only for a connected real provider within budget", async () => {
    const onProviderReadyChange = vi.fn();
    mocks.apiFetch.mockResolvedValueOnce(usage("real"));

    render(<AiUsageGuardrail onProviderReadyChange={onProviderReadyChange} />);

    expect(await screen.findByText("Real provider")).toBeInTheDocument();
    await waitFor(() => expect(onProviderReadyChange).toHaveBeenLastCalledWith(true));
  });

  it("renders real provider usage caps", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      summary: {
        daily: {
          limitCents: 500,
          remainingCents: 400,
          usedCents: 100
        },
        mode: "real",
        monthly: {
          limitCents: 2500,
          remainingCents: 2000,
          usedCents: 500
        },
        provider: {
          modelName: "gpt-4o",
          providerName: "OpenAI",
          status: "Connected"
        }
      }
    });

    render(<AiUsageGuardrail />);

    expect(await screen.findByText("AI cost guardrails")).toBeInTheDocument();
    expect(screen.getByText("Real provider")).toBeInTheDocument();
    expect(screen.getByText(/OpenAI status: Connected/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Today AI budget usage" })).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByRole("progressbar", { name: "This month AI budget usage" })).toHaveAttribute("aria-valuenow", "20");
  });

  it("hides itself when the user is not authenticated", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiError(401, "Authentication is required.", null));

    render(<AiUsageGuardrail />);

    await waitFor(() => {
      expect(screen.queryByText("AI cost guardrails")).not.toBeInTheDocument();
    });
  });
});

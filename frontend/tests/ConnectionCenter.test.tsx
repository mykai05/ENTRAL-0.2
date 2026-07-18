import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionCenter } from "../components/ConnectionCenter";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {},
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

const tool = {
  availableActions: ["status.read"],
  category: "Development" as const,
  connectionStatus: "Connected" as const,
  description: "A read-only test connection.",
  id: "test-tool",
  name: "Test tool",
  readOnly: true,
  requiredCredentials: [],
  requiresAuthorization: false,
  riskLevel: "Low" as const,
  status: "Connected" as const,
  writeActionsEnabled: false
};

describe("ConnectionCenter", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/connections/tools") {
        return Promise.resolve({ items: [tool] });
      }

      return Promise.reject(new Error("Development status unavailable"));
    });
  });

  it("loads the registry once even when parent callback identities change", async () => {
    const { rerender } = render(<ConnectionCenter onEvent={() => undefined} onRegistryLoad={() => undefined} />);

    expect(await screen.findByText("1 tools", { selector: ".connection-center-status" })).toBeInTheDocument();

    rerender(<ConnectionCenter onEvent={() => undefined} onRegistryLoad={() => undefined} />);

    expect(screen.queryByText("Syncing")).not.toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });
});

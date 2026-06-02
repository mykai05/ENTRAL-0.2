import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPrivacyControls } from "../components/AccountPrivacyControls";

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

describe("AccountPrivacyControls", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:entral-export")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads a real account export without contacting external providers", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      mode: {
        accountData: "real",
        externalProvidersContacted: false
      },
      summary: {
        conversations: 1
      }
    });

    render(<AccountPrivacyControls />);

    expect(screen.getByText("Real account data")).toBeInTheDocument();
    expect(screen.getByText(/No external provider is contacted/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /download export/i }));

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith("/account/export");
    });
    expect(await screen.findByText("Account export prepared.")).toBeInTheDocument();
  });

  it("requires password and the exact deletion phrase before deleting the account", async () => {
    const onDeleted = vi.fn();
    mocks.apiFetch.mockResolvedValueOnce({ ok: true });

    render(<AccountPrivacyControls onDeleted={onDeleted} />);

    await userEvent.type(screen.getByLabelText(/current password/i), "secure-password");
    await userEvent.type(screen.getByLabelText(/confirmation phrase/i), "DELETE MY ACCOUNT");
    await userEvent.click(screen.getByRole("button", { name: /^delete account$/i }));

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith("/account", {
        method: "DELETE",
        json: {
          confirmation: "DELETE MY ACCOUNT",
          password: "secure-password"
        }
      });
    });
    expect(onDeleted).toHaveBeenCalled();
  });
});

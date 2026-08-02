import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPrivacyControls } from "../components/AccountPrivacyControls";
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
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("123e4567-e89b-42d3-a456-426614174202");
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
        headers: { "idempotency-key": "123e4567-e89b-42d3-a456-426614174202" },
        json: {
          confirmation: "DELETE MY ACCOUNT",
          password: "secure-password"
        }
      });
    });
    expect(onDeleted).toHaveBeenCalled();
  });

  it("explains retained tenant evidence and renders the ownership-transfer blocker", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiError(409, "Transfer ownership.", {
      reason_code: "LAST_ACTIVE_OWNER_REQUIRED"
    }));
    render(<AccountPrivacyControls />);
    expect(screen.getByText(/Tenant records, creator provenance, and required security evidence are retained/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/current password/i), "secure-password");
    await userEvent.type(screen.getByLabelText(/confirmation phrase/i), "DELETE MY ACCOUNT");
    await userEvent.click(screen.getByRole("button", { name: /^delete account$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Transfer ownership to another active owner before deidentifying this account."
    );
  });
});

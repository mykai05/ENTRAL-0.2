import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SignupForm } from "../components/SignupForm";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh })
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    apiFetch: mocks.apiFetch
  };
});

describe("SignupForm", () => {
  it("sends users to email verification after account creation", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      message: "Account created. Verify your email before signing in.",
      verificationRequired: true
    });

    render(<SignupForm />);

    expect(screen.getByText(/mock or read-only/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/name/i), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secure-password");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/verify-email?email=ada%40example.com");
    });
  });
});

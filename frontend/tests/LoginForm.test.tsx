import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm, safeLoginNextPath } from "../components/LoginForm";
import { apiFetch } from "../lib/api";

const navigation = vi.hoisted(() => ({
  next: null as string | null,
  push: vi.fn(),
  refresh: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, refresh: navigation.refresh }),
  useSearchParams: () => new URLSearchParams(navigation.next ? { next: navigation.next } : undefined)
}));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: vi.fn()
}));

describe("LoginForm", () => {
  beforeEach(() => {
    navigation.next = null;
    navigation.push.mockReset();
    navigation.refresh.mockReset();
    vi.mocked(apiFetch).mockReset();
  });

  it("shows validation errors before submitting invalid input", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it("links to real password recovery", async () => {
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("accepts only same-origin post-login paths", () => {
    expect(safeLoginNextPath("/agents?view=active#templates")).toBe("/agents?view=active#templates");
    expect(safeLoginNextPath("https://evil.example/steal")).toBe("/dashboard");
    expect(safeLoginNextPath("//evil.example/steal")).toBe("/dashboard");
    expect(safeLoginNextPath("/\\evil.example/steal")).toBe("/dashboard");
    expect(safeLoginNextPath(null)).toBe("/dashboard");
  });

  it("routes a successful login to the validated internal destination", async () => {
    navigation.next = "/agents?view=active#templates";
    vi.mocked(apiFetch).mockResolvedValueOnce({});
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "operator@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/agents?view=active#templates"));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});

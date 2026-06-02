import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "../app/page";
import OnboardingPage from "../app/onboarding/page";
import { metadata } from "../app/layout";

describe("public onboarding", () => {
  it("uses the approved public positioning on the landing page", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: "Entral" })).toBeInTheDocument();
    expect(screen.getAllByText(/AI command center for organizing, planning, monitoring, and safely preparing business operations/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /read beta brief/i })).toHaveAttribute("href", "/onboarding");
    expect(screen.getByText(/Real \/ Mock \/ Read-only labels/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /one command layer for supervised business preparation/i })).toBeInTheDocument();
    expect(screen.getByText(/It does not post, buy ads, update stores, contact customers, or change external systems without scoped permission/i)).toBeInTheDocument();
  });

  it("shows first-use safety context before account creation", async () => {
    const page = await OnboardingPage({
      searchParams: Promise.resolve({ next: "/dashboard" })
    });

    render(page);

    expect(screen.getByRole("heading", { name: /know what entral is before entering/i })).toBeInTheDocument();
    expect(screen.getByText(/Create an account, then verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(/External posting, commerce updates, outreach, and ad work require human approval/i)).toBeInTheDocument();
    expect(screen.getByText(/ENTRAL prepares business operations; it does not claim to run the business for you/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create verified account/i })).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("link", { name: /sign in/i }).every((link) => link.getAttribute("href") === "/login?next=%2Fdashboard")).toBe(true);
  });

  it("keeps public metadata aligned with the approved positioning", () => {
    expect(metadata.description).toBe("An AI command center for organizing, planning, monitoring, and safely preparing business operations.");
    expect(JSON.stringify(metadata).toLowerCase()).not.toContain("autonomous command workspace");
  });
});

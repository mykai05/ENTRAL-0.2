import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MemberDestinationNav,
  memberDestinationForPath,
  memberDestinations
} from "../components/MemberDestinationNav";

describe("MemberDestinationNav", () => {
  it("locks the authenticated product to exactly three top-level destinations", () => {
    expect(memberDestinations.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/dashboard", label: "Dashboard" },
      { href: "/graph", label: "OPEN UNIVERSE GRAPH" },
      { href: "/infrastructure", label: "Infrastructure" }
    ]);

    render(<MemberDestinationNav current="graph" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(screen.getByRole("link", { name: "OPEN UNIVERSE GRAPH" })).toHaveAttribute("aria-current", "page");
  });

  it("maps member routes to their canonical destination", () => {
    expect(memberDestinationForPath("/dashboard")).toBe("dashboard");
    expect(memberDestinationForPath("/graph?entity=marshal-1")).toBe("graph");
    expect(memberDestinationForPath("/infrastructure/records")).toBe("infrastructure");
    expect(memberDestinationForPath("/member/graph")).toBe("graph");
    expect(memberDestinationForPath("/member/infrastructure")).toBe("infrastructure");
    expect(memberDestinationForPath("/agents")).toBe("dashboard");
  });

  it("targets the protected member route family on the member surface", () => {
    render(<MemberDestinationNav current="dashboard" surface="member" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/member/dashboard");
    expect(screen.getByRole("link", { name: "OPEN UNIVERSE GRAPH" })).toHaveAttribute("href", "/member/graph");
    expect(screen.getByRole("link", { name: "Infrastructure" })).toHaveAttribute("href", "/member/infrastructure");
  });
});

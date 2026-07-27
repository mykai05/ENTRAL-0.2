import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { CanonicalGraphTextualHierarchy } from "../components/CanonicalGraphErrorBoundary";
import { authorityHierarchy, graphEntity } from "./phase195-graph-fixtures";

describe("Phase 195 graph accessibility", () => {
  it("exposes the truthful fallback as one roving-focus hierarchy", () => {
    render(
      <CanonicalGraphTextualHierarchy
        entities={authorityHierarchy()}
        label="Authorized graph"
      />
    );

    const tree = screen.getByRole("tree", { name: "Authorized graph" });
    const items = within(tree).getAllByRole("treeitem");
    expect(items).toHaveLength(9);
    expect(items[0]).toHaveAttribute("tabindex", "0");
    for (const item of items.slice(1)) {
      expect(item).toHaveAttribute("tabindex", "-1");
    }

    items[0]!.focus();
    fireEvent.keyDown(items[0]!, { key: "ArrowRight" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1]!, { key: "ArrowLeft" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0]!, { key: "End" });
    expect(items.at(-1)).toHaveFocus();
    fireEvent.keyDown(items.at(-1)!, { key: "Home" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0]!, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1]!, { key: "ArrowUp" });
    expect(items[0]).toHaveFocus();
  });

  it("retains an authorized entity whose parent is outside the visible projection", () => {
    const orphan = graphEntity("authorized-orphan", "GENERAL", "hidden-parent");
    render(
      <CanonicalGraphTextualHierarchy
        entities={[orphan]}
        label="Filtered authorized graph"
      />
    );

    fireEvent.click(screen.getByText(/Filtered authorized graph textual hierarchy/i));
    expect(screen.getByRole("treeitem", { name: /GENERAL: authorized-orphan/i }))
      .toBeVisible();
  });
});

import "@testing-library/jest-dom/vitest";
import type { EntityFullRecord, EntityRole, EntitySummary } from "@entral/contracts";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CanonicalInfrastructure,
  orderCanonicalInfrastructureEntities
} from "../components/CanonicalInfrastructure";

const portfolio = vi.hoisted(() => {
  const entries = new Map<string, unknown>();
  const serialize = (key: readonly unknown[]) => JSON.stringify(key);
  return {
    entries,
    get: vi.fn((key: readonly unknown[]) => entries.get(serialize(key))),
    invalidate: vi.fn((key: readonly unknown[]) => entries.delete(serialize(key))),
    loadEntity: vi.fn(),
    set: vi.fn((key: readonly unknown[], value: unknown) => {
      entries.set(serialize(key), value);
      return value;
    })
  };
});

vi.mock("../lib/canonical-portfolio", () => ({
  canonicalPortfolioCache: {
    get: portfolio.get,
    invalidate: portfolio.invalidate,
    set: portfolio.set
  },
  canonicalQueryKeys: {
    entity: (source: { organizationId?: string }, entityId: string) => [
      "canonical-entity",
      source.organizationId ?? "internal",
      entityId
    ]
  },
  loadCanonicalEntity: portfolio.loadEntity
}));

function entity(
  entityId: string,
  role: EntityRole,
  parentId: string | null,
  stableCode = entityId
): EntitySummary {
  return {
    active_alert: null,
    active_task_count: 0,
    assigned_business_id: null,
    child_count: 0,
    compute_tier: null,
    current_mission: null,
    entity_id: entityId,
    entity_type: role,
    health: "HEALTHY",
    latest_material_result: null,
    model_class: null,
    name: entityId,
    parent_id: parentId,
    stable_code: stableCode,
    status: "ACTIVE",
    updated_at: "2026-07-25T00:00:00.000Z",
    version: 1
  };
}

function fullRecord(summary: EntitySummary, aggregateVersion: number): EntityFullRecord {
  return {
    aggregate_version: aggregateVersion,
    audit: {},
    authority: {},
    configuration: {},
    connections: {},
    economics: {},
    evidence: {},
    loaded_at: "2026-07-25T00:00:00.000Z",
    operations: {},
    reliability: {},
    runtime: {},
    summary,
    version_history: []
  };
}

const hierarchy = [
  entity("Soldier One", "SOLDIER", "Commander One", "S-001"),
  entity("ENTRAL Root", "ENTRAL", null, "E-001"),
  entity("Commander One", "COMMANDER", "General One", "C-001"),
  entity("General One", "GENERAL", "ENTRAL Root", "G-001")
];

function renderInfrastructure(
  entities: readonly EntitySummary[],
  selectedEntityId: string | null = null,
  eventSequence = 9
) {
  return render(
    <CanonicalInfrastructure
      entities={entities}
      eventSequence={eventSequence}
      organizationId="organization-1"
      onSelectedEntityChange={vi.fn()}
      selectedEntityId={selectedEntityId}
    />
  );
}

beforeEach(() => {
  portfolio.entries.clear();
  portfolio.get.mockClear();
  portfolio.invalidate.mockClear();
  portfolio.loadEntity.mockReset();
  portfolio.set.mockClear();
});

describe("CanonicalInfrastructure hierarchy", () => {
  it("orders flat summaries depth-first and keeps each parent adjacent to its descendants", () => {
    expect(orderCanonicalInfrastructureEntities(hierarchy).map((row) => [
      row.entity.entity_id,
      row.depth,
      row.parentName
    ])).toEqual([
      ["ENTRAL Root", 0, null],
      ["General One", 1, "ENTRAL Root"],
      ["Commander One", 2, "General One"],
      ["Soldier One", 3, "Commander One"]
    ]);

    renderInfrastructure(hierarchy);
    const rows = screen.getAllByRole("treeitem");
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "ENTRAL Root, ENTRAL, parent none",
      "General One, GENERAL, parent ENTRAL Root",
      "Commander One, COMMANDER, parent General One",
      "Soldier One, SOLDIER, parent Commander One"
    ]);
    expect(rows.map((row) => row.getAttribute("aria-level"))).toEqual(["1", "2", "3", "4"]);
    expect(screen.getByText(/Parent: Commander One/)).toBeInTheDocument();
  });

  it("fails visibly when a deep-linked entity is outside the inherited canonical scope", () => {
    renderInfrastructure(hierarchy, "missing-entity-id");

    expect(screen.getByRole("heading", { name: "Requested record unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/No substitute record is shown/i)).toBeInTheDocument();
    expect(portfolio.loadEntity).not.toHaveBeenCalled();
  });

  it("retains search and rank filters while including ancestor rows as labeled lineage context", () => {
    renderInfrastructure(hierarchy);
    fireEvent.change(screen.getByPlaceholderText("Search records"), {
      target: { value: "Soldier One" }
    });
    expect(screen.getAllByRole("treeitem")).toHaveLength(4);
    expect(screen.getByText("ENTRAL Root (lineage)")).toBeInTheDocument();
    expect(screen.getByText("General One (lineage)")).toBeInTheDocument();
    expect(screen.getByText("Commander One (lineage)")).toBeInTheDocument();
    expect(screen.getByText("Soldier One")).toBeInTheDocument();
    expect(screen.getByText("1 matching records")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search records"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Rank"), { target: { value: "GENERAL" } });
    expect(screen.getAllByRole("treeitem")).toHaveLength(2);
    expect(screen.getByText("General One")).toBeInTheDocument();
  });
});

describe("CanonicalInfrastructure keyboard tree", () => {
  it("supports parent/child Left and Right navigation with roving focus", async () => {
    renderInfrastructure(hierarchy);
    const root = screen.getByRole("treeitem", { name: /ENTRAL Root, ENTRAL/ });
    act(() => root.focus());
    fireEvent.keyDown(root, { key: "ArrowRight" });
    const general = screen.getByRole("treeitem", { name: /General One, GENERAL/ });
    await waitFor(() => expect(general).toHaveFocus());
    expect(general).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(general, { key: "ArrowLeft" });
    await waitFor(() => expect(root).toHaveFocus());
  });

  it("uses End and focus-driven virtualization to make the last of 10000 rows reachable", async () => {
    const large = [entity("ENTRAL Root", "ENTRAL", null, "E-00000")];
    for (let index = 1; index < 10_000; index += 1) {
      large.push(entity(
        `Soldier ${String(index).padStart(5, "0")}`,
        "SOLDIER",
        "ENTRAL Root",
        `S-${String(index).padStart(5, "0")}`
      ));
    }
    renderInfrastructure(large);
    const root = screen.getByRole("treeitem", { name: /ENTRAL Root, ENTRAL/ });
    act(() => root.focus());
    fireEvent.keyDown(root, { key: "End" });

    const last = await screen.findByRole("treeitem", { name: /Soldier 09999, SOLDIER/ });
    await waitFor(() => expect(last).toHaveFocus());
    expect(last).toHaveAttribute("tabindex", "0");
    expect(screen.getAllByRole("treeitem").length).toBeLessThan(100);
  });

  it("scrolls an offscreen preselection into the virtual window and preserves a tree tab stop", async () => {
    const large = [entity("ENTRAL Root", "ENTRAL", null, "E-00000")];
    for (let index = 1; index < 10_000; index += 1) {
      large.push(entity(
        `Soldier ${String(index).padStart(5, "0")}`,
        "SOLDIER",
        "ENTRAL Root",
        `S-${String(index).padStart(5, "0")}`
      ));
    }
    const selected = large.at(-1)!;
    portfolio.loadEntity.mockResolvedValue({
      entity: fullRecord(selected, selected.version),
      event_sequence: 9
    });

    renderInfrastructure(large, selected.entity_id, 9);

    const selectedRow = await screen.findByRole("treeitem", {
      name: /Soldier 09999, SOLDIER/
    });
    expect(selectedRow).toHaveAttribute("tabindex", "0");
    expect(screen.getAllByRole("treeitem").filter((row) => row.tabIndex === 0)).toEqual([
      selectedRow
    ]);
    expect(screen.getAllByRole("treeitem").length).toBeLessThan(100);
  });
});

describe("CanonicalInfrastructure full-record alignment", () => {
  it("invalidates and retries a mismatched snapshot before rendering the aligned record", async () => {
    const selected = hierarchy[0];
    portfolio.loadEntity
      .mockResolvedValueOnce({ entity: fullRecord(selected, selected.version), event_sequence: 8 })
      .mockResolvedValueOnce({ entity: fullRecord(selected, selected.version), event_sequence: 9 });

    renderInfrastructure(hierarchy, selected.entity_id, 9);

    await screen.findByText("Aligned snapshot event 9");
    expect(portfolio.loadEntity).toHaveBeenCalledTimes(2);
    expect(portfolio.invalidate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Aligned snapshot event 8")).not.toBeInTheDocument();
    expect(screen.getByText("Configuration")).toBeInTheDocument();
  });

  it("fails closed after three mismatched readbacks", async () => {
    const selected = hierarchy[0];
    portfolio.loadEntity.mockResolvedValue({
      entity: fullRecord(selected, selected.version),
      event_sequence: 8
    });

    renderInfrastructure(hierarchy, selected.entity_id, 9);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "did not align with workspace event 9 after 3 readbacks"
    );
    expect(portfolio.loadEntity).toHaveBeenCalledTimes(3);
    expect(portfolio.invalidate).toHaveBeenCalledTimes(3);
    expect(screen.queryByText("Configuration")).not.toBeInTheDocument();
  });
});

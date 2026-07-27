import { describe, expect, it } from "vitest";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import {
  applyAuthorizedGraphDeepLink,
  clearGraphSelection,
  createGraphViewState,
  isolateGraphLineage,
  navigateGraphHistory,
  navigateGraphParent,
  parseAuthorizedGraphDeepLink,
  resetGraphNavigation,
  selectGraphEntity,
  serializeAuthorizedGraphDeepLink,
  setGraphExpansion,
  updateGraphFilters,
  updateGraphSearch,
  visibleGraphEntityIds
} from "../lib/graph-view-state";
import { authorityHierarchy } from "./phase195-graph-fixtures";

describe("Phase 195 shared graph view state", () => {
  it("synchronizes selection, focus, breadcrumb, parent navigation, and bounded history", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy(), {
      scopeKey: "organization:authorized"
    });
    const initial = createGraphViewState(projection);
    expect(initial.selectedEntityId).toBe("entral");
    expect(initial.focusedEntityId).toBe("entral");
    expect(initial.breadcrumbEntityIds).toEqual(["entral"]);

    const marshal = selectGraphEntity(initial, projection, "marshal-a");
    const soldier = selectGraphEntity(marshal, projection, "soldier-a");
    expect(soldier.selectedEntityId).toBe("soldier-a");
    expect(soldier.focusedEntityId).toBe("soldier-a");
    expect(soldier.breadcrumbEntityIds).toEqual([
      "entral",
      "marshal-a",
      "general-a",
      "commander-a",
      "soldier-a"
    ]);
    expect(soldier.history.entries).toHaveLength(3);

    const back = navigateGraphHistory(soldier, projection, "BACK");
    expect(back.selectedEntityId).toBe("marshal-a");
    expect(back.history.index).toBe(1);
    const forward = navigateGraphHistory(back, projection, "FORWARD");
    expect(forward.selectedEntityId).toBe("soldier-a");
    expect(forward.history.index).toBe(2);

    const parent = navigateGraphParent(forward, projection);
    expect(parent.selectedEntityId).toBe("commander-a");
    expect(parent.breadcrumbEntityIds.at(-1)).toBe("commander-a");
    expect(selectGraphEntity(parent, projection, "not-authorized")).toBe(parent);
  });

  it("shares expansion and isolation semantics without admitting unknown IDs", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const initial = createGraphViewState(projection);
    expect(initial.expandedEntityIds).toEqual([
      "commander-a",
      "commander-b",
      "general-a",
      "general-b",
      "marshal-a",
      "marshal-b"
    ]);
    expect(visibleGraphEntityIds(projection, initial).size).toBe(9);

    const collapsedBranch = setGraphExpansion(
      initial,
      projection,
      "marshal-a",
      "COLLAPSE_DESCENDANTS"
    );
    expect(collapsedBranch.expandedEntityIds).toEqual([
      "commander-b",
      "general-b",
      "marshal-b"
    ]);
    expect([...visibleGraphEntityIds(projection, collapsedBranch)].sort()).toEqual([
      "commander-b",
      "entral",
      "general-b",
      "marshal-a",
      "marshal-b",
      "soldier-b"
    ]);

    const oneLevel = setGraphExpansion(
      collapsedBranch,
      projection,
      "marshal-a",
      "ONE_LEVEL"
    );
    expect(oneLevel.expandedEntityIds).toEqual([
      "commander-b",
      "general-b",
      "marshal-a",
      "marshal-b"
    ]);
    expect([...visibleGraphEntityIds(projection, oneLevel)].sort()).toEqual([
      "commander-b",
      "entral",
      "general-a",
      "general-b",
      "marshal-a",
      "marshal-b",
      "soldier-b"
    ]);

    const expanded = setGraphExpansion(
      collapsedBranch,
      projection,
      "marshal-a",
      "DESCENDANTS"
    );
    expect(expanded.expandedEntityIds).toEqual([
      "commander-a",
      "commander-b",
      "general-a",
      "general-b",
      "marshal-a",
      "marshal-b"
    ]);
    expect(visibleGraphEntityIds(projection, expanded).size).toBe(9);

    const collapsed = setGraphExpansion(
      expanded,
      projection,
      "general-a",
      "COLLAPSE_DESCENDANTS"
    );
    expect(collapsed.expandedEntityIds).toEqual([
      "commander-b",
      "general-b",
      "marshal-a",
      "marshal-b"
    ]);

    const isolated = isolateGraphLineage(
      collapsed,
      projection,
      "general-a"
    );
    expect([...visibleGraphEntityIds(projection, isolated)].sort()).toEqual([
      "commander-a",
      "entral",
      "general-a",
      "marshal-a",
      "soldier-a"
    ]);
    expect(isolateGraphLineage(
      isolated,
      projection,
      "not-authorized"
    )).toBe(isolated);
  });

  it("filters and searches one authorized projection while retaining canonical lineage", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    let state = createGraphViewState(projection);
    state = updateGraphSearch(state, "soldier-b");
    state = updateGraphFilters(state, projection, {
      entityTypes: ["SOLDIER"],
      authorityLevels: ["SOLDIER"],
      domainIds: ["marshal-b", "not-authorized-domain"],
      businessIds: ["business-b"],
      statuses: ["PAUSED"],
      healthStates: ["WATCH"]
    });

    expect(state.filters.domainIds).toEqual(["marshal-b"]);
    expect([...visibleGraphEntityIds(projection, state)].sort()).toEqual([
      "commander-b",
      "entral",
      "general-b",
      "marshal-b",
      "soldier-b"
    ]);
  });

  it("parses and emits deep links only from authorized entities, scopes, and filter values", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy(), {
      scopeKey: "organization:authorized"
    });
    const parsed = parseAuthorizedGraphDeepLink(
      "?entity=not-authorized&scope=hidden-scope&arrangement=3d-only"
        + "&type=SOLDIER&domain=secret-domain&business=secret-business"
        + "&status=PAUSED&health=WATCH&q=soldier",
      projection,
      { allowedScopeKeys: ["organization:authorized"] }
    );
    expect(parsed).toMatchObject({
      selectedEntityId: null,
      scopeKey: "organization:authorized",
      arrangement: "3d-only",
      searchQuery: "soldier"
    });
    expect(parsed.filters).toMatchObject({
      entityTypes: ["SOLDIER"],
      domainIds: [],
      businessIds: [],
      statuses: ["PAUSED"],
      healthStates: ["WATCH"]
    });

    const initial = createGraphViewState(projection);
    const applied = applyAuthorizedGraphDeepLink(
      initial,
      {
        ...parsed,
        selectedEntityId: "soldier-b",
        filters: {
          ...parsed.filters,
          domainIds: ["marshal-b"],
          businessIds: ["business-b"]
        }
      },
      projection
    );
    const serialized = serializeAuthorizedGraphDeepLink(
      applied,
      projection,
      { allowedScopeKeys: ["organization:authorized"] }
    );
    expect(serialized.get("entity")).toBe("soldier-b");
    expect(serialized.get("scope")).toBe("organization:authorized");
    expect(serialized.get("domain")).toBe("marshal-b");
    expect(serialized.get("business")).toBe("business-b");
    expect(serialized.toString()).not.toContain("secret");
    expect(serialized.toString()).not.toContain("not-authorized");
  });

  it("clears selection and resets navigation to the canonical ENTRAL root", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const selected = isolateGraphLineage(
      selectGraphEntity(
        createGraphViewState(projection),
        projection,
        "soldier-a"
      ),
      projection,
      "soldier-a"
    );
    const cleared = clearGraphSelection(selected, projection);
    expect(cleared.selectedEntityId).toBeNull();
    expect(cleared.focusedEntityId).toBeNull();
    const reset = resetGraphNavigation(cleared, projection);
    expect(reset).toMatchObject({
      selectedEntityId: "entral",
      focusedEntityId: "entral",
      isolatedEntityId: null,
      expandedEntityIds: [
        "commander-a",
        "commander-b",
        "general-a",
        "general-b",
        "marshal-a",
        "marshal-b"
      ]
    });
    expect(visibleGraphEntityIds(projection, reset).size).toBe(9);
  });
});

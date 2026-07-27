import "@testing-library/jest-dom/vitest";
import {
  canonicalGraphPreferenceSettings,
  type EntitySummary,
  type GraphPreferenceSettings,
  type GraphProjection,
  type GraphViewPreferences
} from "@entral/contracts";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { CanonicalGraphWorkspace } from "../components/CanonicalGraphWorkspace";
import { ApiError } from "../lib/api";
import {
  authorityHierarchy,
  canonicalProjectionFixture,
  graphEntity,
  graphPreferencesFixture,
  PHASE195_ORGANIZATION_ID
} from "./phase195-graph-fixtures";

const graphApiMocks = vi.hoisted(() => ({
  reset: vi.fn(),
  telemetry: vi.fn(),
  update: vi.fn()
}));

const rendererHarness = vi.hoisted(() => ({
  fail2D: false,
  fail3D: false
}));

const layoutHarness = vi.hoisted(() => ({
  fail2D: false,
  fail3D: false,
  last2DForceIterations: null as number | null,
  twoDCalls: 0,
  threeDCalls: 0
}));

vi.mock("../lib/canonical-graph", () => ({
  recordCanonicalGraphTelemetry: graphApiMocks.telemetry,
  resetCanonicalGraphPreferences: graphApiMocks.reset,
  updateCanonicalGraphPreferences: graphApiMocks.update
}));

vi.mock("../lib/graph-layouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/graph-layouts")>();
  return {
    ...actual,
    layoutGraph2D: (...args: Parameters<typeof actual.layoutGraph2D>) => {
      layoutHarness.twoDCalls += 1;
      if (layoutHarness.fail2D) throw new TypeError("private-2d-layout-detail");
      layoutHarness.last2DForceIterations = args[2]?.forceIterations ?? null;
      return actual.layoutGraph2D(...args);
    },
    layoutGraph3D: (...args: Parameters<typeof actual.layoutGraph3D>) => {
      layoutHarness.threeDCalls += 1;
      if (layoutHarness.fail3D) throw new TypeError("private-3d-layout-detail");
      return actual.layoutGraph3D(...args);
    }
  };
});

vi.mock("../components/CanonicalUniverseGraph", () => ({
  CanonicalUniverseGraph: (props: {
    entities: readonly EntitySummary[];
    layout: {
      edges: readonly { readonly edgeId: string }[];
      pattern: string;
      points: readonly { readonly entityId: string }[];
    };
    movementPaused: boolean;
    onSelectedEntityChange: (entityId: string | null) => void;
    selectedEntityId: string | null;
  }) => {
    if (rendererHarness.fail2D) throw new TypeError("private-2d-renderer-detail");
    const selected = props.entities.find(
      (entity) => entity.entity_id === props.selectedEntityId
    );
    return (
      <section
        aria-label="Phase 195 2D renderer"
        data-canonical-selected-active-alert={selected?.active_alert ?? undefined}
        data-canonical-selected-active-task-count={selected?.active_task_count}
        data-canonical-selected-child-count={selected?.child_count}
        data-canonical-selected-current-mission={selected?.current_mission ?? undefined}
        data-canonical-selected-latest-material-result={
          selected ? JSON.stringify(selected.latest_material_result) : undefined
        }
        data-edge-signature={props.layout.edges.map((edge) => edge.edgeId).sort().join("|")}
        data-entity-signature={props.layout.points.map((point) => point.entityId).sort().join("|")}
        data-motion={props.movementPaused ? "paused" : "running"}
        data-pattern={props.layout.pattern}
        data-selected-entity={props.selectedEntityId ?? ""}
        data-testid="phase195-renderer-2d"
        role="application"
      >
        <button onClick={() => props.onSelectedEntityChange("soldier-b")} type="button">
          2D select Soldier B
        </button>
        <button onClick={() => props.onSelectedEntityChange("marshal-a")} type="button">
          2D select Marshal A
        </button>
        <button
          onClick={() => props.onSelectedEntityChange(
            props.layout.points[props.layout.points.length - 1]?.entityId ?? null
          )}
          type="button"
        >
          2D select pin target
        </button>
        <canvas aria-label="2D export canvas" height={48} width={64} />
      </section>
    );
  }
}));

vi.mock("../components/CanonicalUniverse3DGraph", () => ({
  CanonicalUniverse3DGraph: (props: {
    entities: readonly EntitySummary[];
    layout: {
      edges: readonly { readonly edgeId: string }[];
      pattern: string;
      points: readonly { readonly entityId: string }[];
    };
    movementPaused: boolean;
    onSelectedEntityChange: (entityId: string | null) => void;
    selectedEntityId: string | null;
  }) => {
    if (rendererHarness.fail3D) throw new TypeError("private-3d-renderer-detail");
    const selected = props.entities.find(
      (entity) => entity.entity_id === props.selectedEntityId
    );
    return (
      <section
        aria-label="Phase 195 3D renderer"
        data-canonical-selected-active-alert={selected?.active_alert ?? undefined}
        data-canonical-selected-active-task-count={selected?.active_task_count}
        data-canonical-selected-child-count={selected?.child_count}
        data-canonical-selected-current-mission={selected?.current_mission ?? undefined}
        data-canonical-selected-latest-material-result={
          selected ? JSON.stringify(selected.latest_material_result) : undefined
        }
        data-edge-signature={props.layout.edges.map((edge) => edge.edgeId).sort().join("|")}
        data-entity-signature={props.layout.points.map((point) => point.entityId).sort().join("|")}
        data-motion={props.movementPaused ? "paused" : "running"}
        data-pattern={props.layout.pattern}
        data-selected-entity={props.selectedEntityId ?? ""}
        data-testid="phase195-renderer-3d"
        role="application"
      >
        <button onClick={() => props.onSelectedEntityChange("general-a")} type="button">
          3D select General A
        </button>
        <button onClick={() => props.onSelectedEntityChange("soldier-b")} type="button">
          3D select Soldier B
        </button>
        <button
          onClick={() => props.onSelectedEntityChange(
            props.layout.points[props.layout.points.length - 1]?.entityId ?? null
          )}
          type="button"
        >
          3D select pin target
        </button>
        <canvas aria-label="3D export canvas" height={48} width={64} />
      </section>
    );
  }
}));

class ResizeObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

const downloadedBlobs: Blob[] = [];
const downloadedNames: string[] = [];
const drawImage = vi.fn();
let exportContextAvailable = false;

function installMatchMedia({
  narrow = false,
  reducedMotion = false
}: {
  readonly narrow?: boolean;
  readonly reducedMotion?: boolean;
} = {}) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: query.includes("prefers-reduced-motion")
      ? reducedMotion
      : query.includes("max-width")
        ? narrow
        : false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn()
  })));
}

function savedPreferences(
  settings: GraphPreferenceSettings,
  version = 2
): GraphViewPreferences {
  return graphPreferencesFixture({
    settings,
    source: "SAVED_OVERRIDE",
    version
  });
}

function renderWorkspace(options: {
  readonly entities?: readonly EntitySummary[];
  readonly preferences?: GraphViewPreferences;
  readonly projection?: GraphProjection;
  readonly scopeBusinessId?: string | null;
  readonly selectedEntityId?: string | null;
} = {}) {
  const entities = options.entities ?? authorityHierarchy();
  const projection = options.projection ?? canonicalProjectionFixture(entities);
  const onPreferencesChange = vi.fn();
  const onPreferredDimensionChange = vi.fn();
  const onSelectedEntityChange = vi.fn();
  const rendered = render(
    <CanonicalGraphWorkspace
      entities={entities}
      eventSequence={projection.projection_version}
      onOpenFullRecord={vi.fn()}
      onPreferencesChange={onPreferencesChange}
      onPreferredDimensionChange={onPreferredDimensionChange}
      onSelectedEntityChange={onSelectedEntityChange}
      organizationId={projection.organization_id}
      preferences={options.preferences ?? graphPreferencesFixture({
        organization_id: projection.organization_id
      })}
      preferredDimension={null}
      projection={projection}
      scopeBusinessId={options.scopeBusinessId ?? null}
      selectedEntityId={options.selectedEntityId ?? null}
    />
  );
  return {
    ...rendered,
    onPreferencesChange,
    onPreferredDimensionChange,
    onSelectedEntityChange
  };
}

function blobText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  layoutHarness.fail2D = false;
  layoutHarness.fail3D = false;
  layoutHarness.last2DForceIterations = null;
  layoutHarness.twoDCalls = 0;
  layoutHarness.threeDCalls = 0;
  rendererHarness.fail2D = false;
  rendererHarness.fail3D = false;
  downloadedBlobs.length = 0;
  downloadedNames.length = 0;
  drawImage.mockReset();
  exportContextAvailable = false;
  graphApiMocks.reset.mockReset();
  graphApiMocks.telemetry.mockReset();
  graphApiMocks.update.mockReset();
  graphApiMocks.telemetry.mockResolvedValue({
    accepted: true,
    contract_version: "1.0.0",
    organization_id: PHASE195_ORGANIZATION_ID,
    recorded_at: "2026-07-26T19:00:00.000Z",
    schema_version: 1,
    telemetry_id: "19500000-0000-4000-8000-000000000006"
  });
  graphApiMocks.update.mockImplementation(async (
    _organizationId: string,
    input: { readonly settings: GraphPreferenceSettings }
  ) => ({
    event_ids: ["19500000-0000-4000-8000-000000000004"],
    idempotent_replay: false,
    preferences: savedPreferences(input.settings)
  }));
  graphApiMocks.reset.mockResolvedValue({
    event_ids: ["19500000-0000-4000-8000-000000000005"],
    idempotent_replay: false,
    preferences: graphPreferencesFixture()
  });

  window.history.replaceState({}, "", "/member/graph");
  installMatchMedia();
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn()
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      downloadedBlobs.push(blob);
      return `blob:phase195-${downloadedBlobs.length}`;
    })
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn()
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloadedNames.push(this.download);
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
    exportContextAvailable
      ? { drawImage } as unknown as CanvasRenderingContext2D
      : null
  );
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    value(callback: BlobCallback) {
      callback(new Blob(["phase195-image"], { type: "image/png" }));
    }
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Phase 195 canonical Graph workspace acceptance", () => {
  it("feeds exact entity and edge parity to both renderers and shares selection, parent navigation, and history", async () => {
    const entities = authorityHierarchy();
    const projection = canonicalProjectionFixture(entities);
    const { container, onSelectedEntityChange } = renderWorkspace({ entities, projection });
    const twoD = screen.getByTestId("phase195-renderer-2d");
    const threeD = screen.getByTestId("phase195-renderer-3d");
    const workspace = container.querySelector(".phase195-graph-workspace");

    expect(projection.entities).toHaveLength(9);
    expect(projection.edges).toHaveLength(8);
    expect(twoD.getAttribute("data-entity-signature")).toBe(
      threeD.getAttribute("data-entity-signature")
    );
    expect(twoD.getAttribute("data-edge-signature")).toBe(
      threeD.getAttribute("data-edge-signature")
    );
    expect(workspace).toHaveAttribute("data-canonical-entity-count", "9");
    expect(workspace).toHaveAttribute("data-canonical-edge-count", "8");
    expect(workspace).toHaveAttribute("data-graph-parity-key");
    expect(twoD).toHaveAttribute("data-selected-entity", "");
    expect(threeD).toHaveAttribute("data-selected-entity", "");

    fireEvent.click(screen.getByRole("button", { name: "2D select Soldier B" }));
    await waitFor(() => {
      expect(twoD).toHaveAttribute("data-selected-entity", "soldier-b");
      expect(threeD).toHaveAttribute("data-selected-entity", "soldier-b");
    });
    expect(onSelectedEntityChange).toHaveBeenLastCalledWith("soldier-b");

    fireEvent.click(screen.getByRole("button", { name: "3D select General A" }));
    expect(twoD).toHaveAttribute("data-selected-entity", "general-a");
    expect(threeD).toHaveAttribute("data-selected-entity", "general-a");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(twoD).toHaveAttribute("data-selected-entity", "soldier-b");
    fireEvent.click(screen.getByRole("button", { name: "Parent" }));
    expect(threeD).toHaveAttribute("data-selected-entity", "commander-b");

    fireEvent.click(screen.getByRole("button", { name: "2D select Marshal A" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse descendants" }));
    await waitFor(() => {
      expect(workspace).toHaveAttribute("data-canonical-entity-count", "6");
    });
    fireEvent.click(screen.getByRole("button", { name: "Expand descendants" }));
    await waitFor(() => {
      expect(workspace).toHaveAttribute("data-canonical-entity-count", "9");
    });
  });

  it("feeds both renderers same-event authorized details and canonical relationship child counts", async () => {
    const entities = authorityHierarchy().map((entity) =>
      entity.entity_id === "commander-b"
        ? {
            ...entity,
            active_alert: "Authorized Phase 195 parity alert.",
            active_task_count: 3,
            child_count: 999,
            current_mission: "Coordinate authorized Phase 195 graph parity.",
            latest_material_result: {
              status: "phase195-parity-verified"
            }
          }
        : entity
    );
    renderWorkspace({
      entities,
      projection: canonicalProjectionFixture(entities)
    });

    fireEvent.click(screen.getByRole("button", {
      name: "2D select Soldier B"
    }));
    fireEvent.click(screen.getByRole("button", { name: "Parent" }));

    for (const renderer of [
      screen.getByTestId("phase195-renderer-2d"),
      screen.getByTestId("phase195-renderer-3d")
    ]) {
      await waitFor(() => {
        expect(renderer).toHaveAttribute(
          "data-selected-entity",
          "commander-b"
        );
      });
      expect(renderer).toHaveAttribute(
        "data-canonical-selected-child-count",
        "1"
      );
      expect(renderer).toHaveAttribute(
        "data-canonical-selected-current-mission",
        "Coordinate authorized Phase 195 graph parity."
      );
      expect(renderer).toHaveAttribute(
        "data-canonical-selected-active-alert",
        "Authorized Phase 195 parity alert."
      );
      expect(renderer).toHaveAttribute(
        "data-canonical-selected-active-task-count",
        "3"
      );
      expect(renderer).toHaveAttribute(
        "data-canonical-selected-latest-material-result",
        "{\"status\":\"phase195-parity-verified\"}"
      );
    }
  });

  it("keeps both layouts stable when shared selection changes without changing visibility", async () => {
    renderWorkspace();
    const initialTwoDCalls = layoutHarness.twoDCalls;
    const initialThreeDCalls = layoutHarness.threeDCalls;

    fireEvent.click(screen.getByRole("button", { name: "2D select Soldier B" }));
    await waitFor(() => {
      expect(screen.getByTestId("phase195-renderer-2d"))
        .toHaveAttribute("data-selected-entity", "soldier-b");
      expect(screen.getByTestId("phase195-renderer-3d"))
        .toHaveAttribute("data-selected-entity", "soldier-b");
    });

    expect(layoutHarness.twoDCalls).toBe(initialTwoDCalls);
    expect(layoutHarness.threeDCalls).toBe(initialThreeDCalls);
  });

  it("shares search, filters, isolation, and Marshal drilldown without fabricating entities", async () => {
    const { container } = renderWorkspace();
    const workspace = container.querySelector(".phase195-graph-workspace");

    fireEvent.click(screen.getByRole("button", { name: "3D select Soldier B" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search both graphs" }), {
      target: { value: "soldier-b" }
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by entity type" }), {
      target: { value: "SOLDIER" }
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), {
      target: { value: "PAUSED" }
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by health" }), {
      target: { value: "WATCH" }
    });
    await waitFor(() => {
      expect(workspace).toHaveAttribute("data-canonical-entity-count", "5");
      expect(screen.getByTestId("phase195-renderer-2d").getAttribute("data-entity-signature"))
        .toBe(screen.getByTestId("phase195-renderer-3d").getAttribute("data-entity-signature"));
    });

    fireEvent.click(screen.getByRole("button", { name: "Isolate lineage" }));
    expect(workspace).toHaveAttribute("data-canonical-entity-count", "5");
    expect(container.textContent).not.toContain("not-authorized");

    fireEvent.click(screen.getByRole("button", { name: "Show all lineages" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear graph search" }));
    for (const label of [
      "Filter by entity type",
      "Filter by status",
      "Filter by health"
    ]) {
      fireEvent.change(screen.getByRole("combobox", { name: label }), {
        target: { value: "" }
      });
    }
    expect(workspace).toHaveAttribute("data-canonical-entity-count", "9");

    fireEvent.click(screen.getByRole("button", { name: "2D select Marshal A" }));
    fireEvent.click(screen.getByRole("button", { name: "Isolate lineage" }));
    expect(workspace).toHaveAttribute("data-canonical-entity-count", "5");
    const isolatedEntitySignature = screen
      .getByTestId("phase195-renderer-2d")
      .getAttribute("data-entity-signature");
    expect(isolatedEntitySignature).toContain("marshal-a");
    expect(isolatedEntitySignature).not.toContain("marshal-b");
  });

  it("supports all five arrangements, restores a saved arrangement, and safely stacks narrow viewports", () => {
    const first = renderWorkspace();
    const workspace = first.container.querySelector(".phase195-graph-workspace");
    const arrangement = screen.getByRole("combobox", { name: "Graph arrangement" });

    expect(workspace).toHaveAttribute("data-graph-layout", "auto");
    expect(workspace).toHaveAttribute("data-effective-arrangement", "side-by-side");
    for (const [requested, effective, visible2D, visible3D] of [
      ["auto", "side-by-side", true, true],
      ["side-by-side", "side-by-side", true, true],
      ["stacked", "stacked", true, true],
      ["2d-only", "2d-only", true, false],
      ["3d-only", "3d-only", false, true]
    ] as const) {
      fireEvent.change(arrangement, { target: { value: requested } });
      expect(workspace).toHaveAttribute("data-graph-layout", requested);
      expect(workspace).toHaveAttribute("data-effective-arrangement", effective);
      expect(screen.queryByTestId("phase195-renderer-2d") !== null).toBe(visible2D);
      expect(screen.queryByTestId("phase195-renderer-3d") !== null).toBe(visible3D);
    }

    first.unmount();
    window.history.replaceState({}, "", "/member/graph");
    installMatchMedia({ narrow: true });
    const settings: GraphPreferenceSettings = {
      ...graphPreferencesFixture().settings,
      simple: {
        ...graphPreferencesFixture().settings.simple,
        arrangement: "SIDE_BY_SIDE"
      }
    };
    const narrow = renderWorkspace({
      preferences: savedPreferences(settings, 7)
    });
    const narrowWorkspace = narrow.container.querySelector(".phase195-graph-workspace");
    expect(narrowWorkspace).toHaveAttribute("data-graph-layout", "side-by-side");
    expect(narrowWorkspace).toHaveAttribute("data-effective-arrangement", "stacked");
    expect(screen.getByText(/Stack is active as a safe narrow-screen override/i)).toHaveTextContent(
      /Side by side remains saved/i
    );

    narrow.unmount();
    window.history.replaceState({}, "", "/member/graph");
    installMatchMedia();
    renderWorkspace({
      preferences: savedPreferences({
        ...settings,
        simple: { ...settings.simple, arrangement: "THREE_D_ONLY" }
      }, 8)
    });
    expect(screen.queryByTestId("phase195-renderer-2d")).not.toBeInTheDocument();
    expect(screen.getByTestId("phase195-renderer-3d")).toBeVisible();
  });

  it("applies only authorized deep-link state and rewrites rejected scope and filter values", async () => {
    const query = new URLSearchParams({
      arrangement: "3d-only",
      business: "business-b",
      domain: "secret-domain",
      entity: "soldier-b",
      health: "WATCH",
      q: "soldier-b",
      scope: "organization:hidden",
      status: "PAUSED",
      type: "SOLDIER"
    });
    window.history.replaceState({}, "", `/member/graph?${query.toString()}`);

    const { container } = renderWorkspace();
    await waitFor(() => {
      expect(screen.getByTestId("phase195-renderer-3d"))
        .toHaveAttribute("data-selected-entity", "soldier-b");
    });
    expect(screen.queryByTestId("phase195-renderer-2d")).not.toBeInTheDocument();
    expect(container.querySelector(".phase195-graph-workspace"))
      .toHaveAttribute("data-canonical-entity-count", "5");

    const rewritten = new URL(window.location.href).searchParams;
    expect(rewritten.get("entity")).toBe("soldier-b");
    expect(rewritten.get("scope")).toBe(`organization:${PHASE195_ORGANIZATION_ID}`);
    expect(rewritten.get("business")).toBe("business-b");
    expect(rewritten.has("domain")).toBe(false);
    expect(rewritten.toString()).not.toContain("secret");
    expect(rewritten.toString()).not.toContain("hidden");
  });

  it("persists versioned settings and restores canonical defaults through reset", async () => {
    vi.useFakeTimers();
    const { onPreferencesChange } = renderWorkspace();
    fireEvent.change(screen.getByRole("combobox", { name: "Connection display mode" }), {
      target: { value: "ALL" }
    });
    expect(screen.getAllByText("Saving settings...").length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(451);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(graphApiMocks.update).toHaveBeenCalledWith(
      PHASE195_ORGANIZATION_ID,
      expect.objectContaining({
        expectedVersion: 0,
        settings: expect.objectContaining({
          simple: expect.objectContaining({ connections: "ALL" })
        })
      })
    );
    expect(onPreferencesChange).toHaveBeenCalledWith(
      expect.objectContaining({ source: "SAVED_OVERRIDE", version: 2 })
    );

    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete all saved graph overrides" }));
      await Promise.resolve();
    });
    expect(graphApiMocks.reset).toHaveBeenCalledWith(
      PHASE195_ORGANIZATION_ID,
      { expectedVersion: 0, resetScope: "ALL" }
    );
    expect(screen.getAllByText("All saved graph overrides deleted").length).toBeGreaterThan(0);
  });

  it("exposes a complete simple menu and functional advanced animation, relation, and 2D controls", async () => {
    const { container } = renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /^Settings$/ }));

    expect(screen.getByRole("combobox", { name: "Simple graph arrangement" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "2D layout" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "3D pattern" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Density" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Labels" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Motion" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Simple connection display mode" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Synchronized navigation" })).toBeInTheDocument();
    const simpleReset = screen.getByRole("button", { name: "Reset settings" });
    const advancedEntry = screen.getByRole("button", { name: "Advanced settings" });
    expect(simpleReset).toBeInTheDocument();
    expect(advancedEntry).toBeInTheDocument();

    const advanced = container.querySelector<HTMLDetailsElement>(
      ".phase195-advanced-settings"
    );
    expect(advanced).not.toBeNull();
    fireEvent.click(advancedEntry);
    expect(advanced).toHaveAttribute("open");

    const animationDuration = screen.getByRole("slider", {
      name: "Animation duration"
    });
    const motionEasing = screen.getByRole("combobox", { name: "Motion easing" });
    const forceIterations = screen.getByRole("slider", {
      name: "2D force iterations"
    });
    const relationContext = screen.getByRole("combobox", {
      name: "Advanced relation context"
    });
    for (const name of [
      "Advanced density",
      "Advanced filter by entity type",
      "Advanced filter by authority level",
      "Advanced filter by domain",
      "Advanced filter by business",
      "Advanced filter by status",
      "Advanced filter by health"
    ]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("checkbox", {
      name: "Advanced synchronized navigation"
    })).toBeInTheDocument();
    fireEvent.change(animationDuration, { target: { value: "750" } });
    fireEvent.change(motionEasing, { target: { value: "EASE_OUT" } });
    fireEvent.change(forceIterations, { target: { value: "12" } });
    fireEvent.change(relationContext, { target: { value: "HIERARCHY" } });

    expect(animationDuration).toHaveValue("750");
    expect(motionEasing).toHaveValue("EASE_OUT");
    expect(forceIterations).toHaveValue("12");
    expect(layoutHarness.last2DForceIterations).toBe(12);
    expect(relationContext).toHaveValue("HIERARCHY");

    fireEvent.change(screen.getByRole("combobox", { name: "2D layout" }), {
      target: { value: "HIERARCHY_TREE" }
    });
    expect(forceIterations).toBeDisabled();
    expect(forceIterations).toHaveAccessibleDescription(
      /does not deform hierarchy-tree levels/i
    );
    expect(layoutHarness.last2DForceIterations).toBe(0);

    const twoDRingSpacing = screen.getByRole("slider", {
      name: "2D ring spacing"
    });
    const threeDRingSpacing = screen.getByRole("slider", {
      name: "3D ring spacing"
    });
    fireEvent.change(twoDRingSpacing, { target: { value: "720" } });
    fireEvent.click(screen.getByRole("button", {
      name: "Copy compatible 2D spacing to 3D"
    }));
    expect(threeDRingSpacing).toHaveValue("720");
    fireEvent.change(threeDRingSpacing, { target: { value: "1100" } });
    fireEvent.click(screen.getByRole("button", {
      name: "Copy compatible 3D spacing to 2D"
    }));
    expect(twoDRingSpacing).toHaveValue("1000");

    await act(async () => {
      fireEvent.click(simpleReset);
      await Promise.resolve();
    });
    expect(graphApiMocks.reset).toHaveBeenCalledWith(
      PHASE195_ORGANIZATION_ID,
      { expectedVersion: 0, resetScope: "ALL" }
    );
  });

  it("offers every durable reset scope through explicit settings controls", async () => {
    const rootId = "19500000-0000-4000-8000-000000000020";
    const targetId = "19500000-0000-4000-8000-000000000021";
    const entities = [
      graphEntity(rootId, "ENTRAL", null),
      graphEntity(targetId, "MARSHAL", rootId)
    ];
    const projection = canonicalProjectionFixture(entities);
    const settings = canonicalGraphPreferenceSettings();
    renderWorkspace({
      entities,
      projection,
      preferences: savedPreferences({
        ...settings,
        pinned_positions: [{
          entity_id: targetId,
          renderer: "2D",
          x: 10,
          y: 20,
          z: null
        }]
      }, 9)
    });

    fireEvent.click(screen.getByRole("button", { name: /^Settings$/ }));
    for (const [label, resetScope] of [
      ["Delete saved node positions", "PINNED_POSITIONS"],
      ["Restore shared defaults", "SHARED"],
      ["Restore 2D defaults", "VIEW_2D"],
      ["Restore 3D defaults", "VIEW_3D"],
      ["Delete all saved graph overrides", "ALL"]
    ] as const) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: label }));
        await Promise.resolve();
      });
      expect(graphApiMocks.reset).toHaveBeenLastCalledWith(
        PHASE195_ORGANIZATION_ID,
        { expectedVersion: 9, resetScope }
      );
    }
    expect(graphApiMocks.reset).toHaveBeenCalledTimes(5);
  });

  it("persists 2D and 3D pins and removes every saved position for the selected entity", async () => {
    vi.useFakeTimers();
    const pinRootId = "19500000-0000-4000-8000-000000000010";
    const pinTargetId = "19500000-0000-4000-8000-000000000011";
    const pinEntities = [
      graphEntity(pinRootId, "ENTRAL", null),
      graphEntity(pinTargetId, "MARSHAL", pinRootId)
    ];
    const pinProjection = canonicalProjectionFixture(pinEntities);
    const flushPreferenceSave = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(451);
        await Promise.resolve();
        await Promise.resolve();
      });
    };
    const settingsFromUpdate = (callIndex: number) => (
      graphApiMocks.update.mock.calls[callIndex]?.[1] as {
        readonly settings: GraphPreferenceSettings;
      }
    ).settings;

    renderWorkspace({ entities: pinEntities, projection: pinProjection });
    fireEvent.click(screen.getByRole("button", { name: "2D select pin target" }));
    fireEvent.click(screen.getByRole("button", { name: /^Settings$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Pin selected in 2D" }));
    await flushPreferenceSave();

    const twoDSettings = settingsFromUpdate(0);
    expect(twoDSettings.pinned_positions).toHaveLength(1);
    expect(twoDSettings.pinned_positions[0]).toMatchObject({
      entity_id: pinTargetId,
      renderer: "2D",
      z: null
    });
    expect(Number.isFinite(twoDSettings.pinned_positions[0]?.x)).toBe(true);
    expect(Number.isFinite(twoDSettings.pinned_positions[0]?.y)).toBe(true);

    cleanup();
    renderWorkspace({ entities: pinEntities, projection: pinProjection });
    fireEvent.click(screen.getByRole("button", { name: "3D select pin target" }));
    fireEvent.click(screen.getByRole("button", { name: /^Settings$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Pin selected in 3D" }));
    await flushPreferenceSave();

    const threeDSettings = settingsFromUpdate(1);
    expect(threeDSettings.pinned_positions).toHaveLength(1);
    expect(threeDSettings.pinned_positions[0]).toMatchObject({
      entity_id: pinTargetId,
      renderer: "3D"
    });
    expect(Number.isFinite(threeDSettings.pinned_positions[0]?.x)).toBe(true);
    expect(Number.isFinite(threeDSettings.pinned_positions[0]?.y)).toBe(true);
    expect(Number.isFinite(threeDSettings.pinned_positions[0]?.z)).toBe(true);

    cleanup();
    const settingsWithPins: GraphPreferenceSettings = {
      ...canonicalGraphPreferenceSettings(),
      pinned_positions: [
        {
          entity_id: pinTargetId,
          renderer: "2D",
          x: 120,
          y: -80,
          z: null
        },
        {
          entity_id: pinTargetId,
          renderer: "3D",
          x: -180,
          y: 90,
          z: 45
        }
      ]
    };
    renderWorkspace({
      entities: pinEntities,
      preferences: savedPreferences(settingsWithPins),
      projection: pinProjection
    });
    fireEvent.click(screen.getByRole("button", { name: "2D select pin target" }));
    fireEvent.click(screen.getByRole("button", { name: /^Settings$/ }));
    fireEvent.click(screen.getByRole("button", {
      name: "Return selected to automatic layout"
    }));
    await flushPreferenceSave();

    expect(settingsFromUpdate(2).pinned_positions).toEqual([]);
  });

  it("keeps conflicted or failed preference changes local and reports reset conflicts truthfully", async () => {
    vi.useFakeTimers();
    graphApiMocks.update.mockRejectedValueOnce(
      new ApiError(409, "Conflict", { code: "GRAPH_PREFERENCE_CONFLICT" })
    );
    renderWorkspace();
    const connectionMode = screen.getByRole("combobox", { name: "Connection display mode" });
    fireEvent.change(connectionMode, { target: { value: "ALL" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(451);
    });
    expect(screen.getAllByText(/Settings changed in another session/i).length).toBeGreaterThan(0);
    expect(connectionMode).toHaveValue("ALL");

    cleanup();
    graphApiMocks.update.mockRejectedValueOnce(new Error("network-private-detail"));
    renderWorkspace();
    const retryMode = screen.getByRole("combobox", { name: "Connection display mode" });
    fireEvent.change(retryMode, { target: { value: "DIRECT" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(451);
    });
    expect(screen.getAllByText(/could not be saved.*remains local/i).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("network-private-detail");

    vi.useRealTimers();
    graphApiMocks.reset.mockRejectedValueOnce(
      new ApiError(409, "Conflict", { code: "GRAPH_PREFERENCE_CONFLICT" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete all saved graph overrides" }));
      await Promise.resolve();
    });
    expect(screen.getAllByText(/Reset conflict.*Reload the latest settings/i).length)
      .toBeGreaterThan(0);
  });

  it("exports the authorized filtered graph as JSON, CSV, and a composed image", async () => {
    exportContextAvailable = true;
    renderWorkspace();
    fireEvent.change(screen.getByRole("textbox", { name: "Search both graphs" }), {
      target: { value: "soldier-b" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadedNames.slice(0, 2)).toEqual([
      "entral-graph-v195.json",
      "entral-graph-v195.csv"
    ]);
    const json = JSON.parse(await blobText(downloadedBlobs[0]!)) as {
      entities: readonly { entity_id: string }[];
      metadata: { entity_count: number; projection_version: number };
    };
    expect(json.metadata).toMatchObject({
      entity_count: 5,
      projection_version: 195
    });
    expect(json.entities.map((entity) => entity.entity_id)).toContain("soldier-b");
    expect(json.entities.map((entity) => entity.entity_id)).not.toContain("soldier-a");
    const csv = await blobText(downloadedBlobs[1]!);
    expect(csv).toContain("\"entity_id\",\"entity_type\"");
    expect(csv).toContain("\"soldier-b\"");
    expect(csv).not.toContain("\"soldier-a\"");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export current view image" }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(downloadedNames).toContain("entral-current-graph-v195.png");
    });
    expect(downloadedBlobs.at(-1)?.type).toBe("image/png");
    expect(drawImage).toHaveBeenCalledTimes(2);
  });

  it("honors reduced motion and retains a keyboard-readable textual hierarchy", async () => {
    installMatchMedia({ reducedMotion: true });
    const { container } = renderWorkspace();
    expect(container.querySelector(".phase195-graph-workspace"))
      .toHaveAttribute("data-graph-motion", "paused");
    expect(screen.getByRole("button", { name: "Movement paused" })).toBeDisabled();
    expect(screen.getByText(/paused by your reduced-motion setting/i)).toHaveTextContent(
      /Canonical updates continue/i
    );
    expect(screen.getByText(/Universe Graph textual hierarchy.*9 entities/i))
      .toBeInTheDocument();
    expect(screen.getByRole("tree", { name: "Universe Graph" }))
      .toContainElement(screen.getByRole("treeitem", { name: /ENTRAL: entral/i }));
  });

  it("contains a 2D layout exception without disabling the authorized 3D renderer", async () => {
    layoutHarness.fail2D = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = renderWorkspace();

    expect(screen.getByRole("alert")).toHaveTextContent("2D Graph renderer unavailable");
    expect(screen.getByRole("tree", { name: "2D Graph" })).toBeInTheDocument();
    expect(screen.queryByTestId("phase195-renderer-2d")).not.toBeInTheDocument();
    expect(screen.getByTestId("phase195-renderer-3d")).toBeVisible();
    expect(container.textContent).not.toContain("private-2d-layout-detail");
    await waitFor(() => {
      expect(graphApiMocks.telemetry).toHaveBeenCalledWith(
        PHASE195_ORGANIZATION_ID,
        expect.objectContaining({
          edge_count: 8,
          error_code: "GRAPH_LAYOUT_FAILURE",
          node_count: 9,
          renderer: "2D"
        })
      );
    });
  });

  it("contains a 3D layout exception without disabling the authorized 2D renderer", async () => {
    layoutHarness.fail3D = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = renderWorkspace();

    expect(screen.getByRole("alert")).toHaveTextContent("3D Graph renderer unavailable");
    expect(screen.getByRole("tree", { name: "3D Graph" })).toBeInTheDocument();
    expect(screen.getByTestId("phase195-renderer-2d")).toBeVisible();
    expect(screen.queryByTestId("phase195-renderer-3d")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("private-3d-layout-detail");
    await waitFor(() => {
      expect(graphApiMocks.telemetry).toHaveBeenCalledWith(
        PHASE195_ORGANIZATION_ID,
        expect.objectContaining({
          edge_count: 8,
          error_code: "GRAPH_LAYOUT_FAILURE",
          node_count: 9,
          renderer: "3D"
        })
      );
    });
  });

  it("fails closed to authorized textual data and never substitutes a sample or empty graph", async () => {
    rendererHarness.fail2D = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const first = renderWorkspace();
    expect(screen.getByRole("alert")).toHaveTextContent("2D Graph renderer unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("No sample graph was substituted");
    expect(screen.getByRole("tree", { name: "2D Graph" })).toBeInTheDocument();
    expect(screen.getByTestId("phase195-renderer-3d")).toBeVisible();
    expect(first.container.textContent).not.toContain("private-2d-renderer-detail");
    await waitFor(() => {
      expect(graphApiMocks.telemetry).toHaveBeenCalledTimes(1);
    });
    const [telemetryOrganizationId, telemetryRequest] =
      graphApiMocks.telemetry.mock.calls[0] as [string, Record<string, unknown>];
    expect(telemetryOrganizationId).toBe(PHASE195_ORGANIZATION_ID);
    expect(telemetryRequest).toMatchObject({
      edge_count: 8,
      error_code: "GRAPH_RENDERER_FAILURE",
      frame_rate_fps: 0,
      node_count: 9,
      projection_version: 195,
      renderer: "2D",
      sample_window_ms: 1
    });
    expect(Object.keys(telemetryRequest).sort()).toEqual([
      "contract_version",
      "dropped_frame_rate_ratio",
      "edge_count",
      "error_code",
      "frame_rate_fps",
      "layout_pattern",
      "layout_time_ms",
      "node_count",
      "observed_at",
      "projection_id",
      "projection_version",
      "render_time_ms",
      "renderer",
      "sample_window_ms",
      "schema_version",
      "settings_version",
      "telemetry_id"
    ]);
    expect(JSON.stringify(telemetryRequest)).not.toContain("private-2d-renderer-detail");

    first.unmount();
    rendererHarness.fail2D = false;
    const emptyProjection = canonicalProjectionFixture([]);
    renderWorkspace({ entities: [], projection: emptyProjection });
    const emptyState = screen.getByText(/No authorized graph entities are available/);
    expect(emptyState).toBeVisible();
    expect(emptyState.closest('[role="status"]')).toHaveTextContent(
      "no sample hierarchy is shown"
    );
    expect(screen.queryByTestId("phase195-renderer-2d")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phase195-renderer-3d")).not.toBeInTheDocument();
  });
});

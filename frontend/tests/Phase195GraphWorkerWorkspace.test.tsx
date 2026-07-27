import "@testing-library/jest-dom/vitest";
import type {
  GraphPreferenceSettings,
  GraphViewPreferences
} from "@entral/contracts";
import {
  canonicalGraphPreferenceSettings
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
import { GraphLayoutWorkerCoordinator } from "../lib/graph-layout-worker-client";
import {
  authorityHierarchy,
  canonicalProjectionFixture,
  graphPreferencesFixture
} from "./phase195-graph-fixtures";

vi.mock("../lib/canonical-graph", () => ({
  recordCanonicalGraphTelemetry: vi.fn().mockResolvedValue({ accepted: true }),
  resetCanonicalGraphPreferences: vi.fn(),
  updateCanonicalGraphPreferences: vi.fn()
}));

vi.mock("../components/CanonicalUniverseGraph", () => ({
  CanonicalUniverseGraph: (props: {
    layout: { readonly points: readonly unknown[] };
    onSelectedEntityChange: (entityId: string | null) => void;
    selectedEntityId: string | null;
    settings: GraphPreferenceSettings;
  }) => (
    <section
      data-label-limit={props.settings.advanced_shared.maximum_live_labels}
      data-node-count={props.layout.points.length}
      data-quality={props.settings.advanced_shared.rendering_quality}
      data-selected-entity={props.selectedEntityId ?? ""}
      data-testid="worker-workspace-2d"
    >
      <button
        onClick={() => props.onSelectedEntityChange("soldier-b")}
        type="button"
      >
        Worker select Soldier B
      </button>
    </section>
  )
}));

vi.mock("../components/CanonicalUniverse3DGraph", () => ({
  CanonicalUniverse3DGraph: (props: {
    layout: { readonly points: readonly unknown[] };
    selectedEntityId: string | null;
    settings: GraphPreferenceSettings;
  }) => (
    <section
      data-node-count={props.layout.points.length}
      data-quality={props.settings.advanced_shared.rendering_quality}
      data-selected-entity={props.selectedEntityId ?? ""}
      data-testid="worker-workspace-3d"
    />
  )
}));

class ResizeObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

function preferencesWith(
  advanced: Partial<GraphPreferenceSettings["advanced_shared"]>
): GraphViewPreferences {
  const settings = canonicalGraphPreferenceSettings();
  return graphPreferencesFixture({
    settings: {
      ...settings,
      advanced_shared: {
        ...settings.advanced_shared,
        ...advanced
      }
    }
  });
}

function renderWorkerWorkspace(preferences = preferencesWith({})) {
  const entities = authorityHierarchy();
  const projection = canonicalProjectionFixture(entities);
  return render(
    <CanonicalGraphWorkspace
      entities={entities}
      eventSequence={projection.projection_version}
      onOpenFullRecord={vi.fn()}
      onPreferencesChange={vi.fn()}
      onPreferredDimensionChange={vi.fn()}
      onSelectedEntityChange={vi.fn()}
      organizationId={projection.organization_id}
      preferences={preferences}
      preferredDimension={null}
      projection={projection}
      scopeBusinessId={null}
      selectedEntityId={null}
    />
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/member/graph");
  vi.stubGlobal("Worker", undefined);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: vi.fn()
  })));
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn()
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Phase 195 Workspace worker and LOD integration", () => {
  it("shows authorized loading truth and then independently falls back when a forced worker is unavailable", async () => {
    const { container } = renderWorkerWorkspace(preferencesWith({
      worker_usage: "ON"
    }));

    expect(screen.getAllByText(/Computing the authorized .* graph layout/))
      .toHaveLength(2);
    expect(screen.getAllByText(/No nodes, edges, or sample data are being substituted/))
      .toHaveLength(2);

    await waitFor(() => {
      expect(screen.getByTestId("worker-workspace-2d")).toHaveAttribute(
        "data-node-count",
        "9"
      );
      expect(screen.getByTestId("worker-workspace-3d")).toHaveAttribute(
        "data-node-count",
        "9"
      );
    });
    const workspace = container.querySelector(".phase195-graph-workspace");
    expect(workspace).toHaveAttribute(
      "data-layout-source-2d",
      "synchronous-fallback"
    );
    expect(workspace).toHaveAttribute(
      "data-layout-source-3d",
      "synchronous-fallback"
    );
    expect(workspace).toHaveAttribute(
      "data-layout-worker-failure-2d",
      "WORKER_UNAVAILABLE"
    );
    expect(workspace).toHaveAttribute(
      "data-layout-worker-failure-3d",
      "WORKER_UNAVAILABLE"
    );
    expect(screen.getAllByText(/without reducing graph data/)).toHaveLength(2);
  });

  it("exposes worker and LOD settings and applies LOD to labels and pixel quality without dropping nodes", async () => {
    const { container } = renderWorkerWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));

    const workerUsage = screen.getByRole("combobox", {
      name: "Layout worker usage"
    });
    const levelOfDetail = screen.getByRole("combobox", {
      name: "Level of detail"
    });
    expect(workerUsage).toHaveValue("AUTO");
    expect(levelOfDetail).toHaveValue("AUTO");

    fireEvent.change(levelOfDetail, { target: { value: "AGGRESSIVE" } });
    await waitFor(() => {
      expect(container.querySelector(".phase195-graph-workspace"))
        .toHaveAttribute("data-effective-level-of-detail", "AGGRESSIVE");
      expect(screen.getByTestId("worker-workspace-2d"))
        .toHaveAttribute("data-label-limit", "9");
      expect(screen.getByTestId("worker-workspace-2d"))
        .toHaveAttribute("data-quality", "LOW");
      expect(screen.getByTestId("worker-workspace-3d"))
        .toHaveAttribute("data-quality", "LOW");
    });
    expect(screen.getByTestId("worker-workspace-2d"))
      .toHaveAttribute("data-node-count", "9");
    expect(screen.getByTestId("worker-workspace-3d"))
      .toHaveAttribute("data-node-count", "9");
  });

  it("does not enqueue new worker layouts for a selection-only navigation change", async () => {
    const requestSpy = vi.spyOn(
      GraphLayoutWorkerCoordinator.prototype,
      "request"
    );
    renderWorkerWorkspace(preferencesWith({ worker_usage: "ON" }));

    await waitFor(() => {
      expect(screen.getByTestId("worker-workspace-2d"))
        .toHaveAttribute("data-node-count", "9");
      expect(screen.getByTestId("worker-workspace-3d"))
        .toHaveAttribute("data-node-count", "9");
    });
    const initialRequests = requestSpy.mock.calls.length;
    expect(initialRequests).toBeGreaterThanOrEqual(2);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", {
        name: "Worker select Soldier B"
      }));
      await Promise.resolve();
    });
    expect(screen.getByTestId("worker-workspace-2d"))
      .toHaveAttribute("data-selected-entity", "soldier-b");
    expect(screen.getByTestId("worker-workspace-3d"))
      .toHaveAttribute("data-selected-entity", "soldier-b");
    expect(requestSpy).toHaveBeenCalledTimes(initialRequests);
  });
});

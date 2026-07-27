import { canonicalGraphPreferenceSettings } from "@entral/contracts";
import { describe, expect, it } from "vitest";
import {
  effectiveGraphRendererSettings,
  resolveGraphLevelOfDetail
} from "../lib/graph-renderer-performance";

describe("Phase 195 renderer level of detail", () => {
  it("maps AUTO through the canonical scale policy without reducing graph truth", () => {
    expect(resolveGraphLevelOfDetail("AUTO", 132)).toBe("FULL");
    expect(resolveGraphLevelOfDetail("AUTO", 133)).toBe("BALANCED");
    expect(resolveGraphLevelOfDetail("AUTO", 1_001)).toBe("AGGRESSIVE");

    const input = canonicalGraphPreferenceSettings();
    const effective = effectiveGraphRendererSettings(input, 10_000);
    expect(effective.effectiveLevelOfDetail).toBe("AGGRESSIVE");
    expect(effective.settings.advanced_shared.maximum_live_labels).toBe(200);
    expect(effective.settings.advanced_shared.rendering_quality).toBe("LOW");
    expect(input.advanced_shared.rendering_quality).toBe("HIGH");
  });

  it("honors explicit FULL, BALANCED, and AGGRESSIVE caps immutably", () => {
    const base = canonicalGraphPreferenceSettings();
    const requested = {
      ...base,
      advanced_shared: {
        ...base.advanced_shared,
        maximum_live_labels: 10_000,
        rendering_quality: "HIGH" as const
      }
    };
    const full = effectiveGraphRendererSettings({
      ...requested,
      advanced_shared: {
        ...requested.advanced_shared,
        level_of_detail: "FULL"
      }
    }, 10_000);
    const balanced = effectiveGraphRendererSettings({
      ...requested,
      advanced_shared: {
        ...requested.advanced_shared,
        level_of_detail: "BALANCED"
      }
    }, 10_000);
    const aggressive = effectiveGraphRendererSettings({
      ...requested,
      advanced_shared: {
        ...requested.advanced_shared,
        level_of_detail: "AGGRESSIVE"
      }
    }, 10_000);

    expect(full.settings.advanced_shared).toMatchObject({
      maximum_live_labels: 10_000,
      rendering_quality: "HIGH"
    });
    expect(balanced.settings.advanced_shared).toMatchObject({
      maximum_live_labels: 300,
      rendering_quality: "MEDIUM"
    });
    expect(aggressive.settings.advanced_shared).toMatchObject({
      maximum_live_labels: 240,
      rendering_quality: "LOW"
    });
    expect(requested.advanced_shared.maximum_live_labels).toBe(10_000);
  });
});

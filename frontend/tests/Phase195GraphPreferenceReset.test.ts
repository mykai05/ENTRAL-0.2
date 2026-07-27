import {
  canonicalGraphPreferenceSettings,
  resetGraphPreferenceSettings,
  type GraphPreferenceSettings
} from "@entral/contracts";
import { describe, expect, it } from "vitest";

const twoDPin = {
  entity_id: "19500000-0000-4000-8000-000000000031",
  renderer: "2D" as const,
  x: 10,
  y: 20,
  z: null
};
const threeDPin = {
  entity_id: "19500000-0000-4000-8000-000000000032",
  renderer: "3D" as const,
  x: 30,
  y: 40,
  z: 50
};

function customizedSettings(): GraphPreferenceSettings {
  const defaults = canonicalGraphPreferenceSettings();
  return {
    ...defaults,
    simple: {
      ...defaults.simple,
      arrangement: "THREE_D_ONLY",
      two_d_layout: "HIERARCHY_TREE",
      three_d_layout: "SPHERICAL_SHELLS"
    },
    advanced_shared: {
      ...defaults.advanced_shared,
      node_scale: 2
    },
    advanced_2d: {
      ...defaults.advanced_2d,
      ring_spacing: 320
    },
    advanced_3d: {
      ...defaults.advanced_3d,
      ring_spacing: 440
    },
    pinned_positions: [twoDPin, threeDPin]
  };
}

describe("Phase 195 graph preference reset scopes", () => {
  it("restores shared defaults while preserving renderer layouts and pins", () => {
    const current = customizedSettings();
    const reset = resetGraphPreferenceSettings(current, "SHARED");
    const defaults = canonicalGraphPreferenceSettings();

    expect(reset.advanced_shared).toEqual(defaults.advanced_shared);
    expect(reset.simple.two_d_layout).toBe("HIERARCHY_TREE");
    expect(reset.simple.three_d_layout).toBe("SPHERICAL_SHELLS");
    expect(reset.advanced_2d).toEqual(current.advanced_2d);
    expect(reset.advanced_3d).toEqual(current.advanced_3d);
    expect(reset.pinned_positions).toEqual([twoDPin, threeDPin]);
  });

  it("restores only the requested renderer and removes only its pins", () => {
    const current = customizedSettings();
    const defaults = canonicalGraphPreferenceSettings();
    const twoD = resetGraphPreferenceSettings(current, "VIEW_2D");
    const threeD = resetGraphPreferenceSettings(current, "VIEW_3D");

    expect(twoD.simple.two_d_layout).toBe(defaults.simple.two_d_layout);
    expect(twoD.advanced_2d).toEqual(defaults.advanced_2d);
    expect(twoD.advanced_3d).toEqual(current.advanced_3d);
    expect(twoD.pinned_positions).toEqual([threeDPin]);

    expect(threeD.simple.three_d_layout).toBe(defaults.simple.three_d_layout);
    expect(threeD.advanced_3d).toEqual(defaults.advanced_3d);
    expect(threeD.advanced_2d).toEqual(current.advanced_2d);
    expect(threeD.pinned_positions).toEqual([twoDPin]);
  });

  it("deletes saved positions independently and all overrides explicitly", () => {
    const current = customizedSettings();
    const pins = resetGraphPreferenceSettings(current, "PINNED_POSITIONS");
    const all = resetGraphPreferenceSettings(current, "ALL");

    expect(pins.pinned_positions).toEqual([]);
    expect(pins.advanced_shared).toEqual(current.advanced_shared);
    expect(all).toEqual(canonicalGraphPreferenceSettings());
  });
});

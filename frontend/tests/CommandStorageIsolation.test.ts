import { beforeEach, describe, expect, it } from "vitest";
import {
  commandStateKeyFor,
  readStoredCommandState,
  readStoredGraphControls,
  readUnscopedCommandStateForExplicitRecovery,
  scopedBrowserKey
} from "../components/NeuronsCommandCenter";

const stateWithMarshal = {
  edges: [],
  groups: [
    { color: "#00F0FF", id: "core", name: "ENTRAL Core" },
    { color: "#FF00FF", id: "commerce-marshal", name: "Commerce Marshal" }
  ],
  nodes: [
    {
      commandType: "emperor",
      id: "entral",
      name: "ENTRAL",
      parentId: null,
      type: "core"
    },
    {
      commandType: "marshal",
      id: "commerce-marshal",
      name: "Commerce Marshal",
      parentId: "entral",
      type: "agent"
    }
  ],
  tasks: []
};

describe("Command Center browser-state isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("never auto-assigns an unscoped legacy hierarchy to a signed-in user", () => {
    window.localStorage.setItem("entral-command-os-state-v3", JSON.stringify(stateWithMarshal));

    expect(readStoredCommandState("user-a").nodes.map((node) => node.id)).toEqual(["entral"]);
    expect(readUnscopedCommandStateForExplicitRecovery()?.nodes.map((node) => node.id)).toContain("commerce-marshal");
  });

  it("loads hierarchy and display preferences only from the current user's scoped keys", () => {
    window.localStorage.setItem(commandStateKeyFor("user-a"), JSON.stringify(stateWithMarshal));
    window.localStorage.setItem(scopedBrowserKey("entral-command-center-controls", "user-a"), JSON.stringify({
      gravity: 2.5,
      showRings: false
    }));

    expect(readStoredCommandState("user-a").nodes.map((node) => node.id)).toContain("commerce-marshal");
    expect(readStoredCommandState("user-b").nodes.map((node) => node.id)).toEqual(["entral"]);
    expect(readStoredGraphControls("user-a")).toMatchObject({ gravity: 2.5, showRings: false });
    expect(readStoredGraphControls("user-b")).toMatchObject({ gravity: 0.72, showRings: true });
  });
});

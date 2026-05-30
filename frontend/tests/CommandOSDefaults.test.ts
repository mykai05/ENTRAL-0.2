import { describe, expect, it } from "vitest";
import { commandGenerals, commandMarshals, createDefaultCommandHierarchy } from "../lib/command-os";

describe("Command OS default hierarchy", () => {
  it("starts first-time users with ENTRAL only and no legacy mock entities", () => {
    const nodes = createDefaultCommandHierarchy();

    expect(commandMarshals).toEqual([
      expect.objectContaining({
        id: "merch-marshal",
        name: "Merch Marshal"
      })
    ]);
    expect(commandGenerals).toEqual([
      expect.objectContaining({
        id: "entral-general",
        marshalId: "merch-marshal",
        name: "ENTRAL General"
      })
    ]);
    expect(nodes.some((node) => node.id.startsWith("mock-") || node.name.startsWith("Mock "))).toBe(false);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toEqual(expect.objectContaining({
      children: [],
      id: "entral",
      name: "ENTRAL",
      type: "emperor"
    }));
    expect(nodes.find((node) => node.id === "entral")?.logs).toContain("No command structures detected.");
    expect(nodes.some((node) => node.type === "marshal")).toBe(false);
    expect(nodes.some((node) => node.type === "general")).toBe(false);
    expect(nodes.some((node) => node.type === "commander")).toBe(false);
    expect(nodes.some((node) => node.type === "soldier")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { commandGenerals, commandMarshals, createDefaultCommandHierarchy } from "../lib/command-os";

describe("Command OS default hierarchy", () => {
  it("seeds the Merch Marshal hierarchy without legacy mock entities", () => {
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
    expect(nodes.find((node) => node.id === "entral")?.children).toEqual(["merch-marshal"]);
    expect(nodes.find((node) => node.id === "merch-marshal")?.children).toEqual(["entral-general"]);
    expect(nodes.filter((node) => node.type === "commander")).toHaveLength(9);
    expect(nodes.filter((node) => node.type === "soldier")).toHaveLength(41);
    expect(nodes.some((node) => node.name === "SEO Soldier")).toBe(true);
    expect(nodes.some((node) => node.name === "Shopify Setup Soldier")).toBe(true);
  });
});

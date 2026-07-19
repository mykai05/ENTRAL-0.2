import { describe, expect, it } from "vitest";
import { commandGenerals, commandMarshals, createDefaultCommandHierarchy } from "../lib/command-os";

describe("Command OS default hierarchy", () => {
  it("starts first-time users with the complete portfolio chain of command", () => {
    const nodes = createDefaultCommandHierarchy();

    expect(commandMarshals).toHaveLength(5);
    expect(commandMarshals).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "portfolio-marshal", name: "Portfolio Marshal" }),
      expect.objectContaining({ id: "operations-marshal", name: "Operations Marshal" }),
      expect.objectContaining({ id: "governance-marshal", name: "Governance Marshal" })
    ]));
    expect(commandGenerals).toEqual([
      expect.objectContaining({
        id: "sovereign-protocol-general",
        marshalId: "operations-marshal",
        name: "Sovereign Protocol General"
      })
    ]);
    expect(nodes.some((node) => node.id.startsWith("mock-") || node.name.startsWith("Mock "))).toBe(false);
    expect(JSON.stringify(nodes)).not.toMatch(/\b(POD|Merch)\b/i);
    expect(nodes).toHaveLength(27);
    expect(nodes[0]).toEqual(expect.objectContaining({
      children: commandMarshals.map((marshal) => marshal.id),
      id: "entral",
      name: "ENTRAL",
      type: "emperor"
    }));
    expect(nodes.filter((node) => node.type === "marshal")).toHaveLength(5);
    expect(nodes.filter((node) => node.type === "general")).toHaveLength(1);
    expect(nodes.filter((node) => node.type === "commander")).toHaveLength(4);
    expect(nodes.filter((node) => node.type === "soldier")).toHaveLength(16);
    expect(nodes.find((node) => node.id === "sovereign-protocol-general")?.parentId).toBe("operations-marshal");
    expect(nodes.filter((node) => node.type === "commander").every((node) => node.parentId === "sovereign-protocol-general")).toBe(true);
    expect(nodes.filter((node) => node.type === "soldier").every((node) => Boolean(node.parentCommanderId))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { buildCommandUniversePlacements, selectCommandUniverseVisibility, type CommandUniverseNode } from "../lib/command-universe";

function node(id: string, commandType: CommandUniverseNode["commandType"], parentId: string | null): CommandUniverseNode {
  return { commandType, id, parentId, status: "idle" };
}

describe("Command universe", () => {
  it("distributes large business portfolios across stable orbital shells", () => {
    const nodes = [node("entral", "emperor", null), node("portfolio", "marshal", "entral")];

    for (let index = 0; index < 250; index += 1) {
      nodes.push(node(`business-${index.toString().padStart(3, "0")}`, "general", "portfolio"));
    }

    const placements = buildCommandUniversePlacements(nodes);
    const first = placements.get("business-000");
    const thirteenth = placements.get("business-012");
    const last = placements.get("business-249");

    expect(first).toMatchObject({ index: 0, radius: 138, shell: 0, shellCount: 12 });
    expect(thirteenth).toMatchObject({ index: 12, radius: 212, shell: 1, shellCount: 12 });
    expect(last?.shell).toBe(20);
    expect(last?.radius).toBeGreaterThan(thirteenth?.radius ?? 0);
  });

  it("keeps the chain of command visible while applying a render budget", () => {
    const nodes: CommandUniverseNode[] = [node("entral", "emperor", null)];

    for (let marshalIndex = 0; marshalIndex < 5; marshalIndex += 1) {
      const marshalId = `marshal-${marshalIndex}`;
      nodes.push(node(marshalId, "marshal", "entral"));

      for (let businessIndex = 0; businessIndex < 220; businessIndex += 1) {
        nodes.push(node(`business-${marshalIndex}-${businessIndex}`, "general", marshalId));
      }
    }

    const visibility = selectCommandUniverseVisibility(nodes, "entral", 900);

    expect(visibility.renderedCount).toBe(900);
    expect(visibility.hiddenCount).toBe(nodes.length - 900);
    expect(visibility.ids.has("entral")).toBe(true);
    expect(nodes.filter((item) => item.commandType === "marshal").every((item) => visibility.ids.has(item.id))).toBe(true);
  });

  it("focuses a business on its complete descendant branch and lineage", () => {
    const nodes = [
      node("entral", "emperor", null),
      node("portfolio", "marshal", "entral"),
      node("business", "general", "portfolio"),
      node("delivery", "commander", "business"),
      node("qa", "soldier", "delivery"),
      node("other-marshal", "marshal", "entral"),
      node("other-business", "general", "other-marshal")
    ];

    const visibility = selectCommandUniverseVisibility(nodes, "business", 5);

    expect(visibility.ids).toEqual(new Set(["entral", "portfolio", "business", "delivery", "qa"]));
  });
});

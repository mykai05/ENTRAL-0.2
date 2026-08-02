import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function frontendFile(...segments: string[]) {
  return readFileSync(resolve(process.cwd(), ...segments), "utf8");
}

describe("Phase 195 member Graph release boundaries", () => {
  it("assembles projection and preferences inside the accepted authenticated snapshot", () => {
    const shell = frontendFile("components", "CanonicalMemberShell.tsx");

    expect(shell).toContain("loadCanonicalGraphProjection");
    expect(shell).toContain("loadCanonicalGraphPreferences");
    expect(shell).toMatch(
      /const \[nextProjection, nextPreferences\] = await Promise\.all\(\[[\s\S]*loadCanonicalGraphProjection[\s\S]*loadCanonicalGraphPreferences/
    );
    expect(shell).toContain(
      "nextProjection.projection_version !== accepted.hierarchy.event_sequence"
    );
    expect(shell).toContain(
      "nextPreferences.user_id !== accepted.portfolio.scope.user_id"
    );
    expect(shell).toMatch(
      /initialDestination === "graph" && graphProjection && graphPreferences[\s\S]*<CanonicalGraphWorkspace/
    );
    expect(shell).not.toMatch(/phase195-graph-fixtures|generatePhase180BenchmarkFixture/);
  });

  it("keeps the canonical member Graph independent from billing and Microsoft adapters", () => {
    const protectedFiles = [
      ["app", "member", "graph", "page.tsx"],
      ["components", "CanonicalMemberShell.tsx"],
      ["components", "CanonicalGraphWorkspace.tsx"],
      ["components", "CanonicalUniverseGraph.tsx"],
      ["components", "CanonicalUniverse3DGraph.tsx"]
    ];

    for (const path of protectedFiles) {
      const source = frontendFile(...path);
      expect(source, path.join("/")).not.toMatch(
        /@microsoft|graph\.microsoft|copilot|sharepoint|stripe|subscription/i
      );
      expect(source, path.join("/")).not.toMatch(
        /from ["'][^"']*(?:tests?|fixtures?|phase180-benchmark)[^"']*["']/
      );
    }
  });

  it("renders explicit empty and renderer-failure states instead of sample production evidence", () => {
    const workspace = frontendFile("components", "CanonicalGraphWorkspace.tsx");
    const boundary = frontendFile("components", "CanonicalGraphErrorBoundary.tsx");

    expect(workspace).toContain("<CanonicalGraphEmptyState");
    expect(workspace).toContain("<CanonicalGraphErrorBoundary");
    expect(workspace).toContain("<CanonicalGraphTextualHierarchy");
    expect(boundary).toMatch(/No sample graph\s+was substituted/);
    expect(boundary).toContain("no sample hierarchy is shown");
    expect(boundary).toContain("The authorized graph data is still available below");
  });

  it("keeps the real account-security surface discoverable from the member shell", () => {
    const shell = frontendFile("components", "CanonicalMemberShell.tsx");

    expect(shell).toContain('router.push("/member/account/security")');
    expect(shell).toContain("Account security");
  });
});

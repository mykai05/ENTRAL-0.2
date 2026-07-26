import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app", "phase170.css"), "utf8");
const commandCenter = readFileSync(resolve(process.cwd(), "components", "NeuronsCommandCenter.tsx"), "utf8");
const memberHost = readFileSync(resolve(process.cwd(), "components", "MemberCommandCenterClient.tsx"), "utf8");
const canonicalShell = readFileSync(resolve(process.cwd(), "components", "CanonicalMemberShell.tsx"), "utf8");
const graphWorkspace = readFileSync(resolve(process.cwd(), "components", "CanonicalGraphWorkspace.tsx"), "utf8");

describe("Phase 170 responsive and route contract", () => {
  it("keeps the phone portfolio single-column and clips accidental horizontal overflow", () => {
    expect(css).toContain("@media (max-width: 560px)");
    expect(css).toContain("overflow-x: clip");
    expect(css).toMatch(/\.phase170-controls\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
    expect(css).toMatch(/\.phase170-business-metrics,[\s\S]*grid-template-columns:\s*1fr;/);
  });

  it("routes the member organization into the canonical Dashboard without replacing Graph or Infrastructure", () => {
    expect(memberHost).toContain("initialSession={session}");
    expect(commandCenter).toContain("<CanonicalPortfolioDashboard");
    expect(canonicalShell).toContain("<CanonicalPortfolioDashboard");
    expect(canonicalShell).toContain("<CanonicalGraphWorkspace");
    expect(graphWorkspace).toContain("<CanonicalUniverseGraph");
    expect(graphWorkspace).toContain("<CanonicalUniverse3DGraph");
    expect(canonicalShell).toContain("<CanonicalInfrastructure");
    expect(canonicalShell).toContain('initialDestination !== "graph"');
  });
});

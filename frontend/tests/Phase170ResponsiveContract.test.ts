import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app", "phase170.css"), "utf8");
const phase180Css = readFileSync(resolve(process.cwd(), "app", "phase180.css"), "utf8");
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

  it("keeps shared dual-graph controls visible while using wide panes and narrow stacking", () => {
    expect(phase180Css).toMatch(
      /\.phase180-graph-control-bar\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*calc\(72px \+ 54px \+ 0\.5rem\);[\s\S]*z-index:\s*35;/
    );
    expect(phase180Css).toMatch(
      /\.phase180-graph-panels\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/
    );
    expect(phase180Css).toMatch(
      /@media \(max-width:\s*1180px\)[\s\S]*\.phase180-graph-panels\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/
    );
    expect(phase180Css).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.phase180-graph-control-bar\s*\{[\s\S]*top:\s*calc\(62px \+ 0\.5rem\);/
    );
    expect(phase180Css).toMatch(/\.phase180-motion-toggle\s*\{[\s\S]*min-height:\s*44px/);
    expect(phase180Css).toMatch(
      /\.phase180-graph-control-bar button:focus-visible,[\s\S]*box-shadow:[\s\S]*outline:\s*2px solid/
    );
    expect(phase180Css).toMatch(
      /\.phase180-graph-control-guide summary\s*\{[\s\S]*min-height:\s*44px/
    );
    expect(phase180Css).toMatch(
      /\.phase180-graph-search,[\s\S]*\.phase180-infrastructure-search\s*\{[\s\S]*min-height:\s*44px/
    );
    expect(phase180Css).toContain(".phase180-graph-control-guide[open] .phase180-guide-chevron");
  });

  it("contains every destination label inside its own navigation grid cell", () => {
    expect(phase180Css).toMatch(
      /\.phase180-shell-header \.member-destination-nav a\s*\{[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0;[\s\S]*overflow:\s*hidden;[\s\S]*width:\s*100%;/
    );
    expect(phase180Css).toMatch(
      /\.phase180-shell-header \.member-destination-nav a span\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow-wrap:\s*anywhere;[\s\S]*white-space:\s*normal;/
    );
  });
});

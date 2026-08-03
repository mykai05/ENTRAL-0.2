import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonical2DFocusAnchor } from "../components/CanonicalUniverseGraph";

const css = readFileSync(resolve(process.cwd(), "app", "phase170.css"), "utf8");
const phase180Css = readFileSync(resolve(process.cwd(), "app", "phase180.css"), "utf8");
const commandCenter = readFileSync(resolve(process.cwd(), "components", "NeuronsCommandCenter.tsx"), "utf8");
const memberHost = readFileSync(resolve(process.cwd(), "components", "MemberCommandCenterClient.tsx"), "utf8");
const canonicalShell = readFileSync(resolve(process.cwd(), "components", "CanonicalMemberShell.tsx"), "utf8");
const graphWorkspace = readFileSync(resolve(process.cwd(), "components", "CanonicalGraphWorkspace.tsx"), "utf8");

describe("Phase 170 responsive and route contract", () => {
  it("places the 2D focal anchor in the visible canvas region around inspectors", () => {
    const canvas = { bottom: 600, height: 600, left: 0, right: 800, top: 0, width: 800 };
    expect(canonical2DFocusAnchor(canvas, null)).toEqual({ x: 400, y: 300 });

    const bottomSheet = { bottom: 600, height: 240, left: 0, right: 800, top: 360, width: 800 };
    const portraitAnchor = canonical2DFocusAnchor(canvas, bottomSheet);
    expect(portraitAnchor.x).toBe(400);
    expect(portraitAnchor.y).toBeLessThan(bottomSheet.top - 12);

    const sideSheet = { bottom: 600, height: 600, left: 440, right: 800, top: 0, width: 360 };
    const landscapeAnchor = canonical2DFocusAnchor(canvas, sideSheet);
    expect(landscapeAnchor.x).toBeLessThan(sideSheet.left - 12);
    expect(landscapeAnchor.y).toBe(300);

    const centerStraddlingRightSheet = { bottom: 600, height: 600, left: 390, right: 800, top: 0, width: 410 };
    const straddlingAnchor = canonical2DFocusAnchor(canvas, centerStraddlingRightSheet);
    expect(straddlingAnchor.x).toBeLessThan(centerStraddlingRightSheet.left - 12);
    expect(straddlingAnchor.y).toBe(300);
  });

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
    expect(canonicalShell).toContain("!isEntralRoom");
    expect(canonicalShell).toContain("<CanonicalEntralAssistant");
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

  it("keeps the persistent ENTRAL assistant viewport-fixed and clear of graph controls", () => {
    expect(phase180Css).toMatch(
      /body:has\(\.phase180-shell\)\s*\{[\s\S]*filter:\s*none;/
    );
    expect(phase180Css).toMatch(
      /\.phase180-entral-emblem\s*\{[\s\S]*position:\s*fixed;/
    );
    expect(phase180Css).toMatch(
      /\.phase180-assistant-widget\s*\{[\s\S]*width:\s*min\(23rem,\s*calc\(100dvw - 2rem\)\);/
    );
    expect(phase180Css).toMatch(
      /data-fullscreen-dimension="3d"[\s\S]*\.phase110-node-drawer\s*\{[\s\S]*right:\s*5\.5rem;/
    );
  });

  it("keeps legacy semantics, responsive inspectors, and floating controls outside the canonical focal field", () => {
    expect(graphWorkspace).toContain('data-graph-overlay-contract="FOCAL_SAFE_V1"');
    expect(graphWorkspace).toContain('data-graph-overlay-role="compact-toolbar"');
    expect(graphWorkspace).toContain('data-graph-overlay-role="compact-legend"');
    expect(phase180Css).toMatch(
      /\.phase195-graph-workspace \.phase195-authority-rings\s*\{[\s\S]*clip-path:\s*inset\(50%\)/
    );
    expect(phase180Css).toMatch(
      /@media \(min-width:\s*768px\)[\s\S]*\.phase180-graph-drawer,[\s\S]*\.phase110-node-drawer:not\(\[data-collapsed="true"\]\)[\s\S]*width:\s*min\(22rem, calc\(50% - 2rem\)\)/
    );
    expect(phase180Css).toMatch(
      /\.phase195-graph-workspace \.phase200-mobile-graph-toolbar\s*\{[\s\S]*position:\s*relative;[\s\S]*width:\s*100%;/
    );
    expect(phase180Css).toMatch(
      /\.phase180-graph-drawer\[data-canonical-detail-surface="2d"\]\s*\{[\s\S]*position:\s*relative;[\s\S]*width:\s*100%;/
    );
    expect(phase180Css).toMatch(
      /\.phase200-mobile-graph-toolbar\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);[\s\S]*overflow-x:\s*visible;/
    );
    expect(phase180Css).toMatch(
      /orientation:\s*landscape[\s\S]*\.phase180-assistant-widget[\s\S]*left:\s*max\(0\.5rem, env\(safe-area-inset-left\)\);/
    );
  });
});

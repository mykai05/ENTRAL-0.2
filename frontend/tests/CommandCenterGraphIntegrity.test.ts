import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components", "NeuronsCommandCenter.tsx"), "utf8")
  .replace(/\r\n/g, "\n");
const memberHostSource = readFileSync(resolve(process.cwd(), "components", "MemberCommandCenterClient.tsx"), "utf8")
  .replace(/\r\n/g, "\n");
const canonicalShellSource = readFileSync(resolve(process.cwd(), "components", "CanonicalMemberShell.tsx"), "utf8")
  .replace(/\r\n/g, "\n");
const graphWorkspaceSource = readFileSync(resolve(process.cwd(), "components", "CanonicalGraphWorkspace.tsx"), "utf8")
  .replace(/\r\n/g, "\n");
const canonical3DSource = readFileSync(resolve(process.cwd(), "components", "CanonicalUniverse3DGraph.tsx"), "utf8")
  .replace(/\r\n/g, "\n");

function sourceSegment(start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("Command Center graph integrity", () => {
  it("selects the restricted member chrome explicitly", () => {
    expect(memberHostSource).toContain("<CanonicalMemberShell");
    expect(memberHostSource).toContain("initialSession={session}");
    expect(memberHostSource).not.toContain("<NeuronsCommandCenter");
    expect(canonicalShellSource).toContain("<CanonicalGraphWorkspace");
    expect(graphWorkspaceSource).toContain("<CanonicalUniverseGraph");
    expect(graphWorkspaceSource).toContain("<CanonicalUniverse3DGraph");
    expect(canonical3DSource).toContain("<OriginalUniverseRenderer");
    expect(canonical3DSource).toContain("canonicalEntities={entities}");
    expect(canonical3DSource).toContain("canonicalEventSequence={eventSequence}");
    expect(canonical3DSource).toContain("canonicalFullscreenActive={fullscreenActive}");
    expect(canonical3DSource).toContain("canonicalMotionPaused={movementPaused}");
    expect(canonical3DSource).toContain("canonicalTouchInteractionActive={fullscreenActive || touchInteractionActive}");
  });

  it("preserves the approved WebGL field while freezing only its visual clock and node motion", () => {
    expect(source).toContain("const useScaleBatching = renderNodes.length > 2_000");
    expect(source).toContain("drawPointBatch(batch.points, batch.color, batch.size, batch.alpha)");
    expect(source).toContain("const motionPaused = graphMotionPausedRef.current");
    expect(source).toContain("const settle = motionPaused ? 0 : gravitySettle");
    expect(graphWorkspaceSource).toContain("setMovementPaused");
    expect(graphWorkspaceSource).not.toContain("executeCommand");
    expect(graphWorkspaceSource).not.toContain("apiFetch");
    expect(sha256(sourceSegment("  function getNodeMotion", "  function setCamera")))
      .toBe("d707bd9d6bec9e82e812b42488d1c81a3354838e09505e27bd525206dbbad4d2");
  });

  it("preserves the approved pointer, touch, wheel, and keyboard camera controls", () => {
    expect(source).toContain('canvas.addEventListener("wheel", handleWheel, { passive: false })');
    expect(source).toContain("embeddedGraphOnly && !canonicalFullscreenActive && !event.ctrlKey && !event.metaKey");
    expect(source).not.toContain("function lockGraphScroll");
    expect(source).not.toContain("function releaseGraphScroll");
    expect(source).not.toContain("document.body.style.overflow");
    expect(source).not.toContain("onPointerEnter={lockGraphScroll}");
    expect(sha256(sourceSegment("  function handlePointerDown", "  function deleteSelectedNode")))
      .toBe("f75c5f2f284e6b8d3ca83a4e10a08fe698b8a5c3ebba404baa50706ea68af975");
  });

  it("preserves the approved graph canvas contract", () => {
    expect(sha256(sourceSegment("      <canvas", "      <p className=\"sr-only\"")))
      .toBe("554dd0bb56a673c4de109acad611c99dc8f5b4702ffbc0c422e445fdb78e73f6");
  });

  it("renders the embedded 3D inspector as an accessible name-only compact card", () => {
    expect(source).toContain("canonicalInspectorCollapsed");
    expect(source).toContain("data-collapsed={isNodeDrawerCollapsed}");
    expect(source).toContain("isNodeDrawerCollapsed ? (");
    expect(source).toContain("phase110-node-drawer-compact");
    expect(source).toContain("Expand details for");
    expect(source).toContain("Collapse details for");
    expect(source).toContain('detail?.target === "graph-inspector"');
  });

  it("exposes one clean view-only gravity control with an expanded safe camera range", () => {
    expect(source).toContain('aria-label="3D formation gravity"');
    expect(source).toContain("Visual formation only. Agent activity, tasks, and canonical updates continue unchanged.");
    expect(source).toContain("max: 1_000_000");
    expect(source).toContain("min: 48");
    expect(source).toContain("graphCameraClipPlanes(camera.distance)");
    expect(source).toContain("fitCameraToGraph(");
  });
});

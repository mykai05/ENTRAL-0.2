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
  });

  it("preserves the approved motion and WebGL field with the canonical scale-batching path", () => {
    expect(source).toContain("const useScaleBatching = renderNodes.length > 2_000");
    expect(source).toContain("drawPointBatch(batch.points, batch.color, batch.size, batch.alpha)");
    expect(sha256(sourceSegment("  function getNodeMotion", "  function setCamera")))
      .toBe("59871f84ce72058554f36a6a01e85c72801f0568357661872911a579decff9da");
  });

  it("preserves the approved pointer, touch, wheel, and keyboard camera controls", () => {
    expect(sha256(sourceSegment("  function handlePointerDown", "  function deleteSelectedNode")))
      .toBe("9110397450e671e60b80a15f9f4dcb665ad2adf18aa61613867924ab702af808");
  });

  it("preserves the approved graph canvas contract", () => {
    expect(sha256(sourceSegment("      <canvas", "      <p className=\"sr-only\"")))
      .toBe("d0e4211202a07d73d0ab4a69b3b03514be32c23b20082579ebeb669918a06dac");
  });
});

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components", "NeuronsCommandCenter.tsx"), "utf8")
  .replace(/\r\n/g, "\n");
const memberHostSource = readFileSync(resolve(process.cwd(), "components", "MemberCommandCenterClient.tsx"), "utf8")
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
    expect(memberHostSource).toContain("<NeuronsCommandCenter");
    expect(memberHostSource).toContain('surface="member"');
  });

  it("preserves the approved motion, renderer, and WebGL field", () => {
    expect(sha256(sourceSegment("  function getNodeMotion", "  function setCamera")))
      .toBe("1646aa8b86e65351d96f9602f8ade70c7f0f107df783c9d13c3306d8c14207a5");
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

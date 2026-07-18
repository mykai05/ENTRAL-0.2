import assert from "node:assert/strict";
import test from "node:test";
import { findForbiddenPositioning } from "./release-positioning.mjs";

test("rejects unsupported whole-workspace autonomy claims", () => {
  const unsafeClaims = [
    "Entral is a fully autonomous command workspace.",
    "Entral provides full autonomy.",
    "Entral runs your entire business."
  ];

  for (const claim of unsafeClaims) {
    assert.notEqual(findForbiddenPositioning(claim).length, 0, claim);
  }
});

test("allows guarded internal autonomy terminology", () => {
  const guardedClaims = [
    "Autonomous launch remains private; provider, payment, publishing, and spend actions remain locked.",
    "The nextAutonomousStep field records the next internal preparation step.",
    "POST /autonomous-launch requires explicit owner confirmation."
  ];

  for (const claim of guardedClaims) {
    assert.deepEqual(findForbiddenPositioning(claim), [], claim);
  }
});

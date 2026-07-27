import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  evaluateInventory,
  normalizeInventory,
  sharpNativeNoticeEvidence
} from "./phase195-license-compliance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(
  await readFile(
    path.join(root, "compliance", "phase195-production-license-policy.json"),
    "utf8"
  )
);

function validRawInventory() {
  return {
    MIT: [
      {
        name: "example",
        versions: ["2.0.0", "1.0.0"],
        paths: ["C:/machine-specific/example"],
        license: "MIT"
      }
    ],
    "Apache-2.0": [
      {
        name: "sharp",
        versions: ["0.35.3"],
        paths: ["C:/machine-specific/sharp"],
        license: "Apache-2.0"
      }
    ],
    "Apache-2.0 AND LGPL-3.0-or-later": [
      {
        name: "@img/sharp-win32-x64",
        versions: ["0.35.3"],
        paths: ["C:/machine-specific/sharp-native"],
        license: "Apache-2.0 AND LGPL-3.0-or-later"
      }
    ],
    "CC-BY-4.0": [
      {
        name: "caniuse-lite",
        versions: ["1.0.30001793"],
        paths: ["C:/machine-specific/caniuse-lite"],
        license: "CC-BY-4.0",
        author: "Ben Briggs"
      }
    ]
  };
}

test("production license inventory normalization is path-free and deterministic", () => {
  const first = normalizeInventory(validRawInventory());
  const reordered = validRawInventory();
  reordered.MIT[0].versions.reverse();
  reordered.MIT[0].paths = ["/another/runner/example"];
  const second = normalizeInventory({
    "CC-BY-4.0": reordered["CC-BY-4.0"],
    MIT: reordered.MIT,
    "Apache-2.0 AND LGPL-3.0-or-later":
      reordered["Apache-2.0 AND LGPL-3.0-or-later"],
    "Apache-2.0": reordered["Apache-2.0"]
  });

  assert.deepEqual(first.packages, second.packages);
  assert.deepEqual(first.licenses, second.licenses);
  assert.equal(first.inventorySha256, second.inventorySha256);
  assert.doesNotMatch(JSON.stringify(first.licenses), /machine-specific|another\/runner/);
});

test("tracked policy recognizes the reviewed sharp, libvips, and caniuse-lite identities", () => {
  const result = evaluateInventory(normalizeInventory(validRawInventory()), policy);
  assert.deepEqual(
    result.checks.filter((entry) => entry.status === "FAIL"),
    []
  );
});

test("tracked policy recognizes split Linux sharp and libvips packages", () => {
  const raw = validRawInventory();
  delete raw["Apache-2.0 AND LGPL-3.0-or-later"];
  raw["Apache-2.0"].push({
    name: "@img/sharp-linux-x64",
    versions: ["0.35.3"],
    paths: ["/runner/node_modules/@img/sharp-linux-x64"],
    license: "Apache-2.0"
  });
  raw["LGPL-3.0-or-later"] = [
    {
      name: "@img/sharp-libvips-linux-x64",
      versions: ["1.3.2"],
      paths: ["/runner/node_modules/@img/sharp-libvips-linux-x64"],
      license: "LGPL-3.0-or-later"
    }
  ];

  const result = evaluateInventory(normalizeInventory(raw), policy);
  assert.deepEqual(
    result.checks.filter((entry) => entry.status === "FAIL"),
    []
  );
});

test("split libvips packages may bind LGPL through the manifest when no LICENSE file is packaged", () => {
  assert.equal(sharpNativeNoticeEvidence({
    declaredLicense: "LGPL-3.0-or-later",
    licenseReadable: false,
    licenseToken: "LGPL",
    readmeReadable: true
  }), true);
  assert.equal(sharpNativeNoticeEvidence({
    declaredLicense: "UNKNOWN",
    licenseReadable: false,
    licenseToken: "LGPL",
    readmeReadable: true
  }), false);
  assert.equal(sharpNativeNoticeEvidence({
    declaredLicense: "LGPL-3.0-or-later",
    licenseReadable: true,
    licenseToken: "LGPL",
    readmeReadable: false
  }), false);
});

test("tracked policy fails closed on an unreviewed license expression", () => {
  const raw = validRawInventory();
  raw["Unreviewed-1.0"] = [
    {
      name: "new-distribution-sensitive-package",
      versions: ["1.0.0"],
      paths: [],
      license: "Unreviewed-1.0"
    }
  ];
  const result = evaluateInventory(normalizeInventory(raw), policy);
  assert.ok(
    result.checks.some(
      (entry) => entry.id === "license-expressions-reviewed" && entry.status === "FAIL"
    )
  );
});

test("package and CI wiring run and retain the deterministic license gate", async () => {
  const [packageJson, workflow, notice] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, ".github", "workflows", "ci-cd.yml"), "utf8"),
    readFile(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8")
  ]);

  assert.match(
    packageJson,
    /"test:phase195:licenses"\s*:\s*"node scripts\/phase195-license-compliance\.mjs"/
  );
  assert.match(workflow, /pnpm test:phase195:licenses/);
  assert.match(workflow, /test-results\/phase195\/\*\*/);
  assert.match(notice, /not legal advice/);
  assert.match(notice, /does not mean "legally approved"/);
});

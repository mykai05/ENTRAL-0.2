import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { constants as fsConstants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const policyPath = path.join(root, "compliance", "phase195-production-license-policy.json");
const evidenceDirectory = path.join(root, "test-results", "phase195");
const inventoryEvidencePath = path.join(evidenceDirectory, "production-license-inventory.json");
const complianceEvidencePath = path.join(evidenceDirectory, "production-license-compliance.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function authorName(author) {
  if (typeof author === "string") return author.trim() || null;
  if (!author || typeof author !== "object") return null;
  const name = typeof author.name === "string" ? author.name.trim() : "";
  const url = typeof author.url === "string" ? author.url.trim() : "";
  return [name, url].filter(Boolean).join(" | ") || null;
}

function packageKey(packageRecord) {
  return `${packageRecord.name}\0${packageRecord.version}\0${packageRecord.license}`;
}

function comparePackages(left, right) {
  return left.name.localeCompare(right.name)
    || left.version.localeCompare(right.version)
    || left.license.localeCompare(right.license);
}

export function normalizeInventory(rawInventory) {
  if (!rawInventory || typeof rawInventory !== "object" || Array.isArray(rawInventory)) {
    throw new Error("pnpm license inventory must be a JSON object");
  }

  const records = new Map();
  const sourceEntries = [];

  for (const licenseExpression of Object.keys(rawInventory).sort()) {
    const packages = rawInventory[licenseExpression];
    if (!Array.isArray(packages)) {
      throw new Error(`license group ${licenseExpression} must contain an array`);
    }

    for (const packageEntry of packages) {
      if (!packageEntry || typeof packageEntry !== "object") {
        throw new Error(`license group ${licenseExpression} contains an invalid package record`);
      }

      const name = typeof packageEntry.name === "string" ? packageEntry.name.trim() : "";
      const versions = Array.isArray(packageEntry.versions)
        ? packageEntry.versions.map((version) => String(version).trim()).filter(Boolean)
        : [];
      const declaredLicense = typeof packageEntry.license === "string"
        ? packageEntry.license.trim()
        : licenseExpression;

      if (!name || versions.length === 0 || !declaredLicense) {
        throw new Error(`license group ${licenseExpression} contains incomplete package metadata`);
      }
      if (declaredLicense !== licenseExpression) {
        throw new Error(
          `${name} reports ${declaredLicense} inside the ${licenseExpression} license group`
        );
      }

      sourceEntries.push({
        name,
        versions: [...new Set(versions)].sort(),
        license: declaredLicense,
        paths: Array.isArray(packageEntry.paths)
          ? packageEntry.paths.filter((entry) => typeof entry === "string")
          : []
      });

      for (const version of versions) {
        const record = {
          name,
          version,
          license: declaredLicense,
          author: authorName(packageEntry.author),
          homepage: typeof packageEntry.homepage === "string"
            ? packageEntry.homepage.trim() || null
            : null
        };
        const key = packageKey(record);
        if (!records.has(key)) records.set(key, record);
      }
    }
  }

  const packages = [...records.values()].sort(comparePackages);
  const licenseGroups = new Map();
  for (const packageRecord of packages) {
    const group = licenseGroups.get(packageRecord.license) ?? [];
    group.push({
      name: packageRecord.name,
      version: packageRecord.version,
      author: packageRecord.author,
      homepage: packageRecord.homepage
    });
    licenseGroups.set(packageRecord.license, group);
  }

  const licenses = [...licenseGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([license, groupedPackages]) => ({
      license,
      packages: groupedPackages
    }));

  const canonicalPackages = JSON.stringify(packages);
  return {
    packages,
    sourceEntries,
    licenses,
    summary: {
      licenseExpressionCount: licenses.length,
      packageNameCount: new Set(packages.map((entry) => entry.name)).size,
      packageVersionCount: packages.length
    },
    inventorySha256: sha256(canonicalPackages)
  };
}

function check(checks, id, passed, detail) {
  checks.push({
    id,
    status: passed ? "PASS" : "FAIL",
    detail
  });
}

function onePackage(packages, expected) {
  return packages.find(
    (entry) => entry.name === expected.name && entry.version === expected.version
  );
}

export function evaluateInventory(normalized, policy) {
  const checks = [];
  const knownExpressions = new Set([
    ...policy.baselineLicenseExpressions,
    ...policy.noticeReviewLicenseExpressions
  ]);
  const observedExpressions = new Set(
    normalized.packages.map((entry) => entry.license)
  );
  const unreviewedExpressions = [...observedExpressions]
    .filter((license) => !knownExpressions.has(license))
    .sort();
  check(
    checks,
    "license-expressions-reviewed",
    unreviewedExpressions.length === 0,
    unreviewedExpressions.length === 0
      ? `${observedExpressions.size} observed expressions are present in the tracked review policy`
      : `unreviewed expressions: ${unreviewedExpressions.join(", ")}`
  );

  const sharpCore = onePackage(normalized.packages, policy.packages.sharpCore);
  check(
    checks,
    "sharp-core-identity",
    sharpCore?.license === policy.packages.sharpCore.license,
    sharpCore
      ? `${sharpCore.name}@${sharpCore.version} declares ${sharpCore.license}`
      : `${policy.packages.sharpCore.name}@${policy.packages.sharpCore.version} is missing`
  );

  const caniuseLite = onePackage(normalized.packages, policy.packages.caniuseLite);
  check(
    checks,
    "caniuse-lite-identity",
    caniuseLite?.license === policy.packages.caniuseLite.license,
    caniuseLite
      ? `${caniuseLite.name}@${caniuseLite.version} declares ${caniuseLite.license}`
      : `${policy.packages.caniuseLite.name}@${policy.packages.caniuseLite.version} is missing`
  );

  const sharpPolicy = policy.packages.sharpNative;
  const sharpLgplPackages = normalized.packages.filter(
    (entry) => entry.name.startsWith(sharpPolicy.namePrefix)
      && entry.license.split(/\s+AND\s+/).includes(sharpPolicy.licenseToken)
  );
  check(
    checks,
    "sharp-libvips-license-present",
    sharpLgplPackages.length > 0,
    sharpLgplPackages.length > 0
      ? sharpLgplPackages
        .map((entry) => `${entry.name}@${entry.version} (${entry.license})`)
        .join(", ")
      : `no installed ${sharpPolicy.namePrefix} package exposes ${sharpPolicy.licenseToken}`
  );

  for (const packageRecord of sharpLgplPackages) {
    const expectedVersion = packageRecord.name.startsWith(sharpPolicy.libvipsPackageNamePrefix)
      ? sharpPolicy.libvipsPackageVersion
      : sharpPolicy.platformPackageVersion;
    check(
      checks,
      `sharp-native-version:${packageRecord.name}`,
      packageRecord.version === expectedVersion,
      `${packageRecord.name} resolved ${packageRecord.version}; reviewed version is ${expectedVersion}`
    );
  }

  const reviewedNoticePackages = new Set([
    ...(caniuseLite ? [packageKey(caniuseLite)] : []),
    ...sharpLgplPackages.map(packageKey)
  ]);
  const unboundNoticePackages = normalized.packages.filter(
    (entry) => policy.noticeReviewLicenseExpressions.includes(entry.license)
      && !reviewedNoticePackages.has(packageKey(entry))
  );
  check(
    checks,
    "notice-review-packages-bound",
    unboundNoticePackages.length === 0,
    unboundNoticePackages.length === 0
      ? "every notice-review expression is bound to a tracked package review"
      : `unbound packages: ${unboundNoticePackages
        .map((entry) => `${entry.name}@${entry.version} (${entry.license})`)
        .join(", ")}`
  );

  return {
    checks,
    sharpCore,
    caniuseLite,
    sharpLgplPackages
  };
}

function sourceEntryFor(normalized, packageRecord) {
  return normalized.sourceEntries.find(
    (entry) => entry.name === packageRecord.name
      && entry.versions.includes(packageRecord.version)
  );
}

function isInsideNodeModules(absolutePath) {
  const nodeModules = path.join(root, "node_modules");
  const relative = path.relative(nodeModules, absolutePath);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

async function findInstalledPackagePath(normalized, packageRecord) {
  const sourceEntry = sourceEntryFor(normalized, packageRecord);
  if (!sourceEntry) return null;

  for (const candidate of sourceEntry.paths) {
    const absolute = path.resolve(candidate);
    if (!isInsideNodeModules(absolute)) continue;
    try {
      const manifest = JSON.parse(await readFile(path.join(absolute, "package.json"), "utf8"));
      if (manifest.name === packageRecord.name && manifest.version === packageRecord.version) {
        return { absolute, manifest };
      }
    } catch {
      // Try the next pnpm-reported package path.
    }
  }
  return null;
}

function repositoryText(manifest) {
  if (typeof manifest.repository === "string") return manifest.repository;
  if (manifest.repository && typeof manifest.repository.url === "string") {
    return manifest.repository.url;
  }
  return "";
}

async function readable(absolutePath) {
  try {
    await access(absolutePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function sharpNativeNoticeEvidence({
  declaredLicense,
  licenseReadable,
  licenseToken,
  readmeReadable
}) {
  return readmeReadable
    && (
      licenseReadable
      || String(declaredLicense).includes(licenseToken)
    );
}

async function verifyInstalledSources(normalized, evaluated, policy) {
  const checks = [];

  for (const [id, packageRecord, expectedRepository] of [
    ["sharp-core-source", evaluated.sharpCore, policy.packages.sharpCore.repository],
    ["caniuse-lite-source", evaluated.caniuseLite, policy.packages.caniuseLite.repository]
  ]) {
    if (!packageRecord) {
      check(checks, id, false, "package identity check did not resolve an installed package");
      continue;
    }
    const installed = await findInstalledPackagePath(normalized, packageRecord);
    const repository = installed ? repositoryText(installed.manifest) : "";
    check(
      checks,
      id,
      Boolean(installed)
        && installed.manifest.license === packageRecord.license
        && repository.includes(new URL(expectedRepository).pathname.replace(/^\//, "")),
      installed
        ? `${packageRecord.name}@${packageRecord.version} manifest and repository metadata verified`
        : `${packageRecord.name}@${packageRecord.version} installed manifest was not found`
    );

    if (id === "caniuse-lite-source" && installed) {
      const licenseReadable = await readable(path.join(installed.absolute, "LICENSE"));
      const installedAuthor = authorName(installed.manifest.author) ?? "";
      check(
        checks,
        "caniuse-lite-attribution-source",
        installedAuthor.includes(policy.packages.caniuseLite.attributionName)
          && licenseReadable,
        `${packageRecord.name} author metadata and packaged LICENSE are present`
      );
    }
  }

  for (const packageRecord of evaluated.sharpLgplPackages) {
    const idSuffix = packageRecord.name.replaceAll("/", "_");
    const installed = await findInstalledPackagePath(normalized, packageRecord);
    check(
      checks,
      `sharp-native-manifest:${idSuffix}`,
      Boolean(installed)
        && String(installed.manifest.license).includes(policy.packages.sharpNative.licenseToken),
      installed
        ? `${packageRecord.name}@${packageRecord.version} installed manifest verified`
        : `${packageRecord.name}@${packageRecord.version} installed manifest was not found`
    );
    if (!installed) continue;

    const licensePath = path.join(installed.absolute, "LICENSE");
    const readmePath = path.join(installed.absolute, "README.md");
    const versionsPath = path.join(installed.absolute, "versions.json");
    const [licenseReadable, readmeReadable, versionsReadable] = await Promise.all([
      readable(licensePath),
      readable(readmePath),
      readable(versionsPath)
    ]);
    check(
      checks,
      `sharp-native-notices:${idSuffix}`,
      sharpNativeNoticeEvidence({
        declaredLicense: installed.manifest.license,
        licenseReadable,
        licenseToken: policy.packages.sharpNative.licenseToken,
        readmeReadable
      }),
      `${packageRecord.name} has a readable packaged README and an LGPL license file or exact manifest declaration`
    );

    let readme = "";
    if (readmeReadable) readme = await readFile(readmePath, "utf8");
    check(
      checks,
      `sharp-native-lgpl-disclosure:${idSuffix}`,
      /libvips/i.test(readme) && /LGPLv?3|LGPL-3\.0/i.test(readme),
      `${packageRecord.name} README discloses libvips and LGPL`
    );

    let installedVipsVersion = null;
    if (versionsReadable) {
      const versions = JSON.parse(await readFile(versionsPath, "utf8"));
      installedVipsVersion = typeof versions.vips === "string" ? versions.vips : null;
    }
    check(
      checks,
      `sharp-native-libvips-version:${idSuffix}`,
      installedVipsVersion === policy.packages.sharpNative.libvipsComponentVersion,
      installedVipsVersion
        ? `${packageRecord.name} metadata identifies libvips ${installedVipsVersion}`
        : `${packageRecord.name} versions.json did not identify libvips`
    );
  }

  return checks;
}

function verifyNotice(notice, policy) {
  const checks = [];
  const requiredTokens = [
    policy.packages.sharpCore.name,
    policy.packages.sharpCore.version,
    policy.packages.sharpCore.license,
    policy.packages.sharpNative.libvipsPackageVersion,
    policy.packages.sharpNative.libvipsComponentVersion,
    policy.packages.sharpNative.licenseToken,
    policy.packages.caniuseLite.name,
    policy.packages.caniuseLite.version,
    policy.packages.caniuseLite.license,
    policy.packages.caniuseLite.attributionName,
    policy.packages.caniuseLite.repository,
    policy.packages.caniuseLite.licenseUrl,
    "not legal advice",
    "does not mean \"legally approved\""
  ];
  const missing = requiredTokens.filter((token) => !notice.includes(token));
  check(
    checks,
    "tracked-notice-complete",
    missing.length === 0,
    missing.length === 0
      ? `${policy.noticeDocument} contains the reviewed identities, attribution, sources, and boundary`
      : `${policy.noticeDocument} is missing: ${missing.join(", ")}`
  );
  return checks;
}

function runPnpmInventory() {
  const args = ["licenses", "list", "--prod", "--json"];
  const npmExecPath = process.env.npm_execpath;
  let result;

  if (npmExecPath && existsSync(npmExecPath)) {
    result = spawnSync(process.execPath, [npmExecPath, ...args], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 32 * 1024 * 1024
    });
  } else {
    result = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32"
    });
  }

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `pnpm license inventory failed with exit ${result.status}: ${result.stderr.trim()}`
    );
  }
  return JSON.parse(result.stdout);
}

function inventoryArtifact(normalized, packageManager) {
  return {
    schema_version: "entral.production-dependency-license-inventory.v1",
    scope: {
      dependency_kind: "production",
      source_command: "pnpm licenses list --prod --json",
      package_manager: packageManager,
      platform: process.platform,
      architecture: process.arch,
      machine_specific_paths_retained: false,
      legal_conclusion: false
    },
    summary: {
      license_expression_count: normalized.summary.licenseExpressionCount,
      package_name_count: normalized.summary.packageNameCount,
      package_version_count: normalized.summary.packageVersionCount
    },
    inventory_sha256: normalized.inventorySha256,
    licenses: normalized.licenses
  };
}

async function writeJson(absolutePath, value) {
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runLicenseGate() {
  const [policyText, rootPackageText] = await Promise.all([
    readFile(policyPath, "utf8"),
    readFile(path.join(root, "package.json"), "utf8")
  ]);
  const policy = JSON.parse(policyText);
  const rootPackage = JSON.parse(rootPackageText);
  const noticePath = path.join(root, policy.noticeDocument);
  const notice = await readFile(noticePath, "utf8");
  const rawInventory = runPnpmInventory();
  const normalized = normalizeInventory(rawInventory);
  const evaluated = evaluateInventory(normalized, policy);

  await mkdir(evidenceDirectory, { recursive: true });
  await writeJson(
    inventoryEvidencePath,
    inventoryArtifact(normalized, rootPackage.packageManager ?? "unknown")
  );

  const checks = [
    ...evaluated.checks,
    ...await verifyInstalledSources(normalized, evaluated, policy),
    ...verifyNotice(notice, policy)
  ];
  const failures = checks.filter((entry) => entry.status === "FAIL");
  const reviewedPackages = [
    ...(evaluated.sharpCore ? [evaluated.sharpCore] : []),
    ...(evaluated.caniuseLite ? [evaluated.caniuseLite] : []),
    ...evaluated.sharpLgplPackages
  ].sort(comparePackages);
  const receipt = {
    schema_version: "entral.production-dependency-license-compliance.v1",
    status: failures.length === 0 ? "PASS" : "FAIL",
    scope: policy.scope,
    legal_approval: false,
    policy_sha256: sha256(policyText),
    notice_sha256: sha256(notice),
    inventory_sha256: normalized.inventorySha256,
    inventory_artifact: "test-results/phase195/production-license-inventory.json",
    notice_document: policy.noticeDocument,
    reviewed_packages: reviewedPackages.map(({ name, version, license }) => ({
      name,
      version,
      license
    })),
    checks
  };
  await writeJson(complianceEvidencePath, receipt);

  for (const result of checks) {
    console.log(`${result.status} ${result.id}: ${result.detail}`);
  }
  console.log(
    `${receipt.status} production license inventory: `
      + `${normalized.summary.packageVersionCount} package-version records, `
      + `${normalized.summary.licenseExpressionCount} license expressions`
  );
  console.log(`EVIDENCE ${path.relative(root, inventoryEvidencePath).replaceAll("\\", "/")}`);
  console.log(`EVIDENCE ${path.relative(root, complianceEvidencePath).replaceAll("\\", "/")}`);
  console.log("BOUNDARY Gate status is inventory review evidence, not legal approval.");

  if (failures.length > 0) {
    throw new Error(`${failures.length} production license compliance check(s) failed`);
  }
  return receipt;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(scriptPath)) {
  try {
    await runLicenseGate();
  } catch (error) {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

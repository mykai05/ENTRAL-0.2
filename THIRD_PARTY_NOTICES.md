# Phase 195 focused third-party notices

This file records attribution and review information for the production
dependency cases that fall outside ENTRAL's baseline license-expression
inventory. It is intentionally bounded: it is not a complete software bill of
materials and is not legal advice or proof that a particular deployment or
redistributed artifact satisfies every upstream license term. The upstream
license texts control.

CI generates the complete, platform-specific production inventory and a gate
receipt under `test-results/phase195/`. Those generated files are retained as CI
artifacts and are not tracked in Git.

## sharp and packaged libvips

- `sharp` version `0.35.3` declares `Apache-2.0`.
- Platform packages named `@img/sharp-*` use platform-dependent packaging.
  `@img/sharp-win32-x64` version `0.35.3`, for example, declares
  `Apache-2.0 AND LGPL-3.0-or-later`.
- Linux and other targets can split the native bundle into an Apache-licensed
  `@img/sharp-<platform>` package and an `LGPL-3.0-or-later`
  `@img/sharp-libvips-<platform>` package. The current lock resolves the latter
  package family at version `1.3.2`.
- The reviewed native package metadata identifies libvips version `8.18.3`.

Upstream notice: Copyright 2013 Lovell Fuller and others.

Sources and license references:

- sharp source: <https://github.com/lovell/sharp>
- packaged libvips source and build definitions:
  <https://github.com/lovell/sharp-libvips>
- libvips source: <https://github.com/libvips/libvips>
- Apache License 2.0: <https://www.apache.org/licenses/LICENSE-2.0>
- GNU LGPL 3.0 or later identifier:
  <https://spdx.org/licenses/LGPL-3.0-or-later.html>

The installed `@img/sharp-*` bundle packages include upstream `README.md` and
`LICENSE` files. Split `@img/sharp-libvips-*` packages can instead carry a
packaged `README.md` plus an exact SPDX license declaration in `package.json`.
Those notices cover more native
libraries than libvips, so this focused record does not replace their component
table. Before redistributing an artifact that contains the native bundle, the
release owner must review and retain those upstream files and record how any
source, notice, or relinking requirements that apply to that distribution are
being met. A passing automated gate does not make that determination.

## caniuse-lite

`caniuse-lite` version `1.0.30001793` declares `CC-BY-4.0`.

Attribution: `caniuse-lite` data by Ben Briggs and contributors, sourced from
<https://github.com/browserslist/caniuse-lite>, licensed under
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
ENTRAL does not declare a package-manager patch for this dependency; build
tooling may still transform or bundle the data. A redistribution review must
preserve the attribution, source, license link, and any change indication
required by the upstream license.

## Automated review boundary

`pnpm test:phase195:licenses`:

1. obtains the installed production inventory from
   `pnpm licenses list --prod --json`;
2. removes machine-specific paths and sorts package/version records;
3. fails on an unreviewed license expression or a missing reviewed package;
4. verifies the installed package manifests and packaged notice evidence for
   sharp/libvips and caniuse-lite, including the split libvips manifest-license
   form used by Linux packages; and
5. writes `production-license-inventory.json` and
   `production-license-compliance.json` for CI retention.

`PASS` means the installed inventory matches the tracked, bounded review policy.
It does not mean "legally approved" or establish distribution compliance.

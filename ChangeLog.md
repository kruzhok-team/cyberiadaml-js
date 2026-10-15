# cyberiadaml-js project changelog

## Version 2.0.0 (unreleased)

Added:
- `core`: the standard-compliant core (PNST 1044-2025), a TypeScript port of the `cgmlval`
  validator of cyberiadaml-compat-tests - `core.read()` in the strict or the permissive mode
  (with the Lapki dialect repairs), `core.write()`, `core.dump()`, findings with the requirement
  ids.
- the documentation (`docs/`) and the tests of the conformance examples and the Lapki dialect
  corpus (`tests/examples`, `tools/sync-examples.mjs`).

Changed:
- the licence field of `package.json` is LGPL-3.0-or-later, as the `LICENSE` file;
  `@types/jest` is a development dependency.

## Version 1.2.4

Published from the sources of 59fb3b5 with the version raised; the check of absent key
declarations (f9900f4) came after it and is released with 2.0.0.

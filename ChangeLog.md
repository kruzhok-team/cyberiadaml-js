# cyberiadaml-js project changelog

## Version 2.1.0 (unreleased)

Added:
- the 2.1 fields for the elements of the extension profiles: `entryPoints` and `exitPoints`,
  the `submachine` reference, `collapsed`, `formalName` of machines, states, regions, vertices
  and comments, the `markup` and `color` of comments, vertex colours, a label rect in
  `labelPosition`, the geometry of comment links.

Changed:
- entry and exit points are no longer in `unknownVertexes`; the standard keys of the extension
  profiles are no longer among `unsupportedDataNodes` (the writer still maps them).

## Version 2.0.0 (unreleased)

Added:
- `core`: the standard-compliant core (PNST 1044-2025), a TypeScript port of the `cgmlval`
  validator of cyberiadaml-compat-tests - `core.read()` in the strict or the permissive mode
  (with the Lapki dialect repairs), `core.write()`, `core.dump()`, findings with the requirement
  ids.
- the documentation (`docs/`) and the tests of the conformance examples and the Lapki dialect
  corpus (`tests/examples`, `tools/sync-examples.mjs`).
- `parseCGML(graphml, { strict })`, `dumpCGML()`, `parseParameters()`, `serializeParameters()`;
  `CGMLError` with the findings; the 2.0 model: the document `meta` and `findings`, comment
  `links`, state `regions` and the `region` of a child, transition `polyline`, the data of every
  element the model does not type in `unsupportedDataNodes`.
- the lapki-client contract tests (`tests/lapki/`).

Changed:
- `parseCGML` and `exportGraphml` work over the core: standard documents are read and written
  (one metadata node, `CGML_COMPONENT <id>` components, no invented geometry, appendix Б key
  declarations, unique ids), the Lapki dialect is read; see `docs/MIGRATION.md`.
- `serializeActions` writes the behaviour text of §6.8; `serialaizeParameters` is a deprecated
  alias of `serializeParameters`, which ends without an empty line.
- the licence field of `package.json` is LGPL-3.0-or-later, as the `LICENSE` file;
  `@types/jest` is a development dependency.
- the CI builds the package and runs eslint.
- the npm package holds the build, the documentation and the changelog only (`files`).

Removed:
- the `fast-xml-parser` dependency; the 1.x XML-layer types (`CGML`, `CGMLGraph`, `CGMLNode`,
  `CGMLEdge`, `CGMLDataNodeProcess`, …) and the `Export*` types.

## Version 1.2.4

Published from the sources of 59fb3b5 with the version raised; the check of absent key
declarations (f9900f4) came after it and is released with 2.0.0.

# cyberiadaml-js Testing

The tests check the library against the standard and the Lapki dialect through the documents of
cyberiadaml-compat-tests, against lapki-client through the fields it reads, and write the
documents the cyberiadaml-py contract tests read back. Everything runs from the repository; the
documents of other checkouts are kept as snapshots with their revision.

```
  cyberiadaml-compat-tests                           cyberiadaml-py
 +----------------------------------+               +----------------------------------+
 |  fixtures/ (standard)            |               |  tests/examples/js-<version>/    |
 |  fixtures/dialect/lapki/         |               |  tests/contract/                 |
 +----------------------------------+               +----------------------------------+
                  |                                                  ^
                  | tools/sync-examples.mjs                          | js-written documents
                  v                                                  |
  tests/examples/standard/ ... /lapki/  ------------>  tools/write-contract.mjs
                  |
         +--------+--------+-----------------+
         v                 v                 v
  tests/conformance/  tests/dialect/   tests/lapki/
```

## Test layers

| directory | what | how |
|---|---|---|
| `tests/unit/` | the core: behaviour grammar (§6.8), parameters (§6.9), the XML reader, the L1-L4 checks, the dialect pass, the model, the writer | small inline documents; the unit tests of `cgmlval` and `cyberiadaml_py.core` ported |
| `tests/conformance/` | the standard examples | positive: `core.read` strict, `core.dump` equals `.expected.txt`; `core.write`, strict re-read, same dump. Negative: strict read throws `CGMLError` with the requirement id of the example; permissive read reports, rejects or repairs it |
| `tests/dialect/` | the Lapki corpus | permissive `core.read`: dump equals `.expected.txt` (an invalid document: its `errors`), repair findings equal `.repairs.txt`; strict read throws; the written document reads in strict mode |
| `tests/facade/` | the 2.0 interface | every positive example read strictly by `parseCGML` and written by `exportGraphml` gives its expected dump (component bodies without trailing empty lines); every valid Lapki document is written as its expected standard document; the lapki-client builder input, regions, links, the text model, the helpers |
| `tests/lapki/` | the lapki-client contract | the fields `GraphmlParser.ts` reads (machine `platform`, `meta.values`, components with `id`, `type`, `order`, `parameters`, the scheme position, states with `bounds`, `parent`, actions, vertices, notes, transitions) for the Lapki corpus and `demos/`, recorded in `lapki-client-view.json`; the same view after a write. `README.md` lists the reviewed differences from 1.2.4 |

The 1.x tests (`src/import.test.ts`, `src/export.test.ts`) compared models after a round trip and
could not see what the reader dropped; the `demos/` documents are in the lapki-client view now, the
round trip is checked by the dumps.

## Examples

    node tools/sync-examples.mjs ~/sources/cyberiadaml-compat-tests

copies the standard examples, their manifest and the dialect corpus into `tests/examples/` and
writes the source revision to `tests/examples/REVISION`. A snapshot change is a commit of its own;
the differences of the expected dumps are reviewed in it.

    node tools/write-contract.mjs OUTPUT_DIR

reads every positive standard example and every dialect document, writes it with
`exportGraphml` and stores the result under `OUTPUT_DIR` with the library version — the input of
the cyberiadaml-py contract tests.

## Running

    npm ci
    npm test
    npm run typecheck
    npm run lint
    npm run build

The GitHub workflows run the same commands.

## Outside the repository

* the compatibility harness of cyberiadaml-compat-tests (after `npm run build`):
  `python3 -m intharness run --driver js`, then `report`;
* lapki-client: `npm test` and opening its templates with this checkout linked.

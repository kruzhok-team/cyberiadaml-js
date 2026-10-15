# The Lapki dialect corpus

The documents of the pre-standard Lapki dialect as their writers left them, with the output
the reference dialect pass gives (`CyberiadaML-GraphML-1.0-LAPKI-DIALECT.md`, §6):

* `<name>.graphml` - the document, byte for byte;
* `<name>.repairs.txt` - the repairs: `LAPKI-D<n> <count>` per line;
* `<name>.expected.txt` - the canonical dump of the repaired document, for a valid one;
* `manifest.json` - per document the repository, path and revision it came from, the further
  identical sources, the status (`valid` | `invalid`) and, for an invalid one, the requirement
  ids it still breaks.

Collected and recorded with

    tools/dialect_corpus.py collect [SOURCES_DIR]
    tools/dialect_corpus.py record

The documents keep the licences of their repositories: `client-*` lapki-client and
`compiler-*` lapki-compiler - GPL-3; `py-*` cyberiadaml-py, `js-*` cyberiadaml-js and
`lib-*` libcyberiadaml - LGPL-3.

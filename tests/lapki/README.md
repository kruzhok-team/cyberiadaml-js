# The lapki-client contract

`view.ts` takes from the 2.0 elements the fields lapki-client's `GraphmlParser.ts` reads;
`lapki-client-view.json` is that view of the Lapki corpus (`tests/examples/lapki/`) and the
`demos/` documents, recorded with

    RECORD_VIEW=1 npx jest tests/lapki

The test also writes every valid document and reads it back: the view stays the same. Ids that
repeat in a later machine are made unique by the first write (`<machine id>::<id>`, `<id>#<N>`)
and keep that form from then on.

## Differences from 1.2.4

The view was compared with the one cyberiadaml-js 1.2.4 gives for the same 49 documents when it
was recorded (2026-10-15). 84 fields differ, all on purpose:

| fields | 1.2.4 | 2.0 | why |
|---|---|---|---|
| machine `name`, 45 machines | absent | the graph id | dialect D-8b: a machine is named |
| machine `name`, note `text`, 23 values | trimmed | as written | the text of the document is kept |
| note `text`, 2 notes without `dData` | absent | empty | |
| `meta.transitionOrder`, 3 documents | `transitionFirst` | `actionFirst` | dialect D-8a |
| `compiler-two-blinkers`, second machine | no `platform`, no metadata; two edges from the metadata node as transitions | the document metadata; no such edges | one metadata node per document (D-1); the component edges dropped (D-2) |
| `autoborder`, `py-demo-autoborder`: two edges `n0-n3` | one transition, the later edge | `n0-n3` (the first edge) and `n0-n3#1` | a duplicate edge id loses no transition (D-7a) |

A transition from an initial pseudostate whose text is a lone trigger without `/` keeps the 1.x
reading — the text is its behaviour (`compiler-initial-states`); the writer puts it after `/`.

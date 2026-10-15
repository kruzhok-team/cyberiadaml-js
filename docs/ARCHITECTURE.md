# cyberiadaml-js Architecture

The library reads and writes CyberiadaML-GraphML documents (PNST 1044-2025) in TypeScript, in the
browser, the Electron renderer and Node. Version 2.0 replaces the 1.x reader and writer with a
standard-compliant pair and keeps the shape of the 1.x object model (`CGMLElements`), so
lapki-client moves with the changes listed in `MIGRATION.md`. The reader also accepts the
pre-standard Lapki dialect the 1.x library wrote (see `CyberiadaML-GraphML-1.0-LAPKI-DIALECT.md`
of cyberiadaml-compat-tests): the users' old documents stay readable.

```
  lapki-client: GraphmlParser.ts,                       compat driver, tests
                GraphmlBuilder.ts
                    |                                           |
                    | parseCGML(text, options)                  | CGMLElements
                    | exportGraphml(elements)                   | findings, dumps
                    v                                           v
 +----------------------------------------------------------------------------------+
 |  src/index.ts: parseCGML(), exportGraphml(), dumpCGML()                          |
 |                                                                                  |
 |  reader   xml.ts > dialect.ts > tagtree.ts > model.ts > checks/                  |
 |  writer   writer.ts, keys.ts                                                     |
 |  shared   actions.ts, meta.ts, findings.ts, rules.ts, dump.ts                    |
 +----------------------------------------------------------------------------------+
                    |
                    | DOMParser
                    v
              @xmldom/xmldom
```

The checks, the dialect repairs and the canonical dump follow `cgmlval` (cyberiadaml-compat-tests),
the reference validator of the standard: the same layers, rule names, requirement ids and dump
format, and the same behaviour as the pure-Python library cyberiadaml-py, which reads what this
library writes in lapki-compiler.

## Reading

```
 xml.ts              dialect.ts          tagtree.ts          model.ts            checks/
 +--------------+    +--------------+    +--------------+    +--------------+    +--------------+
 |  L1 XML parse|    |  D-1 ... D-9 |    |  L2 tag tree |    |  model build |    |  L3 values   |
 |  text > DOM  | -> |  non-strict  | -> |  walk        | -> |  CGMLElements| -> |  L4 integrity|
 |  line numbers|    |  only        |    |              |    |              |    |              |
 +--------------+    +--------------+    +--------------+    +--------------+    +--------------+
         |                   |                   |                   |                   |
         +-------------------+-------------------+-------------------+-------------------+
                                                 | findings
                                                 v
                              CGMLElements.findings, or CGMLError
```

Every check reports a finding — rule name, requirement id (`CGML-<clause>-<n>` or
`LAPKI-D<n>`), layer, severity, message, line. The mode decides what stops reading:

| | strict | permissive (default) |
|---|---|---|
| dialect pass | off | on |
| ERROR finding | `CGMLError`, reading stops at its layer | kept in `CGMLElements.findings` |
| fatal finding | `CGMLError` | `CGMLError` |
| WARNING, INFO | kept | kept |

A finding is fatal when no model can be formed: a document that is not well-formed XML, a root
other than `graphml`, no state machine graph, an element without an id, a duplicate id the dialect
pass does not repair. Elements the permissive reader cannot place are skipped and named in their
finding.

`CGMLElements.format` is `Cyberiada-GraphML-1.0`, or `Cyberiada-GraphML-Lapki` when a dialect
repair fired or the metadata has `lapkiVisual`.

## The object model

The 1.x layout stays: machines by graph id, their elements in dictionaries by kind and id, the
nesting by `parent` ids. 2.0 adds what the standard needs and the 1.x model could not hold:

```
 CGMLElements --- format, keys[], meta (document), findings[]
    |
    +-- stateMachines{id} --- name, meta + platform + standardVersion (mirrors), position
           |
           +-- states{id} ------ name, actions[], bounds?, color, parent, region, regions[]
           +-- initialStates, finals, choices, terminates, shallowHistory, deepHistory,
           |   unknownVertexes{id} --- position (point or rect, as read), name, parent, region
           +-- notes{id} ------- type (formal|informal), name, text, position?, parent, region
           +-- components{node id} --- id, type, parameters, order
           +-- transitions{id} --- source, target, actions[], position, labelPosition, color
           +-- links{id} ------- source, target, pivot, chunk
```

- `regions` of a state: `id`, `name`, `geometry`; a child names its region by id, a single
  region may stay implicit;
- `meta` of the document is the one metadata node; `stateMachines[id].meta`, `.platform` and
  `.standardVersion` mirror it, overlaid with the per-machine parameters of the Lapki dialect
  (D-1), as lapki-client reads them;
- the behaviour grammar of §6.8: `postfix` is `propagate`, `block` or `defer`, a completion
  transition has no trigger, `else` is a guard;
- nothing is invented: geometry is optional everywhere and kept as read;
- `unsupportedDataNodes` keeps every `data` item the model does not type, with its `point` and
  `rect` children, and the writer puts it back in place — the extension elements of the
  standard pass through 2.0 this way.

| stage | release | adds |
|---|---|---|
| 1 | 2.0.0 | CORE profile read and write, strict mode; Lapki dialect; extension data passed through |
| 2 | 2.1.0 | typed submachine states, entry/exit points, `collapsed`, comment→transition links, polylines, label rects, numeric source/target points, colours on every element, `markup`, `formalName` |

## Writing

`writer.ts` writes a model as a standard document:

- `gFormat` `Cyberiada-GraphML-1.0` first, then the key declarations of appendix Б for the keys in
  use, then the extension keys — declared from `CGMLElements.keys` when the caller gives a
  declaration, otherwise `for` the element kind, `attr.type` string; the caller's declarations of
  standard keys are not used;
- one metadata node, at the top of the first machine: `CGMLElements.meta`, or the first
  machine's `meta`, `platform` and `standardVersion` when the document metadata is empty (1.x
  callers);
- one `graph` per machine with `edgedefault="directed"`, edges as one block at its end;
- the `data` of an element in the appendix А order (`dNote`, `dVertex` first where required),
  unsupported items after them, child graphs last; region graph ids from the model, else
  `<state id>::region`;
- components as `CGML_COMPONENT <id>` comments with their parameters, in `order`;
- an extension key with a single `point` child is written as the text `x/ <x>` and `y/ <y>`
  (the D-5 form); other non-text extension data is an error.

The writer never repairs: a model that breaks a MUST rule raises `CGMLError` with the findings of
a strict check run over the result.

## Code layout

```
src/
  index.ts            the exports
  types/              the public model and option types
  xml.ts              L1 — @xmldom/xmldom wrapper with line numbers
  dialect.ts          D-1 ... D-9
  tagtree.ts          L2
  model.ts            the model build
  checks/             L3, L4
  actions.ts meta.ts  the §6.8 and §6.9 grammars
  keys.ts             appendix Б, extension keys
  findings.ts rules.ts requirements.ts
  writer.ts dump.ts
tests/                see TESTING.md
tools/                the example snapshot and the contract writer
```

## Dependencies

`@xmldom/xmldom` for parsing, in every environment, so the findings carry the same line numbers in
the browser and in Node; the writer builds the text itself. `fast-xml-parser` is no longer used.

## Testing

The test layers, the snapshots of the conformance and dialect corpora and the documents written
for the cyberiadaml-py contract tests are described in `TESTING.md`.

# cyberiadaml-js Architecture

The library reads and writes CyberiadaML-GraphML documents (PNST 1044-2025) in TypeScript, in the
browser, the Electron renderer and Node. Version 2.0 is built like cyberiadaml-py 1.5: a
standard-compliant core — a TypeScript port of `cgmlval`, the reference validator of
cyberiadaml-compat-tests — and the 2.0 interface (`parseCGML`, `exportGraphml`, `CGMLElements`)
as a facade over it, keeping the shape of the 1.x object model; lapki-client moves with the
changes listed in `MIGRATION.md`. The core also reads the pre-standard Lapki dialect the 1.x
library wrote (`CyberiadaML-GraphML-1.0-LAPKI-DIALECT.md` of cyberiadaml-compat-tests): the
users' old documents stay readable.

```
  lapki-client: GraphmlParser.ts,                       compat driver, tools
                GraphmlBuilder.ts
                    |                                           |
                    | parseCGML(text, options)                  | core.read(text)
                    | exportGraphml(elements)                   | core.write(doc)
                    v                                           |
 +--------------------------------------+                       |
 |  src/index.ts, src/facade/           |                       |
 |  parseCGML(), exportGraphml()        |                       |
 |  CGMLElements (2.0 model)            |                       |
 +--------------------------------------+                       |
                    |                                           |
                    | core model                                |
                    v                                           v
 +----------------------------------------------------------------------------------+
 |  src/core/: read(), write(), dump(), the document model                          |
 |                                                                                  |
 |  reader   xml.ts > dialect.ts > tagtree.ts > model.ts > checks_l3/l4.ts          |
 |  writer   writer.ts                                                              |
 |  shared   actions.ts meta.ts keys.ts findings.ts rules.ts dump.ts                |
 +----------------------------------------------------------------------------------+
```

The core is a port, not a binding: the same layers, rule names, requirement ids, dialect repairs
and canonical dump as `cgmlval` and as `cyberiadaml_py.core`, so the three agree on every
document by construction and the cross-library tests compare their dumps.

## Reading

```
 xml.ts              dialect.ts          tagtree.ts          model.ts            checks_l3/l4.ts
 +--------------+    +--------------+    +--------------+    +--------------+    +--------------+
 |  L1 XML parse|    |  D-1 ... D-9 |    |  L2 tag tree |    |  model build |    |  L3 values   |
 |  text > tree | -> |  non-strict  | -> |  walk        | -> |  Document    | -> |  L4 integrity|
 |  line numbers|    |  only        |    |              |    |              |    |              |
 +--------------+    +--------------+    +--------------+    +--------------+    +--------------+
         |                   |                   |                   |                   |
         +-------------------+-------------------+-------------------+-------------------+
                                                 | findings
                                                 v
                               Document.findings, or CGMLError
```

Every check reports a finding — rule name, requirement id (`CGML-<clause>-<n>` or
`LAPKI-D<n>`), layer, severity, message, line. The mode decides what stops reading:

| | strict | permissive (default) |
|---|---|---|
| dialect pass | off | on |
| ERROR finding | `CGMLError`, reading stops at its layer | kept in `Document.findings` |
| fatal finding | `CGMLError` | `CGMLError` |
| WARNING, INFO | kept | kept |

A finding is fatal when no model can be formed: a document that is not well-formed XML, a root
other than `graphml`, no state machine graph (unless the dialect pass took out function graphs,
D-9), an element without an id, a duplicate id the dialect pass does not repair. Elements the
permissive reader cannot place are skipped and named in their finding.

`xml.ts` reads XML the way expat reads it for `cgmlval`, without namespace processing: prefixed
names stay literal, `xmlns` is an ordinary attribute, comments and processing instructions are
dropped, every element keeps its line, column and path. A DOM parser would reject the undeclared
prefixes the reference accepts.

The document label is `Cyberiada-GraphML-1.0`, or `Cyberiada-GraphML-Lapki` when a dialect
repair fired or the metadata has `lapkiVisual`; the ids the dialect pass gives (D-7f, D-7a) map
back to the ids as written in `Document.originalIds`.

## The core model

The model of `cgmlval` with the reader's additions, field names in camelCase: `Document`,
`StateMachine`, `Region`, `State`, `SubmachineState`, `Vertex`, `Comment`, `Transition`,
`CommentLink`, `Block`, `Param`, `KeyDecl`, `Extension`, `Point`, `Rect` (see `API.md`). Every
element keeps its source element, parent, line and the `data` items of non-standard keys
(`extensions`); geometry and text are kept as read, nothing is invented.

## The 2.0 interface

`parseCGML` reads through the core (permissive unless `strict`) and fills `CGMLElements`;
`exportGraphml` turns `CGMLElements` into a core model and writes it. The 1.x layout stays —
machines by graph id, their elements in dictionaries by kind and id, the nesting by `parent`
ids — with what the standard needs and the 1.x model could not hold:

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
- `unsupportedDataNodes` keeps every `data` item the model does not type, with its `point` and
  `rect` children, and the writer puts it back in place — the extension elements of the
  standard pass through 2.0 this way.

| stage | release | adds |
|---|---|---|
| 1 | 2.0.0 | CORE profile read and write, strict mode; Lapki dialect; extension data passed through |
| 2 | 2.1.0 | typed submachine states, entry/exit points, `collapsed`, comment→transition links, polylines, label rects, numeric source/target points, colours on every element, `markup`, `formalName` |

## Writing

`core/writer.ts` writes a core model as a standard document, as `cyberiadaml_py.core` does:

- `gFormat` `Cyberiada-GraphML-1.0` first, then the document's own key declarations as they came
  and a declaration for every extension key in use without one; a model without declarations
  gets those of appendix Б for the keys in use;
- one `graph` per machine with `edgedefault="directed"`; the metadata node first in the first
  machine and nowhere else; the edges of a machine as one block at its end;
- the `data` of an element in the appendix А order (`dNote`, `dSubmachineState`, `dVertex` first
  where required), extensions after them, child graphs last; region graph ids from the model,
  else `<state id>::region`;
- `write()` reads its output back in the strict mode: a model that breaks a MUST rule raises
  `CGMLError` with those findings.

The facade adds what 1.x callers expect: the metadata from the first machine's `meta`,
`platform` and `standardVersion` when the document metadata is empty; components as
`CGML_COMPONENT <id>` comments in `order`; an extension key with a single `point` child written
as the text `x/ <x>` and `y/ <y>` (the D-5 form); ids repeated in a later machine written as
`<machine id>::<id>`.

## Code layout

```
src/
  index.ts            the exports
  core/               the port of cgmlval
    index.ts          read(), write(), dump(), CGMLError, the model types
    xml.ts            L1 — the non-namespace XML reader with positions
    dialect.ts tagtree.ts model.ts checks_l3.ts checks_l4.ts
    actions.ts meta.ts keys.ts findings.ts rules.ts requirements.ts
    reader.ts writer.ts dump.ts
  facade/             parseCGML, exportGraphml, the 2.0 types (round 5)
tests/                see TESTING.md
tools/                the example snapshot and the contract writer
```

## Dependencies

None at run time once the facade replaces the 1.x reader and writer (2.0): the core parses and
writes XML itself; `fast-xml-parser` goes with the 1.x code.

## Testing

The test layers, the snapshots of the conformance and dialect corpora and the documents written
for the cyberiadaml-py contract tests are described in `TESTING.md`.

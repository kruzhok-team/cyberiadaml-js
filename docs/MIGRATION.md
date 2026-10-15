# Migrating from 1.x to 2.0

2.0 writes standard CyberiadaML-GraphML (PNST 1044-2025) and reads both the standard and the
documents 1.x wrote. The object model keeps its 1.x layout; the list below is what a 1.x caller —
lapki-client's `GraphmlParser.ts` and `GraphmlBuilder.ts` in the first place — has to look at.

**Order of adoption.** lapki-compiler reads what lapki-client writes. Take 2.0 into lapki-client
only after lapki-compiler runs cyberiadaml-py 1.5 or newer, the first version that reads standard
documents.

## What the written document changes

| | 1.x | 2.0 |
|---|---|---|
| metadata | a `CGML_META` node in every machine, `coreMeta` repeated | one node, in the first machine |
| components | `CGML_COMPONENT` with `id/` in the body | `CGML_COMPONENT <id>`, the body without `id/` |
| pseudostate geometry | `rect` of size `-1 × -1` | `point` |
| missing geometry | `rect 0 0 0 0` invented | none written |
| comment data | `dGeometry` before `dNote` | `dNote` first |
| key declarations | the caller's list (`dInitial`, no `attr.name`) | appendix Б for the keys in use + extension keys |
| region graph id | the parent node id | the region id, or `<state id>::region` |
| `graph` | no `edgedefault` | `edgedefault="directed"` |
| `dLapkiSchemePosition` | `<point>` child | text `x/ <x>` and `y/ <y>`, declared key |
| an id repeated in a later machine | written again (the document is not valid) | `<machine id>::<id>`, an edge `<id>#<N>` |
| a transition from an initial pseudostate | its action as the whole text | `/` and the action |

## What the caller changes

| topic | 1.x | 2.0 — what to do |
|---|---|---|
| document metadata | `stateMachines[id].meta` per machine | `CGMLElements.meta`; the per-machine fields stay as mirrors. Several platforms in one project are several documents |
| `CGMLState.bounds` | always set (`0 0 0 0` when absent) | optional — handle `undefined` |
| `CGMLNote` | informal only, `position` a point | formal comments too (`type`), `position` a point, a rect or `undefined`, `parent` |
| other formal comments | rejected with an exception | read as notes of type `formal` |
| `CGMLVertex.position` | a rect of `-1` for a point | a point for the point kinds |
| `CGMLComponent.id` | the `id/` parameter | the name suffix; `order` stays the document order |
| `dLapkiSchemePosition` | read from `point` | `point` is still given, from the text `x/ <x>` and `y/ <y>`; nothing to change |
| names and texts | trimmed | as written |
| machine name | absent without `dName` | the graph id (dialect D-8b) |
| ids repeated in a later machine | kept | kept when read; after the first save they come back as `<machine id>::<id>` and `<id>#<N>` |
| duplicate edge ids in a machine | one transition lost | the later ones as `<id>#<N>` |
| `CGMLVertex.data`, `CGMLTransition.pivot` | | deprecated: `data` is ignored, a transition with `pivot` is written as a comment link |
| actions | `postfix` `propagate` / `block` | also `defer`; a completion transition has no trigger; `else` guard |
| keys | `getKeys()` gives the full list | the list may stay: the standard keys in use get the appendix Б declarations, of the others only those in use are written; own keys without a declaration get one |
| regions | children of a state, region lost | `CGMLState.regions`, the child's `region` |
| comment links | edges in `transitions` (`pivot`) | `stateMachines[id].links` |
| errors | `Error` with a message | `CGMLError` with `findings`; `parseCGML(text, { strict: true })` rejects every deviation |
| `CGMLDataNode` | `x`, `y`, `width`, `height` stray fields | `point[]`, `rect[]` only |
| exported XML-layer types | `CGML`, `CGMLGraph`, `CGMLNode`, … | removed |

`serialaizeParameters` remains as a deprecated alias of `serializeParameters`, which no longer
ends the text with an empty line.

## From 2.0 to 2.1

The elements of the extension profiles get typed fields (`API.md`, "The 2.1 fields"):

| | 2.0 | 2.1 |
|---|---|---|
| entry and exit points | `unknownVertexes` | `entryPoints`, `exitPoints` |
| `dSubmachineState`, `dCollapsed`, `dFormalName`, `dMarkup`, `dColor` of vertices and comments | in `unsupportedDataNodes` | `submachine`, `collapsed`, `formalName`, `markup`, `color` |
| a label rect | in `unsupportedDataNodes` | `labelPosition` with `width` and `height` |
| the geometry of a comment link | in `unsupportedDataNodes` | `polyline`, `sourcePoint`, `targetPoint` |

Code that wrote these keys as data keeps working: the writer maps them.

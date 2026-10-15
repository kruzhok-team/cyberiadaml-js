# cyberiadaml-js Interface Specification

The exports of `@kruzhok-team/cyberiadaml-js` 2.0. The changes from 1.x are summarised in
`MIGRATION.md`, the reasons in `ARCHITECTURE.md`.

## Reading

* `parseCGML(graphml: string, options?: CGMLParseOptions): CGMLElements` - reads a document,
  standard or Lapki dialect; throws `CGMLError`.
* `CGMLParseOptions` - `strict?: boolean` (default `false`): no dialect repairs, any ERROR
  finding throws.

## Writing

* `exportGraphml(elements: CGMLElements): string` - writes a standard document; throws
  `CGMLError` when the result breaks a MUST rule (the output is read back strictly) or when an
  element names a parent that is not a state.
* `exportTextGraphml(elements: CGMLTextElements): string` - the same for the text model, where
  `actions` is the behaviour text.
* `dumpCGML(elements: CGMLElements): string` - the canonical dump of the validator specification
  §7 (cyberiadaml-compat-tests).

## Helpers

Kept from 1.x: `createEmptyElements()`, `createEmptyTextElements()`, `emptyCGMLStateMachine()`,
`serializeMeta(meta, standardVersion, platform?)`, `parseTrigger`, `toArray`, `CGMLDataKeys`.

* `serializeActions(actions): string` - the behaviour text of §6.8: `entry/`, `exit/`, `do/`,
  `<event> [<guard>] <propagate|block>/`, `<event>/ defer`, `[else]/`, the behaviour lines after
  the trigger line, blocks separated by an empty line; brackets in a guard are escaped.

* `parseParameters(text: string): Record<string, string>` - the `name/ value` list of §6.9
  (metadata, components, the D-5 extension values);
* `serializeParameters(parameters: Record<string, string>): string` - the reverse, without a
  trailing empty line; `serialaizeParameters` stays as its deprecated alias.

## Errors

* `CGMLError extends Error` - `findings: CGMLFinding[]`; the message is the first fatal or error
  finding.
* `CGMLFinding` - `rule`, `req` (`CGML-<clause>-<n>` or `LAPKI-D<n>`), `layer` (0 for the dialect
  pass, 1-4), `severity` (`ERROR` | `WARNING` | `INFO`), `message`, `line?`, `column?`, `path?`.

`CGMLError` is the class of the core (`core.CGMLError`).

## The Core

    import { core } from '@kruzhok-team/cyberiadaml-js';

The standard-compliant core under the 2.0 interface, the same as `cyberiadaml_py.core` with the
names in camelCase.

* `core.read(data: string | Uint8Array, options?: { strict?: boolean }): core.Document` - reads a
  document. Strict: no dialect repairs, any ERROR finding throws. Permissive (default): dialect
  repairs, only fatal findings throw. Throws `core.CGMLError`.
* `core.write(document: core.Document): string` - writes a standard document; throws
  `core.CGMLError` when the result breaks a MUST rule (the output is read back strictly).
* `core.dump(document: core.Document): string` - the canonical dump of the validator
  specification §7.
* `core.FORMAT_STANDARD`, `core.FORMAT_LAPKI`; `core.ERROR`, `core.WARNING`, `core.INFO`.
* `core.CGMLError extends Error` - `findings: core.Finding[]`; `core.Finding` - `rule`, `req`,
  `layer`, `severity`, `message`, `line?`, `column?`, `path?`.

Model classes (`instanceof` tells the node kinds apart); every element has `id`, `elem`, `parent`,
`line` and `extensions: core.Extension[]`:

* `Document` - `format`, `label`, `keys: KeyDecl[]`, `metaComment`, `metaId`, `metaParams:
  Param[]`, `metaErrors`, `geometryMode`, `machines: StateMachine[]`, `findings`,
  `extensionGraphs`, `originalIds: Map<string, string>`; `param(name)`, `transitionOrder()`,
  `eventPropagation()`, `markupLanguage()`;
* `StateMachine` - `name`, `formalName`, `geometry`, `marker`, `children`, `transitions`,
  `links`, `params`;
* `Region` - `name`, `formalName`, `geometry`, `children`;
* `Node` - `name`, `formalName`, `geometry`, `color`, the base of `State` (`data`, `blocks`,
  `blockErrors`, `regions`, `collapsed`), `SubmachineState` (`ref`, `regions`), `Vertex`
  (`kind`) and `Comment` (`kind`, `body`, `markup`, `component()`);
* `Transition` - `source`, `target`, `data`, `blocks`, `blockErrors`, `polyline`, `sourcePoint`,
  `targetPoint`, `labelGeometry`, `color`; `CommentLink` - `source`, `target`, `pivot`, `chunk`,
  `polyline`, `sourcePoint`, `targetPoint`;
* `Block` - `kind`, `trigger`, `param`, `guard`, `behaviour`, `verbatim`; `Param` - `name`,
  `value`, `line`; `KeyDecl` - `id`, `forKind`, `attrName`, `attrType`; `Extension` - `key`,
  `text`, `elem`; `Point`, `Rect`.

## Types

* `CGMLElements` - `format`, `keys: CGMLKeyNode[]`, `meta?: CGMLMeta` (the document metadata),
  `stateMachines: Record<string, CGMLStateMachine>`, `findings?: CGMLFinding[]` (`parseCGML` sets
  both);
* `CGMLMeta` - `id` (the metadata node), `values: Record<string, string>`,
  `unsupportedDataNodes?` (the other data of the metadata node, on the document metadata);
* `CGMLStateMachine` - `name?`, `meta`, `standardVersion`, `platform?` (mirrors of the document
  metadata over the machine parameters; `meta.values` without `platform` and `standardVersion`),
  `position?`, `dimensions?`, `states`, `transitions`, `links?`, `components`, `notes`,
  `initialStates`, `finals`, `choices`, `terminates`, `shallowHistory`, `deepHistory`,
  `unknownVertexes` (records by element id; components by the node id), `unsupportedDataNodes?`
  (the other data of the machine graph);
* `CGMLState` - `name`, `actions: CGMLAction[]`, `bounds?: CGMLRectangle`, `color?`, `parent?`,
  `region?`, `regions?: CGMLRegion[]`, `unsupportedDataNodes`;
* `CGMLRegion` - `id`, `name?`, `geometry?: CGMLRectangle`, `unsupportedDataNodes`;
* `CGMLVertex` - `type`, `name?`, `position?: CGMLPoint | CGMLRectangle`, `parent?`, `region?`,
  `unsupportedDataNodes?`; `data` is deprecated and ignored;
* `CGMLNote` - `type: 'formal' | 'informal'`, `name?`, `text`, `position?: CGMLPoint |
  CGMLRectangle`, `parent?`, `region?`, `unsupportedDataNodes`;
* `CGMLComponent` - `id`, `type`, `parameters`, `order`, `unsupportedDataNodes`;
* `CGMLTransition` - `id`, `source`, `target`, `actions: CGMLTransitionAction[]`, `color?`,
  `polyline?: CGMLPoint[]`, `position?: CGMLPoint` (its first point), `labelPosition?: CGMLPoint`,
  `sourcePoint?`, `targetPoint?`, `unsupportedDataNodes`; `pivot` is deprecated: a transition
  with a pivot is written as a comment link;
* `CGMLCommentLink` - `id`, `source`, `target`, `pivot?` (`dData` | `dName` | empty), `chunk?`,
  `unsupportedDataNodes`;
* `CGMLAction` - `trigger: CGMLTrigger`, `action?`; `CGMLTransitionAction` - `trigger?`,
  `action?`;
* `CGMLTrigger` - `event`, `condition?`, `postfix?: 'propagate' | 'block' | 'defer'`;
  `CGMLTransitionTrigger` - the same with `event?` (none on a completion transition);
* `CGMLDataNode` - `key`, `content: string` (`''` when the item has no text), `point?:
  CGMLPoint[]`, `rect?: CGMLRectangle[]` (the 1.x stray `x`, `y`, `width`, `height` fields are
  gone); `CGMLKeyNode` - `id`, `for`, `attr.name?`, `attr.type?`;
* `CGMLPoint`, `CGMLRectangle`.

`unsupportedDataNodes` holds every `data` item of an element the model does not type: the
extension keys and, until 2.1 types them, the standard ones — `dFormalName`, `dCollapsed`,
`dMarkup`, `dSubmachineState` (a submachine state is a state with it, its entry and exit points
are `unknownVertexes`), `dColor` of vertices and comments, a label rect. `exportGraphml` puts them
back where the standard wants them. A private Lapki key whose text is `x/ <x>` and `y/ <y>`
(`dLapkiSchemePosition`, dialect D-5) also comes with that `point`; written from the point.

Planned for 2.1 (additive, optional): `CGMLSubmachineState` and its entry/exit points,
`CGMLState.collapsed`, `formalName` on machines, regions and nodes, `CGMLNote.markup`, the label
rect, link targets on transitions.

No longer exported: the shapes of the 1.x XML layer — `CGML`, `CGMLGraphmlNode`, `CGMLGraph`,
`CGMLNode`, `CGMLEdge`, `CGMLDataNodeProcess`, `CGMLDataNodeProcessArgs`, `XMLProperies` — and
the `Export*` types.

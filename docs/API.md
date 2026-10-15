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
  `CGMLError` when the result breaks a MUST rule.
* `exportTextGraphml(elements: CGMLTextElements): string` - the same for the text model, where
  `actions` is the behaviour text.
* `dumpCGML(elements: CGMLElements): string` - the canonical dump of the validator specification
  §7 (cyberiadaml-compat-tests).

## Helpers

Kept from 1.x: `createEmptyElements()`, `createEmptyTextElements()`, `emptyCGMLStateMachine()`,
`serializeActions(actions)`, `serializeMeta(meta, standardVersion, platform?)`, `parseTrigger`,
`toArray`, `CGMLDataKeys`.

* `parseParameters(text: string): Record<string, string>` - the `name/ value` list of §6.9
  (metadata, components, the D-5 extension values);
* `serializeParameters(parameters: Record<string, string>): string` - the reverse, without a
  trailing empty line; `serialaizeParameters` stays as its deprecated alias.

## Errors

* `CGMLError extends Error` - `findings: CGMLFinding[]`; the message is the first fatal or error
  finding.
* `CGMLFinding` - `rule`, `req` (`CGML-<clause>-<n>` or `LAPKI-D<n>`), `layer` (0 for the dialect
  pass, 1-4), `severity` (`ERROR` | `WARNING` | `INFO`), `message`, `line?`, `column?`, `path?`.

## Types

* `CGMLElements` - `format`, `keys: CGMLKeyNode[]`, `meta: CGMLMeta` (the document metadata),
  `stateMachines: Record<string, CGMLStateMachine>`, `findings: CGMLFinding[]`;
* `CGMLMeta` - `id` (the metadata node), `values: Record<string, string>`;
* `CGMLStateMachine` - `name?`, `meta`, `standardVersion`, `platform?` (mirrors of the document
  metadata over the machine parameters), `position?`, `dimensions?`, `states`, `transitions`,
  `links`, `components`, `notes`, `initialStates`, `finals`, `choices`, `terminates`,
  `shallowHistory`, `deepHistory`, `unknownVertexes` (records by element id; components by the
  node id);
* `CGMLState` - `name`, `actions: CGMLAction[]`, `bounds?: CGMLRectangle`, `color?`, `parent?`,
  `region?`, `regions?: CGMLRegion[]`, `unsupportedDataNodes`;
* `CGMLRegion` - `id`, `name?`, `geometry?: CGMLRectangle`, `unsupportedDataNodes`;
* `CGMLVertex` - `type`, `name?`, `position?: CGMLPoint | CGMLRectangle`, `parent?`, `region?`,
  `unsupportedDataNodes`;
* `CGMLNote` - `type: 'formal' | 'informal'`, `name?`, `text`, `position?: CGMLPoint |
  CGMLRectangle`, `parent?`, `region?`, `unsupportedDataNodes`;
* `CGMLComponent` - `id`, `type`, `parameters`, `order`, `unsupportedDataNodes`;
* `CGMLTransition` - `id`, `source`, `target`, `actions: CGMLTransitionAction[]`, `color?`,
  `position?: CGMLPoint`, `labelPosition?: CGMLPoint`, `sourcePoint?`, `targetPoint?`,
  `unsupportedDataNodes`;
* `CGMLCommentLink` - `id`, `source`, `target`, `pivot?` (`dData` | `dName` | empty), `chunk?`,
  `unsupportedDataNodes`;
* `CGMLAction` - `trigger: CGMLTrigger`, `action?`; `CGMLTransitionAction` - `trigger?`,
  `action?`;
* `CGMLTrigger` - `event`, `condition?`, `postfix?: 'propagate' | 'block' | 'defer'`;
  `CGMLTransitionTrigger` - the same with `event?` (none on a completion transition);
* `CGMLDataNode` - `key`, `content?: string`, `point?: CGMLPoint[]`, `rect?: CGMLRectangle[]`
  (the 1.x stray `x`, `y`, `width`, `height` fields are gone); `CGMLKeyNode` - `id`, `for`,
  `attr.name?`, `attr.type?`;
* `CGMLPoint`, `CGMLRectangle`.

Planned for 2.1 (additive, optional): `CGMLSubmachineState` and its entry/exit points,
`CGMLState.collapsed`, `formalName` on machines, regions and nodes, `CGMLNote.markup`,
`CGMLTransition.polyline` and the label rect, link targets on transitions.

No longer exported: the shapes of the 1.x XML layer — `CGML`, `CGMLGraphmlNode`, `CGMLGraph`,
`CGMLNode`, `CGMLEdge`, `CGMLDataNodeProcess`, `CGMLDataNodeProcessArgs`, `XMLProperies` — and
the `Export*` types.

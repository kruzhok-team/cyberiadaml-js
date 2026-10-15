/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L3 layer: attribute and value checks
 *
 * Copyright (C) 2026 Alexey Fedoseev <aleksey@fedoseev.net>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/
 *
 * ----------------------------------------------------------------------------- */

import { ERROR, INFO, WARNING } from './findings';
import {
  binding,
  CSS_COLOR_NAMES,
  EVENT_PROPAGATIONS,
  GEOMETRY_MODES,
  NOTE_KINDS,
  STANDARD_BINDINGS,
  STANDARD_KEY_IDS,
  TRANSITION_ORDERS,
  UNTYPED_KEYS,
  VERTEX_CORE,
  VERTEX_EXT,
  VERTEX_RESERVED,
} from './keys';
import * as meta from './meta';
import * as model from './model';
import { Comment, Vertex } from './model';
import { Context, declare, rule } from './rules';
import { repr } from './util';
import { XElement } from './xml';

export const FORMAT_VALUE = 'Cyberiada-GraphML-1.0';

const ID_EXCLUDED = new Set(['"', "'", '`', '\\']);
const ID_MAX_LENGTH = 256;

// Python's '$' also matches before a trailing newline
export const FORMAL_NAME_RE = /^[A-Za-z_][A-Za-z_0-9]*\n?$/;
const LATIN_NAME_RE = /^[A-Za-z]+\n?$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?\n?$/;
const EDGE_ID_RE = /^.+-.+(#[0-9]+)?\n?$/;
const ISO_DATE_RE =
  /^\d{4}-?\d{2}-?\d{2}([T ]\d{2}(:?\d{2}(:?\d{2}([.,]\d+)?)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$/;
const PIVOT_VALUES = ['dName', 'dData', ''];
const COMPONENT_PREFIX = model.COMPONENT_NAME + ' ';

declare(
  'key-defaults',
  'CGML-5.5-2',
  3,
  INFO,
  'the appendix B defaults apply when the key block is absent',
  'the model applies the default declarations',
);
declare(
  'behaviour-blocks',
  'CGML-6.8-2',
  3,
  INFO,
  'behaviour blocks are separated by blank lines',
  'checked by the behaviour parser',
);
declare(
  'behaviour-keywords',
  'CGML-6.8-3',
  3,
  INFO,
  'entry/, exit/ and do/ blocks are recognized',
  'checked by the behaviour parser',
);
declare(
  'event-name',
  'CGML-6.8-4',
  3,
  INFO,
  'the event description begins with the event name',
  'checked by the behaviour parser',
);
declare(
  'event-params',
  'CGML-6.8-5',
  3,
  INFO,
  'the propagate, block and defer event parameters are recognized',
  'checked by the behaviour parser',
);
declare(
  'behaviour-block-once',
  'CGML-6.8-3-1',
  3,
  ERROR,
  'a state carries at most one entry/, exit/ and do/ block',
);
declare('event-name-reserved', 'CGML-6.8-4-1', 3, ERROR, 'event names are not reserved words');
declare(
  'defer-usage',
  'CGML-6.8-5-1',
  3,
  ERROR,
  'defer is the whole behaviour of an internal transition',
);
declare('param-needs-event', 'CGML-6.8-5-2', 3, ERROR, 'propagate and block require an event name');
declare(
  'else-guard',
  'CGML-6.8-6',
  3,
  INFO,
  'the else guard keyword is recognized',
  'checked by the behaviour parser',
);
declare(
  'guard-brackets',
  'CGML-6.8-8',
  3,
  INFO,
  'escaped square brackets in guards are recognized',
  'checked by the behaviour parser',
);
declare(
  'meta-text-params',
  'CGML-6.9-4-2',
  3,
  INFO,
  'the standard text parameters are preserved',
  'values are kept in the model',
);
declare(
  'markup-default',
  'CGML-6.9-4-6',
  3,
  INFO,
  'the markupLanguage parameter sets the comment markup default',
  'resolved by the model',
);
declare(
  'custom-params',
  'CGML-6.9-5',
  3,
  INFO,
  'additional metadata parameters are preserved',
  'values are kept in the model',
);

function allData(root: XElement | null): XElement[] {
  return root === null ? [] : [...root.iter('data')];
}

function length(text: string): number {
  return Array.from(text).length;
}

rule('gformat-value', 'CGML-5.4-2', 3, ERROR, `the gFormat value is "${FORMAT_VALUE}"`, (ctx) => {
  const doc = ctx.doc;
  if (doc.formatElem === null) {
    return;
  }
  if ((doc.format ?? '').trim() !== FORMAT_VALUE) {
    ctx.emit(
      'gformat-value',
      `the gFormat value is ${repr(doc.format)}, expected "${FORMAT_VALUE}"`,
      doc.formatElem,
    );
  }
});

rule(
  'key-declarations',
  'CGML-appendix-B-1',
  3,
  ERROR,
  'key declarations agree with the appendix B inventory',
  (ctx) => {
    const doc = ctx.doc;
    const declared = new Set<string | null>();
    for (const decl of doc.keys) {
      declared.add(decl.id);
      if (decl.id === null || !STANDARD_KEY_IDS.has(decl.id)) {
        continue;
      }
      const bound = STANDARD_BINDINGS.get(binding(decl.id, decl.forKind ?? 'None'));
      if (bound === undefined) {
        ctx.emit(
          'key-declarations',
          `standard key ${decl.id} redeclared for ${repr(decl.forKind)}`,
          decl.elem,
        );
      } else if (decl.attrName !== null && decl.attrName !== bound) {
        ctx.emit(
          'key-declarations',
          `standard key ${decl.id} redeclared with attr.name ${repr(decl.attrName)}, ` +
            `expected ${repr(bound)}`,
          decl.elem,
        );
      }
    }
    for (const data of allData(doc.root)) {
      const key = data.get('key');
      if (key !== null && !STANDARD_KEY_IDS.has(key) && !declared.has(key)) {
        ctx.emit('key-declarations', `data key ${key} is neither standard nor declared`, data);
      }
    }
  },
);

rule(
  'key-type',
  'CGML-5.5-5',
  3,
  ERROR,
  'standard key declarations keep the appendix B attr.type',
  (ctx) => {
    for (const decl of ctx.doc.keys) {
      if (decl.id === null || !STANDARD_KEY_IDS.has(decl.id) || decl.attrType === null) {
        continue;
      }
      if (UNTYPED_KEYS.has(decl.id)) {
        ctx.emit(
          'key-type',
          `standard key ${decl.id} declared with attr.type ${repr(decl.attrType)}; appendix B ` +
            'declares no type',
          decl.elem,
        );
      } else if (decl.attrType !== 'string') {
        ctx.emit(
          'key-type',
          `standard key ${decl.id} declared with attr.type ${repr(decl.attrType)}, expected "string"`,
          decl.elem,
        );
      }
    }
  },
);

rule('data-key-attr', 'CGML-5.5-3', 3, ERROR, 'every data tag carries a key attribute', (ctx) => {
  for (const data of allData(ctx.doc.root)) {
    if (data.get('key') === null) {
      ctx.emit('data-key-attr', 'data tag without a key attribute', data);
    }
  }
});

rule('element-ids', 'CGML-5.9-1', 3, ERROR, 'every graph, node and edge carries an id', (ctx) => {
  for (const [kind, elem] of model.iterElements(ctx.doc.root!)) {
    if (elem.get('id') === null) {
      ctx.emit('element-ids', `${kind} without an id attribute`, elem);
    }
  }
});

rule(
  'id-charset',
  'CGML-5.9-2',
  3,
  ERROR,
  'ids use ASCII 33-126 except quotes, the backquote and the backslash',
  (ctx) => {
    for (const [kind, elem] of model.iterElements(ctx.doc.root!)) {
      const value = elem.get('id');
      if (!value) {
        continue;
      }
      for (const char of value) {
        const code = char.codePointAt(0)!;
        if (!(code >= 33 && code <= 126) || ID_EXCLUDED.has(char)) {
          ctx.emit(
            'id-charset',
            `${kind} id ${repr(value)} contains the inadmissible character ${repr(char)}`,
            elem,
          );
          break;
        }
      }
    }
  },
);

rule(
  'id-length',
  'CGML-5.9-3',
  3,
  ERROR,
  'ids are non-empty and at most 256 characters long',
  (ctx) => {
    for (const [kind, elem] of model.iterElements(ctx.doc.root!)) {
      const value = elem.get('id');
      if (value === null) {
        continue;
      }
      if (!value) {
        ctx.emit('id-length', `${kind} with an empty id`, elem);
      } else if (length(value) > ID_MAX_LENGTH) {
        ctx.emit(
          'id-length',
          `${kind} id is ${length(value)} characters long, at most ${ID_MAX_LENGTH} allowed`,
          elem,
        );
      }
    }
  },
);

rule('edgedefault', 'CGML-5.6-1', 3, WARNING, 'graphs carry edgedefault="directed"', (ctx) => {
  for (const machine of ctx.doc.machines) {
    const value = machine.elem!.get('edgedefault');
    if (value !== 'directed') {
      ctx.emit(
        'edgedefault',
        `graph edgedefault is ${repr(value)}, expected "directed"`,
        machine.elem,
      );
    }
  }
  // regions carry no edges; only an explicit wrong value is reported
  for (const region of model.iterRegions(ctx.doc)) {
    const value = region.elem!.get('edgedefault');
    if (value !== null && value !== 'directed') {
      ctx.emit(
        'edgedefault',
        `region edgedefault is ${repr(value)}, expected "directed"`,
        region.elem,
      );
    }
  }
});

rule(
  'edge-endpoints',
  'CGML-5.8-1',
  3,
  ERROR,
  'edges carry non-empty source and target attributes',
  (ctx) => {
    for (const [kind, elem] of model.iterElements(ctx.doc.root!)) {
      if (kind !== 'edge') {
        continue;
      }
      for (const name of ['source', 'target']) {
        if (!elem.get(name)) {
          ctx.emit('edge-endpoints', `edge without a non-empty ${name} attribute`, elem);
        }
      }
    }
  },
);

rule(
  'edge-id-template',
  'CGML-5.8-2',
  3,
  INFO,
  'edge ids follow the source-target or source-target#N template',
  (ctx) => {
    for (const [kind, elem] of model.iterElements(ctx.doc.root!)) {
      if (kind !== 'edge') {
        continue;
      }
      const value = elem.get('id');
      if (value && !EDGE_ID_RE.test(value)) {
        ctx.emit(
          'edge-id-template',
          `edge id ${repr(value)} does not follow the source-target[#N] template`,
          elem,
        );
      }
    }
  },
);

rule(
  'sm-marker-value',
  'CGML-6.1-1',
  3,
  ERROR,
  'the dStateMachine marker value is empty',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      const value = model.dataValue(machine.elem!, 'dStateMachine');
      if (value && value.trim()) {
        ctx.emit(
          'sm-marker-value',
          `dStateMachine carries the non-empty value ${repr(value)}`,
          machine.elem,
        );
      }
    }
  },
);

rule(
  'marker-values',
  'CGML-6.5-2',
  3,
  WARNING,
  'the dRegion and dCollapsed marker values are empty',
  (ctx) => {
    for (const data of allData(ctx.doc.root)) {
      const key = data.get('key');
      if ((key === 'dRegion' || key === 'dCollapsed') && data.text && data.text.trim()) {
        ctx.emit('marker-values', `${key} carries the non-empty value ${repr(data.text)}`, data);
      }
    }
  },
);

rule(
  'vertex-value',
  'CGML-6.4-2',
  3,
  ERROR,
  "dVertex values come from the standard's table 3",
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      if (!(node instanceof Vertex)) {
        continue;
      }
      const kind = (node.kind ?? '').trim();
      if (VERTEX_RESERVED.includes(kind)) {
        ctx.emit(
          'vertex-reserved',
          `dVertex value ${repr(kind)} is reserved; tolerated on read as an unknown vertex`,
          node.elem,
        );
      } else if (![...VERTEX_CORE, ...VERTEX_EXT].includes(kind)) {
        ctx.emit('vertex-value', `dVertex value ${repr(kind)} is not admissible`, node.elem);
      }
    }
  },
);

declare(
  'vertex-reserved',
  'CGML-6.4-2',
  3,
  WARNING,
  'the reserved fork and join vertexes are tolerated on read',
);

rule('note-value', 'CGML-6.6-1', 3, ERROR, 'dNote values are informal or formal', (ctx) => {
  for (const node of model.iterNodes(ctx.doc)) {
    if (node instanceof Comment && !NOTE_KINDS.includes((node.kind ?? '').trim())) {
      ctx.emit('note-value', `dNote value ${repr(node.kind)} is not admissible`, node.elem);
    }
  }
});

rule(
  'color-value',
  'CGML-9.2-2',
  3,
  ERROR,
  'dColor values are #RRGGBB, #RRGGBBAA or a CSS colour name',
  (ctx) => {
    for (const data of allData(ctx.doc.root)) {
      if (data.get('key') !== 'dColor') {
        continue;
      }
      const value = (data.text ?? '').trim();
      if (!value) {
        ctx.emit('color-value', 'empty dColor value', data);
      } else if (value.startsWith('#')) {
        if (!HEX_COLOR_RE.test(value)) {
          ctx.emit(
            'color-value',
            `dColor value ${repr(value)} is not a #RRGGBB or #RRGGBBAA color`,
            data,
          );
        }
      } else if (!CSS_COLOR_NAMES.has(value.toLowerCase())) {
        ctx.emit(
          'color-value',
          `dColor value ${repr(value)} is neither a #RRGGBB[AA] color nor a CSS colour name`,
          data,
        );
      }
    }
  },
  ['CGML-9.2-1', 'CGML-9.2-3'],
);

rule(
  'markup-usage',
  'CGML-9.3-2',
  3,
  ERROR,
  'dMarkup appears on comments only, with a non-empty value',
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      const markup = model.dataValue(node.elem!, 'dMarkup');
      if (markup === null) {
        continue;
      }
      if (!(node instanceof Comment)) {
        ctx.emit('markup-usage', 'dMarkup on a node that is not a comment', node.elem);
      } else if (!markup.trim()) {
        ctx.emit('markup-usage', 'empty dMarkup value', node.elem);
      }
    }
  },
  ['CGML-9.3-1'],
);

rule(
  'formal-name-syntax',
  'CGML-10.1-2',
  3,
  ERROR,
  'formal names are identifiers of latin letters, digits and underscores',
  (ctx) => {
    for (const data of allData(ctx.doc.root)) {
      if (data.get('key') !== 'dFormalName') {
        continue;
      }
      const value = data.text || '';
      if (!FORMAL_NAME_RE.test(value)) {
        ctx.emit(
          'formal-name-syntax',
          `formal name ${repr(value)} does not match the identifier syntax`,
          data,
        );
      }
    }
  },
);

rule('pivot-value', 'CGML-6.7-1', 3, ERROR, 'dPivot names dName, dData or is empty', (ctx) => {
  for (const machine of ctx.doc.machines) {
    for (const link of machine.links) {
      if (!PIVOT_VALUES.includes((link.pivot ?? '').trim())) {
        ctx.emit('pivot-value', `dPivot value ${repr(link.pivot)} is not admissible`, link.elem);
      }
    }
  }
});

rule(
  'chunk-required',
  'CGML-6.7-3',
  3,
  ERROR,
  'a dName or dData link carries a non-empty dChunk',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      for (const link of machine.links) {
        if (['dName', 'dData'].includes((link.pivot ?? '').trim()) && !(link.chunk ?? '').trim()) {
          ctx.emit(
            'chunk-required',
            `comment link with dPivot ${repr(link.pivot)} carries no non-empty dChunk`,
            link.elem,
          );
        }
      }
    }
  },
);

rule(
  'chunk-no-target-point',
  'CGML-9.1-1-3-4',
  3,
  ERROR,
  'a link to a subject aspect carries no dTargetPoint',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      for (const link of machine.links) {
        const targetPoint = model.dataValue(link.elem!, 'dTargetPoint');
        if (link.chunk !== null && targetPoint !== null) {
          ctx.emit(
            'chunk-no-target-point',
            'comment link with dChunk carries a dTargetPoint',
            link.elem,
          );
        }
      }
    }
  },
);

rule(
  'component-syntax',
  'CGML-10.3-1',
  3,
  ERROR,
  'CGML_COMPONENT comments name a component unique in its state machine and its type',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      // the component identifier is unique in its machine; the node ids are unique in the whole
      // document (CGML-5.9-4)
      const seen = new Map<string, string | null>();
      for (const node of model.iterMachineNodes(machine)) {
        if (!(node instanceof Comment) || (node.kind ?? '').trim() !== 'formal') {
          continue;
        }
        const name = node.name ?? '';
        if (name !== model.COMPONENT_NAME && !name.startsWith(COMPONENT_PREFIX)) {
          continue;
        }
        const ident = name.slice(COMPONENT_PREFIX.length);
        if (!FORMAL_NAME_RE.test(ident)) {
          ctx.emit(
            'component-syntax',
            `component comment name ${repr(name)} is not CGML_COMPONENT, one space and a formal ` +
              'identifier',
            node.elem,
          );
        } else if (seen.has(ident)) {
          ctx.emit(
            'component-syntax',
            `component ${repr(ident)} is defined twice in the state machine ${repr(machine.id)} ` +
              `(nodes ${repr(seen.get(ident))} and ${repr(node.id)})`,
            node.elem,
          );
        } else {
          seen.set(ident, node.id);
        }
        const [params, errors] = meta.parse(node.body);
        for (const [line, message] of errors) {
          ctx.emit('component-syntax', `${message} (value line ${line + 1})`, node.elem);
        }
        const types = params.filter((p) => p.name === 'type').map((p) => p.value.trim());
        if (!types.length || !types[0]) {
          ctx.emit(
            'component-syntax',
            `component ${repr(ident)} has no non-empty type parameter`,
            node.elem,
          );
        }
      }
    }
  },
);

rule(
  'behaviour-syntax',
  'CGML-6.8-1',
  3,
  ERROR,
  'dData behaviour text follows the trigger syntax',
  (ctx) => {
    // the parser errors go under the rule each one names
    for (const node of model.iterNodes(ctx.doc)) {
      const errors = 'blockErrors' in node ? node.blockErrors : [];
      for (const [line, message, name] of errors) {
        ctx.emit(name, `${message} (value line ${line + 1})`, node.elem);
      }
    }
    for (const machine of ctx.doc.machines) {
      for (const transition of machine.transitions) {
        for (const [line, message, name] of transition.blockErrors) {
          ctx.emit(name, `${message} (value line ${line + 1})`, transition.elem);
        }
      }
    }
  },
);

function metaElem(ctx: Context): XElement | null {
  return ctx.doc.metaComment === null ? null : ctx.doc.metaComment.elem;
}

rule(
  'meta-syntax',
  'CGML-6.9-2',
  3,
  ERROR,
  'metadata parameters follow the name/ value syntax',
  (ctx) => {
    const doc = ctx.doc;
    if (doc.metaComment === null) {
      return;
    }
    for (const [line, message] of doc.metaErrors) {
      ctx.emit('meta-syntax', `${message} (value line ${line + 1})`, doc.metaComment.elem);
    }
  },
);

rule(
  'meta-params',
  'CGML-6.9-2',
  3,
  ERROR,
  'metadata parameter names are latin letters, not repeated',
  (ctx) => {
    const seen = new Set<string>();
    for (const par of ctx.doc.metaParams) {
      if (!LATIN_NAME_RE.test(par.name)) {
        ctx.emit(
          'meta-params',
          `parameter name ${repr(par.name)} is not latin letters only`,
          metaElem(ctx),
        );
      }
      if (seen.has(par.name)) {
        ctx.emit(
          'meta-params',
          `parameter ${repr(par.name)} is repeated; the first occurrence wins`,
          metaElem(ctx),
        );
      }
      seen.add(par.name);
    }
  },
);

rule(
  'standard-version',
  'CGML-6.9-3',
  3,
  ERROR,
  'the standardVersion metadata parameter is "1.0"',
  (ctx) => {
    const doc = ctx.doc;
    if (doc.metaComment === null) {
      return;
    }
    const value = doc.param('standardVersion');
    if (value === null) {
      ctx.emit(
        'standard-version',
        'the mandatory standardVersion parameter is missing',
        doc.metaComment.elem,
      );
    } else if (value.trim() !== '1.0') {
      ctx.emit(
        'standard-version',
        `standardVersion is ${repr(value)}, expected "1.0"`,
        doc.metaComment.elem,
      );
    }
  },
);

rule(
  'geometry-mode-value',
  'CGML-6.9-4-1',
  3,
  ERROR,
  'the geometry metadata parameter is none, short or full',
  (ctx) => {
    const value = ctx.doc.param('geometry');
    if (value !== null && !GEOMETRY_MODES.includes(value.trim())) {
      ctx.emit(
        'geometry-mode-value',
        `geometry mode ${repr(value)} is not admissible`,
        metaElem(ctx),
      );
    }
  },
);

rule(
  'transition-order-value',
  'CGML-6.9-4-4',
  3,
  WARNING,
  'the transitionOrder parameter is actionFirst or exitFirst',
  (ctx) => {
    const value = ctx.doc.param('transitionOrder');
    if (value !== null && !TRANSITION_ORDERS.includes(value.trim())) {
      ctx.emit(
        'transition-order-value',
        `transitionOrder ${repr(value)} is not admissible`,
        metaElem(ctx),
      );
    }
  },
);

rule(
  'event-propagation-value',
  'CGML-6.9-4-5',
  3,
  ERROR,
  'the eventPropagation parameter is block or propagate',
  (ctx) => {
    const value = ctx.doc.param('eventPropagation');
    if (value !== null && !EVENT_PROPAGATIONS.includes(value.trim())) {
      ctx.emit(
        'event-propagation-value',
        `eventPropagation ${repr(value)} is not admissible (defer is valid only per event)`,
        metaElem(ctx),
      );
    }
  },
);

rule(
  'created-at',
  'CGML-6.9-4-3',
  3,
  INFO,
  'the createdAt parameter is an ISO 8601 UTC timestamp',
  (ctx) => {
    const value = ctx.doc.param('createdAt');
    if (value === null) {
      return;
    }
    if (!ISO_DATE_RE.test(value.trim())) {
      ctx.emit(
        'created-at',
        `createdAt ${repr(value)} is not an ISO 8601 timestamp`,
        metaElem(ctx),
      );
    }
  },
);

rule(
  'point-name-required',
  'CGML-8.3-4',
  3,
  ERROR,
  'entry and exit points carry a non-empty name',
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      if (
        node instanceof Vertex &&
        (node.kind === 'entryPoint' || node.kind === 'exitPoint') &&
        !(node.name ?? '').trim()
      ) {
        ctx.emit(
          'point-name-required',
          `${node.kind} ${repr(node.id)} carries no non-empty dName`,
          node.elem,
        );
      }
    }
  },
);

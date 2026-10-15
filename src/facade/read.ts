/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * parseCGML: the 2.0 elements read through the core
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

import { blockAction, stateActions } from './actions';
import {
  CGMLComponent,
  CGMLDataNode,
  CGMLElements,
  CGMLFinding,
  CGMLKeyNode,
  CGMLMeta,
  CGMLParseOptions,
  CGMLPoint,
  CGMLRectangle,
  CGMLStateMachine,
  CGMLTransitionAction,
  CGMLVertex,
  NoteType,
} from './types';

import * as core from '../core';
import { parse as parseMeta } from '../core/meta';
import { AnyNode, iterMachineNodes } from '../core/model';
import { XElement } from '../core/xml';

const VERTEX_FIELDS: { [kind: string]: keyof CGMLStateMachine } = {
  initial: 'initialStates',
  choice: 'choices',
  final: 'finals',
  terminate: 'terminates',
  shallowHistory: 'shallowHistory',
  deepHistory: 'deepHistory',
};

// the data keys the 2.0 model types; every other item goes to unsupportedDataNodes
const MACHINE_KEYS = ['dStateMachine', 'dName', 'dGeometry'];
const REGION_KEYS = ['dRegion', 'dName', 'dGeometry'];
const STATE_KEYS = ['dName', 'dGeometry', 'dData', 'dColor'];
const VERTEX_KEYS = ['dVertex', 'dName', 'dGeometry'];
const NOTE_KEYS = ['dNote', 'dName', 'dGeometry', 'dData'];
const COMPONENT_KEYS = ['dNote', 'dName', 'dData'];
const META_KEYS = ['dNote', 'dName', 'dData'];
const LINK_KEYS = ['dPivot', 'dChunk'];
const PRIVATE_PREFIX = 'dLapki';

type Shape = core.Point | core.Rect | null;

function point(shape: core.Point): CGMLPoint {
  return { x: shape.x, y: shape.y };
}

function rect(shape: core.Rect): CGMLRectangle {
  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
}

function shape(value: Shape): CGMLPoint | CGMLRectangle | undefined {
  if (value instanceof core.Rect) {
    return rect(value);
  }
  return value instanceof core.Point ? point(value) : undefined;
}

function number(value: string | null): number {
  return Number(value ?? 0);
}

/** The private Lapki point kept as the text x/ <x> and y/ <y> (D-5), also given as a point. */
function textPoint(key: string, content: string): CGMLPoint[] | undefined {
  if (!key.startsWith(PRIVATE_PREFIX)) {
    return undefined;
  }
  const [params, errors] = parseMeta(content);
  if (errors.length || params.length !== 2 || params[0].name !== 'x' || params[1].name !== 'y') {
    return undefined;
  }
  const [x, y] = params.map((p) => p.value.trim());
  if (!x || !y || isNaN(Number(x)) || isNaN(Number(y))) {
    return undefined;
  }
  return [{ x: Number(x), y: Number(y) }];
}

function dataNode(elem: XElement): CGMLDataNode {
  const key = elem.get('key') ?? '';
  const node: CGMLDataNode = { key, content: elem.text ?? '' };
  const points = elem.children
    .filter((c) => c.tag === 'point')
    .map((c) => ({ x: number(c.get('x')), y: number(c.get('y')) }));
  const rects = elem.children
    .filter((c) => c.tag === 'rect')
    .map((c) => ({
      x: number(c.get('x')),
      y: number(c.get('y')),
      width: number(c.get('width')),
      height: number(c.get('height')),
    }));
  const mirror = points.length || rects.length ? undefined : textPoint(key, node.content);
  if (points.length || mirror) {
    node.point = points.length ? points : mirror;
  }
  if (rects.length) {
    node.rect = rects;
  }
  return node;
}

function unsupported(elem: XElement | null, typed: string[]): CGMLDataNode[] {
  if (elem === null) {
    return [];
  }
  return elem.children
    .filter((d) => d.tag === 'data' && !typed.includes(d.get('key') as string))
    .map(dataNode);
}

function trimmed(params: core.Param[]): { [id: string]: string } {
  const values: { [id: string]: string } = {};
  for (const param of params) {
    values[param.name.trim()] = param.value.trim();
  }
  return values;
}

/** Fill the 2.0 state machine from a core state machine. */
class MachineReader {
  sm: CGMLStateMachine;
  order = 0;
  initials: Set<string | null>;

  constructor(
    private document: core.Document,
    machine: core.StateMachine,
    first: boolean,
    private strict: boolean,
  ) {
    this.initials = new Set(
      [...iterMachineNodes(machine)]
        .filter((n) => n instanceof core.Vertex && n.kind === 'initial')
        .map((n) => n.id),
    );
    const values = { ...trimmed(document.metaParams), ...trimmed(machine.params) };
    const platform = values['platform'];
    const standardVersion = values['standardVersion'] ?? '';
    delete values['platform'];
    delete values['standardVersion'];
    this.sm = {
      name: machine.name ?? undefined,
      meta: { id: first ? document.metaId ?? '' : '', values },
      standardVersion,
      platform,
      states: {},
      transitions: {},
      links: {},
      components: {},
      initialStates: {},
      notes: {},
      finals: {},
      choices: {},
      terminates: {},
      shallowHistory: {},
      deepHistory: {},
      unknownVertexes: {},
      unsupportedDataNodes: unsupported(machine.elem, MACHINE_KEYS),
    };
    if (platform === undefined) {
      delete this.sm.platform;
    }
    if (machine.geometry instanceof core.Rect) {
      this.sm.position = { x: machine.geometry.x, y: machine.geometry.y };
      this.sm.dimensions = { width: machine.geometry.width, height: machine.geometry.height };
    }
    for (const child of machine.children) {
      this.node(child, undefined, undefined);
    }
    for (const transition of machine.transitions) {
      this.transition(transition);
    }
    for (const link of machine.links) {
      this.link(link);
    }
  }

  // the ids per machine as written: the dialect renames of repeated ids are undone (D-7f)
  id(value: string | null): string {
    return (value !== null ? this.document.originalIds.get(value) : undefined) ?? value ?? '';
  }

  // an edge id renamed for a duplicate (D-7a) comes back unless it is taken in this machine
  edgeId(value: string | null, taken: object): string {
    const ident = this.id(value);
    return ident in taken ? value ?? '' : ident;
  }

  node(node: AnyNode, parent: string | undefined, region: string | undefined): void {
    const place: { parent?: string; region?: string } = {};
    if (parent !== undefined) {
      place.parent = parent;
    }
    if (region !== undefined) {
      place.region = region;
    }
    const id = this.id(node.id);
    if (node instanceof core.Comment) {
      this.comment(node, id, place);
    } else if (node instanceof core.Vertex) {
      const kind = node.kind ?? '';
      const vertex: CGMLVertex = {
        type: kind,
        ...place,
        unsupportedDataNodes: unsupported(node.elem, VERTEX_KEYS),
      };
      if (node.name !== null) {
        vertex.name = node.name;
      }
      const position = shape(node.geometry);
      if (position) {
        vertex.position = position;
      }
      const field = VERTEX_FIELDS[kind] ?? 'unknownVertexes';
      (this.sm[field] as { [id: string]: CGMLVertex })[id] = vertex;
    } else {
      const state = node instanceof core.State ? node : null;
      this.sm.states[id] = {
        name: node.name ?? '',
        actions: state ? stateActions(state.blocks) : [],
        ...place,
        unsupportedDataNodes: unsupported(node.elem, STATE_KEYS),
      };
      const record = this.sm.states[id];
      if (node.geometry instanceof core.Rect) {
        record.bounds = rect(node.geometry);
      } else if (node.geometry instanceof core.Point) {
        record.bounds = { ...point(node.geometry), width: 0, height: 0 };
      }
      if (node.color !== null) {
        record.color = node.color;
      }
      if (node.regions.length) {
        record.regions = node.regions.map((r) => ({
          id: r.id ?? '',
          ...(r.name !== null ? { name: r.name } : {}),
          ...(r.geometry instanceof core.Rect ? { geometry: rect(r.geometry) } : {}),
          unsupportedDataNodes: unsupported(r.elem, REGION_KEYS),
        }));
      }
      for (const r of node.regions) {
        for (const child of r.children) {
          this.node(child, id, r.id ?? undefined);
        }
      }
    }
  }

  comment(node: core.Comment, id: string, place: { parent?: string; region?: string }): void {
    if (node === this.document.metaComment) {
      return;
    }
    const component = node.component();
    if (component !== null) {
      const [ident, kind, params] = component;
      // a component comment keeps its geometry as data
      const record: CGMLComponent = {
        id: ident,
        type: (kind ?? '').trim(),
        parameters: trimmed(params),
        order: this.order,
        unsupportedDataNodes: unsupported(node.elem, COMPONENT_KEYS),
      };
      this.sm.components[id] = record;
      this.order += 1;
      return;
    }
    this.sm.notes[id] = {
      type: ((node.kind ?? '').trim() || 'informal') as NoteType,
      text: node.body ?? '',
      ...place,
      unsupportedDataNodes: unsupported(node.elem, NOTE_KEYS),
    };
    const note = this.sm.notes[id];
    if (node.name !== null) {
      note.name = node.name;
    }
    const position = shape(node.geometry);
    if (position) {
      note.position = position;
    }
  }

  transition(edge: core.Transition): void {
    const typed = ['dData', 'dColor', 'dGeometry'];
    const id = this.edgeId(edge.id, this.sm.transitions);
    const record = (this.sm.transitions[id] = {
      id,
      source: this.id(edge.source),
      target: this.id(edge.target),
      actions: this.initialBehaviour(edge) ?? edge.blocks.map(blockAction),
      unsupportedDataNodes: [] as CGMLDataNode[],
    } as CGMLStateMachine['transitions'][string]);
    if (edge.color !== null) {
      record.color = edge.color;
    }
    if (edge.polyline.length) {
      record.polyline = edge.polyline.map(point);
      record.position = record.polyline[0];
    }
    if (edge.labelGeometry instanceof core.Point) {
      record.labelPosition = point(edge.labelGeometry);
      typed.push('dLabelGeometry');
    }
    if (edge.sourcePoint !== null) {
      record.sourcePoint = point(edge.sourcePoint);
      typed.push('dSourcePoint');
    }
    if (edge.targetPoint !== null) {
      record.targetPoint = point(edge.targetPoint);
      typed.push('dTargetPoint');
    }
    record.unsupportedDataNodes = unsupported(edge.elem, typed);
  }

  // 1.x read the text of a transition from an initial pseudostate as its behaviour: a lone
  // trigger there (no '/', guard or postfix) stays the behaviour in the permissive mode
  initialBehaviour(edge: core.Transition): CGMLTransitionAction[] | null {
    const [block] = edge.blocks;
    if (
      this.strict ||
      !this.initials.has(edge.source) ||
      edge.blocks.length !== 1 ||
      block.kind !== 'event' ||
      block.guard !== null ||
      block.param !== null ||
      block.behaviour.length ||
      !block.trigger ||
      (edge.data ?? '').includes('/')
    ) {
      return null;
    }
    return [{ action: (edge.data ?? '').trim() }];
  }

  link(edge: core.CommentLink): void {
    const links = this.sm.links!;
    const id = this.edgeId(edge.id, links);
    links[id] = {
      id,
      source: this.id(edge.source),
      target: this.id(edge.target),
      unsupportedDataNodes: unsupported(edge.elem, LINK_KEYS),
    };
    if (edge.pivot !== null) {
      links[id].pivot = edge.pivot;
    }
    if (edge.chunk !== null) {
      links[id].chunk = edge.chunk;
    }
  }
}

function keys(document: core.Document): CGMLKeyNode[] {
  return document.keys.map((decl) => {
    const key: CGMLKeyNode = { id: decl.id ?? '', for: decl.forKind ?? '' };
    if (decl.attrName !== null) {
      key['attr.name'] = decl.attrName;
    }
    if (decl.attrType !== null) {
      key['attr.type'] = decl.attrType;
    }
    return key;
  });
}

function meta(document: core.Document): CGMLMeta {
  return {
    id: document.metaId ?? '',
    values: trimmed(document.metaParams),
    unsupportedDataNodes: unsupported(document.metaComment?.elem ?? null, META_KEYS),
  };
}

/**
 * Read a document, standard or Lapki dialect; throw CGMLError when it cannot be read.
 *
 * The strict mode reads the standard alone: any ERROR finding throws.
 */
export function parseCGML(graphml: string, options: CGMLParseOptions = {}): CGMLElements {
  const document = core.read(graphml, { strict: options.strict ?? false });
  const elements: CGMLElements = {
    stateMachines: {},
    format: document.format ?? core.FORMAT_STANDARD,
    keys: keys(document),
    meta: meta(document),
    findings: document.findings as CGMLFinding[],
  };
  document.machines.forEach((machine, index) => {
    elements.stateMachines[machine.id ?? ''] = new MachineReader(
      document,
      machine,
      index === 0,
      options.strict ?? false,
    ).sm;
  });
  return elements;
}

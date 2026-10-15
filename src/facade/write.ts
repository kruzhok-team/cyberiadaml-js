/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * exportGraphml: the 2.0 elements written through the core
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

import { serializeActions } from './actions';
import {
  CGMLAction,
  CGMLDataNode,
  CGMLElements,
  CGMLKeyNode,
  CGMLPoint,
  CGMLRectangle,
  CGMLRegion,
  CGMLState,
  CGMLStateMachine,
  CGMLTextElements,
  CGMLTextState,
  CGMLTextStateMachine,
  CGMLTextTransition,
  CGMLTransition,
  CGMLTransitionAction,
  CGMLVertex,
} from './types';

import * as core from '../core';
import { ERROR, Finding } from '../core/findings';
import { binding, STANDARD_BINDINGS, STANDARD_KEY_IDS, UNTYPED_KEYS } from '../core/keys';
import { AnyNode } from '../core/model';
import { pyFloatRepr } from '../core/util';
import { usedKeys } from '../core/writer';
import { XElement } from '../core/xml';
import { serializeParameters } from '../utils';

const COMPONENT_NAME = 'CGML_COMPONENT';
const META_NAME = 'CGML_META';
const META_ID = 'nMeta';
const PRIVATE_PREFIX = 'dLapki';
const VERTEX_FIELDS: Array<[keyof CGMLStateMachine, string | null]> = [
  ['initialStates', 'initial'],
  ['finals', 'final'],
  ['choices', 'choice'],
  ['terminates', 'terminate'],
  ['shallowHistory', 'shallowHistory'],
  ['deepHistory', 'deepHistory'],
  ['unknownVertexes', null],
];

type AnyMachine = CGMLStateMachine | CGMLTextStateMachine;
type Actions = Array<CGMLAction> | Array<CGMLTransitionAction> | string;
type Container = core.State | core.SubmachineState;

function fail(message: string): never {
  throw new core.CGMLError([new Finding('elements-structure', null, 0, ERROR, message)]);
}

function number(value: number): string {
  const text = pyFloatRepr(value);
  return text.endsWith('.0') ? text.slice(0, -2) : text;
}

function behaviour(actions: Actions): string | null {
  return (typeof actions === 'string' ? actions : serializeActions(actions)) || null;
}

/** A rect when the position has a size (not the -1 x -1 of the 1.x points), a point otherwise. */
function geometry(value: CGMLPoint | CGMLRectangle | undefined): core.Point | core.Rect | null {
  if (value === undefined) {
    return null;
  }
  if ('width' in value && 'height' in value && !(value.width === -1 && value.height === -1)) {
    return new core.Rect(value.x, value.y, value.width, value.height);
  }
  return new core.Point(value.x, value.y);
}

function rectOf(value: CGMLRectangle | undefined): core.Rect | null {
  return value ? new core.Rect(value.x, value.y, value.width, value.height) : null;
}

function pointOf(value: CGMLPoint | undefined): core.Point | null {
  return value ? new core.Point(value.x, value.y) : null;
}

function shapeOf(node: CGMLDataNode): core.Point | core.Rect | null {
  if (node.rect?.length) {
    return rectOf(node.rect[0]);
  }
  return node.point?.length ? pointOf(node.point[0]) : null;
}

/** The data element of an item; a private Lapki point is written as text (D-5). */
function dataElem(node: CGMLDataNode): XElement {
  const elem = new XElement('data', { key: node.key });
  if (node.key.startsWith(PRIVATE_PREFIX) && node.point?.length === 1 && !node.rect?.length) {
    elem.text = `x/ ${number(node.point[0].x)}\n\ny/ ${number(node.point[0].y)}`;
    return elem;
  }
  if (node.content) {
    elem.text = node.content;
  }
  for (const r of node.rect ?? []) {
    elem.append(
      new XElement('rect', {
        x: number(r.x),
        y: number(r.y),
        width: number(r.width),
        height: number(r.height),
      }),
    );
  }
  for (const p of node.point ?? []) {
    elem.append(new XElement('point', { x: number(p.x), y: number(p.y) }));
  }
  return elem;
}

type Item = core.StateMachine | core.Region | AnyNode | core.Transition | core.CommentLink;

/** Map the standard data items onto the core fields; keep the others as extensions. */
function apply(item: Item, nodes: CGMLDataNode[] | undefined): void {
  for (const node of nodes ?? []) {
    const text = node.content;
    switch (node.key) {
      case 'dFormalName':
        if ('formalName' in item) {
          item.formalName = text;
        }
        break;
      case 'dCollapsed':
        if (item instanceof core.State) {
          item.collapsed = true;
        }
        break;
      case 'dMarkup':
        if (item instanceof core.Comment) {
          item.markup = text;
        }
        break;
      case 'dColor':
        if ('color' in item) {
          item.color = text;
        }
        break;
      case 'dGeometry':
        if (item instanceof core.Transition || item instanceof core.CommentLink) {
          item.polyline = (node.point ?? []).map((p) => new core.Point(p.x, p.y));
        } else if ('geometry' in item) {
          item.geometry = shapeOf(node);
        }
        break;
      case 'dLabelGeometry':
        if (item instanceof core.Transition) {
          item.labelGeometry = shapeOf(node);
        }
        break;
      case 'dSourcePoint':
      case 'dTargetPoint':
        if ('sourcePoint' in item) {
          const value = pointOf(node.point?.[0]);
          if (node.key === 'dSourcePoint') {
            item.sourcePoint = value;
          } else {
            item.targetPoint = value;
          }
        }
        break;
      case 'dPivot':
        if (item instanceof core.CommentLink) {
          item.pivot = text;
        }
        break;
      case 'dChunk':
        if (item instanceof core.CommentLink) {
          item.chunk = text;
        }
        break;
      default:
        if (!STANDARD_KEY_IDS.has(node.key)) {
          item.extensions.push(new core.Extension(node.key, text || null, dataElem(node)));
        }
    }
  }
}

function region(value: CGMLRegion): core.Region {
  const result = new core.Region(value.id || null, null, {
    name: value.name ?? null,
    geometry: rectOf(value.geometry),
  });
  apply(result, value.unsupportedDataNodes);
  return result;
}

/** Build one core state machine from a 2.0 state machine. */
class MachineWriter {
  machine: core.StateMachine;
  nodes: Map<string, AnyNode> = new Map();
  order: Array<[AnyNode, string | undefined, string | undefined]> = [];

  constructor(id: string, sm: AnyMachine, meta: core.Comment | null) {
    this.machine = new core.StateMachine(id, null, { name: sm.name ?? null, marker: true });
    if (sm.position) {
      this.machine.geometry = new core.Rect(
        sm.position.x,
        sm.position.y,
        sm.dimensions?.width ?? 0,
        sm.dimensions?.height ?? 0,
      );
    }
    apply(this.machine, sm.unsupportedDataNodes);
    if (meta !== null) {
      this.machine.children.push(meta);
    }
    const components = Object.entries(sm.components).sort(
      ([, a], [, b]) => (a.order ?? Infinity) - (b.order ?? Infinity),
    );
    for (const [nodeId, component] of components) {
      const comment = new core.Comment(nodeId, null, {
        name: `${COMPONENT_NAME} ${component.id}`,
        kind: 'formal',
        body: serializeParameters({ type: component.type, ...component.parameters }),
      });
      apply(comment, component.unsupportedDataNodes);
      this.add(comment, undefined, undefined);
    }
    for (const [stateId, state] of Object.entries(
      sm.states as { [id: string]: CGMLState | CGMLTextState },
    )) {
      const refs = state.unsupportedDataNodes.filter((d) => d.key === 'dSubmachineState');
      const common = {
        name: state.name || null,
        geometry: rectOf(state.bounds),
        color: state.color ?? null,
      };
      const node: Container = refs.length
        ? new core.SubmachineState(stateId, null, { ...common, ref: refs[0].content })
        : new core.State(stateId, null, { ...common, data: behaviour(state.actions) });
      apply(
        node,
        state.unsupportedDataNodes.filter((d) => d.key !== 'dSubmachineState'),
      );
      node.regions = (state.regions ?? []).map(region);
      this.add(node, state.parent, state.region);
    }
    for (const [field, kind] of VERTEX_FIELDS) {
      for (const [vertexId, vertex] of Object.entries(sm[field] as { [id: string]: CGMLVertex })) {
        const node = new core.Vertex(vertexId, null, {
          kind: kind ?? vertex.type,
          name: vertex.name ?? null,
          geometry: geometry(vertex.position),
        });
        apply(node, vertex.unsupportedDataNodes);
        this.add(node, vertex.parent, vertex.region);
      }
    }
    for (const [noteId, note] of Object.entries(sm.notes)) {
      const comment = new core.Comment(noteId, null, {
        name: note.name ?? null,
        geometry: geometry(note.position),
        kind: note.type || 'informal',
        body: note.text,
      });
      apply(comment, note.unsupportedDataNodes);
      this.add(comment, note.parent, note.region);
    }
    this.place();
    for (const transition of Object.values(
      sm.transitions as { [id: string]: CGMLTransition | CGMLTextTransition },
    )) {
      if (transition.pivot !== undefined) {
        this.link(
          transition.id,
          transition.source,
          transition.target,
          transition.pivot,
          undefined,
          transition.unsupportedDataNodes,
        );
        continue;
      }
      const polyline = transition.polyline ?? (transition.position ? [transition.position] : []);
      const edge = new core.Transition(transition.id, null, {
        source: transition.source,
        target: transition.target,
        data: behaviour(transition.actions),
        polyline: polyline.map((p) => new core.Point(p.x, p.y)),
        labelGeometry: pointOf(transition.labelPosition),
        sourcePoint: pointOf(transition.sourcePoint),
        targetPoint: pointOf(transition.targetPoint),
        color: transition.color ?? null,
      });
      apply(edge, transition.unsupportedDataNodes);
      this.machine.transitions.push(edge);
    }
    for (const link of Object.values(sm.links ?? {})) {
      this.link(
        link.id,
        link.source,
        link.target,
        link.pivot,
        link.chunk,
        link.unsupportedDataNodes,
      );
    }
  }

  add(node: AnyNode, parent: string | undefined, regionId: string | undefined): void {
    this.nodes.set(node.id ?? '', node);
    this.order.push([node, parent, regionId]);
  }

  place(): void {
    for (const [node, parent, regionId] of this.order) {
      if (parent === undefined || parent === '') {
        this.machine.children.push(node);
        continue;
      }
      const owner = this.nodes.get(parent);
      if (!(owner instanceof core.State || owner instanceof core.SubmachineState)) {
        fail(`the parent ${parent} of ${node.id} is not a state`);
      }
      let target =
        regionId !== undefined ? owner.regions.find((r) => r.id === regionId) : owner.regions[0];
      if (target === undefined) {
        target = new core.Region(regionId ?? null, null);
        owner.regions.push(target);
      }
      target.children.push(node);
    }
  }

  link(
    id: string,
    source: string,
    target: string,
    pivot: string | undefined,
    chunk: string | undefined,
    data: CGMLDataNode[],
  ): void {
    const link = new core.CommentLink(id, null, {
      source,
      target,
      pivot: pivot ?? null,
      chunk: chunk ?? null,
    });
    apply(link, data);
    this.machine.links.push(link);
  }
}

function* nodesOf(items: AnyNode[]): Generator<AnyNode> {
  for (const item of items) {
    yield item;
    if (item instanceof core.State || item instanceof core.SubmachineState) {
      for (const r of item.regions) {
        yield* nodesOf(r.children);
      }
    }
  }
}

/**
 * Make the per-machine ids unique in the document: a node id repeated in a later machine becomes
 * <machine id>::<id>, a repeated edge id <id>#<N>, as the dialect repairs D-7f and D-7a read them.
 */
function uniqueIds(document: core.Document): void {
  const nodes = new Set<string | null>();
  const edges = new Set<string | null>();
  for (const machine of document.machines) {
    const renamed = new Map<string | null, string>();
    for (const node of nodesOf(machine.children)) {
      if (nodes.has(node.id)) {
        const base = `${machine.id}::${node.id}`;
        let name = base;
        for (let n = 2; nodes.has(name); n++) {
          name = `${base}-${n}`;
        }
        renamed.set(node.id, name);
        node.id = name;
      }
      nodes.add(node.id);
    }
    const renamedEdges = new Map<string | null, string>();
    for (const edge of [...machine.transitions, ...machine.links]) {
      edge.source = renamed.get(edge.source) ?? edge.source;
      edge.target = renamed.get(edge.target) ?? edge.target;
      if (edges.has(edge.id)) {
        let n = 1;
        while (edges.has(`${edge.id}#${n}`)) {
          n += 1;
        }
        renamedEdges.set(edge.id, `${edge.id}#${n}`);
        edge.id = `${edge.id}#${n}`;
      }
      edges.add(edge.id);
    }
    for (const link of machine.links) {
      link.target = renamedEdges.get(link.target) ?? link.target;
    }
  }
}

/** The document metadata: the elements' own, else the first machine's (1.x). */
function metadata(elements: CGMLElements | CGMLTextElements): [string, Array<[string, string]>] {
  const first: AnyMachine | undefined = Object.values(elements.stateMachines)[0];
  let id = elements.meta?.id || first?.meta.id || '';
  let values: { [name: string]: string };
  if (elements.meta && Object.keys(elements.meta.values).length) {
    values = { ...elements.meta.values };
  } else {
    values = { ...(first?.meta.values ?? {}) };
    if (first?.platform && values['platform'] === undefined) {
      values['platform'] = first.platform;
    }
  }
  const version = values['standardVersion'] || first?.standardVersion || '1.0';
  delete values['standardVersion'];
  if (first) {
    const taken = new Set(
      [
        first.states,
        first.components,
        first.notes,
        ...VERTEX_FIELDS.map(([field]) => first[field] as object),
      ].flatMap((records) => Object.keys(records)),
    );
    if (!id || taken.has(id)) {
      id = META_ID;
      for (let n = 2; taken.has(id); n++) {
        id = `${META_ID}-${n}`;
      }
    }
  }
  return [id || META_ID, [['standardVersion', version], ...Object.entries(values)]];
}

/** Appendix B for the standard keys in use, the caller's declarations for the others. */
function declarations(document: core.Document, keys: CGMLKeyNode[]): core.KeyDecl[] {
  const used = usedKeys(document);
  const usedPairs = new Set(used.map(([key, kind]) => binding(key, kind)));
  const result: core.KeyDecl[] = [];
  for (const [pair, name] of STANDARD_BINDINGS) {
    if (usedPairs.has(pair)) {
      const [key, kind] = pair.split('|');
      result.push(new core.KeyDecl(key, kind, name, UNTYPED_KEYS.has(key) ? null : 'string'));
    }
  }
  for (const [key, kind] of used) {
    const own = keys.find((k) => k.id === key && k.for === kind);
    if (!STANDARD_BINDINGS.has(binding(key, kind)) && own !== undefined) {
      const chars = Array.from(key);
      const derived =
        key.startsWith('d') && chars.length > 1
          ? chars[1].toLowerCase() + chars.slice(2).join('')
          : key;
      result.push(
        new core.KeyDecl(key, kind, own['attr.name'] || derived, own['attr.type'] || 'string'),
      );
    }
  }
  return result;
}

function document(elements: CGMLElements | CGMLTextElements): core.Document {
  const result = new core.Document(null, { format: core.FORMAT_STANDARD });
  const machines = Object.entries(elements.stateMachines as { [id: string]: AnyMachine });
  let meta: core.Comment | null = null;
  if (machines.length) {
    const [id, params] = metadata(elements);
    result.metaParams = params.map(([name, value], index) => new core.Param(name, value, index));
    meta = new core.Comment(id, null, {
      name: META_NAME,
      kind: 'formal',
      body: serializeParameters(Object.fromEntries(params)),
    });
    apply(meta, elements.meta?.unsupportedDataNodes);
    result.metaComment = meta;
  }
  machines.forEach(([id, sm], index) => {
    result.machines.push(new MachineWriter(id, sm, index === 0 ? meta : null).machine);
  });
  uniqueIds(result);
  result.keys = declarations(result, elements.keys ?? []);
  return result;
}

/** Write a standard document; throw CGMLError when the elements break a MUST rule. */
export function exportGraphml(elements: CGMLElements): string {
  return core.write(document(elements));
}

/** exportGraphml for the text model: the actions are the behaviour text. */
export function exportTextGraphml(elements: CGMLTextElements): string {
  return core.write(document(elements));
}

/** The canonical dump (validator specification §7) of the elements as written. */
export function dumpCGML(elements: CGMLElements): string {
  return core.dump(core.read(exportGraphml(elements), { strict: true }));
}

/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The Lapki dialect pass: repairs between L1 and L2 (informative)
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

import { WARNING } from './findings';
import * as meta from './meta';
import { Param } from './meta';
import { Context, declare } from './rules';
import { pyFloat, repr } from './util';
import { XElement } from './xml';

export const LAPKI = 'lapki';
export const DIALECTS = [LAPKI];

export const FORMAT_VALUE = 'Cyberiada-GraphML-1.0';
export const FORMAT_LAPKI = 'Cyberiada-GraphML-Lapki';
const OLD_FORMAT = 'Cyberiada-GraphML';
const META_NAME = 'CGML_META';
const COMPONENT_NAME = 'CGML_COMPONENT';
const PRIVATE_PREFIX = 'dLapki';
const LAPKI_HINT = 'lapkiVisual';
const UNDEFINED = 'undefined';
const POINT_KINDS = [
  'initial',
  'final',
  'terminate',
  'shallowHistory',
  'deepHistory',
  'entryPoint',
  'exitPoint',
];
const RECT_KINDS = ['state', 'submachine', 'comment', 'choice'];
const SIZE_OF_POINT = -1.0; // cyberiadaml-js 1.x stores a point as such a rect

declare(
  'lapki-d1',
  'LAPKI-D1',
  0,
  WARNING,
  'one metadata node, at the top of the first state machine',
);
declare(
  'lapki-d2',
  'LAPKI-D2',
  0,
  WARNING,
  'components named CGML_COMPONENT <id>, not linked to the metadata',
);
declare('lapki-d3', 'LAPKI-D3', 0, WARNING, 'a region graph id differs from the node ids');
declare('lapki-d4a', 'LAPKI-D4', 0, WARNING, 'a point node carries no -1 x -1 rect');
declare('lapki-d4b', 'LAPKI-D4', 0, WARNING, 'a rect node carries no point');
declare('lapki-d5a', 'LAPKI-D5', 0, WARNING, 'private Lapki keys are declared');
declare('lapki-d5b', 'LAPKI-D5', 0, WARNING, 'private Lapki keys carry text, not a point');
declare('lapki-d6', 'LAPKI-D6', 0, WARNING, 'gFormat is first and carries the version');
declare('lapki-d7a', 'LAPKI-D7', 0, WARNING, 'edge ids are unique');
declare('lapki-d7b', 'LAPKI-D7', 0, WARNING, 'dNote is the first data key of a comment');
declare('lapki-d7d', 'LAPKI-D7', 0, WARNING, 'dNote is not empty');
declare('lapki-d7e', 'LAPKI-D7', 0, WARNING, 'a state machine graph carries edgedefault');
declare('lapki-d7f', 'LAPKI-D7', 0, WARNING, 'node ids are unique across the state machines');
declare('lapki-d8a', 'LAPKI-D8', 0, WARNING, 'transitionOrder is actionFirst or exitFirst');
declare('lapki-d8b', 'LAPKI-D8', 0, WARNING, 'a state machine has a name');
declare('lapki-d9', 'LAPKI-D9', 0, WARNING, 'top-level graphs are state machines');

const SUFFIX = /^(.*)#(\d+)\n?$/;

/** What the pass leaves for the reader besides the repaired tree. */
export class Result {
  label = FORMAT_VALUE;
  // state machine graph id -> the parameters of its removed metadata node
  machineParams: Map<string | null, Param[]> = new Map();
  extensionGraphs: XElement[] = [];
  // an id given by D-7f or D-7a -> the id as written
  renamed: Map<string, string> = new Map();
  repairs = 0;

  constructor(public dialect: string) {}
}

type Machine = [number, XElement, XElement]; // index, machine graph, metadata node

function datas(elem: XElement): XElement[] {
  return elem.children.filter((child) => child.tag === 'data');
}

function data(elem: XElement, key: string): XElement | null {
  return elem.children.find((child) => child.tag === 'data' && child.get('key') === key) ?? null;
}

function text(elem: XElement | null): string {
  return elem !== null ? elem.text ?? '' : '';
}

function isFormal(node: XElement, name: string): boolean {
  const note = data(node, 'dNote');
  const title = data(node, 'dName');
  return (
    note !== null && title !== null && text(note).trim() === 'formal' && text(title).trim() === name
  );
}

function serialize(params: Param[]): string {
  return params.map((p) => `${p.name}/ ${p.value}`).join('\n\n');
}

function parents(root: XElement): Map<XElement, XElement> {
  const map = new Map<XElement, XElement>();
  for (const parent of root.iter()) {
    for (const child of parent.children) {
      map.set(child, parent);
    }
  }
  return map;
}

function graphs(root: XElement): XElement[] {
  return root.children.filter((child) => child.tag === 'graph');
}

function attr(value: string | null): string {
  return value ?? 'None';
}

function free(base: string, taken: Set<string | null>): string {
  let name = base;
  let number = 2;
  while (taken.has(name)) {
    name = `${base}-${number}`;
    number += 1;
  }
  return name;
}

function repairFormat(ctx: Context, root: XElement): void {
  const elem = root.children.find((c) => c.tag === 'data' && c.get('key') === 'gFormat');
  if (elem === undefined) {
    return;
  }
  if (text(elem).trim() === OLD_FORMAT) {
    ctx.emit(
      'lapki-d6',
      `gFormat ${repr(OLD_FORMAT)} without the version, read as ${FORMAT_VALUE}`,
      elem,
    );
    elem.text = FORMAT_VALUE;
  }
  if (root.children.indexOf(elem) !== 0) {
    ctx.emit('lapki-d6', 'gFormat is not the first child of graphml', elem);
    root.remove(elem);
    root.insert(0, elem);
  }
}

function privateKeys(ctx: Context, root: XElement): void {
  const declared = new Set(root.children.filter((k) => k.tag === 'key').map((k) => k.get('id')));
  const missing = new Map<string, [string, string, XElement]>();
  for (const owner of root.iter()) {
    if (!['graph', 'node', 'edge'].includes(owner.tag)) {
      continue;
    }
    for (const item of datas(owner)) {
      const key = item.get('key') ?? '';
      const index = `${key}|${owner.tag}`;
      if (key.startsWith(PRIVATE_PREFIX) && !declared.has(key) && !missing.has(index)) {
        missing.set(index, [key, owner.tag, item]);
      }
    }
  }
  const keys = root.children.flatMap((c, i) => (c.tag === 'key' ? [i] : []));
  let pos = keys.length ? keys[keys.length - 1] + 1 : 1;
  for (const [key, kind, item] of missing.values()) {
    ctx.emit('lapki-d5a', `private key ${key} for ${kind} used without a declaration`, item);
    const decl = new XElement('key', {
      id: key,
      for: kind,
      'attr.name': 'lapki' + key.slice(PRIVATE_PREFIX.length),
      'attr.type': 'string',
    });
    root.insert(pos, decl);
    ctx.parsed!.inherit(decl, item);
    pos += 1;
  }
}

function privatePoints(ctx: Context, root: XElement): void {
  for (const item of root.iter('data')) {
    const key = item.get('key') ?? '';
    const children = item.children;
    if (!key.startsWith(PRIVATE_PREFIX) || children.length !== 1 || children[0].tag !== 'point') {
      continue;
    }
    const point = children[0];
    ctx.emit('lapki-d5b', `point inside the private key ${key}, kept as text`, item);
    item.remove(point);
    item.text = `x/ ${attr(point.get('x'))}\n\ny/ ${attr(point.get('y'))}`;
  }
}

function functions(ctx: Context, root: XElement, result: Result): void {
  for (const graph of graphs(root)) {
    const keys = datas(graph).map((d) => d.get('key'));
    if (keys.includes('dFunction') && !keys.includes('dStateMachine')) {
      ctx.emit('lapki-d9', `function graph ${repr(graph.get('id'))} is not a state machine`, graph);
      root.remove(graph);
      result.extensionGraphs.push(graph);
    }
  }
}

function regionIds(ctx: Context, root: XElement): void {
  const nodeIds = new Set([...root.iter('node')].map((n) => n.get('id')));
  const taken = new Set([
    ...nodeIds,
    ...[...root.iter('graph')].map((g) => g.get('id')),
    ...[...root.iter('edge')].map((e) => e.get('id')),
  ]);
  for (const node of [...root.iter('node')]) {
    for (const graph of node.children.filter((g) => g.tag === 'graph')) {
      const gid = graph.get('id');
      if (gid === null || !nodeIds.has(gid)) {
        continue;
      }
      const name = free(`${attr(node.get('id'))}::region`, taken);
      ctx.emit(
        'lapki-d3',
        `region graph id ${repr(gid)} equals a node id, read as ${repr(name)}`,
        graph,
      );
      graph.set('id', name);
      taken.add(name);
    }
  }
}

function nodeIds(ctx: Context, root: XElement, result: Result): void {
  const taken = new Set([
    ...[...root.iter('node')].map((n) => n.get('id')),
    ...[...root.iter('graph')].map((g) => g.get('id')),
  ]);
  const seen = new Set<string | null>();
  for (const machine of graphs(root)) {
    const nodes = [...machine.iter('node')];
    const renamed = new Map<string, string>();
    for (const node of nodes) {
      const nid = node.get('id');
      if (nid === null || !seen.has(nid)) {
        continue;
      }
      const name = free(`${attr(machine.get('id'))}::${nid}`, taken);
      ctx.emit(
        'lapki-d7f',
        `node id ${repr(nid)} repeats one of an earlier state machine, read as ${repr(name)}`,
        node,
      );
      node.set('id', name);
      taken.add(name);
      renamed.set(nid, name);
      result.renamed.set(name, nid);
    }
    for (const edge of machine.iter('edge')) {
      for (const end of ['source', 'target']) {
        const value = edge.get(end);
        if (value !== null && renamed.has(value)) {
          edge.set(end, renamed.get(value)!);
        }
      }
    }
    for (const node of nodes) {
      seen.add(node.get('id'));
    }
  }
}

function edgeIds(ctx: Context, root: XElement, result: Result): void {
  const edges = [...root.iter('edge')];
  const taken = new Set(edges.map((e) => e.get('id')));
  const seen = new Set<string>();
  for (const edge of edges) {
    let eid = edge.get('id');
    if (eid === null) {
      continue;
    }
    if (seen.has(eid)) {
      const match = SUFFIX.exec(eid);
      const base = match ? match[1] : eid;
      let number = 1;
      while (taken.has(`${base}#${number}`)) {
        number += 1;
      }
      const name = `${base}#${number}`;
      ctx.emit('lapki-d7a', `duplicate edge id ${repr(eid)}, read as ${repr(name)}`, edge);
      edge.set('id', name);
      taken.add(name);
      result.renamed.set(name, eid);
      eid = name;
    }
    seen.add(eid);
  }
}

function rewriteMeta(ctx: Context, node: XElement): void {
  let item = data(node, 'dData');
  const [params, errors] = meta.parse(text(item));
  if (errors.length) {
    return;
  }
  let changed = false;
  let kept: Param[] = [];
  const names = new Set<string>();
  for (const param of params) {
    const value = param.value.trim();
    if (names.has(param.name)) {
      ctx.emit(
        'lapki-d1',
        `metadata parameter ${param.name} repeated, the first occurrence kept`,
        node,
      );
      changed = true;
      continue;
    }
    names.add(param.name);
    if (value === UNDEFINED) {
      ctx.emit('lapki-d1', `metadata parameter ${param.name}/ ${UNDEFINED} dropped`, node);
      changed = true;
      continue;
    }
    if (param.name === 'transitionOrder' && value === 'transitionFirst') {
      ctx.emit('lapki-d8a', 'transitionOrder/ transitionFirst read as actionFirst', node);
      param.value = 'actionFirst';
      changed = true;
    }
    kept.push(param);
  }
  const version = kept.filter((p) => p.name === 'standardVersion');
  if (!version.length || !version[0].value.trim()) {
    ctx.emit('lapki-d1', 'metadata without a standardVersion value, 1.0 assumed', node);
    kept = kept.filter((p) => p.name !== 'standardVersion');
    kept.unshift(new Param('standardVersion', '1.0', 0));
    changed = true;
  }
  if (!changed) {
    return;
  }
  if (item === null) {
    item = new XElement('data', { key: 'dData' });
    node.append(item);
    ctx.parsed!.inherit(item, node);
  }
  item.text = serialize(kept);
}

function repairMeta(ctx: Context, root: XElement, result: Result): void {
  const machines = graphs(root);
  const parentOf = parents(root);
  const metas: Machine[] = [];
  machines.forEach((machine, index) => {
    for (const node of machine.iter('node')) {
      if (isFormal(node, META_NAME)) {
        metas.push([index, machine, node]);
      }
    }
  });
  for (const [, , node] of metas) {
    const [params] = meta.parse(text(data(node, 'dData')));
    if (params.some((p) => p.name === LAPKI_HINT)) {
      result.label = FORMAT_LAPKI;
    }
  }
  // the older component attachment: edges from a metadata node, which may sit in another machine
  const metaIds = new Set(metas.map(([, , node]) => node.get('id')));
  for (const machine of machines) {
    for (const edge of machine.children.filter((e) => e.tag === 'edge')) {
      if (metaIds.has(edge.get('source'))) {
        ctx.emit(
          'lapki-d2',
          `edge ${repr(edge.get('id'))} links the metadata to ${repr(edge.get('target'))}`,
          edge,
        );
        machine.remove(edge);
      }
    }
  }
  if (!metas.length) {
    return;
  }
  const top = metas.filter((m) => m[0] === 0 && parentOf.get(m[2]) === machines[0]);
  const kept = top.length ? top[0] : metas[0];
  for (const item of metas) {
    if (item === kept) {
      continue;
    }
    const [, machine, node] = item;
    const [params] = meta.parse(text(data(node, 'dData')));
    result.machineParams.set(
      machine.get('id'),
      params.filter((p) => p.value.trim() !== UNDEFINED),
    );
    ctx.emit(
      'lapki-d1',
      `metadata node ${repr(node.get('id'))} in the state machine ${repr(machine.get('id'))}, ` +
        'its parameters kept for that machine',
      node,
    );
    parentOf.get(node)!.remove(node);
    for (const edge of machine.children.filter((e) => e.tag === 'edge')) {
      if (node.get('id') === edge.get('source') || node.get('id') === edge.get('target')) {
        machine.remove(edge);
      }
    }
  }
  const node = kept[2];
  if (parentOf.get(node) !== machines[0]) {
    ctx.emit(
      'lapki-d1',
      `metadata node ${repr(node.get('id'))} moved to the first state machine`,
      node,
    );
    parentOf.get(node)!.remove(node);
    const first = machines[0];
    first.insert(datas(first).length, node);
  }
  rewriteMeta(ctx, node);
}

function components(ctx: Context, root: XElement): void {
  for (const node of root.iter('node')) {
    if (!isFormal(node, COMPONENT_NAME)) {
      continue;
    }
    const item = data(node, 'dData');
    const [params, errors] = meta.parse(text(item));
    const ids = params.filter((p) => p.name === 'id');
    if (errors.length || !ids.length) {
      continue;
    }
    const cid = ids[0].value.trim();
    ctx.emit(
      'lapki-d2',
      `component comment ${repr(node.get('id'))} named ${COMPONENT_NAME} with the id in its body`,
      node,
    );
    data(node, 'dName')!.text = `${COMPONENT_NAME} ${cid}`;
    item!.text = serialize(params.filter((p) => p.name !== 'id'));
  }
}

function nodeKind(keys: Array<string | null>, node: XElement): string {
  if (keys.includes('dNote')) {
    return 'comment';
  }
  if (keys.includes('dVertex')) {
    return text(data(node, 'dVertex')).trim();
  }
  if (keys.includes('dSubmachineState')) {
    return 'submachine';
  }
  return 'state';
}

function shapeAttrs(shape: XElement, names: string[]): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const name of names) {
    const value = shape.get(name);
    if (value !== null) {
      attrs[name] = value;
    }
  }
  return attrs;
}

function repairGeometry(ctx: Context, node: XElement, kind: string): void {
  const geometry = data(node, 'dGeometry');
  const shapes = geometry !== null ? geometry.children : [];
  if (shapes.length !== 1) {
    return;
  }
  const shape = shapes[0];
  if (
    POINT_KINDS.includes(kind) &&
    shape.tag === 'rect' &&
    pyFloat(shape.get('width')) === SIZE_OF_POINT &&
    pyFloat(shape.get('height')) === SIZE_OF_POINT
  ) {
    ctx.emit(
      'lapki-d4a',
      `-1 x -1 rect on the ${kind} node ${repr(node.get('id'))}, read as a point`,
      shape,
    );
    const point = new XElement('point', shapeAttrs(shape, ['x', 'y']));
    geometry!.remove(shape);
    geometry!.append(point);
    ctx.parsed!.inherit(point, shape);
  } else if (RECT_KINDS.includes(kind) && shape.tag === 'point') {
    ctx.emit(
      'lapki-d4b',
      `point on the ${kind} node ${repr(node.get('id'))}, read as a loose rect`,
      shape,
    );
    const rect = new XElement('rect', {
      ...shapeAttrs(shape, ['x', 'y']),
      width: '0',
      height: '0',
    });
    geometry!.remove(shape);
    geometry!.append(rect);
    ctx.parsed!.inherit(rect, shape);
  }
}

function nodes(ctx: Context, root: XElement): void {
  for (const node of root.iter('node')) {
    const keys = datas(node).map((d) => d.get('key'));
    const note = data(node, 'dNote');
    if (note !== null && !text(note).trim()) {
      ctx.emit('lapki-d7d', `empty dNote on ${repr(node.get('id'))}, read as informal`, note);
      note.text = 'informal';
    }
    if (note !== null && keys[0] !== 'dNote') {
      ctx.emit('lapki-d7b', `dNote is not the first data key of ${repr(node.get('id'))}`, note);
      node.remove(note);
      node.insert(0, note);
    }
    repairGeometry(ctx, node, nodeKind(keys, node));
  }
}

function machinesPass(ctx: Context, root: XElement): void {
  for (const graph of graphs(root)) {
    if (graph.get('edgedefault') === null) {
      ctx.emit(
        'lapki-d7e',
        `state machine graph ${repr(graph.get('id'))} without edgedefault, read as directed`,
        graph,
      );
      graph.set('edgedefault', 'directed');
    }
    let name = data(graph, 'dName');
    if (name !== null && text(name).trim()) {
      continue;
    }
    ctx.emit(
      'lapki-d8b',
      `state machine ${repr(graph.get('id'))} without a name, named by its id`,
      graph,
    );
    if (name === null) {
      name = new XElement('data', { key: 'dName' });
      const marker = data(graph, 'dStateMachine');
      graph.insert(marker !== null ? graph.children.indexOf(marker) + 1 : 0, name);
      ctx.parsed!.inherit(name, graph);
    }
    name.text = graph.get('id');
  }
}

/** Repair the parsed tree of ctx in place; return the Result. */
export function apply(ctx: Context, dialect: string = LAPKI): Result {
  if (!DIALECTS.includes(dialect)) {
    throw new Error(`unknown dialect: ${dialect}`);
  }
  const result = new Result(dialect);
  const root = ctx.parsed!.root;
  if (root.tag !== 'graphml') {
    return result;
  }
  const before = ctx.report.findings.length;
  repairFormat(ctx, root);
  privateKeys(ctx, root);
  privatePoints(ctx, root);
  functions(ctx, root, result);
  repairMeta(ctx, root, result);
  components(ctx, root);
  nodeIds(ctx, root, result);
  regionIds(ctx, root);
  edgeIds(ctx, root, result);
  nodes(ctx, root);
  machinesPass(ctx, root);
  result.repairs = ctx.report.findings.length - before;
  if (result.repairs) {
    result.label = FORMAT_LAPKI;
  }
  return result;
}

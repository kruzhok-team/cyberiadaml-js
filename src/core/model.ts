/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The document model built from an L2-clean element tree
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

import * as actions from './actions';
import { Block } from './actions';
import * as meta from './meta';
import { Param } from './meta';
import { pyFloat } from './util';
import { XElement } from './xml';

export const META_NAME = 'CGML_META';
export const COMPONENT_NAME = 'CGML_COMPONENT';

export const GEOMETRY_MODES = ['none', 'short', 'full'];

/** A point geometry. */
export class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

/** A rect geometry. */
export class Rect {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
  ) {}
}

export type Geometry = Point | Rect | null;

/** A key declaration of the document. */
export class KeyDecl {
  constructor(
    public id: string | null,
    public forKind: string | null,
    public attrName: string | null,
    public attrType: string | null,
    public elem: XElement | null = null,
  ) {}
}

/** A data item of a non-standard key, kept as read. */
export class Extension {
  constructor(
    public key: string | null,
    public text: string | null,
    public elem: XElement | null = null,
  ) {}
}

/** The common part of the graph nodes. */
export class Node {
  name: string | null = null;
  formalName: string | null = null;
  geometry: Geometry = null;
  color: string | null = null;
  parent: unknown = null;
  line: number | null = null;
  extensions: Extension[] = [];

  constructor(
    public id: string | null,
    public elem: XElement | null,
    init: Partial<Node> = {},
  ) {
    Object.assign(this, init);
  }
}

/** A simple or composite state. */
export class State extends Node {
  blocks: Block[] = [];
  blockErrors: actions.ActionError[] = [];
  data: string | null = null;
  regions: Region[] = [];
  collapsed = false;

  constructor(id: string | null, elem: XElement | null, init: Partial<State> = {}) {
    super(id, elem);
    Object.assign(this, init);
  }
}

/** A pseudostate or a final state. */
export class Vertex extends Node {
  kind: string | null = null;

  constructor(id: string | null, elem: XElement | null, init: Partial<Vertex> = {}) {
    super(id, elem);
    Object.assign(this, init);
  }
}

/** A formal or informal comment. */
export class Comment extends Node {
  kind: string | null = null; // informal | formal
  body: string | null = null;
  markup: string | null = null;

  constructor(id: string | null, elem: XElement | null, init: Partial<Comment> = {}) {
    super(id, elem);
    Object.assign(this, init);
  }

  /** [id, type, params] of a component comment, or null. */
  component(): [string, string | null, Param[]] | null {
    const name = (this.name ?? '').trim();
    if ((this.kind ?? '').trim() !== 'formal' || !name.startsWith(COMPONENT_NAME + ' ')) {
      return null;
    }
    const [params] = meta.parse(this.body);
    const types = params.filter((p) => p.name === 'type').map((p) => p.value.trim());
    return [
      name.slice(COMPONENT_NAME.length + 1).trim(),
      types.length ? types[0] : null,
      params.filter((p) => p.name !== 'type'),
    ];
  }
}

/** A state with a nested state machine. */
export class SubmachineState extends Node {
  ref: string | null = null;
  regions: Region[] = [];

  constructor(id: string | null, elem: XElement | null, init: Partial<SubmachineState> = {}) {
    super(id, elem);
    Object.assign(this, init);
  }
}

export type AnyNode = State | Vertex | Comment | SubmachineState;

/** A region of a composite state. */
export class Region {
  name: string | null = null;
  formalName: string | null = null;
  geometry: Geometry = null;
  children: AnyNode[] = [];
  parent: unknown = null;
  line: number | null = null;
  extensions: Extension[] = [];

  constructor(
    public id: string | null,
    public elem: XElement | null,
    init: Partial<Region> = {},
  ) {
    Object.assign(this, init);
  }
}

/** A transition edge. */
export class Transition {
  source: string | null = null;
  target: string | null = null;
  blocks: Block[] = [];
  blockErrors: actions.ActionError[] = [];
  data: string | null = null;
  polyline: Point[] = [];
  sourcePoint: Point | null = null;
  targetPoint: Point | null = null;
  labelGeometry: Geometry = null;
  color: string | null = null;
  parent: unknown = null;
  line: number | null = null;
  extensions: Extension[] = [];

  constructor(
    public id: string | null,
    public elem: XElement | null,
    init: Partial<Transition> = {},
  ) {
    Object.assign(this, init);
  }
}

/** A link edge of a comment to its subject. */
export class CommentLink {
  source: string | null = null;
  target: string | null = null;
  pivot: string | null = null;
  chunk: string | null = null;
  polyline: Point[] = [];
  sourcePoint: Point | null = null;
  targetPoint: Point | null = null;
  parent: unknown = null;
  line: number | null = null;
  extensions: Extension[] = [];

  constructor(
    public id: string | null,
    public elem: XElement | null,
    init: Partial<CommentLink> = {},
  ) {
    Object.assign(this, init);
  }
}

/** A top-level state machine graph. */
export class StateMachine {
  name: string | null = null;
  formalName: string | null = null;
  geometry: Geometry = null;
  marker = false; // dStateMachine key present
  children: AnyNode[] = [];
  transitions: Transition[] = [];
  links: CommentLink[] = [];
  // the parameters of a removed per-machine metadata node (dialect D-1)
  params: Param[] = [];
  line: number | null = null;
  extensions: Extension[] = [];

  constructor(
    public id: string | null,
    public elem: XElement | null,
    init: Partial<StateMachine> = {},
  ) {
    Object.assign(this, init);
  }
}

/** The document model. */
export class Document {
  format: string | null = null;
  formatElem: XElement | null = null;
  keys: KeyDecl[] = [];
  machines: StateMachine[] = [];
  metaComment: Comment | null = null;
  metaParams: Param[] = [];
  metaErrors: Array<[number, string]> = [];
  geometryMode = 'none';
  // the reader's additions: the format label, the findings, the top-level graphs the dialect
  // pass took out (D-9) and the ids it gave (D-7f, D-7a) -> the ids as written
  label = 'Cyberiada-GraphML-1.0';
  findings: import('./findings').Finding[] = [];
  extensionGraphs: XElement[] = [];
  originalIds: Map<string, string> = new Map();

  constructor(
    public root: XElement | null,
    init: Partial<Document> = {},
  ) {
    Object.assign(this, init);
  }

  /** The id of the metadata node, or null. */
  get metaId(): string | null {
    return this.metaComment ? this.metaComment.id : null;
  }

  /** The value of a metadata parameter, or null. */
  param(name: string): string | null {
    for (const par of this.metaParams) {
      if (par.name === name) {
        return par.value;
      }
    }
    return null;
  }

  transitionOrder(): string {
    return this.param('transitionOrder') || 'actionFirst';
  }

  eventPropagation(): string {
    return this.param('eventPropagation') || 'block';
  }

  markupLanguage(): string {
    return this.param('markupLanguage') || 'plain';
  }
}

/** The ordered [key, data element] pairs of an element. */
export function dataItems(elem: XElement): Array<[string | null, XElement]> {
  return elem.children.filter((d) => d.tag === 'data').map((d) => [d.get('key'), d]);
}

/** All [kind, element] pairs of the graphs, nodes and edges of the tree. */
export function* iterElements(root: XElement): Generator<[string, XElement]> {
  function* walkGraph(graph: XElement): Generator<[string, XElement]> {
    yield ['graph', graph];
    for (const child of graph.children) {
      if (child.tag === 'node') {
        yield* walkNode(child);
      } else if (child.tag === 'edge') {
        yield ['edge', child];
      }
    }
  }

  function* walkNode(node: XElement): Generator<[string, XElement]> {
    yield ['node', node];
    for (const child of node.children) {
      if (child.tag === 'graph') {
        yield* walkGraph(child);
      }
    }
  }

  for (const child of root.children) {
    if (child.tag === 'graph') {
      yield* walkGraph(child);
    }
  }
}

function regionsOf(node: AnyNode): Region[] {
  return node instanceof State || node instanceof SubmachineState ? node.regions : [];
}

/** All node model objects of a state machine, region children included. */
export function* iterMachineNodes(machine: StateMachine): Generator<AnyNode> {
  function* walk(children: AnyNode[]): Generator<AnyNode> {
    for (const child of children) {
      yield child;
      for (const region of regionsOf(child)) {
        yield* walk(region.children);
      }
    }
  }
  yield* walk(machine.children);
}

/** All node model objects of the document, region children included. */
export function* iterNodes(document: Document): Generator<AnyNode> {
  for (const machine of document.machines) {
    yield* iterMachineNodes(machine);
  }
}

/** All region model objects of the document. */
export function* iterRegions(document: Document): Generator<Region> {
  function* walk(children: AnyNode[]): Generator<Region> {
    for (const child of children) {
      for (const region of regionsOf(child)) {
        yield region;
        yield* walk(region.children);
      }
    }
  }
  for (const machine of document.machines) {
    yield* walk(machine.children);
  }
}

/** The text of the first data tag with the key, or null. */
export function dataValue(elem: XElement, key: string): string | null {
  for (const [name, data] of dataItems(elem)) {
    if (name === key) {
      return data.text || '';
    }
  }
  return null;
}

function dataElem(elem: XElement, key: string): XElement | null {
  for (const [name, data] of dataItems(elem)) {
    if (name === key) {
      return data;
    }
  }
  return null;
}

function number(value: string | null): number {
  return pyFloat(value) ?? 0.0;
}

function geometryObject(child: XElement): Point | Rect | null {
  if (child.tag === 'rect') {
    return new Rect(
      number(child.get('x')),
      number(child.get('y')),
      number(child.get('width')),
      number(child.get('height')),
    );
  }
  if (child.tag === 'point') {
    return new Point(number(child.get('x')), number(child.get('y')));
  }
  return null;
}

function geometry(elem: XElement, key = 'dGeometry'): Geometry {
  const data = dataElem(elem, key);
  if (data === null) {
    return null;
  }
  for (const child of data.children) {
    const obj = geometryObject(child);
    if (obj !== null) {
      return obj;
    }
  }
  return null;
}

function points(elem: XElement, key: string): Point[] {
  const data = dataElem(elem, key);
  if (data === null) {
    return [];
  }
  return data.children.filter((c) => c.tag === 'point').map((c) => geometryObject(c) as Point);
}

function nodeCommon(node: XElement): Partial<Node> {
  return {
    name: dataValue(node, 'dName'),
    formalName: dataValue(node, 'dFormalName'),
    geometry: geometry(node),
    color: dataValue(node, 'dColor'),
  };
}

function buildRegion(graph: XElement): Region {
  const region = new Region(graph.get('id'), graph, {
    name: dataValue(graph, 'dName'),
    formalName: dataValue(graph, 'dFormalName'),
    geometry: geometry(graph),
  });
  region.children = graph.children.filter((n) => n.tag === 'node').map(buildNode);
  return region;
}

function buildNode(node: XElement): AnyNode {
  const keys = dataItems(node).map(([k]) => k);
  const regions = node.children.filter((g) => g.tag === 'graph').map(buildRegion);
  const id = node.get('id');
  if (keys.includes('dNote')) {
    return new Comment(id, node, {
      ...nodeCommon(node),
      kind: dataValue(node, 'dNote'),
      body: dataValue(node, 'dData'),
      markup: dataValue(node, 'dMarkup'),
    });
  }
  if (keys.includes('dVertex')) {
    return new Vertex(id, node, { ...nodeCommon(node), kind: dataValue(node, 'dVertex') });
  }
  if (keys.includes('dSubmachineState')) {
    return new SubmachineState(id, node, {
      ...nodeCommon(node),
      ref: dataValue(node, 'dSubmachineState'),
      regions,
    });
  }
  const text = dataValue(node, 'dData');
  const [blocks, errors] = actions.parse(text);
  return new State(id, node, {
    ...nodeCommon(node),
    blocks,
    blockErrors: errors,
    data: text,
    regions,
    collapsed: dataValue(node, 'dCollapsed') !== null,
  });
}

function buildEdge(edge: XElement): Transition | CommentLink {
  const items = dataItems(edge);
  const sourcePoints = points(edge, 'dSourcePoint');
  const targetPoints = points(edge, 'dTargetPoint');
  const common = {
    source: edge.get('source'),
    target: edge.get('target'),
    polyline: points(edge, 'dGeometry'),
    sourcePoint: sourcePoints.length ? sourcePoints[0] : null,
    targetPoint: targetPoints.length ? targetPoints[0] : null,
  };
  if (items.length && items[0][0] === 'dPivot') {
    return new CommentLink(edge.get('id'), edge, {
      ...common,
      pivot: dataValue(edge, 'dPivot'),
      chunk: dataValue(edge, 'dChunk'),
    });
  }
  const text = dataValue(edge, 'dData');
  const [blocks, errors] = actions.parse(text, true);
  return new Transition(edge.get('id'), edge, {
    ...common,
    blocks,
    blockErrors: errors,
    data: text,
    labelGeometry: geometry(edge, 'dLabelGeometry'),
    color: dataValue(edge, 'dColor'),
  });
}

function buildMachine(graph: XElement): StateMachine {
  const machine = new StateMachine(graph.get('id'), graph, {
    name: dataValue(graph, 'dName'),
    formalName: dataValue(graph, 'dFormalName'),
    geometry: geometry(graph),
    marker: dataValue(graph, 'dStateMachine') !== null,
  });
  for (const child of graph.children) {
    if (child.tag === 'node') {
      machine.children.push(buildNode(child));
    } else if (child.tag === 'edge') {
      const built = buildEdge(child);
      if (built instanceof CommentLink) {
        machine.links.push(built);
      } else {
        machine.transitions.push(built);
      }
    }
  }
  return machine;
}

function findMeta(document: Document): void {
  if (!document.machines.length) {
    return;
  }
  for (const child of document.machines[0].children) {
    if (child instanceof Comment && child.kind === 'formal' && child.name === META_NAME) {
      document.metaComment = child;
      [document.metaParams, document.metaErrors] = meta.parse(child.body);
      return;
    }
  }
}

/** Build the document model from the parsed L2-clean tree. */
export function build(root: XElement): Document {
  const document = new Document(root);
  for (const child of root.children) {
    if (child.tag === 'data' && child.get('key') === 'gFormat') {
      if (document.formatElem === null) {
        document.format = child.text || '';
        document.formatElem = child;
      }
    } else if (child.tag === 'key') {
      document.keys.push(
        new KeyDecl(
          child.get('id'),
          child.get('for'),
          child.get('attr.name'),
          child.get('attr.type'),
          child,
        ),
      );
    } else if (child.tag === 'graph') {
      document.machines.push(buildMachine(child));
    }
  }
  findMeta(document);
  const mode = document.param('geometry');
  document.geometryMode = mode !== null && GEOMETRY_MODES.includes(mode) ? mode : 'none';
  return document;
}

/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L2 layer: the admissible tag tree of the testing specification 2.8.1
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
import { STANDARD_KEY_IDS } from './keys';
import { Context, declare } from './rules';
import { pyFloat, repr } from './util';
import { XElement } from './xml';

export const GRAPHML_NS = 'http://graphml.graphdrawing.org/xmlns';

declare(
  'root-graphml',
  'CGML-5.1-2',
  2,
  ERROR,
  'the root tag is graphml with the GraphML namespace',
);
declare('extra-namespaces', 'CGML-5.1-3', 2, INFO, 'additional namespace attributes are tolerated');
declare(
  'gformat-first',
  'CGML-5.4-1',
  2,
  ERROR,
  'the gFormat data tag is the first child of graphml',
);
declare('key-placement', 'CGML-5.5-1', 2, ERROR, 'key declarations precede the graph structure');
declare('graph-in-graph', 'CGML-5.6-3', 2, ERROR, 'subgraphs nest only inside nodes', null, [
  'CGML-6.1-6',
]);
declare(
  'graph-child-order',
  'CGML-5.6-3',
  2,
  ERROR,
  'graph children are ordered keys, nodes, edges',
);
declare('node-placement', 'CGML-5.7-2', 2, ERROR, 'nodes appear only inside graphs');
declare(
  'node-content',
  'CGML-5.7-3',
  2,
  INFO,
  'nodes contain data keys and nested graphs',
  'admissible content is accepted by the walker',
);
declare(
  'edge-block',
  'CGML-5.8-3',
  2,
  WARNING,
  'edges form a single block at the end of the graph',
);
declare(
  'sm-first-key',
  'CGML-6.1-1',
  2,
  ERROR,
  'dStateMachine is the first key of a state machine graph',
);
declare(
  'sm-child-order',
  'CGML-6.1-4',
  2,
  ERROR,
  'state machine children are ordered keys, nodes, edges',
);
declare('node-marker', 'CGML-5.7-4', 2, ERROR, 'a node carries at most one marker key');
declare('vertex-first-key', 'CGML-6.4-1', 2, ERROR, 'dVertex is the first key of a vertex node');
declare(
  'submachine-first-key',
  'CGML-8.1-1',
  2,
  ERROR,
  'dSubmachineState is the first key of a submachine state node',
);
declare(
  'submachine-subgraph',
  'CGML-8.1-2',
  2,
  ERROR,
  'a submachine subgraph holds entry/exit points only, without keys',
);
declare('submachine-no-data', 'CGML-8.1-3', 2, ERROR, 'a submachine state carries no dData');
declare(
  'region-marker-required',
  'CGML-6.5-5',
  2,
  ERROR,
  'each of two or more regions starts with the dRegion key',
);
declare(
  'composite-children',
  'CGML-6.5-1',
  2,
  ERROR,
  'composite state children live in region subgraphs',
);
declare(
  'region-no-edges',
  'CGML-6.5-8',
  2,
  ERROR,
  'child transitions are placed at the top level, not in regions',
);
declare('note-first-key', 'CGML-6.6-1', 2, ERROR, 'dNote is the first key of a comment node');
declare(
  'pivot-first-key',
  'CGML-6.7-1',
  2,
  ERROR,
  'dPivot is the first key of a comment link edge',
);
declare(
  'geometry-shape',
  'CGML-7.2-2',
  2,
  ERROR,
  'rect and point tags carry their numeric attributes',
);
declare('tag-tree', 'CGML-appendix-A-1', 2, ERROR, 'tag placement follows the admissible tag tree');
declare(
  'key-usage',
  'CGML-appendix-A-1',
  2,
  ERROR,
  'data keys appear on their admissible element kinds',
  null,
  ['CGML-9.2-4'],
);

export const GRAPH_KEYS = ['dStateMachine', 'dName', 'dGeometry', 'dFormalName'];
export const REGION_KEYS = ['dRegion', 'dName', 'dGeometry', 'dFormalName'];
export const NODE_KEYS = [
  'dNote',
  'dSubmachineState',
  'dVertex',
  'dName',
  'dGeometry',
  'dData',
  'dFormalName',
  'dCollapsed',
  'dColor',
  'dMarkup',
];
export const EDGE_KEYS = [
  'dPivot',
  'dChunk',
  'dData',
  'dLabelGeometry',
  'dGeometry',
  'dSourcePoint',
  'dTargetPoint',
  'dColor',
];

// (carrier kind, key) -> [admissible sub-tags, min count, max count]
const GEOMETRY_CONTENT: Map<string, [string[], number, number | null]> = new Map([
  ['graph|dGeometry', [['rect'], 1, 1]],
  ['node|dGeometry', [['point', 'rect'], 1, 1]],
  ['edge|dGeometry', [['point'], 1, null]],
  ['edge|dLabelGeometry', [['point', 'rect'], 1, 1]],
  ['edge|dSourcePoint', [['point'], 1, 1]],
  ['edge|dTargetPoint', [['point'], 1, 1]],
]);

const MARKER_KEYS = ['dNote', 'dVertex', 'dSubmachineState'];
const ENTRY_EXIT = ['entryPoint', 'exitPoint'];
const RECT_ATTRS = ['x', 'y', 'width', 'height'];
const POINT_ATTRS = ['x', 'y'];

function text(value: string | null): string {
  return value === null ? 'None' : value;
}

function isStandard(key: string | null): boolean {
  return key !== null && STANDARD_KEY_IDS.has(key);
}

function checkGeometryElement(ctx: Context, elem: XElement): void {
  const attrs = elem.tag === 'rect' ? RECT_ATTRS : POINT_ATTRS;
  for (const name of attrs) {
    const value = elem.get(name);
    if (value === null) {
      ctx.emit('geometry-shape', `${elem.tag} tag misses the ${name} attribute`, elem);
    } else if (pyFloat(value) === null) {
      ctx.emit(
        'geometry-shape',
        `${elem.tag} attribute ${name} is not a number: ${repr(value)}`,
        elem,
      );
    }
  }
}

/** Check the sub-tags of one data element of a graph/node/edge. */
function checkDataContent(ctx: Context, kind: string, data: XElement): void {
  const key = data.get('key');
  const content = GEOMETRY_CONTENT.get(`${kind}|${key}`);
  if (content === undefined) {
    for (const child of data.children) {
      ctx.emit(
        'tag-tree',
        `tag ${child.tag} is not admissible inside data key ${text(key)}`,
        child,
      );
    }
    return;
  }
  const [tags, low, high] = content;
  let count = 0;
  for (const child of data.children) {
    if (!tags.includes(child.tag)) {
      ctx.emit(
        'tag-tree',
        `tag ${child.tag} is not admissible inside data key ${text(key)} (expected ${tags.join(' or ')})`,
        child,
      );
      continue;
    }
    count += 1;
    checkGeometryElement(ctx, child);
  }
  if (count < low || (high !== null && count > high)) {
    ctx.emit(
      'geometry-shape',
      `data key ${text(key)} must contain ${high === low ? low : `at least ${low}`} ` +
        `${tags.join(' or ')} tag(s), found ${count}`,
      data,
    );
  }
}

/** Check that the marker key, when present, is the first data key. */
function firstKeyCheck(ctx: Context, ruleName: string, marker: string, datas: XElement[]): void {
  const keys = datas.map((d) => d.get('key'));
  if (keys.includes(marker) && keys[0] !== marker) {
    ctx.emit(
      ruleName,
      `${marker} is not the first data key (found after ${text(keys[0])})`,
      datas[0],
    );
  }
}

function checkEdge(ctx: Context, edge: XElement): void {
  const datas: XElement[] = [];
  for (const child of edge.children) {
    if (child.tag === 'data') {
      datas.push(child);
      const key = child.get('key');
      if (isStandard(key) && !EDGE_KEYS.includes(key!)) {
        ctx.emit('key-usage', `data key ${key} is not admissible on an edge`, child);
      }
      checkDataContent(ctx, 'edge', child);
    } else {
      ctx.emit('tag-tree', `tag ${child.tag} is not admissible inside an edge`, child);
    }
  }
  if (datas.length) {
    firstKeyCheck(ctx, 'pivot-first-key', 'dPivot', datas);
  }
}

/** 8.1-2: no data keys, only entry/exit point vertex nodes. */
function checkSubmachineSubgraph(ctx: Context, graph: XElement): void {
  for (const child of graph.children) {
    if (child.tag === 'data') {
      ctx.emit(
        'submachine-subgraph',
        `data key ${text(child.get('key'))} inside a submachine subgraph`,
        child,
      );
    } else if (child.tag === 'node') {
      const keys = child.children
        .filter((d) => d.tag === 'data')
        .map((d): [string | null, string] => [d.get('key'), (d.text ?? '').trim()]);
      if (!keys.length || keys[0][0] !== 'dVertex' || !ENTRY_EXIT.includes(keys[0][1])) {
        ctx.emit(
          'submachine-subgraph',
          `node ${repr(child.get('id'))} inside a submachine subgraph is not an entry or exit point`,
          child,
        );
      }
    }
  }
}

function checkNode(ctx: Context, node: XElement): void {
  const datas: XElement[] = [];
  const graphs: XElement[] = [];
  let seenGraph = false;
  for (const child of node.children) {
    if (child.tag === 'data') {
      if (seenGraph) {
        ctx.emit('tag-tree', 'data key after a region subgraph inside a node', child);
      }
      datas.push(child);
      const key = child.get('key');
      if (isStandard(key) && !NODE_KEYS.includes(key!)) {
        ctx.emit('key-usage', `data key ${key} is not admissible on a node`, child);
      }
      checkDataContent(ctx, 'node', child);
    } else if (child.tag === 'graph') {
      seenGraph = true;
      graphs.push(child);
      checkGraph(ctx, child, 'region');
    } else if (child.tag === 'node') {
      ctx.emit(
        'composite-children',
        'node nested directly inside a node; children live in region subgraphs',
        child,
      );
    } else {
      ctx.emit('tag-tree', `tag ${child.tag} is not admissible inside a node`, child);
    }
  }
  const keys = datas.map((d) => d.get('key'));
  const markers = keys.filter((k): k is string => k !== null && MARKER_KEYS.includes(k));
  if (markers.length > 1) {
    ctx.emit(
      'node-marker',
      `node carries the marker keys ${markers.join(' and ')}`,
      datas[keys.indexOf(markers[1])],
    );
  }
  if (datas.length) {
    firstKeyCheck(ctx, 'vertex-first-key', 'dVertex', datas);
    firstKeyCheck(ctx, 'note-first-key', 'dNote', datas);
    firstKeyCheck(ctx, 'submachine-first-key', 'dSubmachineState', datas);
  }
  if (keys.includes('dSubmachineState')) {
    if (keys.includes('dData')) {
      ctx.emit(
        'submachine-no-data',
        'submachine state carries a dData key',
        datas[keys.indexOf('dData')],
      );
    }
    if (graphs.length > 1) {
      ctx.emit(
        'submachine-subgraph',
        `submachine state with ${graphs.length} subgraphs; at most one holds the entry/exit points`,
        graphs[1],
      );
    }
    for (const graph of graphs) {
      checkSubmachineSubgraph(ctx, graph);
    }
  } else if (graphs.length > 1) {
    for (const graph of graphs) {
      const first = graph.children.filter((d) => d.tag === 'data').map((d) => d.get('key'))[0];
      if (first !== 'dRegion') {
        ctx.emit(
          'region-marker-required',
          `region ${repr(graph.get('id'))} of a state with ${graphs.length} regions does not ` +
            'start with the dRegion key',
          graph,
        );
      }
    }
  }
}

/** Walk one graph: kind is 'sm' (top level) or 'region' (inside a node). */
function checkGraph(ctx: Context, graph: XElement, kind: string): void {
  const allowed = kind === 'sm' ? GRAPH_KEYS : REGION_KEYS;
  const orderRule = kind === 'sm' ? 'sm-child-order' : 'graph-child-order';
  const datas: XElement[] = [];
  let phase = 'data';
  for (const child of graph.children) {
    if (child.tag === 'data') {
      if (phase !== 'data') {
        ctx.emit(orderRule, 'data key after the first node of the graph', child);
      } else {
        datas.push(child);
      }
      const key = child.get('key');
      if (isStandard(key) && !allowed.includes(key!)) {
        ctx.emit(
          'key-usage',
          `data key ${key} is not admissible on a ${kind === 'sm' ? 'state machine' : 'region'} graph`,
          child,
        );
      }
      checkDataContent(ctx, 'graph', child);
    } else if (child.tag === 'node') {
      if (phase === 'edge') {
        ctx.emit(
          'edge-block',
          'node after an edge; edges must form a single trailing block',
          child,
        );
      }
      phase = phase === 'data' ? 'node' : phase;
      checkNode(ctx, child);
    } else if (child.tag === 'edge') {
      if (kind === 'region') {
        ctx.emit('region-no-edges', 'edge inside a region subgraph', child);
      }
      phase = 'edge';
      checkEdge(ctx, child);
    } else if (child.tag === 'graph') {
      ctx.emit(
        'graph-in-graph',
        'subgraph directly inside a graph; subgraphs nest only inside nodes',
        child,
      );
    } else if (child.tag === 'key') {
      ctx.emit('key-placement', 'key declaration inside a graph', child);
    } else {
      ctx.emit('tag-tree', `tag ${child.tag} is not admissible inside a graph`, child);
    }
  }
  if (kind === 'sm' && datas.length) {
    const keys = datas.map((d) => d.get('key'));
    if (keys.length && keys[0] !== 'dStateMachine' && keys.includes('dStateMachine')) {
      ctx.emit(
        'sm-first-key',
        'dStateMachine is not the first key of the state machine graph',
        datas[0],
      );
    }
  }
}

function checkRoot(ctx: Context, root: XElement): boolean {
  if (root.tag !== 'graphml') {
    ctx.emit('root-graphml', `the root tag is ${root.tag}, not graphml`, root);
    return false;
  }
  const xmlns = root.get('xmlns');
  if (xmlns === null) {
    ctx.emit('root-graphml', 'the graphml tag has no xmlns attribute', root);
  } else if (xmlns !== GRAPHML_NS) {
    ctx.emit('root-graphml', `the graphml namespace is ${xmlns}, expected ${GRAPHML_NS}`, root);
  }
  for (const name of root.keys()) {
    if (name.startsWith('xmlns:')) {
      ctx.emit('extra-namespaces', `additional namespace attribute ${name}`, root);
    }
  }
  return true;
}

/** Run the L2 tag tree walk over the parsed document. */
export function check(ctx: Context): void {
  const root = ctx.parsed!.root;
  if (!checkRoot(ctx, root)) {
    return;
  }
  // graphml children: data<gFormat>, key*, graph*
  let phase = 'gformat';
  let sawGformat = false;
  root.children.forEach((child, index) => {
    if (child.tag === 'data') {
      const key = child.get('key');
      if (key !== 'gFormat') {
        if (isStandard(key)) {
          ctx.emit(
            'key-usage',
            `data key ${key} is not admissible on graphml (only gFormat)`,
            child,
          );
        }
      } else {
        sawGformat = true;
        if (index > 0) {
          ctx.emit(
            'gformat-first',
            'the gFormat data tag is not the first child of graphml',
            child,
          );
        }
      }
      phase = phase === 'gformat' ? 'keys' : phase;
    } else if (child.tag === 'key') {
      if (phase === 'graphs') {
        ctx.emit('key-placement', 'key declaration after the graph structure', child);
      } else {
        phase = 'keys';
      }
    } else if (child.tag === 'graph') {
      phase = 'graphs';
      checkGraph(ctx, child, 'sm');
    } else if (child.tag === 'node') {
      ctx.emit(
        'node-placement',
        'node directly inside graphml; nodes appear only inside graphs',
        child,
      );
    } else {
      ctx.emit('tag-tree', `tag ${child.tag} is not admissible inside graphml`, child);
    }
  });
  if (!sawGformat) {
    ctx.emit('gformat-first', 'the gFormat data tag is missing', root);
  }
}

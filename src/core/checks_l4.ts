/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L4 layer: document integrity checks
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
import * as model from './model';
import {
  AnyNode,
  Comment,
  dataItems,
  Document,
  iterElements,
  Point,
  Rect,
  State,
  StateMachine,
  SubmachineState,
  Transition,
  Vertex,
} from './model';
import { declare, rule } from './rules';
import { compareText, repr } from './util';

declare(
  'geometry-mode-detect',
  'CGML-7.1-1',
  4,
  INFO,
  'the document geometry mode is resolved from the metadata',
  'resolved by the model',
);
declare(
  'sm-geometry',
  'CGML-7.2-1-1',
  2,
  INFO,
  'state machine geometry is a rect',
  'shape constrained by the tag tree',
);
declare(
  'region-geometry',
  'CGML-7.2-1-4',
  2,
  INFO,
  'region geometry is a rect',
  'shape constrained by the tag tree',
);
declare(
  'label-geometry',
  'CGML-7.2-1-6',
  2,
  INFO,
  'transition label geometry is a point or a rect',
  'shape constrained by the tag tree',
);

/** The node/edge id sets of one state machine. */
function machineIndex(machine: StateMachine): [Set<string>, Set<string>, Set<string>] {
  const nodeIds = new Set<string>();
  const commentIds = new Set<string>();
  for (const node of model.iterMachineNodes(machine)) {
    if (node.id !== null) {
      nodeIds.add(node.id);
      if (node instanceof Comment) {
        commentIds.add(node.id);
      }
    }
  }
  const edgeIds = new Set<string>();
  for (const edge of [...machine.transitions, ...machine.links]) {
    if (edge.id !== null) {
      edgeIds.add(edge.id);
    }
  }
  return [nodeIds, commentIds, edgeIds];
}

/** All sibling levels: [container description, children list]. */
function* levels(document: Document): Generator<[string, AnyNode[]]> {
  for (const machine of document.machines) {
    yield [`state machine ${repr(machine.id)}`, machine.children];
  }
  for (const region of model.iterRegions(document)) {
    yield [`region ${repr(region.id)}`, region.children];
  }
}

function regionsOf(node: AnyNode): model.Region[] {
  return node instanceof State || node instanceof SubmachineState ? node.regions : [];
}

rule(
  'top-level-graphs',
  'CGML-5.6-2',
  4,
  ERROR,
  'the document contains at least one state machine graph',
  (ctx) => {
    if (!ctx.doc.machines.length) {
      ctx.emit('top-level-graphs', 'the document contains no top-level graphs', ctx.doc.root);
    }
  },
);

rule(
  'unique-ids',
  'CGML-5.9-4',
  4,
  ERROR,
  'ids are unique across the whole document',
  (ctx) => {
    const seen = new Map<string, string>();
    for (const [kind, elem] of iterElements(ctx.doc.root!)) {
      const value = elem.get('id');
      if (!value) {
        continue;
      }
      if (seen.has(value)) {
        ctx.emit(
          'unique-ids',
          `${kind} id ${repr(value)} duplicates the id of a ${seen.get(value)}`,
          elem,
        );
      } else {
        seen.set(value, kind);
      }
    }
  },
  ['CGML-5.7-1'],
);

rule(
  'unique-data-keys',
  'CGML-5.5-4',
  4,
  ERROR,
  'a tag carries at most one data of each key',
  (ctx) => {
    for (const [kind, elem] of iterElements(ctx.doc.root!)) {
      const seen = new Set<string>();
      for (const [key, data] of dataItems(elem)) {
        if (key === null) {
          continue;
        }
        if (seen.has(key)) {
          ctx.emit(
            'unique-data-keys',
            `${kind} carries more than one data with the key ${key}`,
            data,
          );
        }
        seen.add(key);
      }
    }
  },
);

rule(
  'sm-marker',
  'CGML-6.1-1',
  4,
  ERROR,
  'every top-level graph carries the dStateMachine marker',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      if (!machine.marker) {
        ctx.emit('sm-marker', 'top-level graph without the dStateMachine key', machine.elem);
      }
    }
  },
);

rule('sm-name', 'CGML-6.1-2', 4, ERROR, 'state machines carry unique non-empty names', (ctx) => {
  const seen = new Map<string, string | null>();
  for (const machine of ctx.doc.machines) {
    if (machine.name === null) {
      ctx.emit('sm-name', 'state machine without a dName key', machine.elem);
      continue;
    }
    const name = machine.name.trim();
    if (!name) {
      ctx.emit('sm-name', 'state machine with an empty name', machine.elem);
    } else if (seen.has(name)) {
      ctx.emit(
        'sm-name',
        `state machines ${repr(seen.get(name))} and ${repr(machine.id)} share the name ${repr(name)}`,
        machine.elem,
      );
    } else {
      seen.set(name, machine.id);
    }
  }
});

rule('state-names', 'CGML-6.2-3', 4, ERROR, 'sibling states carry unique names', (ctx) => {
  for (const [where, children] of levels(ctx.doc)) {
    const seen = new Map<string, string | null>();
    for (const child of children) {
      if (!(child instanceof State || child instanceof SubmachineState)) {
        continue;
      }
      const name = (child.name ?? '').trim();
      if (!name) {
        continue;
      }
      if (seen.has(name)) {
        ctx.emit(
          'state-names',
          `sibling states ${repr(seen.get(name))} and ${repr(child.id)} in ${where} share the name ` +
            repr(name),
          child.elem,
        );
      } else {
        seen.set(name, child.id);
      }
    }
  }
});

rule(
  'formal-name-unique',
  'CGML-10.1-3',
  4,
  ERROR,
  'formal names are unique among state machines and among siblings',
  (ctx) => {
    const seen = new Map<string, string | null>();
    for (const machine of ctx.doc.machines) {
      const name = machine.formalName;
      if (!name) {
        continue;
      }
      if (seen.has(name)) {
        ctx.emit(
          'formal-name-unique',
          `state machines ${repr(seen.get(name))} and ${repr(machine.id)} share the formal name ` +
            repr(name),
          machine.elem,
        );
      } else {
        seen.set(name, machine.id);
      }
    }
    for (const [where, children] of levels(ctx.doc)) {
      const levelSeen = new Map<string, string | null>();
      for (const child of children) {
        const name = child.formalName;
        if (!name || child instanceof Comment) {
          continue;
        }
        if (levelSeen.has(name)) {
          ctx.emit(
            'formal-name-unique',
            `siblings ${repr(levelSeen.get(name))} and ${repr(child.id)} in ${where} share the ` +
              `formal name ${repr(name)}`,
            child.elem,
          );
        } else {
          levelSeen.set(name, child.id);
        }
      }
    }
  },
);

rule(
  'transition-endpoints',
  'CGML-6.3-2',
  4,
  ERROR,
  'transition endpoints resolve to nodes of the same state machine',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      const [nodeIds, , edgeIds] = machineIndex(machine);
      for (const transition of machine.transitions) {
        for (const attr of ['source', 'target'] as const) {
          const value = transition[attr];
          if (!value) {
            continue;
          }
          if (value === machine.id) {
            ctx.emit(
              'transition-endpoints',
              `transition ${attr} ${repr(value)} is the state machine graph itself`,
              transition.elem,
            );
          } else if (edgeIds.has(value)) {
            ctx.emit(
              'link-target',
              `plain transition ${attr} ${repr(value)} is an edge id; only comment links may target ` +
                'transitions',
              transition.elem,
            );
          } else if (!nodeIds.has(value)) {
            ctx.emit(
              'transition-endpoints',
              `transition ${attr} ${repr(value)} does not name a node of this state machine`,
              transition.elem,
            );
          }
        }
      }
    }
  },
);

declare('link-target', 'CGML-8.5-3', 4, ERROR, 'only comment links may target an edge id');

rule(
  'link-endpoints',
  'CGML-6.7-2',
  4,
  ERROR,
  'comment link endpoints resolve within the same state machine',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      const [nodeIds, commentIds, edgeIds] = machineIndex(machine);
      for (const link of machine.links) {
        const source = link.source;
        if (source && !nodeIds.has(source)) {
          ctx.emit(
            'link-endpoints',
            `comment link source ${repr(source)} does not name a node of this state machine`,
            link.elem,
          );
        } else if (source && !commentIds.has(source)) {
          ctx.emit(
            'link-source',
            `comment link source ${repr(source)} is not a comment node`,
            link.elem,
          );
        }
        if (source && source === link.target) {
          ctx.emit('link-source', `comment link ${repr(link.id)} is a self-loop`, link.elem);
        }
        const target = link.target;
        if (target && !nodeIds.has(target) && !edgeIds.has(target)) {
          ctx.emit(
            'link-endpoints',
            `comment link target ${repr(target)} does not name a node or an edge of this state ` +
              'machine',
            link.elem,
          );
        }
      }
    }
  },
);

declare(
  'link-source',
  'CGML-6.7-4',
  4,
  ERROR,
  'a comment link leaves a comment node and is not a self-loop',
);

rule(
  'link-target-kind',
  'CGML-8.5-2',
  4,
  ERROR,
  'a comment link targeting an edge targets a transition',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      const linkIds = new Set(machine.links.map((link) => link.id).filter((id) => id !== null));
      for (const link of machine.links) {
        if (linkIds.has(link.target)) {
          ctx.emit(
            'link-target-kind',
            `comment link target ${repr(link.target)} is a comment link, not a transition`,
            link.elem,
          );
        }
      }
    }
  },
);

rule('single-else', 'CGML-6.3-4', 4, ERROR, 'at most one else transition leaves a node', (ctx) => {
  for (const machine of ctx.doc.machines) {
    const vertices = new Map<string | null, Vertex>();
    for (const node of model.iterMachineNodes(machine)) {
      if (node instanceof Vertex) {
        vertices.set(node.id, node);
      }
    }
    const counts = new Map<string | null, Transition[]>();
    for (const transition of machine.transitions) {
      if (transition.blocks.some((b) => b.guard === 'else')) {
        const list = counts.get(transition.source) ?? [];
        list.push(transition);
        counts.set(transition.source, list);
      }
    }
    for (const [source, transitions] of counts) {
      if (transitions.length < 2) {
        continue;
      }
      const vertex = vertices.get(source);
      if (vertex !== undefined && vertex.kind === 'choice') {
        ctx.emit(
          'choice-single-else',
          `choice ${repr(source)} has ${transitions.length} outgoing else transitions`,
          transitions[1].elem,
        );
      } else {
        ctx.emit(
          'single-else',
          `node ${repr(source)} has ${transitions.length} outgoing else transitions`,
          transitions[1].elem,
        );
      }
    }
  }
});

declare(
  'choice-single-else',
  'CGML-6.3-4',
  4,
  ERROR,
  'at most one else transition leaves a choice',
);

rule(
  'single-initial',
  'CGML-6.4-4-1',
  4,
  ERROR,
  'at most one initial pseudostate per hierarchy level',
  (ctx) => {
    for (const [where, children] of levels(ctx.doc)) {
      const initials = children.filter((c) => c instanceof Vertex && c.kind === 'initial');
      if (initials.length > 1) {
        ctx.emit(
          'single-initial',
          `${where} carries ${initials.length} initial pseudostates`,
          initials[1].elem,
        );
      }
    }
  },
);

rule(
  'meta-presence',
  'CGML-6.9-1',
  4,
  ERROR,
  'the first state machine carries the CGML_META formal comment',
  (ctx) => {
    const doc = ctx.doc;
    if (doc.machines.length && doc.metaComment === null) {
      ctx.emit(
        'meta-presence',
        'no CGML_META formal comment in the first state machine',
        doc.machines[0].elem,
      );
    }
  },
);

rule(
  'meta-single',
  'CGML-6.9-1',
  4,
  ERROR,
  'the CGML_META comment is unique and is not linked',
  (ctx) => {
    const doc = ctx.doc;
    const metas = [...model.iterNodes(doc)].filter(
      (n) =>
        n instanceof Comment && (n.kind ?? '').trim() === 'formal' && n.name === model.META_NAME,
    );
    for (const extra of metas.slice(1)) {
      ctx.emit('meta-single', `a second CGML_META comment ${repr(extra.id)}`, extra.elem);
    }
    const metaIds = new Set(metas.map((m) => m.id).filter((id) => id !== null));
    for (const machine of doc.machines) {
      for (const link of machine.links) {
        if (metaIds.has(link.source) || metaIds.has(link.target)) {
          ctx.emit(
            'meta-single',
            `comment link ${repr(link.id)} attached to the CGML_META comment`,
            link.elem,
          );
        }
      }
    }
  },
);

rule(
  'collapsed-needs-regions',
  'CGML-8.4-2',
  4,
  ERROR,
  'a collapsed state keeps its region subgraphs',
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      if (node instanceof State && node.collapsed && !node.regions.length) {
        ctx.emit(
          'collapsed-needs-regions',
          `collapsed state ${repr(node.id)} has no region subgraph`,
          node.elem,
        );
      }
    }
  },
);

rule(
  'edge-geometry-mode',
  'CGML-7.2-1-5',
  4,
  WARNING,
  'transitions carry no geometry in the base (short) format',
  (ctx) => {
    const doc = ctx.doc;
    if (doc.geometryMode === 'full') {
      return;
    }
    for (const machine of doc.machines) {
      for (const transition of machine.transitions) {
        if (transition.polyline.length || transition.sourcePoint || transition.targetPoint) {
          ctx.emit(
            'edge-geometry-mode',
            `transition geometry in a ${repr(doc.geometryMode)} mode document`,
            transition.elem,
          );
        }
      }
    }
  },
);

rule(
  'state-geometry-kind',
  'CGML-7.2-1-2',
  4,
  WARNING,
  'states, choices, comments and submachine states carry rect geometry',
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      const rectCarrier =
        node instanceof State ||
        node instanceof SubmachineState ||
        node instanceof Comment ||
        (node instanceof Vertex && node.kind === 'choice');
      if (rectCarrier && node.geometry instanceof Point) {
        ctx.emit(
          'state-geometry-kind',
          `point geometry on ${repr(node.id)}, expected a rect`,
          node.elem,
        );
      }
    }
  },
);

rule(
  'vertex-geometry-kind',
  'CGML-7.2-1-3',
  4,
  WARNING,
  'pseudostates and final states carry point geometry',
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      if (node instanceof Vertex && node.kind !== 'choice' && node.geometry instanceof Rect) {
        ctx.emit(
          'vertex-geometry-kind',
          `rect geometry on the ${node.kind ?? 'None'} vertex ${repr(node.id)}, expected a point`,
          node.elem,
        );
      }
    }
  },
);

rule(
  'transition-geometry-endpoints',
  'CGML-6.3-5',
  4,
  WARNING,
  'transition geometry requires geometry on both endpoint nodes',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      const geometry = new Map<string | null, boolean>();
      for (const node of model.iterMachineNodes(machine)) {
        geometry.set(node.id, node.geometry !== null);
      }
      for (const transition of machine.transitions) {
        const hasGeometry =
          transition.labelGeometry !== null ||
          transition.polyline.length > 0 ||
          transition.sourcePoint !== null ||
          transition.targetPoint !== null;
        if (!hasGeometry) {
          continue;
        }
        for (const endpoint of [transition.source, transition.target]) {
          if (geometry.has(endpoint) && !geometry.get(endpoint)) {
            ctx.emit(
              'transition-geometry-endpoints',
              `transition geometry while the endpoint node ${repr(endpoint)} has none`,
              transition.elem,
            );
          }
        }
      }
    }
  },
);

const ENTRY_EXIT = ['entryPoint', 'exitPoint'];

function isPoint(node: AnyNode): boolean {
  return node instanceof Vertex && node.kind !== null && ENTRY_EXIT.includes(node.kind);
}

rule(
  'initial-present',
  'CGML-6.4-4-2',
  4,
  INFO,
  'a state machine of a correct diagram contains an initial pseudostate',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      if (
        ![...model.iterMachineNodes(machine)].some(
          (n) => n instanceof Vertex && n.kind === 'initial',
        )
      ) {
        ctx.emit(
          'initial-present',
          `state machine ${repr(machine.id)} contains no initial pseudostate`,
          machine.elem,
        );
      }
    }
  },
);

/** The commented text of a link target: name or dData. */
function aspect(target: AnyNode | Transition, pivot: string): string | null {
  if (pivot === 'dName') {
    return 'name' in target ? target.name : null;
  }
  if (target instanceof Comment) {
    return target.body;
  }
  return 'data' in target ? (target.data as string | null) : null;
}

rule(
  'chunk-substring',
  'CGML-6.7-3',
  4,
  ERROR,
  'dChunk is a substring of the commented aspect of the subject',
  (ctx) => {
    const nodes = new Map<string | null, AnyNode>();
    for (const node of model.iterNodes(ctx.doc)) {
      nodes.set(node.id, node);
    }
    for (const machine of ctx.doc.machines) {
      const edges = new Map<string | null, Transition>(machine.transitions.map((t) => [t.id, t]));
      for (const link of machine.links) {
        const pivot = (link.pivot ?? '').trim();
        const chunk = link.chunk ?? '';
        if (!['dName', 'dData'].includes(pivot) || !chunk.trim()) {
          continue;
        }
        const target = nodes.get(link.target) ?? edges.get(link.target);
        if (target === undefined) {
          continue;
        }
        if (!(aspect(target, pivot) ?? '').includes(chunk)) {
          ctx.emit(
            'chunk-substring',
            `dChunk ${repr(chunk)} is not found in the ${pivot} of ${repr(link.target)}`,
            link.elem,
          );
        }
      }
    }
  },
);

rule(
  'submachine-self-reference',
  'CGML-8.1-1-1',
  4,
  ERROR,
  'a submachine state does not reference its own state machine',
  (ctx) => {
    for (const machine of ctx.doc.machines) {
      for (const node of model.iterMachineNodes(machine)) {
        if (node instanceof SubmachineState && node.ref === machine.id) {
          ctx.emit(
            'submachine-self-reference',
            `submachine state ${repr(node.id)} references its own state machine ${repr(machine.id)}`,
            node.elem,
          );
        }
      }
    }
  },
);

rule(
  'submachine-point-names',
  'CGML-8.1-4',
  4,
  ERROR,
  'the points of a submachine state are named after the points of the referenced state machine',
  (ctx) => {
    const machines = new Map<string | null, StateMachine>(ctx.doc.machines.map((m) => [m.id, m]));
    for (const node of model.iterNodes(ctx.doc)) {
      if (!(node instanceof SubmachineState) || !machines.has(node.ref)) {
        continue;
      }
      const names = new Set(
        machines
          .get(node.ref)!
          .children.filter(isPoint)
          .map((p) => (p.name ?? '').trim()),
      );
      const listed = [...names].sort(compareText);
      for (const region of node.regions) {
        for (const point of region.children) {
          const name = (point.name ?? '').trim();
          if (isPoint(point) && !names.has(name)) {
            ctx.emit(
              'submachine-point-names',
              `point ${repr(point.id)} of submachine state ${repr(node.id)} is named ` +
                `${repr(point.name)}; state machine ${repr(node.ref)} defines the points ` +
                (listed.length ? `[${listed.map(repr).join(', ')}]` : 'none'),
              point.elem,
            );
          }
        }
      }
    }
  },
);

rule(
  'points-first-region',
  'CGML-8.3-5',
  4,
  ERROR,
  'the entry/exit points of a multi-region state sit in its first region',
  (ctx) => {
    for (const node of model.iterNodes(ctx.doc)) {
      const regions = regionsOf(node);
      if (node instanceof State && regions.length > 1) {
        for (const region of regions.slice(1)) {
          for (const point of region.children) {
            if (isPoint(point)) {
              ctx.emit(
                'points-first-region',
                `point ${repr(point.id)} of state ${repr(node.id)} sits in region ` +
                  `${repr(region.id)}, not in the first region`,
                point.elem,
              );
            }
          }
        }
      }
    }
  },
);

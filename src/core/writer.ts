/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The writer of standard documents from the document model
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

import { FORMAT_VALUE } from './dialect';
import { binding, STANDARD_BINDINGS, UNTYPED_KEYS } from './keys';
import { Param } from './meta';
import {
  AnyNode,
  Comment,
  CommentLink,
  Document,
  Extension,
  Geometry,
  KeyDecl,
  META_NAME,
  Point,
  Rect,
  State,
  StateMachine,
  SubmachineState,
  Transition,
  Vertex,
} from './model';
import { read } from './reader';
import { GRAPHML_NS } from './tagtree';
import { pyFloatRepr } from './util';
import { XElement } from './xml';

const DECLARATION = '<?xml version="1.0" encoding="utf-8"?>\n';
const INDENT = '  ';
const META_ID = 'nMeta';
const REGION_SUFFIX = '::region';
// the characters of Python's str.isspace()
// eslint-disable-next-line no-control-regex
const BLANK = /^[\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]*$/;

function number(value: number): string {
  const text = pyFloatRepr(value);
  return text.endsWith('.0') ? text.slice(0, -2) : text;
}

function parameters(params: Param[]): string {
  return params.map((p) => `${p.name}/ ${p.value}`).join('\n\n');
}

function free(base: string, taken: Set<string | null>): string {
  let name = base;
  let count = 2;
  while (taken.has(name)) {
    name = `${base}-${count}`;
    count += 1;
  }
  return name;
}

function blank(text: string | null): boolean {
  return !text || BLANK.test(text);
}

/** Indent the tree in place, as ElementTree.indent(). */
function indent(tree: XElement): void {
  if (!tree.children.length) {
    return;
  }
  const indentations = ['\n'];
  const indentChildren = (elem: XElement, level: number): void => {
    if (level + 1 >= indentations.length) {
      indentations.push(indentations[level] + INDENT);
    }
    const childIndentation = indentations[level + 1];
    if (blank(elem.text)) {
      elem.text = childIndentation;
    }
    for (const child of elem.children) {
      if (child.children.length) {
        indentChildren(child, level + 1);
      }
      if (blank(child.tail)) {
        child.tail = childIndentation;
      }
    }
    const last = elem.children[elem.children.length - 1];
    if (blank(last.tail)) {
      last.tail = indentations[level];
    }
  };
  indentChildren(tree, 0);
}

function escapeText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(text: string): string {
  return escapeText(text)
    .replaceAll('"', '&quot;')
    .replaceAll('\r', '&#13;')
    .replaceAll('\n', '&#10;')
    .replaceAll('\t', '&#09;');
}

/** Serialize the tree, as ElementTree.tostring(encoding='unicode'). */
function serialize(elem: XElement, out: string[]): void {
  out.push('<' + elem.tag);
  for (const [name, value] of elem.attrib) {
    out.push(` ${name}="${escapeAttribute(value)}"`);
  }
  if (elem.text || elem.children.length) {
    out.push('>');
    if (elem.text) {
      out.push(escapeText(elem.text));
    }
    for (const child of elem.children) {
      serialize(child, out);
    }
    out.push(`</${elem.tag}>`);
  } else {
    out.push(' />');
  }
  if (elem.tail) {
    out.push(escapeText(elem.tail));
  }
}

function sub(parent: XElement, tag: string, attrs: Record<string, string>): XElement {
  const elem = new XElement(tag, attrs);
  parent.append(elem);
  return elem;
}

/** One write: the output tree and the keys in use. */
class Writer {
  used: Array<[string, string]> = [];
  usedSet: Set<string> = new Set();
  declared: Map<string, KeyDecl>;

  constructor(public document: Document) {
    this.declared = new Map(
      document.keys.map((k) => [binding(String(k.id), String(k.forKind)), k]),
    );
  }

  use(key: string, kind: string): void {
    if (!this.usedSet.has(binding(key, kind))) {
      this.usedSet.add(binding(key, kind));
      this.used.push([key, kind]);
    }
  }

  data(parent: XElement, kind: string, key: string, text: string | null = null): XElement {
    this.use(key, kind);
    const elem = sub(parent, 'data', { key });
    if (text !== null) {
      elem.text = text;
    }
    return elem;
  }

  geometry(parent: XElement, kind: string, key: string, geometry: Geometry | Point[]): void {
    if (geometry === null) {
      return;
    }
    const data = this.data(parent, kind, key);
    for (const shape of Array.isArray(geometry) ? geometry : [geometry]) {
      if (shape instanceof Rect) {
        sub(data, 'rect', {
          x: number(shape.x),
          y: number(shape.y),
          width: number(shape.width),
          height: number(shape.height),
        });
      } else if (shape instanceof Point) {
        sub(data, 'point', { x: number(shape.x), y: number(shape.y) });
      }
    }
  }

  extensions(parent: XElement, kind: string, item: { extensions: Extension[] }): void {
    for (const ext of item.extensions) {
      if (ext.elem !== null) {
        const elem = ext.elem.copy();
        elem.tail = null;
        parent.append(elem);
        if (ext.key !== null) {
          this.use(ext.key, kind);
        }
      } else if (ext.key !== null) {
        this.data(parent, kind, ext.key, ext.text);
      }
    }
  }

  keys(root: XElement): void {
    // the document keeps its own declarations; one without any gets those of appendix B for the
    // keys in use
    const written = new Set<string | null>();
    for (const decl of this.document.keys) {
      const attrs: Record<string, string> = {};
      const fields: Array<[string, string | null]> = [
        ['id', decl.id],
        ['for', decl.forKind],
        ['attr.name', decl.attrName],
        ['attr.type', decl.attrType],
      ];
      for (const [name, value] of fields) {
        if (value !== null) {
          attrs[name] = value;
        }
      }
      sub(root, 'key', attrs);
      written.add(decl.id);
    }
    if (!this.document.keys.length) {
      for (const [pair, name] of STANDARD_BINDINGS) {
        if (!this.usedSet.has(pair)) {
          continue;
        }
        const [key, kind] = pair.split('|');
        const attrs: Record<string, string> = { id: key, for: kind, 'attr.name': name };
        if (!UNTYPED_KEYS.has(key)) {
          attrs['attr.type'] = 'string';
        }
        sub(root, 'key', attrs);
      }
    }
    for (const [key, kind] of this.used) {
      if (STANDARD_BINDINGS.has(binding(key, kind)) || written.has(key)) {
        continue;
      }
      written.add(key);
      const decl = this.declared.get(binding(key, kind));
      const chars = Array.from(key);
      const name =
        decl?.attrName ||
        (key.startsWith('d') && chars.length > 1
          ? chars[1].toLowerCase() + chars.slice(2).join('')
          : key);
      sub(root, 'key', {
        id: key,
        for: kind,
        'attr.name': name,
        'attr.type': decl?.attrType || 'string',
      });
    }
  }

  node(parent: XElement, node: AnyNode): void {
    const elem = sub(parent, 'node', { id: node.id ?? '' });
    if (node instanceof Comment) {
      this.data(elem, 'node', 'dNote', node.kind || 'informal');
    } else if (node instanceof SubmachineState) {
      this.data(elem, 'node', 'dSubmachineState', node.ref ?? '');
    } else if (node instanceof Vertex) {
      this.data(elem, 'node', 'dVertex', node.kind);
    }
    if (node.name !== null) {
      this.data(elem, 'node', 'dName', node.name);
    }
    this.geometry(elem, 'node', 'dGeometry', node.geometry);
    if (node instanceof Comment && node.body !== null) {
      let text = node.body;
      if (node === this.document.metaComment && this.document.metaParams.length) {
        text = parameters(this.document.metaParams);
      }
      this.data(elem, 'node', 'dData', text);
    } else if (node instanceof State && node.data !== null) {
      this.data(elem, 'node', 'dData', node.data);
    }
    if (node.formalName !== null) {
      this.data(elem, 'node', 'dFormalName', node.formalName);
    }
    if (node instanceof State && node.collapsed) {
      this.data(elem, 'node', 'dCollapsed');
    }
    if (node.color !== null) {
      this.data(elem, 'node', 'dColor', node.color);
    }
    if (node instanceof Comment && node.markup !== null) {
      this.data(elem, 'node', 'dMarkup', node.markup);
    }
    this.extensions(elem, 'node', node);
    if (node instanceof SubmachineState) {
      for (const region of node.regions) {
        const graph = sub(elem, 'graph', { id: region.id || (node.id ?? '') + REGION_SUFFIX });
        for (const child of region.children) {
          this.node(graph, child);
        }
      }
    } else if (node instanceof State) {
      const taken = new Set<string | null>();
      for (const region of node.regions) {
        const rid = region.id || free((node.id ?? '') + REGION_SUFFIX, taken);
        taken.add(rid);
        const graph = sub(elem, 'graph', { id: rid });
        this.data(graph, 'graph', 'dRegion');
        if (region.name !== null) {
          this.data(graph, 'graph', 'dName', region.name);
        }
        this.geometry(graph, 'graph', 'dGeometry', region.geometry);
        if (region.formalName !== null) {
          this.data(graph, 'graph', 'dFormalName', region.formalName);
        }
        this.extensions(graph, 'graph', region);
        for (const child of region.children) {
          this.node(graph, child);
        }
      }
    }
  }

  edge(parent: XElement, edge: Transition | CommentLink): void {
    const elem = sub(parent, 'edge', {
      id: edge.id ?? '',
      source: edge.source ?? '',
      target: edge.target ?? '',
    });
    if (edge instanceof CommentLink) {
      this.data(elem, 'edge', 'dPivot', edge.pivot || null);
      if (edge.chunk !== null) {
        this.data(elem, 'edge', 'dChunk', edge.chunk);
      }
    } else {
      if (edge.data !== null) {
        this.data(elem, 'edge', 'dData', edge.data);
      }
      this.geometry(elem, 'edge', 'dLabelGeometry', edge.labelGeometry);
    }
    if (edge.polyline.length) {
      this.geometry(elem, 'edge', 'dGeometry', [...edge.polyline]);
    }
    this.geometry(elem, 'edge', 'dSourcePoint', edge.sourcePoint);
    this.geometry(elem, 'edge', 'dTargetPoint', edge.targetPoint);
    if (edge instanceof Transition && edge.color !== null) {
      this.data(elem, 'edge', 'dColor', edge.color);
    }
    this.extensions(elem, 'edge', edge);
  }

  machine(root: XElement, machine: StateMachine, first: boolean): void {
    const graph = sub(root, 'graph', { id: machine.id ?? '', edgedefault: 'directed' });
    this.data(graph, 'graph', 'dStateMachine');
    if (machine.name !== null) {
      this.data(graph, 'graph', 'dName', machine.name);
    }
    this.geometry(graph, 'graph', 'dGeometry', machine.geometry);
    if (machine.formalName !== null) {
      this.data(graph, 'graph', 'dFormalName', machine.formalName);
    }
    this.extensions(graph, 'graph', machine);
    const meta = this.document.metaComment;
    const children: AnyNode[] = [...machine.children];
    if (first) {
      if (meta !== null && children.includes(meta)) {
        children.splice(children.indexOf(meta), 1);
        children.unshift(meta);
      } else if (meta === null && this.document.metaParams.length) {
        children.unshift(this.metaNode());
      }
    }
    for (const child of children) {
      this.node(graph, child);
    }
    for (const edge of [...machine.transitions, ...machine.links]) {
      this.edge(graph, edge);
    }
  }

  metaNode(): Comment {
    const taken = new Set(this.document.machines.flatMap((m) => m.children.map((n) => n.id)));
    return new Comment(free(META_ID, taken), null, {
      name: META_NAME,
      kind: 'formal',
      body: parameters(this.document.metaParams),
    });
  }

  write(): string {
    const root = new XElement('graphml', { xmlns: GRAPHML_NS });
    sub(root, 'data', { key: 'gFormat' }).text = FORMAT_VALUE;
    this.use('gFormat', 'graphml');
    const graphs = new XElement('graphs');
    this.document.machines.forEach((machine, index) => this.machine(graphs, machine, index === 0));
    this.keys(root);
    root.children.push(...graphs.children);
    indent(root);
    const out: string[] = [];
    serialize(root, out);
    return DECLARATION + out.join('') + '\n';
  }
}

/** Return the document text without the check of write(). */
export function render(document: Document): string {
  return new Writer(document).write();
}

/** Write a standard document; throw CGMLError on a MUST violation. */
export function write(document: Document): string {
  const text = render(document);
  read(text, { strict: true });
  return text;
}

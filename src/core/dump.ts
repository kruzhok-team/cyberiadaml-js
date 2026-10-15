/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The canonical dump writer
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

import { Block } from './actions';
import {
  AnyNode,
  Comment,
  CommentLink,
  Document,
  Geometry,
  META_NAME,
  Point,
  Rect,
  Region,
  State,
  SubmachineState,
  Transition,
  Vertex,
} from './model';
import { compareText, pyFixed2, pyStr } from './util';

export const HEADER = 'cgml-canonical-dump 1';
const INDENT = '  ';

function quote(text: string): string {
  const out = ['"'];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (char === '\\') {
      out.push('\\\\');
    } else if (char === '"') {
      out.push('\\"');
    } else if (char === '\n') {
      out.push('\\n');
    } else if (char === '\t') {
      out.push('\\t');
    } else if (char === '\r') {
      out.push('\\r');
    } else if (code < 32) {
      out.push('\\u' + code.toString(16).padStart(4, '0'));
    } else {
      out.push(char);
    }
  }
  out.push('"');
  return out.join('');
}

function num(value: number): string {
  const text = pyFixed2(value);
  return text === '-0.00' ? '0.00' : text;
}

function geometryText(shape: Point | Rect): string {
  if (shape instanceof Rect) {
    return `rect ${num(shape.x)} ${num(shape.y)} ${num(shape.width)} ${num(shape.height)}`;
  }
  return `point ${num(shape.x)} ${num(shape.y)}`;
}

function sorted<T extends { id: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareText(a.id ?? '', b.id ?? ''));
}

function sortedEdges<T extends { id: string | null; source: string | null; target: string | null }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      compareText(a.source ?? '', b.source ?? '') ||
      compareText(a.target ?? '', b.target ?? '') ||
      compareText(a.id ?? '', b.id ?? ''),
  );
}

class Writer {
  lines: string[] = [HEADER];

  put(depth: number, text: string): void {
    this.lines.push(INDENT.repeat(depth) + text);
  }

  text(): string {
    return this.lines.join('\n') + '\n';
  }
}

function putCommon(
  out: Writer,
  depth: number,
  node: { name: string | null; formalName: string | null },
): void {
  if (node.name) {
    out.put(depth, `name: ${quote(node.name)}`);
  }
  if (node.formalName) {
    out.put(depth, `formal-name: ${quote(node.formalName)}`);
  }
}

function putBlock(out: Writer, depth: number, block: Block): void {
  let head: string;
  if (block.kind === 'event') {
    head = `action event ${quote(block.trigger)}`;
    if (block.param) {
      head += ' ' + block.param;
    }
    if (block.guard !== null) {
      const escaped =
        block.guard !== 'else' ? block.guard.replaceAll('[', '\\[').replaceAll(']', '\\]') : 'else';
      head += ` guard ${quote(escaped)}`;
    }
  } else {
    head = `action ${block.kind}`;
  }
  out.put(depth, head + ':');
  for (const line of block.behaviour) {
    out.put(depth + 1, `do: ${quote(line)}`);
  }
}

function putTrailer(
  out: Writer,
  depth: number,
  node: { geometry: Geometry; color: string | null },
): void {
  if (node.geometry !== null) {
    out.put(depth, `geometry: ${geometryText(node.geometry)}`);
  }
  if (node.color) {
    out.put(depth, `color: ${quote(node.color)}`);
  }
}

function putRegion(out: Writer, depth: number, document: Document, region: Region): void {
  out.put(depth, `region ${quote(region.id ?? '')}:`);
  if (region.name) {
    out.put(depth + 1, `name: ${quote(region.name)}`);
  }
  if (region.formalName) {
    out.put(depth + 1, `formal-name: ${quote(region.formalName)}`);
  }
  if (region.geometry !== null) {
    out.put(depth + 1, `geometry: ${geometryText(region.geometry)}`);
  }
  for (const child of sorted(region.children)) {
    putNode(out, depth + 1, document, child);
  }
}

function putNode(out: Writer, depth: number, document: Document, node: AnyNode): void {
  const quoted = quote(node.id ?? '');
  if (node instanceof Comment) {
    out.put(depth, `comment ${quoted} ${pyStr(node.kind)}:`);
    putCommon(out, depth + 1, node);
    if (node.kind === 'informal') {
      out.put(depth + 1, `markup: ${quote(node.markup || document.markupLanguage())}`);
    } else if (node.markup) {
      // a formal comment has no default
      out.put(depth + 1, `markup: ${quote(node.markup)}`);
    }
    if (node.body !== null && !(node.kind === 'formal' && node.name === META_NAME)) {
      // the metadata parameters are rendered by the meta section
      out.put(depth + 1, `body: ${quote(node.body)}`);
    }
    putTrailer(out, depth + 1, node);
  } else if (node instanceof Vertex) {
    out.put(depth, `vertex ${quoted} ${pyStr(node.kind)}:`);
    putCommon(out, depth + 1, node);
    putTrailer(out, depth + 1, node);
  } else if (node instanceof SubmachineState) {
    out.put(depth, `submachine ${quoted} ref ${quote(node.ref ?? '')}:`);
    putCommon(out, depth + 1, node);
    putTrailer(out, depth + 1, node);
    for (const region of sorted(node.regions)) {
      putRegion(out, depth + 1, document, region);
    }
  } else if (node instanceof State) {
    out.put(depth, `state ${quoted}:`);
    putCommon(out, depth + 1, node);
    if (node.collapsed) {
      out.put(depth + 1, 'collapsed');
    }
    for (const block of node.blocks) {
      putBlock(out, depth + 1, block);
    }
    putTrailer(out, depth + 1, node);
    for (const region of sorted(node.regions)) {
      putRegion(out, depth + 1, document, region);
    }
  }
}

function putTransition(out: Writer, depth: number, transition: Transition): void {
  out.put(
    depth,
    `transition ${quote(transition.id ?? '')}: ${quote(transition.source ?? '')} -> ` +
      quote(transition.target ?? ''),
  );
  for (const block of transition.blocks) {
    putBlock(out, depth + 1, block);
  }
  if (transition.polyline.length) {
    out.put(depth + 1, `polyline: ${transition.polyline.map(geometryText).join(' ')}`);
  }
  if (transition.sourcePoint !== null) {
    out.put(depth + 1, `source-point: ${geometryText(transition.sourcePoint)}`);
  }
  if (transition.targetPoint !== null) {
    out.put(depth + 1, `target-point: ${geometryText(transition.targetPoint)}`);
  }
  if (transition.labelGeometry !== null) {
    out.put(depth + 1, `label-geometry: ${geometryText(transition.labelGeometry)}`);
  }
  if (transition.color) {
    out.put(depth + 1, `color: ${quote(transition.color)}`);
  }
}

function putLink(out: Writer, depth: number, link: CommentLink): void {
  let line =
    `comment-link ${quote(link.id ?? '')}: ${quote(link.source ?? '')} -> ` +
    `${quote(link.target ?? '')} pivot ${quote(link.pivot ?? '')}`;
  if (link.chunk !== null) {
    line += ` chunk ${quote(link.chunk)}`;
  }
  out.put(depth, line);
}

/** Render the canonical dump of a validated document model. */
export function render(document: Document): string {
  const out = new Writer();
  out.put(0, `format: ${quote(document.format ?? '')}`);
  out.put(0, `geometry-mode: ${document.geometryMode}`);
  out.put(0, `transition-order: ${document.transitionOrder()}`);
  out.put(0, `event-propagation: ${document.eventPropagation()}`);
  if (document.metaParams.length) {
    out.put(0, 'meta:');
    const params = [...document.metaParams].sort(
      (a, b) =>
        Number(a.name !== 'standardVersion') - Number(b.name !== 'standardVersion') ||
        compareText(a.name, b.name),
    );
    for (const par of params) {
      out.put(1, `param ${quote(par.name)}: ${quote(par.value)}`);
    }
  }
  for (const machine of sorted(document.machines)) {
    out.put(0, `state-machine ${quote(machine.id ?? '')}:`);
    putCommon(out, 1, machine);
    if (machine.geometry !== null) {
      out.put(1, `geometry: ${geometryText(machine.geometry)}`);
    }
    for (const child of sorted(machine.children)) {
      putNode(out, 1, document, child);
    }
    for (const transition of sortedEdges(machine.transitions)) {
      putTransition(out, 1, transition);
    }
    for (const link of sortedEdges(machine.links)) {
      putLink(out, 1, link);
    }
  }
  return out.text();
}

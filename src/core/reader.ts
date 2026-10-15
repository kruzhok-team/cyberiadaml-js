/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The reader: the validation layers, the dialect pass and the modes
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

import './checks_l3';
import './checks_l4';
import * as dialect from './dialect';
import { ERROR, Finding, Report } from './findings';
import { STANDARD_KEY_IDS } from './keys';
import * as model from './model';
import { CommentLink, Document, Extension, Region, Transition } from './model';
import { Context, declare, runLayer } from './rules';
import * as tagtree from './tagtree';
import { load, XElement } from './xml';

declare('document-model', null, 2, ERROR, 'the document holds a state machine graph to read');

// findings that leave no model to read, in either mode
export const FATAL_RULES: Set<string> = new Set([
  'xml-not-empty',
  'xml-well-formed',
  'element-ids',
  'unique-ids',
  'document-model',
]);
const DOCUMENT_NAME = '<document>';

/** The document cannot be read; findings tell why. */
export class CGMLError extends Error {
  findings: Finding[];

  constructor(findings: Finding[]) {
    const list = [...findings];
    const fatal = list.filter((f) => FATAL_RULES.has(f.rule));
    const errors = list.filter((f) => f.severity === ERROR);
    const first = fatal.length ? fatal : errors.length ? errors : list;
    super(first.length ? first[0].render(DOCUMENT_NAME) : 'the document cannot be read');
    this.name = 'CGMLError';
    this.findings = list;
  }
}

/** Reading options: strict reads the standard alone. */
export interface ReadOptions {
  strict?: boolean;
}

function stop(ctx: Context, strict: boolean, layer: number): void {
  const fatal = ctx.report.findings.some((f) => FATAL_RULES.has(f.rule));
  if (fatal || (strict && ctx.report.hasErrors(layer))) {
    throw new CGMLError(ctx.report.findings);
  }
}

function lineOf(ctx: Context, elem: XElement | null): number | null {
  const info = elem !== null ? ctx.parsed!.info.get(elem) : undefined;
  return info !== undefined ? info[0] : null;
}

function extensions(elem: XElement | null): Extension[] {
  if (elem === null) {
    return [];
  }
  return elem.children
    .filter((d) => d.tag === 'data' && !STANDARD_KEY_IDS.has(d.get('key') as string))
    .map((d) => new Extension(d.get('key'), d.text, d));
}

type Item = model.AnyNode | Region | Transition | CommentLink;

function annotate(ctx: Context, item: Item, parent: unknown): void {
  item.parent = parent;
  item.line = lineOf(ctx, item.elem);
  item.extensions = extensions(item.elem);
  if ('regions' in item) {
    for (const region of item.regions) {
      annotate(ctx, region, item);
    }
  }
  if ('children' in item) {
    for (const child of item.children) {
      annotate(ctx, child, item);
    }
  }
}

function finish(ctx: Context): Document {
  const document = ctx.doc;
  document.findings = ctx.report.findings;
  const result = ctx.dialect;
  if (result !== null) {
    document.label = result.label;
    document.extensionGraphs = result.extensionGraphs;
    document.originalIds = result.renamed;
  }
  for (const machine of document.machines) {
    machine.line = lineOf(ctx, machine.elem);
    machine.extensions = extensions(machine.elem);
    if (result !== null) {
      machine.params = result.machineParams.get(machine.id) ?? [];
    }
    for (const child of machine.children) {
      annotate(ctx, child, machine);
    }
    for (const edge of [...machine.transitions, ...machine.links]) {
      annotate(ctx, edge, machine);
    }
  }
  return document;
}

/**
 * Run the validation layers over the document data; return the context (the cgmlval gating).
 *
 * A dialect name runs its repair pass between L1 and L2 (layer 0).
 */
export function runDocument(
  data: string | Uint8Array,
  filename = '<data>',
  dialectName: string | null = null,
): Context {
  const ctx = new Context(new Report(), filename);
  ctx.layer = 1;
  ctx.parsed = load(data, ctx);
  ctx.report.layersRun.push(1);
  if (ctx.report.hasErrors(1) || ctx.parsed === null) {
    return ctx;
  }
  if (dialectName !== null) {
    ctx.layer = 0;
    ctx.dialect = dialect.apply(ctx, dialectName);
  }
  ctx.layer = 2;
  tagtree.check(ctx);
  ctx.report.layersRun.push(2);
  if (ctx.report.hasErrors(2)) {
    return ctx;
  }
  ctx.model = model.build(ctx.parsed.root);
  runLayer(ctx, 3);
  if (ctx.report.hasErrors(3)) {
    return ctx;
  }
  runLayer(ctx, 4);
  return ctx;
}

/**
 * Read a document; throw CGMLError when it cannot be read.
 *
 * Strict: the standard alone, the first layer with an ERROR stops the reading. Permissive: the
 * Lapki dialect is repaired first, the ERROR findings stay in Document.findings, only the fatal
 * ones throw.
 */
export function read(data: string | Uint8Array, options: ReadOptions = {}): Document {
  const strict = options.strict ?? false;
  const ctx = new Context(new Report(), DOCUMENT_NAME);
  ctx.layer = 1;
  ctx.parsed = load(data, ctx);
  ctx.report.layersRun.push(1);
  if (ctx.parsed === null) {
    throw new CGMLError(ctx.report.findings);
  }
  stop(ctx, strict, 1);
  if (!strict) {
    ctx.layer = 0;
    ctx.dialect = dialect.apply(ctx);
  }
  ctx.layer = 2;
  tagtree.check(ctx);
  ctx.report.layersRun.push(2);
  if (ctx.parsed.root.tag !== 'graphml') {
    throw new CGMLError(ctx.report.findings);
  }
  stop(ctx, strict, 2);
  ctx.model = model.build(ctx.parsed.root);
  for (const layer of [3, 4]) {
    runLayer(ctx, layer);
    stop(ctx, strict, layer);
  }
  // an empty model is readable only with dialect extension graphs (D-9)
  if (!ctx.model.machines.length && !(ctx.dialect && ctx.dialect.extensionGraphs.length)) {
    ctx.emit('document-model', 'no state machine graph to read', ctx.parsed.root);
    throw new CGMLError(ctx.report.findings);
  }
  return finish(ctx);
}

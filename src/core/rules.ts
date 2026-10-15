/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The validation rule registry and the layer runner
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

import type { Result } from './dialect';
import { Finding, Report } from './findings';
import type { Document } from './model';
import { DIALECT_REQUIREMENTS, REQUIREMENTS } from './requirements';
import type { ParsedDocument, XElement } from './xml';

/** A registered check: its requirement, layer and severity. */
export interface Rule {
  name: string;
  req: string | null;
  layer: number;
  severity: string;
  title: string;
  func: ((ctx: Context) => void) | null;
  note: string | null;
  also: string[]; // further requirement ids the rule covers
}

export const REGISTRY: Map<string, Rule> = new Map();

function register(ruleObj: Rule): void {
  if (REGISTRY.has(ruleObj.name)) {
    throw new Error(`duplicate rule name: ${ruleObj.name}`);
  }
  for (const req of [ruleObj.req, ...ruleObj.also]) {
    if (req !== null && !REQUIREMENTS.has(req) && !DIALECT_REQUIREMENTS.has(req)) {
      throw new Error(`unknown requirement: ${req}`);
    }
  }
  REGISTRY.set(ruleObj.name, ruleObj);
}

/** Register a callable check; the callable receives the layer context. */
export function rule(
  name: string,
  req: string | null,
  layer: number,
  severity: string,
  title: string,
  func: (ctx: Context) => void,
  also: string[] = [],
): void {
  register({ name, req, layer, severity, title, func, note: null, also });
}

/** Register a rule emitted by a walker or the parser (no callable). */
export function declare(
  name: string,
  req: string | null,
  layer: number,
  severity: string,
  title: string,
  note: string | null = null,
  also: string[] = [],
): void {
  register({ name, req, layer, severity, title, func: null, note, also });
}

export interface Position {
  line?: number | null;
  column?: number | null;
  path?: string | null;
}

/** The state passed to the checks of one validation layer. */
export class Context {
  layer = 0;
  parsed: ParsedDocument | null = null; // after L1
  model: Document | null = null; // after the model build
  dialect: Result | null = null; // when a dialect pass ran

  constructor(
    public report: Report,
    public filename: string,
  ) {}

  /** Report a finding of the named rule, located at elem. */
  emit(name: string, message: string, elem: XElement | null = null, pos: Position = {}): void {
    const ruleObj = REGISTRY.get(name);
    if (ruleObj === undefined) {
      throw new Error(`unknown rule: ${name}`);
    }
    let line = pos.line ?? null;
    let column = pos.column ?? null;
    let path = pos.path ?? null;
    if (elem !== null && this.parsed !== null) {
      const info = this.parsed.info.get(elem);
      if (info !== undefined) {
        line = pos.line ?? info[0];
        column = pos.column ?? info[1];
        path = pos.path ?? info[2];
      }
    }
    this.report.add(
      new Finding(name, ruleObj.req, ruleObj.layer, ruleObj.severity, message, line, column, path),
    );
  }

  get doc(): Document {
    if (this.model === null) {
      throw new Error('the model is not built');
    }
    return this.model;
  }
}

/** Run the callable checks of one layer. */
export function runLayer(ctx: Context, layer: number): void {
  ctx.layer = layer;
  for (const ruleObj of REGISTRY.values()) {
    if (ruleObj.layer === layer && ruleObj.func !== null) {
      ruleObj.func(ctx);
    }
  }
  ctx.report.layersRun.push(layer);
}

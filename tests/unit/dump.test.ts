/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The canonical dump tests
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

import { readFileSync } from 'fs';
import { join } from 'path';

import { minimal } from './docbuilder';

import { render } from '../../src/core/dump';
import { runDocument } from '../../src/core/reader';
import { Context } from '../../src/core/rules';

const EXAMPLES = join(__dirname, 'examples');

function validated(data: Uint8Array, filename = 'test.graphml'): Context {
  const ctx = runDocument(data, filename);
  expect(ctx.report.findings.filter((f) => f.severity === 'ERROR').map((f) => f.rule)).toEqual([]);
  return ctx;
}

function example(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(EXAMPLES, name)));
}

test.each(['minimal', 'hierarchy', 'extensions'])('the dump of %s matches the expected', (name) => {
  const ctx = validated(example(name + '.graphml'), name + '.graphml');
  expect(ctx.report.findings).toEqual([]);
  expect(render(ctx.doc)).toBe(readFileSync(join(EXAMPLES, name + '.expected.txt'), 'utf-8'));
});

test('dump deterministic', () => {
  const first = validated(example('hierarchy.graphml'));
  const second = validated(example('hierarchy.graphml'));
  expect(render(first.doc)).toBe(render(second.doc));
  expect(render(first.doc)).toBe(render(first.doc));
});

test('default and declared key twins dump identically', () => {
  const declared = validated(minimal());
  const defaults = validated(minimal({ keys: '' }));
  expect(render(declared.doc)).toBe(render(defaults.doc));
});

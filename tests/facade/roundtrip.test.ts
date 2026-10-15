/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The 2.0 interface over the examples: read, write, the same canonical dump
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

import { CGMLError, dumpCGML, exportGraphml, parseCGML } from '../../src';
import * as core from '../../src/core';

const EXAMPLES = join(__dirname, '..', 'examples');
const MANIFEST: Record<string, { reject?: string }> = JSON.parse(
  readFileSync(join(EXAMPLES, 'standard', 'manifest.json'), 'utf-8'),
).fixtures;
const CORPUS: Record<string, { status: string }> = JSON.parse(
  readFileSync(join(EXAMPLES, 'lapki', 'manifest.json'), 'utf-8'),
).documents;
const POSITIVE = Object.keys(MANIFEST)
  .filter((n) => MANIFEST[n].reject === undefined)
  .sort();
const NEGATIVE = Object.keys(MANIFEST)
  .filter((n) => MANIFEST[n].reject !== undefined)
  .sort();
const VALID = Object.keys(CORPUS)
  .filter((n) => CORPUS[n].status === 'valid')
  .sort();
const INVALID = Object.keys(CORPUS)
  .filter((n) => CORPUS[n].status !== 'valid')
  .sort();

// a component comment is written from its parameters: no trailing empty lines in its body
function bodies(dump: string): string {
  return dump.replace(/^( +body: ".*?)(\\n)+"$/gm, '$1"');
}

function text(dir: string, name: string, suffix: string): string {
  return readFileSync(join(EXAMPLES, dir, name + suffix), 'utf-8');
}

test.each(POSITIVE)('%s: read strictly, written, the expected dump', (name) => {
  const elements = parseCGML(text('standard', name, '.graphml'), { strict: true });
  expect(elements.findings!.filter((f) => f.severity === 'ERROR')).toEqual([]);
  expect(bodies(dumpCGML(elements))).toBe(bodies(text('standard', name, '.expected.txt')));
});

test.each(NEGATIVE)('%s: rejected by the strict read', (name) => {
  expect(() => parseCGML(text('standard', name, '.graphml'), { strict: true })).toThrow(CGMLError);
});

// the documents the 2.0 interface reads as 1.x did, not as the core does
const FACADE_READINGS: Record<string, string> = {
  'compiler-initial-states': 'a lone trigger on an initial transition is its behaviour',
};

test.each(VALID)('%s: the Lapki document written as the expected standard document', (name) => {
  const elements = parseCGML(text('lapki', name, '.graphml'));
  const written = exportGraphml(elements);
  const again = core.read(written, { strict: true });
  expect(again.label).toBe(core.FORMAT_STANDARD);
  if (FACADE_READINGS[name] === undefined) {
    expect(core.dump(again)).toBe(text('lapki', name, '.expected.txt'));
  }
});

test('a lone trigger on an initial transition is read and written as its behaviour', () => {
  const elements = parseCGML(text('lapki', 'compiler-initial-states', '.graphml'));
  const sm = Object.values(elements.stateMachines)[0];
  const initial = Object.values(sm.transitions).filter((t) => t.source in sm.initialStates);
  const behaviour = initial.filter((t) => t.actions.length);
  expect(behaviour.length).toBeGreaterThan(0);
  for (const transition of behaviour) {
    expect(transition.actions).toEqual([{ action: expect.stringContaining('println') }]);
  }
  const again = parseCGML(exportGraphml(elements), { strict: true });
  const written = Object.values(again.stateMachines)[0].transitions;
  for (const transition of behaviour) {
    expect(written[transition.id].actions).toEqual(transition.actions);
  }
  // the core keeps the standard grammar: the text is an event name
  const machine = core.read(text('lapki', 'compiler-initial-states', '.graphml')).machines[0];
  const edge = machine.transitions.find((t) => t.id === behaviour[0].id)!;
  expect(edge.blocks[0].trigger).toBe(behaviour[0].actions[0].action);
});

test.each(INVALID)('%s: the invalid Lapki document is refused by the writer', (name) => {
  const elements = parseCGML(text('lapki', name, '.graphml'));
  expect(elements.findings!.some((f) => f.severity === 'ERROR')).toBe(true);
  expect(() => exportGraphml(elements)).toThrow(CGMLError);
});

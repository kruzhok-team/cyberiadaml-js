/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The 2.1 fields: the elements of the extension profiles
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

import { CGMLDataNode, CGMLElements, exportGraphml, parseCGML } from '../../src';
import * as core from '../../src/core';
import { STANDARD_KEY_IDS } from '../../src/core/keys';

const EXAMPLES = join(__dirname, '..', 'examples', 'standard');
const MANIFEST: Record<string, { reject?: string }> = JSON.parse(
  readFileSync(join(EXAMPLES, 'manifest.json'), 'utf-8'),
).fixtures;
const POSITIVE = Object.keys(MANIFEST)
  .filter((n) => MANIFEST[n].reject === undefined)
  .sort();

function read(name: string): CGMLElements {
  return parseCGML(readFileSync(join(EXAMPLES, `${name}.graphml`), 'utf-8'), { strict: true });
}

function allData(elements: CGMLElements): CGMLDataNode[] {
  // the metadata node and the component comments keep their geometry among the data
  const data: CGMLDataNode[] = [];
  for (const sm of Object.values(elements.stateMachines)) {
    data.push(...(sm.unsupportedDataNodes ?? []));
    const records = [
      sm.states,
      sm.transitions,
      sm.links ?? {},
      sm.notes,
      sm.initialStates,
      sm.finals,
      sm.choices,
      sm.terminates,
      sm.shallowHistory,
      sm.deepHistory,
      sm.entryPoints ?? {},
      sm.exitPoints ?? {},
      sm.unknownVertexes,
    ];
    for (const record of records) {
      for (const item of Object.values<{ unsupportedDataNodes?: CGMLDataNode[] }>(record)) {
        data.push(...(item.unsupportedDataNodes ?? []));
      }
    }
    for (const state of Object.values(sm.states)) {
      for (const region of state.regions ?? []) {
        data.push(...region.unsupportedDataNodes);
      }
    }
  }
  return data;
}

test.each(POSITIVE)('%s: no standard key left among the untyped data', (name) => {
  const keys = allData(read(name)).map((d) => d.key);
  expect(keys.filter((key) => STANDARD_KEY_IDS.has(key))).toEqual([]);
});

test('submachine states and their typed entry and exit points', () => {
  const elements = read('ext/F-EXT-SUB');
  const caller = elements.stateMachines['M1'];
  const callee = elements.stateMachines['M2'];
  expect(caller.states['sub0'].submachine).toBe('M2');
  expect(caller.states['s1'].submachine).toBeUndefined();
  expect(Object.keys(caller.entryPoints!)).toEqual(['sub0::en']);
  expect(caller.entryPoints!['sub0::en'].parent).toBe('sub0');
  expect(Object.keys(caller.exitPoints!)).toEqual(['sub0::ex']);
  expect(Object.keys(callee.entryPoints!)).toEqual(['m2en']);
  expect(caller.unknownVertexes).toEqual({});
});

test('a collapsed state, its region and a comment link to a transition', () => {
  const sm = read('ext/F-EXT-C').stateMachines['M1'];
  expect(sm.states['c0'].collapsed).toBe(true);
  expect(sm.states['n0'].collapsed).toBeUndefined();
  expect(sm.states['c0'].regions!.map((r) => r.id)).toEqual(['c0:']);
  expect(sm.states['cs1'].region).toBe('c0:');
  expect(sm.links!['cN-t#1']).toMatchObject({ target: 'n0-c0#1', pivot: 'dData', chunk: 'WORK' });
});

test('markup, colours and formal names', () => {
  let sm = read('ext/F-EXT-D').stateMachines['G'];
  expect(sm.notes['cDoc'].markup).toBe('markdown');
  expect(sm.notes['cPlain'].markup).toBeUndefined();
  expect(sm.states['n0'].color).toBe('#FF8800');
  sm = read('ext/F-EXT-P').stateMachines['G'];
  expect(sm.formalName).toBe('platform_sm');
  expect(sm.states['n0'].formalName).toBe('idle_state');
});

test('the full geometry: the label rect, the source and target points', () => {
  const sm = read('geometry/F-GEO-F').stateMachines['G'];
  expect(sm.position).toEqual({ x: -100.5, y: -50.25 });
  const transition = sm.transitions['n0-n1#1'];
  expect(transition.labelPosition).toEqual({ x: 60, y: 20, width: 48.5, height: 14 });
  expect(transition.sourcePoint).toEqual({ x: 39.5, y: 40.5 });
  expect(transition.targetPoint).toEqual({ x: 140, y: 40.5 });
  expect(sm.transitions['n1-n1#1'].polyline!.length).toBe(3);
});

test('the typed fields win over the same keys given as data', () => {
  const elements = read('ext/F-EXT-P');
  const state = elements.stateMachines['G'].states['n0'];
  state.unsupportedDataNodes.push({ key: 'dFormalName', content: 'old_name' });
  state.formalName = 'new_name';
  state.collapsed = false;
  const document = core.read(exportGraphml(elements), { strict: true });
  const node = document.machines[0].children.find((n) => n.id === 'n0')!;
  expect(node.formalName).toBe('new_name');
});

test('a submachine state written from its typed reference', () => {
  const elements = read('ext/F-EXT-SUB');
  const caller = elements.stateMachines['M1'];
  caller.states['sub0'].unsupportedDataNodes = [];
  const again = parseCGML(exportGraphml(elements), { strict: true });
  expect(again.stateMachines['M1'].states['sub0'].submachine).toBe('M2');
  expect(Object.keys(again.stateMachines['M1'].entryPoints!)).toEqual(['sub0::en']);
});

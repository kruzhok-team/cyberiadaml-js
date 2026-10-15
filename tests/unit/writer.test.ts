/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The writer of the core
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

import { KEYS, META_NODE, minimal } from './docbuilder';

import * as core from '../../src/core';
import { Report } from '../../src/core/findings';
import { Context } from '../../src/core/rules';
import { load, XElement } from '../../src/core/xml';

const COMPOSITE = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Composite</data>
${META_NODE}\
    <node id="note">
      <data key="dNote">informal</data>
      <data key="dData">see Outer</data>
    </node>
    <node id="n1">
      <data key="dName">Outer</data>
      <data key="dCollapsed"/>
      <data key="dLapkiFlag">on</data>
      <graph id="first">
        <data key="dRegion"/>
        <node id="a"><data key="dName">A</data></node>
      </graph>
      <graph id="second">
        <data key="dRegion"/>
        <node id="b"><data key="dName">B</data></node>
      </graph>
    </node>
    <edge id="note-n1" source="note" target="n1">
      <data key="dPivot"/>
    </edge>
  </graph>
`;

const FLAG_KEY = '  <key id="dLapkiFlag" for="node" attr.name="flag" attr.type="string"/>\n';

function tree(text: string): XElement {
  return load(text, new Context(new Report(), 'test.graphml'))!.root;
}

function nodeById(root: XElement, id: string): XElement {
  return [...root.iter('node')].find((n) => n.get('id') === id)!;
}

function failure(write: () => unknown): core.CGMLError {
  try {
    write();
  } catch (error) {
    if (error instanceof core.CGMLError) {
      return error;
    }
    throw error;
  }
  throw new Error('the document was written');
}

test('regions, collapsed states, links and extension data', () => {
  const document = core.read(minimal({ keys: KEYS + FLAG_KEY, machines: COMPOSITE }), {
    strict: true,
  });
  const text = core.write(document);
  const again = core.read(text, { strict: true });
  expect(core.dump(again)).toBe(core.dump(document));
  const root = tree(text);
  const keys = root.children
    .filter((k) => k.tag === 'key')
    .map((k) => [k.get('id'), k.get('for'), k.get('attr.name')]);
  expect(keys).toEqual(document.keys.map((k) => [k.id, k.forKind, k.attrName]));
  expect(root.children[0].tag).toBe('data');
  const outer = nodeById(root, 'n1');
  expect(outer.children.filter((g) => g.tag === 'graph').map((g) => g.get('id'))).toEqual([
    'first',
    'second',
  ]);
  expect(outer.children.filter((d) => d.tag === 'data').map((d) => d.get('key'))).toEqual([
    'dName',
    'dCollapsed',
    'dLapkiFlag',
  ]);
});

test('the metadata node opens the first machine only', () => {
  const document = core.read(minimal(), { strict: true });
  const machine = document.machines[0];
  machine.children.push(machine.children.shift()!);
  const root = tree(core.write(document));
  const first = root.children.filter((g) => g.tag === 'graph')[0];
  expect(first.children.filter((n) => n.tag === 'node')[0].get('id')).toBe('nMeta');
});

test('a model without a metadata node gets one from metaParams', () => {
  const document = core.read(minimal(), { strict: true });
  const machine = document.machines[0];
  machine.children.splice(machine.children.indexOf(document.metaComment!), 1);
  document.metaComment = null;
  document.metaParams = [
    new core.Param('standardVersion', '1.0', 0),
    new core.Param('name', 'Built', 2),
  ];
  const again = core.read(core.write(document), { strict: true });
  expect(again.param('name')).toBe('Built');
  expect(document.metaComment).toBeNull();
});

test('regions without an id get <state id>::region ids', () => {
  const document = core.read(minimal({ keys: KEYS + FLAG_KEY, machines: COMPOSITE }), {
    strict: true,
  });
  const outer = document.machines[0].children.find((n) => n.id === 'n1') as core.State;
  for (const region of outer.regions) {
    region.id = null;
  }
  const node = nodeById(tree(core.write(document)), 'n1');
  expect(node.children.filter((g) => g.tag === 'graph').map((g) => g.get('id'))).toEqual([
    'n1::region',
    'n1::region-2',
  ]);
});

test('the shortest round-trip form of the coordinates', () => {
  const document = core.read(minimal(), { strict: true });
  const state = document.machines[0].children.find((n) => n.id === 'n0')!;
  state.geometry = new core.Rect(10.0, 2.5, 100.0, 0.1);
  const rect = [...tree(core.write(document)).iter('rect')][0];
  expect(Object.fromEntries(rect.attrib)).toEqual({
    x: '10',
    y: '2.5',
    width: '100',
    height: '0.1',
  });
});

test('a transition to a missing node is refused', () => {
  const document = core.read(minimal(), { strict: true });
  document.machines[0].transitions[0].target = 'missing';
  const error = failure(() => core.write(document));
  expect(error.findings.map((f) => f.req)).toContain('CGML-6.3-2');
});

test('a data without a key read permissively is refused', () => {
  const document = core.read(
    minimal({ machines: COMPOSITE.replace('<data key="dLapkiFlag">on</data>', '<data>on</data>') }),
  );
  const error = failure(() => core.write(document));
  expect(error.findings.map((f) => f.req)).toContain('CGML-5.5-3');
});

test('declared keys are kept, missing extension keys declared', () => {
  const document = core.read(minimal({ keys: KEYS + FLAG_KEY, machines: COMPOSITE }), {
    strict: true,
  });
  document.keys = document.keys.filter((k) => k.id !== 'dLapkiFlag');
  let root = tree(core.write(document));
  const keys = root.children.filter((k) => k.tag === 'key').map((k) => [k.get('id'), k.get('for')]);
  expect(keys.at(-1)).toEqual(['dLapkiFlag', 'node']);
  expect(keys).not.toContainEqual(['dCollapsed', 'node']);
  document.keys = [];
  root = tree(core.write(document));
  const generated = root.children
    .filter((k) => k.tag === 'key')
    .map((k) => [k.get('id'), k.get('for'), k.get('attr.name')]);
  expect(generated).toContainEqual(['dCollapsed', 'node', 'collapsed']);
  expect(generated[0]).toEqual(['gFormat', 'graphml', 'format']);
});

test('the writer output equals the canonical form of a written document', () => {
  // a second write of a written document is the same text
  const document = core.read(minimal({ keys: KEYS + FLAG_KEY, machines: COMPOSITE }), {
    strict: true,
  });
  const text = core.write(document);
  expect(core.write(core.read(text, { strict: true }))).toBe(text);
});

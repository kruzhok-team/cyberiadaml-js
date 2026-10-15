/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The reader of the core: the modes, the fatal findings, the additions
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

import { encode, KEYS, META_NODE, minimal, minimalText } from './docbuilder';

import * as core from '../../src/core';

const TWINS = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Twins</data>
${META_NODE}\
    <node id="a">
      <data key="dName">Same</data>
    </node>
    <node id="b">
      <data key="dName">Same</data>
    </node>
  </graph>
`;

const RICH_KEYS =
  KEYS +
  `\
  <key id="dLapkiNoteFormat" for="node" attr.name="noteFormat"
       attr.type="string"/>
`;

const RICH = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Rich</data>
${META_NODE}\
    <node id="cLED">
      <data key="dNote">formal</data>
      <data key="dName">CGML_COMPONENT LED1</data>
      <data key="dData">type/ LED

pin/ 13</data>
    </node>
    <node id="n1">
      <data key="dName">Outer</data>
      <graph id="n1::r">
        <node id="n1::n2">
          <data key="dName">Inner</data>
          <data key="dLapkiNoteFormat">bgColor/ red</data>
        </node>
      </graph>
    </node>
    <edge id="n1-n1::n2" source="n1" target="n1::n2"/>
  </graph>
`;

function failure(read: () => unknown): core.CGMLError {
  try {
    read();
  } catch (error) {
    if (error instanceof core.CGMLError) {
      return error;
    }
    throw error;
  }
  throw new Error('the document was read');
}

test('a permissive read keeps an ERROR finding', () => {
  const document = core.read(minimal({ machines: TWINS }));
  const errors = document.findings.filter((f) => f.severity === core.ERROR).map((f) => f.req);
  expect(errors).toEqual(['CGML-6.2-3']);
});

test('a strict read throws on an ERROR finding', () => {
  const error = failure(() => core.read(minimal({ machines: TWINS }), { strict: true }));
  expect(error.message).toContain('CGML-6.2-3');
});

test.each(['', '<graphml>', '<other/>'])(
  'an unreadable document %j throws in both modes',
  (text) => {
    for (const strict of [false, true]) {
      expect(() => core.read(encode(text), { strict })).toThrow(core.CGMLError);
    }
  },
);

test('a document without a state machine throws', () => {
  const error = failure(() => core.read(minimal({ machines: '' })));
  expect(error.findings.map((f) => f.req)).toContain('CGML-5.6-2');
});

test('duplicate node ids in one machine throw', () => {
  expect(() => core.read(minimal({ machines: TWINS.replaceAll('"b"', '"a"') }))).toThrow(
    core.CGMLError,
  );
});

test('the reader takes text as well as bytes', () => {
  expect(core.read(minimalText()).machines[0].name).toBe('Test machine');
});

test('the parents, the source lines and the extension data', () => {
  const document = core.read(minimal({ keys: RICH_KEYS, machines: RICH }));
  const machine = document.machines[0];
  const outer = machine.children.find((n) => n.id === 'n1') as core.State;
  const region = outer.regions[0];
  const inner = region.children[0];
  expect(outer.parent).toBe(machine);
  expect(region.parent).toBe(outer);
  expect(inner.parent).toBe(region);
  expect(machine.transitions[0].parent).toBe(machine);
  expect(inner.line).not.toBeNull();
  expect(inner.line!).toBeGreaterThan(outer.line!);
  expect(inner.extensions.map((e) => [e.key, e.text])).toEqual([
    ['dLapkiNoteFormat', 'bgColor/ red'],
  ]);
  expect(outer.extensions).toEqual([]);
});

test('the component of a component comment', () => {
  const document = core.read(minimal({ keys: RICH_KEYS, machines: RICH }));
  const comments = new Map(
    document.machines[0].children
      .filter((n): n is core.Comment => n instanceof core.Comment)
      .map((n) => [n.id, n]),
  );
  const [ident, kind, params] = comments.get('cLED')!.component()!;
  expect([ident, kind]).toEqual(['LED1', 'LED']);
  expect(params.map((p) => [p.name, p.value])).toEqual([['pin', '13']]);
  expect(comments.get('nMeta')!.component()).toBeNull();
  expect(document.metaId).toBe('nMeta');
});

test('the format label and the per-machine parameters (D-1)', () => {
  let document = core.read(minimal());
  expect(document.label).toBe(core.FORMAT_STANDARD);
  expect(document.machines[0].params).toEqual([]);
  const second = META_NODE.replaceAll('nMeta', 'nMeta2').replaceAll(
    'standardVersion/ 1.0',
    'standardVersion/ 1.0\n\nplatform/ B',
  );
  const machines =
    TWINS.replaceAll('"b"', '"c"').replace('>Same<', '>A<') +
    TWINS.replaceAll('"G"', '"G2"')
      .replaceAll('Twins', 'Other')
      .replaceAll(META_NODE, second)
      .replaceAll('"a"', '"x"')
      .replaceAll('"b"', '"y"');
  document = core.read(minimal({ machines }));
  expect(document.label).toBe(core.FORMAT_LAPKI);
  const params = document.machines[1].params;
  expect(params.map((p) => [p.name, p.value]).at(-1)).toEqual(['platform', 'B']);
});

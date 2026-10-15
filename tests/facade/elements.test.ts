/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The 2.0 elements written and read: the lapki-client builder input, the helpers
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

import {
  CGMLElements,
  CGMLError,
  CGMLStateMachine,
  createEmptyElements,
  createEmptyTextElements,
  emptyCGMLStateMachine,
  exportGraphml,
  exportTextGraphml,
  parseCGML,
  parseParameters,
  serializeActions,
  serializeMeta,
  serializeParameters,
  serialaizeParameters,
} from '../../src';
import * as core from '../../src/core';

// the key list lapki-client's GraphmlBuilder.ts gives
const LAPKI_KEYS = [
  { id: 'dName', for: 'node', 'attr.name': 'name', 'attr.type': 'string' },
  { id: 'dData', for: 'node', 'attr.name': 'data', 'attr.type': 'string' },
  { id: 'dData', for: 'edge', 'attr.name': 'data', 'attr.type': 'string' },
  { id: 'dInitial', for: 'node', 'attr.name': 'initial', 'attr.type': 'string' },
  { id: 'dGeometry', for: 'edge' },
  { id: 'dGeometry', for: 'node' },
  { id: 'dColor', for: 'edge' },
  { id: 'dNote', for: 'node' },
  { id: 'dColor', for: 'node' },
];

/** A machine as lapki-client's exportCGML() builds it. */
function lapkiMachine(name: string): CGMLStateMachine {
  return {
    ...emptyCGMLStateMachine(),
    name,
    standardVersion: '1.0',
    platform: 'ArduinoUno',
    meta: {
      id: 'coreMeta',
      values: {
        name: 'Blinker',
        author: 'Lapki IDE TEAM',
        standardVersion: '1.0',
        platformVersion: '1.0',
        lapkiVisual: 'true',
      },
    },
    position: { x: 0, y: 0 },
    dimensions: { width: 450, height: 100 },
    components: {
      cLED1: {
        id: 'LED1',
        type: 'LED',
        parameters: { name: 'Diode', pin: '12' },
        order: 0,
        unsupportedDataNodes: [
          { key: 'dLapkiSchemePosition', content: '', point: [{ x: 20, y: 60 }], rect: undefined },
        ],
      },
    },
    states: {
      on: {
        name: 'On',
        unsupportedDataNodes: [],
        actions: [{ trigger: { event: 'entry', condition: undefined }, action: 'LED1.on()' }],
        color: '#FFFFFF',
        bounds: { x: 80, y: 50, width: 450, height: 95 },
      },
      off: {
        name: 'Off',
        unsupportedDataNodes: [],
        actions: [{ trigger: { event: 'exit' }, action: 'LED1.off()\ntimer1.stop()' }],
        parent: 'on',
        bounds: { x: 10, y: 120, width: 200, height: 95 },
      },
    },
    initialStates: { init: { data: '', type: 'initial', position: { x: 30, y: 30 } } },
    transitions: {
      'init-on': {
        id: 'init-on',
        source: 'init',
        target: 'on',
        actions: [],
        unsupportedDataNodes: [],
      },
      t1: {
        id: 't1',
        source: 'on',
        target: 'off',
        pivot: undefined,
        unsupportedDataNodes: [],
        labelPosition: { x: 100, y: 40 },
        actions: [
          {
            trigger: { event: 'timer1.timeout', condition: 'LED1.value == 1' },
            action: 'LED1.off()',
          },
        ],
      },
      t2: {
        id: 't2',
        source: 'off',
        target: 'on',
        unsupportedDataNodes: [],
        actions: [{ trigger: { event: undefined, condition: 'else' } }],
      },
    },
    notes: {
      note: {
        name: undefined,
        text: 'A blinker',
        position: { x: 300, y: 300 },
        type: 'informal',
        unsupportedDataNodes: [
          {
            key: 'dLapkiNoteFormat',
            content: 'bgColor/ red\n\n',
            rect: undefined,
            point: undefined,
          },
        ],
      },
    },
  };
}

function lapkiElements(): CGMLElements {
  const elements = createEmptyElements();
  elements.format = 'Cyberiada-GraphML-1.0';
  elements.stateMachines['A'] = lapkiMachine('First');
  elements.stateMachines['B'] = lapkiMachine('Second');
  elements.keys = LAPKI_KEYS;
  return elements;
}

test('the lapki-client builder input is written as a standard document', () => {
  const text = exportGraphml(lapkiElements());
  const document = core.read(text, { strict: true });
  expect(document.label).toBe(core.FORMAT_STANDARD);
  // one metadata node, in the first machine, platform from the machine
  expect(document.metaId).toBe('coreMeta');
  expect(document.machines[0].children[0]).toBe(document.metaComment);
  expect(document.metaParams.map((p) => p.name)).toEqual([
    'standardVersion',
    'name',
    'author',
    'platformVersion',
    'lapkiVisual',
    'platform',
  ]);
  expect(text.match(/CGML_META/g)!.length).toBe(1);
  // appendix B declarations for the standard keys in use, the private keys declared, no dInitial
  const keys = document.keys.map((k) => [k.id, k.forKind, k.attrName]);
  expect(keys[0]).toEqual(['gFormat', 'graphml', 'format']);
  expect(keys).toContainEqual(['dStateMachine', 'graph', 'stateMachine']);
  expect(keys).toContainEqual(['dLapkiSchemePosition', 'node', 'lapkiSchemePosition']);
  expect(keys.map(([id]) => id)).not.toContain('dInitial');
  // the component: its id in the name, the position as text (D-5)
  const component = document.machines[0].children.find((n) => n.id === 'cLED1') as core.Comment;
  expect(component.name).toBe('CGML_COMPONENT LED1');
  expect(component.body).toBe('type/ LED\n\nname/ Diode\n\npin/ 12');
  expect(component.extensions.map((e) => [e.key, e.text])).toEqual([
    ['dLapkiSchemePosition', 'x/ 20\n\ny/ 60'],
  ]);
  // the ids of the second machine made unique
  const second = document.machines[1];
  expect(second.children.map((n) => n.id)).toEqual(['B::cLED1', 'B::on', 'B::init', 'B::note']);
  expect(second.transitions.map((t) => [t.id, t.source, t.target])).toContainEqual([
    't1#1',
    'B::on',
    'B::off',
  ]);
  // a pseudostate position is a point, the nested state sits in an implicit region
  const init = document.machines[0].children.find((n) => n.id === 'init')!;
  expect(init.geometry).toEqual(new core.Point(30, 30));
  const on = document.machines[0].children.find((n) => n.id === 'on') as core.State;
  expect(on.regions.map((r) => r.id)).toEqual(['on::region']);
  expect(text).toContain('<graph id="on::region">');
});

test('the lapki-client builder input reads back as it was given', () => {
  const elements = parseCGML(exportGraphml(lapkiElements()));
  const sm = elements.stateMachines['A'];
  expect(sm.platform).toBe('ArduinoUno');
  expect(sm.meta.values).toEqual({
    name: 'Blinker',
    author: 'Lapki IDE TEAM',
    platformVersion: '1.0',
    lapkiVisual: 'true',
  });
  expect(elements.meta!.values['platform']).toBe('ArduinoUno');
  expect(elements.stateMachines['B'].platform).toBe('ArduinoUno');
  expect(sm.components['cLED1']).toEqual({
    id: 'LED1',
    type: 'LED',
    parameters: { name: 'Diode', pin: '12' },
    order: 0,
    unsupportedDataNodes: [
      { key: 'dLapkiSchemePosition', content: 'x/ 20\n\ny/ 60', point: [{ x: 20, y: 60 }] },
    ],
  });
  expect(sm.states['on'].actions).toEqual([{ trigger: { event: 'entry' }, action: 'LED1.on()' }]);
  expect(sm.states['off']).toMatchObject({
    parent: 'on',
    actions: [{ trigger: { event: 'exit' }, action: 'LED1.off()\ntimer1.stop()' }],
    bounds: { x: 10, y: 120, width: 200, height: 95 },
  });
  expect(sm.transitions['t1']).toMatchObject({
    labelPosition: { x: 100, y: 40 },
    actions: [
      { trigger: { event: 'timer1.timeout', condition: 'LED1.value == 1' }, action: 'LED1.off()' },
    ],
  });
  expect(sm.transitions['t2'].actions).toEqual([{ trigger: { condition: 'else' } }]);
  expect(sm.transitions['init-on'].actions).toEqual([]);
  expect(sm.initialStates['init'].position).toEqual({ x: 30, y: 30 });
  expect(sm.notes['note']).toMatchObject({
    text: 'A blinker',
    type: 'informal',
    position: { x: 300, y: 300 },
    unsupportedDataNodes: [{ key: 'dLapkiNoteFormat', content: 'bgColor/ red\n\n' }],
  });
});

test('a parent that is not a state is refused', () => {
  const elements = lapkiElements();
  elements.stateMachines['A'].states['off'].parent = 'init';
  expect(() => exportGraphml(elements)).toThrow(CGMLError);
});

test('a broken model is refused with the findings of the strict reading', () => {
  const elements = lapkiElements();
  elements.stateMachines['A'].transitions['t1'].target = 'missing';
  try {
    exportGraphml(elements);
    throw new Error('written');
  } catch (error) {
    expect(error).toBeInstanceOf(CGMLError);
    expect((error as CGMLError).findings.map((f) => f.req)).toContain('CGML-6.3-2');
  }
});

test('regions by id, links, the deprecated pivot of a transition', () => {
  const elements = createEmptyElements();
  const sm: CGMLStateMachine = { ...emptyCGMLStateMachine(), name: 'M', standardVersion: '1.0' };
  sm.states = {
    s: {
      name: 'S',
      actions: [],
      unsupportedDataNodes: [],
      regions: [
        { id: 'r1', name: 'Left', unsupportedDataNodes: [] },
        { id: 'r2', unsupportedDataNodes: [] },
      ],
    },
    a: { name: 'A', actions: [], unsupportedDataNodes: [], parent: 's', region: 'r2' },
    b: { name: 'B', actions: [], unsupportedDataNodes: [], parent: 's' },
  };
  sm.notes = { c: { text: 'see S', type: 'informal', unsupportedDataNodes: [] } };
  sm.links = {
    l1: {
      id: 'l1',
      source: 'c',
      target: 's',
      pivot: 'dName',
      chunk: 'S',
      unsupportedDataNodes: [],
    },
  };
  sm.transitions = {
    l2: { id: 'l2', source: 'c', target: 'a', pivot: '', actions: [], unsupportedDataNodes: [] },
  };
  elements.stateMachines['G'] = sm;
  const again = parseCGML(exportGraphml(elements), { strict: true }).stateMachines['G'];
  expect(again.states['s'].regions!.map((r) => [r.id, r.name])).toEqual([
    ['r1', 'Left'],
    ['r2', undefined],
  ]);
  expect(again.states['a']).toMatchObject({ parent: 's', region: 'r2' });
  expect(again.states['b']).toMatchObject({ parent: 's', region: 'r1' });
  expect(again.links).toEqual({
    l1: {
      id: 'l1',
      source: 'c',
      target: 's',
      pivot: 'dName',
      chunk: 'S',
      unsupportedDataNodes: [],
    },
    l2: { id: 'l2', source: 'c', target: 'a', pivot: '', unsupportedDataNodes: [] },
  });
  expect(again.transitions).toEqual({});
});

test('the text model writes the behaviour text as it is', () => {
  const elements = createEmptyTextElements();
  const sm = { ...emptyCGMLStateMachine(), name: 'M', standardVersion: '1.0' };
  elements.stateMachines['G'] = {
    ...sm,
    states: { s: { name: 'S', actions: 'entry/\non()\n\nTICK/ defer', unsupportedDataNodes: [] } },
    transitions: {},
  };
  const again = parseCGML(exportTextGraphml(elements), { strict: true }).stateMachines['G'];
  expect(again.states['s'].actions).toEqual([
    { trigger: { event: 'entry' }, action: 'on()' },
    { trigger: { event: 'TICK', postfix: 'defer' } },
  ]);
});

test('the behaviour text of the actions', () => {
  expect(serializeActions([{ trigger: { event: 'entry' }, action: 'a()\nb()' }])).toBe(
    'entry/\na()\nb()',
  );
  expect(
    serializeActions([
      { trigger: { event: 'E', condition: 'x > [1]', postfix: 'propagate' }, action: 'go()' },
      { trigger: { event: 'T', postfix: 'defer' } },
    ]),
  ).toBe('E [x > \\[1\\]] propagate/\ngo()\n\nT/ defer');
  expect(serializeActions([{ trigger: { condition: 'else' } }])).toBe('[else]/');
  expect(serializeActions([{ action: 'finish()' }])).toBe('/\nfinish()');
  const text = exportTextGraphml({
    ...createEmptyTextElements(),
    stateMachines: {
      G: {
        ...emptyCGMLStateMachine(),
        name: 'M',
        states: {
          s: {
            name: 'S',
            unsupportedDataNodes: [],
            actions: serializeActions([
              { trigger: { event: 'E', condition: 'x > [1]', postfix: 'block' }, action: 'go()' },
            ]),
          },
        },
        transitions: {},
      },
    },
  });
  const state = core.read(text, { strict: true }).machines[0].children[1] as core.State;
  expect(state.blockErrors).toEqual([]);
  expect([state.blocks[0].trigger, state.blocks[0].guard, state.blocks[0].param]).toEqual([
    'E',
    'x > [1]',
    'block',
  ]);
});

test('the parameter helpers', () => {
  expect(parseParameters('id/ c1\n\ntype/  LED \n\nname/ Front light')).toEqual({
    id: 'c1',
    type: 'LED',
    name: 'Front light',
  });
  expect(serializeParameters({ a: '1', b: '2' })).toBe('a/ 1\n\nb/ 2');
  expect(serialaizeParameters).toBe(serializeParameters);
  expect(serializeMeta({ id: 'm', values: { name: 'N' } }, '1.0', 'ArduinoUno')).toBe(
    'standardVersion/ 1.0\n\nname/ N\n\nplatform/ ArduinoUno',
  );
});

test('the strict reading refuses the Lapki dialect, the permissive one repairs it', () => {
  const text = exportGraphml(lapkiElements()).replace('Cyberiada-GraphML-1.0', 'Cyberiada-GraphML');
  expect(() => parseCGML(text, { strict: true })).toThrow(CGMLError);
  const elements = parseCGML(text);
  expect(elements.findings!.map((f) => f.req)).toContain('LAPKI-D6');
  expect(elements.format).toBe('Cyberiada-GraphML-1.0');
});

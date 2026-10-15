/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L3 layer tests: attributes and values
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

import { MACHINE, META_NODE, minimal, replace } from './docbuilder';

import { runDocument } from '../../src/core/reader';
import { Context } from '../../src/core/rules';

function run(data: Uint8Array): Context {
  return runDocument(data, 'test.graphml');
}

function ruleNames(ctx: Context): string[] {
  return ctx.report.findings.map((f) => f.rule);
}

function errors(ctx: Context): string[] {
  return ctx.report.findings.filter((f) => f.severity === 'ERROR').map((f) => f.rule);
}

function warnings(ctx: Context): string[] {
  return ctx.report.findings.filter((f) => f.severity === 'WARNING').map((f) => f.rule);
}

function withMeta(body: string): Uint8Array {
  const meta = META_NODE.replaceAll('standardVersion/ 1.0', body);
  return replace(minimal(), META_NODE, meta);
}

const IDLE = '      <data key="dName">Idle</data>';

test('minimal document clean at L3', () => {
  const ctx = run(minimal());
  expect(ctx.report.findings).toEqual([]);
  expect(ctx.report.layersRun).toContain(3);
});

test('wrong gformat value rejected', () => {
  const doc = replace(minimal(), 'Cyberiada-GraphML-1.0</data>', 'Cyberiada-GraphML-2.0</data>');
  expect(errors(run(doc))).toContain('gformat-value');
});

test('empty gformat value rejected', () => {
  const doc = replace(minimal(), '>Cyberiada-GraphML-1.0</data>', '></data>');
  expect(errors(run(doc))).toContain('gformat-value');
});

test('no key block defaults apply', () => {
  const ctx = run(minimal({ keys: '' }));
  expect(ctx.report.findings).toEqual([]);
  expect(ctx.model!.param('standardVersion')).toBe('1.0');
});

test('key redeclared differently rejected', () => {
  // dName redeclared for edges
  let doc = replace(
    minimal(),
    '<key id="dName" for="graph" attr.name="name" attr.type="string"/>',
    '<key id="dName" for="edge" attr.name="name" attr.type="string"/>',
  );
  expect(errors(run(doc))).toContain('key-declarations');
  // dVertex redeclared with another attr.name
  doc = replace(
    minimal(),
    '<key id="dVertex" for="node" attr.name="vertex" attr.type="string"/>',
    '<key id="dVertex" for="node" attr.name="vrtx" attr.type="string"/>',
  );
  expect(errors(run(doc))).toContain('key-declarations');
});

test('declared custom key tolerated', () => {
  let doc = replace(
    minimal(),
    '  <graph id="G"',
    '  <key id="dCustom" for="node" attr.name="custom" attr.type="string"/>\n  <graph id="G"',
  );
  doc = replace(doc, IDLE, IDLE + '\n      <data key="dCustom">anything</data>');
  const ctx = run(doc);
  expect(ctx.report.findings).toEqual([]);
});

test('undeclared custom key rejected', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dCustom">anything</data>');
  expect(errors(run(doc))).toContain('key-declarations');
});

test('data without key rejected', () => {
  const doc = replace(minimal(), IDLE, '      <data>Idle</data>');
  expect(errors(run(doc))).toContain('data-key-attr');
});

test('graph without id rejected', () => {
  const doc = replace(
    minimal(),
    '<graph id="G" edgedefault="directed">',
    '<graph edgedefault="directed">',
  );
  expect(errors(run(doc))).toContain('element-ids');
});

test('undirected graph reported', () => {
  const doc = replace(minimal(), 'edgedefault="directed"', 'edgedefault="undirected"');
  const ctx = run(doc);
  expect(warnings(ctx)).toContain('edgedefault');
  expect(ctx.report.hasErrors()).toBe(false);
});

test('edge attribute variants rejected', () => {
  const base = '<edge id="init-n0#1" source="init" target="n0"/>';
  const variants: Array<[string, string]> = [
    ['<edge id="init-n0#1" target="n0"/>', 'edge-endpoints'],
    ['<edge id="init-n0#1" source="init"/>', 'edge-endpoints'],
    ['<edge source="init" target="n0"/>', 'element-ids'],
    ['<edge id="init-n0#1" source="" target="n0"/>', 'edge-endpoints'],
  ];
  for (const [repl, expected] of variants) {
    const ctx = run(replace(minimal(), base, repl));
    expect(errors(ctx)).toContain(expected);
  }
});

test('edge id template informational', () => {
  const doc = replace(minimal(), 'id="init-n0#1"', 'id="myedge"');
  const ctx = run(doc);
  expect(ruleNames(ctx)).toEqual(['edge-id-template']);
  expect(ctx.report.valid(true)).toBe(true);
});

test('exotic ids accepted', () => {
  let doc = replace(
    replace(minimal(), 'id="init"', 'id="in-it_#!~"'),
    'source="init"',
    'source="in-it_#!~"',
  );
  doc = replace(replace(doc, 'id="n0"', 'id="n0::n1"'), 'target="n0"', 'target="n0::n1"');
  const ctx = run(doc);
  expect(errors(ctx)).toEqual([]);
});

test('bad id characters rejected', () => {
  for (const bad of ['id="a b"', 'id="a&quot;b"', 'id="a\\\\b"', 'id="имя"']) {
    const doc = replace(minimal(), '<node id="n0">', `<node ${bad}>`);
    const ctx = run(doc);
    expect(errors(ctx)).toContain('id-charset');
  }
});

test('id length limits', () => {
  const longOk = 'x'.repeat(256);
  let ctx = run(
    replace(replace(minimal(), 'id="n0"', `id="${longOk}"`), 'target="n0"', `target="${longOk}"`),
  );
  expect(errors(ctx)).toEqual([]);
  const tooLong = 'x'.repeat(257);
  ctx = run(
    replace(replace(minimal(), 'id="n0"', `id="${tooLong}"`), 'target="n0"', `target="${tooLong}"`),
  );
  expect(errors(ctx)).toContain('id-length');
  ctx = run(replace(minimal(), '<node id="n0">', '<node id="">'));
  expect(errors(ctx)).toContain('id-length');
});

test('case sensitive ids coexist', () => {
  let doc = replace(minimal(), '<node id="n0">', '<node id="N0">');
  doc = replace(doc, 'target="n0"', 'target="N0"');
  doc = replace(
    doc,
    '</graph>',
    '  <node id="nn0"><data key="dName">Other</data></node>\n  </graph>',
  );
  expect(errors(run(doc))).toEqual([]);
});

test('statemachine marker with value rejected', () => {
  const doc = replace(
    minimal(),
    '<data key="dStateMachine"/>',
    '<data key="dStateMachine">yes</data>',
  );
  expect(errors(run(doc))).toContain('sm-marker-value');
});

test('vertex value banana rejected', () => {
  const doc = replace(
    minimal(),
    '<data key="dVertex">initial</data>',
    '<data key="dVertex">banana</data>',
  );
  expect(errors(run(doc))).toContain('vertex-value');
});

test('reserved vertex reported', () => {
  const doc = replace(
    minimal(),
    '<data key="dVertex">initial</data>',
    '<data key="dVertex">fork</data>',
  );
  const ctx = run(doc);
  expect(warnings(ctx)).toContain('vertex-reserved');
  expect(ctx.report.hasErrors()).toBe(false);
});

test.each([
  'final',
  'choice',
  'terminate',
  'shallowHistory',
  'deepHistory',
  'entryPoint',
  'exitPoint',
])('extension vertexes accepted: %s', (kind) => {
  const doc = replace(
    minimal(),
    '<data key="dVertex">initial</data>',
    `<data key="dVertex">${kind}</data><data key="dName">P</data>`,
  );
  expect(errors(run(doc))).toEqual([]);
});

test('note value casual rejected', () => {
  const doc = replace(
    minimal(),
    '<data key="dNote">formal</data>',
    '<data key="dNote">casual</data>',
  );
  expect(errors(run(doc))).toContain('note-value');
});

test('color values', () => {
  const ok = [
    '      <data key="dColor">#12AB34</data>',
    '      <data key="dColor">#12AB34FF</data>',
    '      <data key="dColor">red</data>',
  ];
  for (const color of ok) {
    const doc = replace(minimal(), IDLE, IDLE + '\n' + color);
    const ctx = run(doc);
    expect(warnings(ctx)).toEqual([]);
  }
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dColor"></data>');
  expect(errors(run(doc))).toContain('color-value');
});

test('markup on state reported', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dMarkup">markdown</data>');
  expect(errors(run(doc))).toContain('markup-usage');
});

test('markup on a formal comment accepted', () => {
  const doc = replace(
    minimal(),
    '      <data key="dName">CGML_META</data>',
    '      <data key="dName">CGML_META</data>\n      <data key="dMarkup">markdown</data>',
  );
  expect(errors(run(doc))).not.toContain('markup-usage');
  const empty = replace(doc, '<data key="dMarkup">markdown</data>', '<data key="dMarkup"></data>');
  expect(errors(run(empty))).toContain('markup-usage');
});

test('formal names', () => {
  for (const name of ['_x', 'Scan9', 'A_b_1']) {
    const doc = replace(minimal(), IDLE, IDLE + `\n      <data key="dFormalName">${name}</data>`);
    expect(errors(run(doc))).toEqual([]);
  }
  for (const name of ['9x', 'a-b', 'имя', '']) {
    const doc = replace(minimal(), IDLE, IDLE + `\n      <data key="dFormalName">${name}</data>`);
    expect(errors(run(doc))).toContain('formal-name-syntax');
  }
});

test('behaviour parse error rejected', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dData">EV\n[guard]</data>');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('behaviour-syntax');
});

test('empty event name node block accepted', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dData">/ act()</data>');
  expect(errors(run(doc))).toEqual([]);
});

test('transition label without separator accepted', () => {
  const doc = replace(
    minimal(),
    '<edge id="init-n0#1" source="init" target="n0"/>',
    '<edge id="init-n0#1" source="init" target="n0">' +
      '<data key="dData">EV\n[x &gt; 1]</data></edge>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).not.toContain('behaviour-syntax');
});

test('node event without behaviour accepted', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dData">EV</data>');
  const ctx = run(doc);
  expect(errors(ctx)).not.toContain('behaviour-syntax');
});

test('node block without separator rejected', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dData">EV\n[x &gt; 1]</data>');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('behaviour-syntax');
});

test('meta param name reported', () => {
  const ctx = run(withMeta('standardVersion/ 1.0\n\nимя/ значение'));
  expect(errors(ctx)).toContain('meta-params');
});

test('repeated meta param reported', () => {
  const ctx = run(withMeta('standardVersion/ 1.0\n\nauthor/ A\n\nauthor/ B'));
  expect(errors(ctx)).toContain('meta-params');
});

test('standard version missing rejected', () => {
  const ctx = run(withMeta('platform/ Arduino'));
  expect(errors(ctx)).toContain('standard-version');
});

test('standard version wrong rejected', () => {
  const ctx = run(withMeta('standardVersion/ 2.0'));
  expect(errors(ctx)).toContain('standard-version');
});

test('geometry mode values', () => {
  for (const mode of ['none', 'short', 'full']) {
    const ctx = run(withMeta('standardVersion/ 1.0\n\ngeometry/ ' + mode));
    expect(errors(ctx)).toEqual([]);
  }
  const ctx = run(withMeta('standardVersion/ 1.0\n\ngeometry/ big'));
  expect(errors(ctx)).toContain('geometry-mode-value');
});

test('transition order values', () => {
  let ctx = run(withMeta('standardVersion/ 1.0\n\ntransitionOrder/ exitFirst'));
  expect(ctx.report.findings).toEqual([]);
  ctx = run(withMeta('standardVersion/ 1.0\n\ntransitionOrder/ transitionFirst'));
  expect(warnings(ctx)).toContain('transition-order-value');
});

test('event propagation values', () => {
  let ctx = run(withMeta('standardVersion/ 1.0\n\neventPropagation/ propagate'));
  expect(ctx.report.findings).toEqual([]);
  ctx = run(withMeta('standardVersion/ 1.0\n\neventPropagation/ defer'));
  expect(errors(ctx)).toContain('event-propagation-value');
});

test('created at informational', () => {
  let ctx = run(withMeta('standardVersion/ 1.0\n\ncreatedAt/ 2024-04-24T10:20:30Z'));
  expect(ctx.report.findings).toEqual([]);
  ctx = run(withMeta('standardVersion/ 1.0\n\ncreatedAt/ yesterday'));
  expect(ruleNames(ctx)).toEqual(['created-at']);
  expect(ctx.report.valid(true)).toBe(true);
});

test('text and custom params accepted', () => {
  const body =
    'standardVersion/ 1.0\n\nplatform/ Arduino\n\nauthor/ A. N.\n\n' +
    'description/ multi\nline\ntext\n\nmyParam/ custom value';
  const ctx = run(withMeta(body));
  expect(ctx.report.findings).toEqual([]);
  expect(ctx.model!.param('myParam')).toBe('custom value');
});

test('L3 errors stop the pipeline', () => {
  const doc = replace(minimal(), 'Cyberiada-GraphML-1.0</data>', 'Cyberiada-GraphML-2.0</data>');
  const ctx = run(doc);
  expect(ctx.report.layersRun).toEqual([1, 2, 3]);
  expect(ctx.report.verdict()).toBe('invalid');
});

function component(nodeId: string, componentId: string): string {
  return `\
    <node id="${nodeId}">
      <data key="dNote">formal</data>
      <data key="dName">CGML_COMPONENT ${componentId}</data>
      <data key="dData">type/ Timer</data>
    </node>
`;
}

function secondMachine(nodes: string): string {
  return `\
  <graph id="G2" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Second machine</data>
${nodes}\
    <node id="init2">
      <data key="dVertex">initial</data>
    </node>
    <node id="m0">
      <data key="dName">Idle</data>
    </node>
    <edge id="init2-m0#1" source="init2" target="m0"/>
  </graph>
`;
}

/**
 * The minimal document with components.
 *
 * The components go into the first machine and, when given, into a second machine of its own.
 */
function withComponents(first: string, second: string | null = null): Uint8Array {
  let machines = MACHINE.replaceAll(META_NODE, META_NODE + first);
  if (second !== null) {
    machines += secondMachine(second);
  }
  return minimal({ machines });
}

test('the same component in two machines is accepted', () => {
  const ctx = run(withComponents(component('cA', 'timer1'), component('cB', 'timer1')));
  expect(errors(ctx)).toEqual([]);
  expect(ctx.report.layersRun).toContain(4);
});

test('a component twice in one machine is rejected', () => {
  const ctx = run(withComponents(component('cA', 'timer1') + component('cB', 'timer1')));
  expect(errors(ctx)).toEqual(['component-syntax']);
  const message = ctx.report.findings[0].message;
  expect(message).toContain("'G'");
  expect(message).toContain("'cA'");
  expect(message).toContain("'cB'");
});

test('a component node id is unique in the document', () => {
  const ctx = run(withComponents(component('cA', 'timer1'), component('cA', 'timer1')));
  expect(errors(ctx)).toEqual(['unique-ids']);
});

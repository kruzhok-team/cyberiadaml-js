/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L2 layer tests: the admissible tag tree
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

import { GFORMAT, KEYS, MACHINE, META_NODE, minimal, replace } from './docbuilder';

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

// a state machine with a composite state and its transition at the top level
function hierarchyMachine(meta: string, regionExtra: string, nodeExtra: string): string {
  return `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Test machine</data>
${meta}\
    <node id="init">
      <data key="dVertex">initial</data>
    </node>
    <node id="n0">
      <data key="dName">Composite</data>
      <graph id="n0:">
        <data key="dRegion"/>
        <node id="n0::n1">
          <data key="dName">Child</data>
        </node>
${regionExtra}\
      </graph>
${nodeExtra}\
    </node>
    <edge id="init-n0#1" source="init" target="n0"/>
    <edge id="n0-n1#1" source="n0" target="n0::n1"/>
  </graph>
`;
}

function hierarchy(meta = META_NODE, regionExtra = '', nodeExtra = ''): Uint8Array {
  return minimal({ machines: hierarchyMachine(meta, regionExtra, nodeExtra) });
}

function minimalMachineWith(meta: string): string {
  return MACHINE.replaceAll(META_NODE, meta);
}

test('minimal document clean at L2', () => {
  const ctx = run(minimal());
  expect(ctx.report.findings).toEqual([]);
  expect(ctx.report.layersRun).toContain(2);
});

test('hierarchy document accepted', () => {
  const ctx = run(hierarchy());
  expect(ctx.report.findings).toEqual([]);
});

test('two regions accepted', () => {
  const second = `\
      <graph id="n0:2">
        <data key="dRegion"/>
        <node id="n0::n2">
          <data key="dName">Other child</data>
        </node>
      </graph>
`;
  const ctx = run(hierarchy(META_NODE, '', second));
  expect(ctx.report.findings).toEqual([]);
});

test('wrong root tag rejected', () => {
  const doc = replace(replace(minimal(), '<graphml ', '<gml '), '</graphml>', '</gml>');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('root-graphml');
});

test('missing xmlns rejected', () => {
  const doc = replace(minimal(), ' xmlns="http://graphml.graphdrawing.org/xmlns"', '');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('root-graphml');
});

test('extra namespace tolerated', () => {
  const doc = replace(
    minimal(),
    '<graphml xmlns=',
    '<graphml xmlns:y="http://www.yworks.com/xml/graphml" xmlns=',
  );
  const ctx = run(doc);
  expect(ruleNames(ctx)).toEqual(['extra-namespaces']);
  expect(ctx.report.valid()).toBe(true);
});

test('missing gformat rejected', () => {
  const ctx = run(minimal({ gformat: '' }));
  expect(errors(ctx)).toContain('gformat-first');
});

test('gformat after keys rejected', () => {
  const ctx = run(minimal({ gformat: '', keys: KEYS + GFORMAT }));
  expect(errors(ctx)).toEqual(['gformat-first']);
});

test('node inside graphml rejected', () => {
  const doc = replace(minimal(), '</graphml>', '<node id="stray"/>\n</graphml>');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('node-placement');
});

test('key after graphs rejected', () => {
  const doc = replace(
    minimal(),
    '</graphml>',
    '<key id="dChunk" for="edge" attr.name="chunk"/>\n</graphml>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('key-placement');
});

test('subgraph inside graph rejected', () => {
  const extra = '    <graph id="sub"><data key="dRegion"/></graph>\n';
  const doc = replace(minimal(), '  </graph>', extra + '  </graph>');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('graph-in-graph');
});

test('edge between nodes reported', () => {
  const doc = replace(
    minimal(),
    '    <node id="n0">',
    '    <edge id="e-early#1" source="init" target="init"/>\n    <node id="n0">',
  );
  const ctx = run(doc);
  expect(ruleNames(ctx)).toContain('edge-block');
  expect(ctx.report.hasErrors()).toBe(false);
});

test('data after node rejected', () => {
  const doc = replace(
    minimal(),
    '  </graph>',
    '    <data key="dName">Late name</data>\n  </graph>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('sm-child-order');
});

test('statemachine not first key rejected', () => {
  const doc = replace(
    minimal(),
    '    <data key="dStateMachine"/>\n    <data key="dName">Test machine</data>',
    '    <data key="dName">Test machine</data>\n    <data key="dStateMachine"/>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('sm-first-key');
});

test('name before vertex rejected', () => {
  const doc = replace(
    minimal(),
    '      <data key="dVertex">initial</data>',
    '      <data key="dName">Init</data>\n      <data key="dVertex">initial</data>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('vertex-first-key');
});

test('name before note rejected', () => {
  const badMeta = META_NODE.replaceAll(
    '      <data key="dNote">formal</data>\n      <data key="dName">CGML_META</data>',
    '      <data key="dName">CGML_META</data>\n      <data key="dNote">formal</data>',
  );
  const ctx = run(minimal({ machines: minimalMachineWith(badMeta) }));
  expect(errors(ctx)).toContain('note-first-key');
});

test('pivot not first key rejected', () => {
  const doc = replace(
    minimal(),
    '<edge id="init-n0#1" source="init" target="n0"/>',
    '<edge id="init-n0#1" source="init" target="n0">\n' +
      '      <data key="dChunk">Idle</data>\n' +
      '      <data key="dPivot">dName</data>\n' +
      '    </edge>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('pivot-first-key');
});

test('edge inside region rejected', () => {
  const edge = '        <edge id="inner#1" source="n0::n1" target="n0::n1"/>\n';
  const ctx = run(hierarchy(META_NODE, edge));
  expect(errors(ctx)).toContain('region-no-edges');
});

test('node inside node rejected', () => {
  const doc = replace(
    minimal(),
    '    <node id="n0">\n      <data key="dName">Idle</data>\n    </node>',
    '    <node id="n0">\n      <data key="dName">Idle</data>\n      <node id="inner"/>\n    </node>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('composite-children');
});

test('unknown tag rejected', () => {
  const doc = replace(minimal(), '</graphml>', '<foo/>\n</graphml>');
  const ctx = run(doc);
  expect(errors(ctx)).toContain('tag-tree');
});

test('key on wrong element kind rejected', () => {
  // dVertex on a graph
  let doc = replace(
    minimal(),
    '    <data key="dStateMachine"/>',
    '    <data key="dStateMachine"/>\n    <data key="dVertex">initial</data>',
  );
  expect(errors(run(doc))).toContain('key-usage');
  // dRegion on a node
  doc = replace(
    minimal(),
    '      <data key="dName">Idle</data>',
    '      <data key="dName">Idle</data>\n      <data key="dRegion"/>',
  );
  expect(errors(run(doc))).toContain('key-usage');
  // dPivot on a node
  doc = replace(
    minimal(),
    '      <data key="dName">Idle</data>',
    '      <data key="dName">Idle</data>\n      <data key="dPivot">dName</data>',
  );
  expect(errors(run(doc))).toContain('key-usage');
});

test('wrong geometry subtag rejected', () => {
  const doc = replace(
    minimal(),
    '<edge id="init-n0#1" source="init" target="n0"/>',
    '<edge id="init-n0#1" source="init" target="n0">\n' +
      '      <data key="dSourcePoint"><rect x="0" y="0" width="1" height="1"/></data>\n' +
      '    </edge>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('tag-tree');
});

test('incomplete geometry attributes rejected', () => {
  // rect without width
  let doc = replace(
    minimal(),
    '      <data key="dName">Idle</data>',
    '      <data key="dName">Idle</data>\n' +
      '      <data key="dGeometry"><rect x="0" y="0" height="10"/></data>',
  );
  expect(errors(run(doc))).toContain('geometry-shape');
  // point without y
  doc = replace(
    minimal(),
    '      <data key="dVertex">initial</data>',
    '      <data key="dVertex">initial</data>\n      <data key="dGeometry"><point x="0"/></data>',
  );
  expect(errors(run(doc))).toContain('geometry-shape');
});

test('non numeric geometry rejected', () => {
  const doc = replace(
    minimal(),
    '      <data key="dName">Idle</data>',
    '      <data key="dName">Idle</data>\n' +
      '      <data key="dGeometry"><rect x="a" y="0" width="1" height="1"/></data>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('geometry-shape');
});

test('L2 errors stop the pipeline', () => {
  const ctx = run(minimal({ gformat: '' }));
  expect(ctx.report.layersRun).toEqual([1, 2]);
  expect(ctx.report.verdict()).toBe('invalid');
});

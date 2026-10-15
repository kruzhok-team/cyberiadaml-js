/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L4 layer tests: document integrity
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

import { encode, KEYS, MACHINE, META_NODE, minimal, replace } from './docbuilder';

import { runDocument } from '../../src/core/reader';
import { Context } from '../../src/core/rules';

const SECOND_MACHINE = `\
  <graph id="G2" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Second machine</data>
    <node id="g2n0">
      <data key="dName">Idle</data>
    </node>
  </graph>
`;

function run(data: Uint8Array): Context {
  return runDocument(data, 'test.graphml');
}

function errors(ctx: Context): string[] {
  return ctx.report.findings.filter((f) => f.severity === 'ERROR').map((f) => f.rule);
}

function warnings(ctx: Context): string[] {
  return ctx.report.findings.filter((f) => f.severity === 'WARNING').map((f) => f.rule);
}

function multi(second = SECOND_MACHINE): Uint8Array {
  return minimal({ machines: MACHINE + second });
}

const IDLE = '      <data key="dName">Idle</data>';
const FIRST_EDGE = '<edge id="init-n0#1" source="init" target="n0"/>';

test('minimal document clean at L4', () => {
  const ctx = run(minimal());
  expect(ctx.report.findings).toEqual([]);
  expect(ctx.report.layersRun).toEqual([1, 2, 3, 4]);
});

test('multi machine document accepted', () => {
  const ctx = run(multi());
  expect(errors(ctx)).toEqual([]);
});

test('duplicate data key rejected', () => {
  const doc = replace(minimal(), IDLE, IDLE + '\n      <data key="dName">Idle again</data>');
  expect(errors(run(doc))).toContain('unique-data-keys');
});

test('document without graphs rejected', () => {
  const text =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n' +
    '  <data key="gFormat">Cyberiada-GraphML-1.0</data>\n' +
    KEYS +
    '</graphml>\n';
  expect(errors(run(encode(text)))).toContain('top-level-graphs');
});

test('duplicate ids across machines rejected', () => {
  const doc = multi(SECOND_MACHINE.replaceAll('id="g2n0"', 'id="n0"'));
  expect(errors(run(doc))).toContain('unique-ids');
});

test('node id equal to region id rejected', () => {
  const machines = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Test machine</data>
${META_NODE}\
    <node id="c0">
      <data key="dName">Composite</data>
      <graph id="dup">
        <data key="dRegion"/>
        <node id="dup"><data key="dName">Child</data></node>
      </graph>
    </node>
  </graph>
`;
  expect(errors(run(minimal({ machines })))).toContain('unique-ids');
});

test('duplicate edge id rejected', () => {
  const doc = replace(
    minimal(),
    FIRST_EDGE,
    FIRST_EDGE + '\n    <edge id="init-n0#1" source="n0" target="n0"/>',
  );
  expect(errors(run(doc))).toContain('unique-ids');
});

test('graph without statemachine marker rejected', () => {
  const doc = replace(minimal(), '    <data key="dStateMachine"/>\n', '');
  expect(errors(run(doc))).toContain('sm-marker');
});

test('sm name variants rejected', () => {
  // missing dName
  let doc = replace(minimal(), '    <data key="dName">Test machine</data>\n', '');
  expect(errors(run(doc))).toContain('sm-name');
  // empty dName
  doc = replace(
    minimal(),
    '    <data key="dName">Test machine</data>',
    '    <data key="dName"></data>',
  );
  expect(errors(run(doc))).toContain('sm-name');
  // two machines with equal names
  doc = multi(SECOND_MACHINE.replaceAll('Second machine', 'Test machine'));
  expect(errors(run(doc))).toContain('sm-name');
});

test('sibling states with equal names rejected', () => {
  const doc = replace(
    minimal(),
    '  </graph>',
    '    <node id="n1"><data key="dName">Idle</data></node>\n  </graph>',
  );
  expect(errors(run(doc))).toContain('state-names');
});

test('same name on different levels accepted', () => {
  const machines = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Test machine</data>
${META_NODE}\
    <node id="c0">
      <data key="dName">Idle</data>
      <graph id="c0:">
        <data key="dRegion"/>
        <node id="c1"><data key="dName">Idle</data></node>
      </graph>
    </node>
  </graph>
`;
  const ctx = run(minimal({ machines }));
  expect(errors(ctx)).toEqual([]);
});

test('transition to missing node rejected', () => {
  const doc = replace(minimal(), 'target="n0"/>', 'target="nowhere"/>');
  expect(errors(run(doc))).toContain('transition-endpoints');
});

test('transition to other machine rejected', () => {
  const doc = replace(multi(), FIRST_EDGE, '<edge id="init-n0#1" source="init" target="g2n0"/>');
  expect(errors(run(doc))).toContain('transition-endpoints');
});

test('transition to the machine graph rejected', () => {
  const doc = replace(minimal(), 'target="n0"/>', 'target="G"/>');
  expect(errors(run(doc))).toContain('transition-endpoints');
});

test('plain transition targeting edge rejected', () => {
  const doc = replace(
    minimal(),
    '  </graph>',
    '    <edge id="n0-e#1" source="n0" target="init-n0#1"/>\n  </graph>',
  );
  expect(errors(run(doc))).toContain('link-target');
});

test('comment link accepted and resolved', () => {
  const doc = replace(
    replace(
      minimal(),
      '    <edge id="init-n0#1"',
      '    <node id="c0">\n      <data key="dNote">informal</data>\n' +
        '    </node>\n    <edge id="init-n0#1"',
    ),
    '  </graph>',
    '    <edge id="c0-n0#1" source="c0" target="n0">\n' +
      '      <data key="dPivot">dName</data>\n' +
      '      <data key="dChunk">Idle</data>\n' +
      '    </edge>\n  </graph>',
  );
  const ctx = run(doc);
  expect(ctx.report.findings).toEqual([]);
});

test('comment link to missing node rejected', () => {
  const doc = replace(
    minimal(),
    '  </graph>',
    '    <edge id="nMeta-x#1" source="nMeta" target="nowhere">\n' +
      '      <data key="dPivot">dName</data>\n' +
      '      <data key="dChunk">Idle</data>\n' +
      '    </edge>\n  </graph>',
  );
  expect(errors(run(doc))).toContain('link-endpoints');
});

test('comment link from non comment rejected', () => {
  const doc = replace(
    minimal(),
    '  </graph>',
    '    <edge id="n0-m#1" source="n0" target="init">\n' +
      '      <data key="dPivot">dName</data>\n' +
      '      <data key="dChunk">Idle</data>\n' +
      '    </edge>\n  </graph>',
  );
  expect(errors(run(doc))).toContain('link-source');
});

test('double else from state reported', () => {
  const doc = replace(
    minimal(),
    '  </graph>',
    '    <edge id="n0-init#1" source="n0" target="init">\n' +
      '      <data key="dData">[else]/ a()</data>\n' +
      '    </edge>\n' +
      '    <edge id="n0-init#2" source="n0" target="init">\n' +
      '      <data key="dData">[else]/ b()</data>\n' +
      '    </edge>\n  </graph>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('single-else');
});

test('double else from choice reported', () => {
  // the node phase is over after the first edge: build a well-ordered doc
  const doc = replace(
    minimal(),
    '    ' + FIRST_EDGE,
    '    <node id="ch0"><data key="dVertex">choice</data></node>\n' +
      '    ' +
      FIRST_EDGE +
      '\n' +
      '    <edge id="ch0-init#1" source="ch0" target="init">\n' +
      '      <data key="dData">[else]/ a()</data>\n' +
      '    </edge>\n' +
      '    <edge id="ch0-n0#1" source="ch0" target="n0">\n' +
      '      <data key="dData">[else]/ b()</data>\n' +
      '    </edge>',
  );
  const ctx = run(doc);
  expect(errors(ctx)).toContain('choice-single-else');
});

test('two initials on one level rejected', () => {
  const doc = replace(
    minimal(),
    '    <node id="n0">',
    '    <node id="init2"><data key="dVertex">initial</data></node>\n    <node id="n0">',
  );
  expect(errors(run(doc))).toContain('single-initial');
});

test('initials on different levels accepted', () => {
  const machines = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Test machine</data>
${META_NODE}\
    <node id="init"><data key="dVertex">initial</data></node>
    <node id="c0">
      <data key="dName">Composite</data>
      <graph id="c0:">
        <data key="dRegion"/>
        <node id="rinit"><data key="dVertex">initial</data></node>
      </graph>
    </node>
  </graph>
`;
  const ctx = run(minimal({ machines }));
  expect(ctx.report.findings).toEqual([]);
});

test('missing meta rejected', () => {
  const doc = replace(minimal(), META_NODE, '');
  expect(errors(run(doc))).toContain('meta-presence');
});

test('meta in second machine only rejected', () => {
  const first = MACHINE.replaceAll(META_NODE, '');
  const second = SECOND_MACHINE.replaceAll(
    '    <node id="g2n0">',
    META_NODE.replaceAll('id="nMeta"', 'id="g2Meta"') + '    <node id="g2n0">',
  );
  const ctx = run(minimal({ machines: first + second }));
  expect(errors(ctx)).toContain('meta-presence');
});

test('edge geometry in short mode reported', () => {
  const meta = META_NODE.replaceAll(
    'standardVersion/ 1.0',
    'standardVersion/ 1.0\n\ngeometry/ short',
  );
  let doc = replace(minimal(), META_NODE, meta);
  doc = replace(
    doc,
    FIRST_EDGE,
    '<edge id="init-n0#1" source="init" target="n0">\n' +
      '      <data key="dGeometry"><point x="1" y="2"/></data>\n' +
      '    </edge>',
  );
  const ctx = run(doc);
  expect(warnings(ctx)).toContain('edge-geometry-mode');
});

test('wrong geometry kind reported', () => {
  // point on a state
  let doc = replace(
    minimal(),
    IDLE,
    IDLE + '\n      <data key="dGeometry"><point x="1" y="2"/></data>',
  );
  expect(warnings(run(doc))).toContain('state-geometry-kind');
  // rect on an initial pseudostate
  doc = replace(
    minimal(),
    '      <data key="dVertex">initial</data>',
    '      <data key="dVertex">initial</data>\n' +
      '      <data key="dGeometry"><rect x="1" y="2" width="3" height="4"/></data>',
  );
  expect(warnings(run(doc))).toContain('vertex-geometry-kind');
});

test('transition geometry without endpoint geometry reported', () => {
  const doc = replace(
    minimal(),
    FIRST_EDGE,
    '<edge id="init-n0#1" source="init" target="n0">\n' +
      '      <data key="dLabelGeometry"><point x="1" y="2"/></data>\n' +
      '    </edge>',
  );
  const ctx = run(doc);
  expect(warnings(ctx)).toContain('transition-geometry-endpoints');
});

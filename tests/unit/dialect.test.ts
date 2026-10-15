/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The Lapki dialect pass: one document per repair, the standard invariance
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

import { GFORMAT, KEYS, META_NODE, minimal } from './docbuilder';

import { FORMAT_LAPKI, FORMAT_VALUE } from '../../src/core/dialect';
import { render } from '../../src/core/dump';
import { Comment, State } from '../../src/core/model';
import { runDocument } from '../../src/core/reader';
import { Context } from '../../src/core/rules';

const FIXTURES = join(__dirname, '..', 'examples', 'standard');

const NOTE_KEYS = KEYS + '  <key id="dGeometry" for="node" attr.name="geometry"/>\n';

function run(data: Uint8Array, dialect: string | null = 'lapki'): Context {
  return runDocument(data, 'test.graphml', dialect);
}

function errors(ctx: Context): string[] {
  return ctx.report.findings.filter((f) => f.severity === 'ERROR').map((f) => f.rule);
}

function repairs(ctx: Context): string[] {
  return ctx.report.findings.filter((f) => f.layer === 0).map((f) => f.rule);
}

interface MachineOptions {
  gid?: string;
  name?: string | null;
  meta?: string;
  edgedefault?: string;
}

/** A state machine graph around body. */
function machine(body: string, options: MachineOptions = {}): string {
  const {
    gid = 'G',
    name = 'Test machine',
    meta = META_NODE,
    edgedefault = ' edgedefault="directed"',
  } = options;
  const nameData = name !== null ? `    <data key="dName">${name}</data>\n` : '';
  return (
    `  <graph id="${gid}"${edgedefault}>\n    <data key="dStateMachine"/>\n` +
    `${nameData}${meta}${body}  </graph>\n`
  );
}

const IDLE = `\
    <node id="init">
      <data key="dVertex">initial</data>
    </node>
    <node id="n0">
      <data key="dName">Idle</data>
    </node>
    <edge id="init-n0" source="init" target="n0"/>
`;

const SECOND_IDLE = IDLE.replaceAll('"init', '"i2')
  .replaceAll('"n0', '"m0')
  .replaceAll('init-n0', 'i2-m0');

function clean(ctx: Context): void {
  expect(errors(ctx)).toEqual([]);
}

test('d1 later metadata becomes machine parameters', () => {
  const second = META_NODE.replace('standardVersion/ 1.0', 'standardVersion/ 1.0\n\nplatform/ B');
  const data = minimal({
    machines:
      machine(IDLE) +
      machine(SECOND_IDLE, { gid: 'G2', name: 'Second', meta: second.replace('nMeta', 'nMeta2') }),
  });
  const ctx = run(data);
  clean(ctx);
  expect(repairs(ctx)).toEqual(['lapki-d1']);
  const params = ctx.dialect!.machineParams.get('G2')!;
  expect(params.map((p) => [p.name, p.value])).toEqual([
    ['standardVersion', '1.0'],
    ['platform', 'B'],
  ]);
  expect(ctx.doc.metaComment!.id).toBe('nMeta');
});

test('d1 metadata moves to the first machine', () => {
  const data = minimal({
    machines: machine(IDLE, { meta: '' }) + machine(SECOND_IDLE, { gid: 'G2', name: 'Second' }),
  });
  const ctx = run(data);
  clean(ctx);
  expect(repairs(ctx)).toEqual(['lapki-d1']);
  expect(ctx.doc.metaComment).not.toBeNull();
  expect(ctx.doc.machines[0].children[0].id).toBe('nMeta');
});

test('d1 metadata values repaired', () => {
  const meta = META_NODE.replace(
    'standardVersion/ 1.0',
    'standardVersion/\n\nplatform/ A\n\nplatform/ B\n\nauthor/ undefined',
  );
  const ctx = run(minimal({ machines: machine(IDLE, { meta }) }));
  clean(ctx);
  expect(repairs(ctx).sort()).toEqual(['lapki-d1', 'lapki-d1', 'lapki-d1']);
  expect(ctx.doc.param('standardVersion')).toBe('1.0');
  expect(ctx.doc.param('platform')).toBe('A');
  expect(ctx.doc.param('author')).toBeNull();
});

const COMPONENT = `\
    <node id="cLED1">
      <data key="dNote">formal</data>
      <data key="dName"> CGML_COMPONENT </data>
      <data key="dData">id/ LED1

type/ LED

name/ Main

</data>
    </node>
`;

test('d2 old component comment', () => {
  const body = COMPONENT + IDLE + '    <edge id="nMeta-cLED1" source="nMeta" target="cLED1"/>\n';
  const ctx = run(minimal({ machines: machine(body) }));
  clean(ctx);
  expect(repairs(ctx).sort()).toEqual(['lapki-d2', 'lapki-d2']);
  const comment = ctx.doc.machines[0].children.filter((c) => c.id === 'cLED1') as Comment[];
  expect(comment[0].name).toBe('CGML_COMPONENT LED1');
  expect(comment[0].body).toBe('type/ LED\n\nname/ Main');
  expect(ctx.doc.machines[0].links).toEqual([]);
});

const COMPOSITE = `\
    <node id="init">
      <data key="dVertex">initial</data>
    </node>
    <node id="n1">
      <data key="dName">Outer</data>
      <graph id="n1">
        <node id="n1::n2">
          <data key="dName">Inner</data>
        </node>
      </graph>
    </node>
    <edge id="init-n1" source="init" target="n1"/>
`;

test('d3 region graph id', () => {
  const ctx = run(minimal({ machines: machine(COMPOSITE) }));
  clean(ctx);
  expect(repairs(ctx)).toEqual(['lapki-d3']);
  const outer = ctx.doc.machines[0].children[2] as State;
  expect(outer.regions[0].id).toBe('n1::region');
});

test('d4 geometry kinds', () => {
  const body = `\
    <node id="init">
      <data key="dVertex">initial</data>
      <data key="dGeometry"><rect x="10" y="20" width="-1" height="-1"/></data>
    </node>
    <node id="n0">
      <data key="dName">Idle</data>
      <data key="dGeometry"><point x="100" y="200"/></data>
    </node>
    <edge id="init-n0" source="init" target="n0"/>
`;
  const ctx = run(minimal({ keys: NOTE_KEYS, machines: machine(body) }));
  clean(ctx);
  expect(repairs(ctx).sort()).toEqual(['lapki-d4a', 'lapki-d4b']);
  const text = render(ctx.doc);
  expect(text).toContain('geometry: point 10.00 20.00');
  expect(text).toContain('geometry: rect 100.00 200.00 0.00 0.00');
});

test('d5 private key with a point', () => {
  const component = COMPONENT.replace(
    '    </node>\n',
    '      <data key="dLapkiSchemePosition"><point x="20" y="60"/></data>\n    </node>\n',
  );
  const ctx = run(minimal({ machines: machine(component + IDLE) }));
  clean(ctx);
  expect(repairs(ctx).sort()).toEqual(['lapki-d2', 'lapki-d5a', 'lapki-d5b']);
  const decl = ctx.doc.keys.filter((k) => k.id === 'dLapkiSchemePosition');
  expect(decl.length).toBeGreaterThan(0);
  expect(decl[0].forKind).toBe('node');
  const data = [...ctx.parsed!.root.iter('data')].filter(
    (d) => d.get('key') === 'dLapkiSchemePosition',
  );
  expect(data[0].text).toBe('x/ 20\n\ny/ 60');
  expect(data[0].children.length).toBe(0);
});

test('d6 format label and position', () => {
  const data = minimal({
    gformat: '',
    keys: KEYS + GFORMAT.replace('Cyberiada-GraphML-1.0', 'Cyberiada-GraphML'),
  });
  const ctx = run(data);
  clean(ctx);
  expect(repairs(ctx)).toEqual(['lapki-d6', 'lapki-d6']);
  expect(ctx.doc.format).toBe(FORMAT_VALUE);
});

test('d7 structural leniency', () => {
  const second = IDLE.replaceAll('"init"', '"i2"').replaceAll('init-n0', 'x');
  const body =
    IDLE +
    `\
    <node id="note">
      <data key="dData">a comment</data>
      <data key="dNote"></data>
    </node>
    <edge id="init-n0" source="init" target="n0"/>
`;
  const data = minimal({
    machines:
      machine(body, { edgedefault: '' }) + machine(second, { gid: 'G2', name: 'Second', meta: '' }),
  });
  const ctx = run(data);
  clean(ctx);
  expect(repairs(ctx).sort()).toEqual([
    'lapki-d7a',
    'lapki-d7b',
    'lapki-d7d',
    'lapki-d7e',
    'lapki-d7f',
  ]);
  const secondMachine = ctx.doc.machines[1];
  expect(secondMachine.children.map((n) => n.id)).toEqual(['i2', 'G2::n0']);
  expect(secondMachine.transitions[0].target).toBe('G2::n0');
  expect(ctx.doc.machines[0].transitions.map((t) => t.id)).toEqual(['init-n0', 'init-n0#1']);
});

test('d8 values', () => {
  const meta = META_NODE.replace(
    'standardVersion/ 1.0',
    'standardVersion/ 1.0\n\ntransitionOrder/ transitionFirst',
  );
  const ctx = run(minimal({ machines: machine(IDLE, { name: null, meta }) }));
  clean(ctx);
  expect(repairs(ctx).sort()).toEqual(['lapki-d8a', 'lapki-d8b']);
  expect(ctx.doc.transitionOrder()).toBe('actionFirst');
  expect(ctx.doc.machines[0].name).toBe('G');
});

test('d9 function graph', () => {
  const fn = `\
  <graph id="F" edgedefault="directed">
    <data key="dFunction"/>
    <node id="f0"/>
  </graph>
`;
  const keys = KEYS + '  <key id="dFunction" for="graph" attr.name="function"/>\n';
  const ctx = run(minimal({ keys, machines: machine(IDLE) + fn }));
  clean(ctx);
  expect(repairs(ctx)).toEqual(['lapki-d9']);
  expect(ctx.dialect!.extensionGraphs.map((g) => g.get('id'))).toEqual(['F']);
  expect(ctx.doc.machines.map((m) => m.id)).toEqual(['G']);
});

test('label', () => {
  const meta = META_NODE.replace(
    'standardVersion/ 1.0',
    'standardVersion/ 1.0\n\nlapkiVisual/ true',
  );
  expect(run(minimal()).dialect!.label).toBe(FORMAT_VALUE);
  const ctx = run(minimal({ machines: machine(IDLE, { meta }) }));
  expect(repairs(ctx)).toEqual([]);
  expect(ctx.dialect!.label).toBe(FORMAT_LAPKI);
});

test('without the dialect the patterns stay errors', () => {
  const data = minimal({
    gformat: '',
    keys: KEYS + GFORMAT.replace('Cyberiada-GraphML-1.0', 'Cyberiada-GraphML'),
  });
  const ctx = run(data, null);
  expect(ctx.dialect).toBeNull();
  expect(errors(ctx)).toContain('gformat-first');
});

test('unknown dialect', () => {
  expect(() => run(minimal(), 'nonexistent')).toThrow();
});

function positives(): string[] {
  const manifest: Record<string, { reject?: string }> = JSON.parse(
    readFileSync(join(FIXTURES, 'manifest.json'), 'utf-8'),
  ).fixtures;
  return Object.keys(manifest)
    .filter((name) => manifest[name].reject === undefined)
    .sort();
}

test.each(positives())('standard example %s is untouched', (name) => {
  const ctx = run(new Uint8Array(readFileSync(join(FIXTURES, name + '.graphml'))));
  expect(repairs(ctx)).toEqual([]);
  expect(render(ctx.doc)).toBe(readFileSync(join(FIXTURES, name + '.expected.txt'), 'utf-8'));
});

/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The document model build tests
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

import { minimal, replace } from './docbuilder';

import { Comment, Document, Point, Rect, State, Vertex } from '../../src/core/model';
import { runDocument } from '../../src/core/reader';

function build(data: Uint8Array): Document {
  const ctx = runDocument(data, 'test.graphml');
  expect(ctx.model).not.toBeNull();
  return ctx.doc;
}

test('minimal model', () => {
  const doc = build(minimal());
  expect(doc.format).toBe('Cyberiada-GraphML-1.0');
  expect(doc.keys.length).toBe(8);
  expect(doc.machines.length).toBe(1);
  const machine = doc.machines[0];
  expect(machine.id).toBe('G');
  expect(machine.name).toBe('Test machine');
  expect(machine.marker).toBe(true);
  expect(machine.children.map((c) => c.constructor.name)).toEqual(['Comment', 'Vertex', 'State']);
  expect(machine.transitions.length).toBe(1);
  expect(machine.transitions[0].source).toBe('init');
  expect(machine.transitions[0].target).toBe('n0');
});

test('meta resolution', () => {
  const doc = build(minimal());
  expect(doc.metaComment).not.toBeNull();
  expect(doc.param('standardVersion')).toBe('1.0');
  expect(doc.geometryMode).toBe('none');
  expect(doc.transitionOrder()).toBe('actionFirst');
  expect(doc.eventPropagation()).toBe('block');
  expect(doc.markupLanguage()).toBe('plain');
});

test('node classification', () => {
  const [comment, vertex, state] = build(minimal()).machines[0].children;
  expect(comment).toBeInstanceOf(Comment);
  expect((comment as Comment).kind).toBe('formal');
  expect(comment.name).toBe('CGML_META');
  expect(vertex).toBeInstanceOf(Vertex);
  expect((vertex as Vertex).kind).toBe('initial');
  expect(state).toBeInstanceOf(State);
  expect(state.name).toBe('Idle');
  expect((state as State).regions).toEqual([]);
});

test('geometry and actions', () => {
  let doc = replace(
    minimal(),
    '      <data key="dName">Idle</data>',
    '      <data key="dName">Idle</data>\n' +
      '      <data key="dData">entry/ on()</data>\n' +
      '      <data key="dGeometry"><rect x="1.5" y="-2" width="30" height="40"/></data>',
  );
  doc = replace(
    doc,
    '      <data key="dVertex">initial</data>',
    '      <data key="dVertex">initial</data>\n' +
      '      <data key="dGeometry"><point x="5" y="6"/></data>',
  );
  const [, vertex, state] = build(doc).machines[0].children;
  expect(state.geometry).toEqual(new Rect(1.5, -2.0, 30.0, 40.0));
  expect(vertex.geometry).toEqual(new Point(5.0, 6.0));
  expect((state as State).blocks.map((b) => b.kind)).toEqual(['entry']);
  expect((state as State).blocks[0].behaviour).toEqual(['on()']);
});

test('comment link classification', () => {
  const doc = replace(
    minimal(),
    '<edge id="init-n0#1" source="init" target="n0"/>',
    '<edge id="init-n0#1" source="init" target="n0"/>\n' +
      '    <edge id="c-n0#1" source="nMeta" target="n0">\n' +
      '      <data key="dPivot">dName</data>\n' +
      '      <data key="dChunk">Idle</data>\n' +
      '    </edge>',
  );
  const machine = build(doc).machines[0];
  expect(machine.transitions.length).toBe(1);
  expect(machine.links.length).toBe(1);
  expect(machine.links[0].pivot).toBe('dName');
  expect(machine.links[0].chunk).toBe('Idle');
});

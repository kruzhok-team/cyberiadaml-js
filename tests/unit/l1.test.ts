/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L1 layer tests: encoding, declaration, well-formedness
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

import { encode, minimal, minimalText, replace } from './docbuilder';

import { runDocument } from '../../src/core/reader';
import { Context, REGISTRY } from '../../src/core/rules';

function run(data: Uint8Array): Context {
  return runDocument(data, 'test.graphml');
}

function ruleNames(ctx: Context): string[] {
  return ctx.report.findings.map((f) => f.rule);
}

/** Every occurrence of old replaced by value, as bytes.replaceAll(). */
function replaceBytes(data: Uint8Array, old: Uint8Array, value: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    if (i + old.length <= data.length && old.every((b, j) => data[i + j] === b)) {
      out.push(...value);
      i += old.length;
    } else {
      out.push(data[i]);
      i += 1;
    }
  }
  return new Uint8Array(out);
}

/** The text in UTF-16 with a byte order mark, as str.encode('utf-16') on a little-endian host. */
function utf16(text: string): Uint8Array {
  const out = [0xff, 0xfe];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out.push(code & 0xff, code >> 8);
  }
  return new Uint8Array(out);
}

test('minimal document is clean', () => {
  const ctx = run(minimal());
  expect(ctx.report.findings).toEqual([]);
  expect(ctx.report.verdict()).toBe('valid');
  expect(ctx.report.layersRun).toContain(1);
  expect(ctx.parsed!.root.tag).toBe('graphml');
});

test('cyrillic content preserved', () => {
  const doc = replace(minimal(), 'Test machine', 'Машина состояний');
  const ctx = run(doc);
  expect(ctx.report.findings).toEqual([]);
  const text = [...ctx.parsed!.root.iter('graph')].flatMap((g) =>
    g.children.filter((d) => d.tag === 'data').map((d) => d.text),
  );
  expect(text).toContain('Машина состояний');
});

test('escaped characters unescaped on read', () => {
  const doc = replace(
    minimal(),
    '<data key="dName">Idle</data>',
    '<data key="dName">&quot;A&quot; &gt;= &amp; b</data>',
  );
  const ctx = run(doc);
  expect(ctx.report.findings).toEqual([]);
  const names = [...ctx.parsed!.root.iter('node')].flatMap((n) =>
    n.children.filter((d) => d.tag === 'data' && d.get('key') === 'dName').map((d) => d.text),
  );
  expect(names).toContain('"A" >= & b');
});

test('xml comments ignored', () => {
  let doc = minimal({
    gformat: '<!-- top --><data key="gFormat">Cyberiada-GraphML-1.0</data>\n',
  });
  doc = replace(doc, '<edge', '<!-- between nodes and edges --><edge');
  doc = replace(doc, '<node id="n0">', '<node id="n0"><!-- inside node -->');
  const ctx = run(doc);
  expect(ctx.report.findings).toEqual([]);
});

test('utf16 document reported', () => {
  const text = minimalText().replaceAll('encoding="UTF-8"', 'encoding="UTF-16"');
  const ctx = run(utf16(text));
  expect(ruleNames(ctx)).toContain('doc-encoding');
  expect(ctx.report.hasWarnings()).toBe(true);
  expect(ctx.report.hasErrors()).toBe(false);
  expect(ctx.report.valid(true)).toBe(false);
});

test('declared non utf8 encoding reported', () => {
  const ctx = run(minimal({ declaration: '<?xml version="1.0" encoding="windows-1251"?>\n' }));
  expect(ruleNames(ctx)).toContain('doc-encoding');
  expect(ctx.report.hasErrors()).toBe(false);
});

test('broken utf8 reported', () => {
  const ctx = run(
    replaceBytes(minimal(), encode('Idle'), new Uint8Array([...encode('Idl'), 0xff])),
  );
  expect(ruleNames(ctx)).toContain('doc-encoding');
});

test('missing declaration reported', () => {
  const ctx = run(minimal({ declaration: '' }));
  expect(ruleNames(ctx)).toEqual(['xml-declaration']);
  expect(ctx.report.hasWarnings()).toBe(true);
});

test('declaration without encoding reported', () => {
  const ctx = run(minimal({ declaration: '<?xml version="1.0"?>\n' }));
  expect(ruleNames(ctx)).toEqual(['xml-declaration']);
});

test('truncated file rejected', () => {
  const ctx = run(minimal().slice(0, -40));
  const findings = ctx.report.findings;
  expect(findings.map((f) => f.rule)).toEqual(['xml-well-formed']);
  expect(findings[0].line).not.toBeNull();
  expect(ctx.report.verdict()).toBe('invalid');
  expect(ctx.report.layersRun).toEqual([1]);
});

test('empty file rejected', () => {
  for (const data of [new Uint8Array(), encode('   \n')]) {
    const ctx = run(data);
    expect(ruleNames(ctx)).toContain('xml-not-empty');
    expect(ctx.report.hasErrors()).toBe(true);
  }
});

test('binary junk rejected', () => {
  const ctx = run(Uint8Array.from({ length: 256 }, (_, i) => i));
  expect(ctx.report.hasErrors()).toBe(true);
  expect(ctx.parsed).toBeNull();
});

test('unescaped ampersand rejected', () => {
  const doc = replace(minimal(), 'standardVersion/ 1.0', 'a && b');
  const ctx = run(doc);
  const errors = ctx.report.findings.filter((f) => f.rule === 'xml-well-formed');
  expect(errors.length).toBeGreaterThan(0);
  expect(errors[0].line).not.toBeNull();
});

test('registry contains L1 rules', () => {
  for (const name of [
    'xml-well-formed',
    'doc-encoding',
    'char-escaping',
    'data-escaping',
    'xml-comments',
  ]) {
    expect(REGISTRY.has(name)).toBe(true);
  }
});

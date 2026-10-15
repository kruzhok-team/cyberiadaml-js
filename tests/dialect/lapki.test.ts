/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The Lapki dialect corpus read by the core
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

import * as core from '../../src/core';

const CORPUS = join(__dirname, '..', 'examples', 'lapki');
const DOCUMENTS: Record<string, { status: string; errors?: string[] }> = JSON.parse(
  readFileSync(join(CORPUS, 'manifest.json'), 'utf-8'),
).documents;
const NAMES = Object.keys(DOCUMENTS).sort();

function data(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(CORPUS, name + '.graphml')));
}

function corpusText(name: string, suffix: string): string {
  return readFileSync(join(CORPUS, name + suffix), 'utf-8');
}

function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

test('the snapshot holds the corpus', () => {
  expect(NAMES.length).toBeGreaterThanOrEqual(40);
});

test.each(NAMES)('%s: the repairs', (name) => {
  const document = core.read(data(name));
  const counts = new Map<string, number>();
  for (const finding of document.findings) {
    if (finding.layer === 0) {
      counts.set(finding.req!, (counts.get(finding.req!) ?? 0) + 1);
    }
  }
  const text = [...counts.keys()]
    .sort(byCodePoint)
    .map((req) => `${req} ${counts.get(req)}\n`)
    .join('');
  expect(text).toBe(corpusText(name, '.repairs.txt'));
  expect(document.label).toBe(core.FORMAT_LAPKI);
});

test.each(NAMES)('%s: the dump of a valid document, the errors of an invalid one', (name) => {
  const document = core.read(data(name));
  const entry = DOCUMENTS[name];
  const errors = [
    ...new Set(
      document.findings.filter((f) => f.severity === core.ERROR).map((f) => f.req ?? f.rule),
    ),
  ].sort(byCodePoint);
  if (entry.status === 'valid') {
    expect(errors).toEqual([]);
    expect(core.dump(document)).toBe(corpusText(name, '.expected.txt'));
  } else {
    expect(errors).toEqual(entry.errors);
  }
});

test.each(NAMES)('%s: the strict read rejects the dialect', (name) => {
  expect(() => core.read(data(name), { strict: true })).toThrow(core.CGMLError);
});

test.each(NAMES)('%s: the writer gives a standard document or refuses an invalid one', (name) => {
  const document = core.read(data(name));
  if (DOCUMENTS[name].status !== 'valid') {
    expect(() => core.write(document)).toThrow(core.CGMLError);
    return;
  }
  const again = core.read(core.write(document), { strict: true });
  expect(again.label).toBe(core.FORMAT_STANDARD);
  expect(core.dump(again)).toBe(corpusText(name, '.expected.txt'));
});

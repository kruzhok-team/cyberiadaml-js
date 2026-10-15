/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The conformance examples of the standard read by the core
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
import { REGISTRY } from '../../src/core/rules';

const EXAMPLES = join(__dirname, '..', 'examples', 'standard');
const MANIFEST: Record<string, { reject?: string }> = JSON.parse(
  readFileSync(join(EXAMPLES, 'manifest.json'), 'utf-8'),
).fixtures;
const names = Object.keys(MANIFEST).sort();
const POSITIVE = names.filter((n) => MANIFEST[n].reject === undefined);
const NEGATIVE = names.filter((n) => MANIFEST[n].reject !== undefined);

function data(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(EXAMPLES, name + '.graphml')));
}

function expected(name: string): string {
  return readFileSync(join(EXAMPLES, name + '.expected.txt'), 'utf-8');
}

/** The requirement ids the findings report. */
function cited(findings: core.Finding[]): Set<string | null> {
  const ids = new Set<string | null>();
  for (const finding of findings) {
    ids.add(finding.req);
    for (const req of REGISTRY.get(finding.rule)?.also ?? []) {
      ids.add(req);
    }
  }
  return ids;
}

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

test('the snapshot holds the examples', () => {
  expect(POSITIVE.length).toBeGreaterThanOrEqual(35);
  expect(NEGATIVE.length).toBeGreaterThanOrEqual(56);
});

test.each(POSITIVE)('%s reads strictly to its canonical dump', (name) => {
  const document = core.read(data(name), { strict: true });
  expect(core.dump(document)).toBe(expected(name));
  expect(document.label).toBe(core.FORMAT_STANDARD);
});

test.each(POSITIVE)('%s reads permissively without a repair', (name) => {
  const document = core.read(data(name));
  expect(document.findings.filter((f) => f.layer === 0)).toEqual([]);
  expect(document.findings.filter((f) => f.severity === core.ERROR)).toEqual([]);
});

test.each(NEGATIVE)('%s is rejected strictly with its requirement', (name) => {
  const error = failure(() => core.read(data(name), { strict: true }));
  expect([...cited(error.findings)]).toContain(MANIFEST[name].reject);
});

test.each(NEGATIVE)('%s is reported, rejected or repaired permissively', (name) => {
  let findings: core.Finding[];
  try {
    findings = core.read(data(name)).findings;
  } catch (error) {
    if (!(error instanceof core.CGMLError)) {
      throw error;
    }
    findings = error.findings;
  }
  const repaired = findings.some((f) => f.layer === 0);
  expect(repaired || cited(findings).has(MANIFEST[name].reject!)).toBe(true);
});

test.each(POSITIVE)('%s gives the same dump after write and a strict re-read', (name) => {
  const document = core.read(data(name), { strict: true });
  const again = core.read(core.write(document), { strict: true });
  expect(core.dump(again)).toBe(expected(name));
});

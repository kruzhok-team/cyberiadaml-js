/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The lapki-client contract: the fields GraphmlParser.ts reads
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

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { view } from './view';

import { CGMLElements, exportGraphml, parseCGML } from '../../src';

// RECORD_VIEW=1 npx jest tests/lapki records the view; the differences from 1.2.4 are reviewed
// in README.md
const RECORD = process.env.RECORD_VIEW === '1';
const ROOT = join(__dirname, '..', '..');
const VIEW = join(__dirname, 'lapki-client-view.json');
const SOURCES = [join(ROOT, 'tests', 'examples', 'lapki'), join(ROOT, 'demos')];

const documents: Array<[string, string]> = SOURCES.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.graphml'))
    .sort()
    .map((f): [string, string] => [`${dir === SOURCES[0] ? 'lapki' : 'demos'}/${f}`, join(dir, f)]),
);

function take(text: string): unknown {
  try {
    return view(parseCGML(text));
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const recorded: { [name: string]: unknown } = RECORD ? {} : JSON.parse(readFileSync(VIEW, 'utf-8'));

afterAll(() => {
  if (RECORD) {
    writeFileSync(VIEW, JSON.stringify(recorded, null, 1) + '\n');
  }
});

test.each(documents)('%s: the lapki-client view', (name, path) => {
  const actual = take(readFileSync(path, 'utf-8'));
  if (RECORD) {
    recorded[name] = actual;
  } else {
    expect(actual).toEqual(recorded[name]);
  }
});

/** True when an element id repeats in a later machine: written as <machine id>::<id>, <id>#<N>. */
function repeatsAcrossMachines(elements: CGMLElements): boolean {
  const seen = new Set<string>();
  for (const sm of Object.values(elements.stateMachines)) {
    const ids = [
      sm.states,
      sm.components,
      sm.notes,
      sm.initialStates,
      sm.finals,
      sm.choices,
      sm.terminates,
      sm.shallowHistory,
      sm.deepHistory,
      sm.unknownVertexes,
      sm.transitions,
      sm.links ?? {},
    ].flatMap((records) => Object.keys(records));
    if (ids.some((id) => seen.has(id))) {
      return true;
    }
    ids.forEach((id) => seen.add(id));
  }
  return false;
}

test.each(documents)('%s: the same view after a write', (name, path) => {
  let elements = parseCGML(readFileSync(path, 'utf-8'));
  if (elements.findings!.some((f) => f.severity === 'ERROR')) {
    return; // an invalid document is refused by the writer
  }
  if (repeatsAcrossMachines(elements)) {
    // the first write gives the repeated ids their document-unique form; it stays from then on
    elements = parseCGML(exportGraphml(elements));
    expect(repeatsAcrossMachines(elements)).toBe(false);
  }
  expect(view(parseCGML(exportGraphml(elements)))).toEqual(view(elements));
});

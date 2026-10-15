/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The 6.9 metadata parameter parser tests
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

import { Param, parse } from '../../src/core/meta';

function pairs(params: Param[]): Array<[string, string]> {
  return params.map((p) => [p.name, p.value]);
}

test('empty text', () => {
  for (const text of [null, '', '\n\n']) {
    const [params, errors] = parse(text);
    expect(params).toEqual([]);
    expect(errors).toEqual([]);
  }
});

test('single parameter', () => {
  const [params, errors] = parse('standardVersion/ 1.0');
  expect(errors).toEqual([]);
  expect(pairs(params)).toEqual([['standardVersion', '1.0']]);
});

test('multiple parameters ordered', () => {
  const [params, errors] = parse('standardVersion/ 1.0\n\ngeometry/ short\n\nauthor/ A. Author');
  expect(errors).toEqual([]);
  expect(pairs(params)).toEqual([
    ['standardVersion', '1.0'],
    ['geometry', 'short'],
    ['author', 'A. Author'],
  ]);
});

test('multiline value', () => {
  const [params, errors] = parse('description/ first line\nsecond line\nthird line');
  expect(errors).toEqual([]);
  expect(pairs(params)).toEqual([['description', 'first line\nsecond line\nthird line']]);
});

test('no space after slash', () => {
  expect(pairs(parse('name/value')[0])).toEqual([['name', 'value']]);
});

test('whitespace around the slash is trimmed', () => {
  expect(pairs(parse('name \t/ \t double space ')[0])).toEqual([['name', 'double space ']]);
});

test('missing slash is an error', () => {
  const [params, errors] = parse('standardVersion 1.0');
  expect(params).toEqual([]);
  expect(errors.length).toBe(1);
  expect(errors[0][1]).toContain("missing '/'");
});

test('empty name is an error', () => {
  const [params, errors] = parse('/ value');
  expect(params).toEqual([]);
  expect(errors.length).toBe(1);
  expect(errors[0][1]).toContain('empty parameter name');
});

test('non latin name parsed for L3', () => {
  // the parser keeps the name; the charset is judged by the L3 checks
  const [params, errors] = parse('имя/ значение');
  expect(errors).toEqual([]);
  expect(pairs(params)).toEqual([['имя', 'значение']]);
});

test('component body grammar', () => {
  const [params, errors] = parse('id/ c1\n\ntype/ LED\n\nname/ Front light');
  expect(errors).toEqual([]);
  expect(pairs(params)).toEqual([
    ['id', 'c1'],
    ['type', 'LED'],
    ['name', 'Front light'],
  ]);
});

test('error line numbers', () => {
  expect(parse('a/ 1\n\nbroken\n\nb/ 2')[1]).toEqual([
    [2, "missing '/' in the parameter description"],
  ]);
});

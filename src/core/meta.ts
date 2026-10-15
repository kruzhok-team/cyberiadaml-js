/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The parser of the 6.9 metadata parameter text (name/ value lists)
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

/** A metadata parameter. */
export class Param {
  constructor(
    public name: string,
    public value: string,
    public line: number, // line index of the parameter inside the text
  ) {}
}

/** Trim spaces and tabs only, as Python's strip(' \t'). */
export function trimBlanks(text: string, start = true, end = true): string {
  let from = 0;
  let to = text.length;
  while (start && from < to && (text[from] === ' ' || text[from] === '\t')) from++;
  while (end && to > from && (text[to - 1] === ' ' || text[to - 1] === '\t')) to--;
  return text.slice(from, to);
}

/** Python's str.strip(): whitespace on both sides. */
export function strip(text: string): string {
  return text.trim();
}

/**
 * Parse a metadata parameter list; return [params, errors].
 *
 * Parameters are separated by blank lines; the first line of a chunk is 'name/ value' (spaces and
 * tabs around the '/' are trimmed), the following chunk lines continue the value. The same grammar
 * parses the CGML_COMPONENT bodies. Errors are [line index, message] pairs.
 */
export function parse(text: string | null): [Param[], Array<[number, string]>] {
  const params: Param[] = [];
  const errors: Array<[number, string]> = [];
  if (text === null || text === undefined) {
    return [params, errors];
  }
  const lines = text.split('\n');
  let run: Array<[number, string]> = [];
  [...lines, ''].forEach((line, lineno) => {
    if (strip(line)) {
      run.push([lineno, line]);
      return;
    }
    if (!run.length) {
      return;
    }
    const [headerLineno, header] = run[0];
    const sep = header.indexOf('/');
    if (sep < 0) {
      errors.push([headerLineno, "missing '/' in the parameter description"]);
    } else {
      const name = trimBlanks(header.slice(0, sep));
      let value = trimBlanks(header.slice(sep + 1), true, false);
      for (const [, extra] of run.slice(1)) {
        value += '\n' + extra;
      }
      if (!name) {
        errors.push([headerLineno, 'empty parameter name']);
      } else {
        params.push(new Param(name, value, headerLineno));
      }
    }
    run = [];
  });
  return [params, errors];
}

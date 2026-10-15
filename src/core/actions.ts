/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The parser of the 6.8 behaviour text: triggers, guards, blocks
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

import { repr, words } from './util';

export const ENTRY = 'entry';
export const EXIT = 'exit';
export const DO = 'do';
export const EVENT = 'event';

export const KEYWORDS = [ENTRY, EXIT, DO];
export const EVENT_PARAMS = ['propagate', 'block', 'defer'];
export const PRE_PARAMS = ['propagate', 'block']; // directly before the '/' separator
export const DEFER = 'defer'; // directly after the '/' separator
export const RESERVED = [...KEYWORDS, ...EVENT_PARAMS, 'else']; // not event names (6.8.1)
export const SYNTAX = 'behaviour-syntax';
export const RESERVED_RULE = 'event-name-reserved';
export const DEFER_RULE = 'defer-usage';
export const PARAM_RULE = 'param-needs-event';
export const ONCE_RULE = 'behaviour-block-once';

/** One block of a behaviour text. */
export class Block {
  constructor(
    public kind: string, // entry | exit | do | event
    public trigger: string = '', // event name, verbatim (event blocks)
    public param: string | null = null, // propagate | block | defer
    public guard: string | null = null, // guard text, bracket escapes resolved
    public behaviour: string[] = [],
    public verbatim: string = '',
  ) {}
}

/** An error of the text: [line index, message, rule]. */
export type ActionError = [number, string, string];

function escaped(line: string, idx: number): boolean {
  return idx > 0 && line[idx - 1] === '\\';
}

/** The header separator: the first '/' followed by a space, a newline or the text end. */
export function findSeparator(text: string): number {
  let idx = 0;
  for (;;) {
    idx = text.indexOf('/', idx);
    if (idx < 0) {
      return -1;
    }
    if (idx === text.length - 1 || ' \n'.includes(text[idx + 1])) {
      return idx;
    }
    idx += 1;
  }
}

/** The last unescaped [...] pair directly before end. */
function findGuard(text: string, end: number): [number, number] | null {
  let close = end - 1;
  while (close >= 0 && ' \n\t\r'.includes(text[close])) {
    close -= 1;
  }
  if (close < 0 || text[close] !== ']' || escaped(text, close)) {
    return null;
  }
  for (let start = close - 1; start >= 0; start--) {
    if (text[start] === '[' && !escaped(text, start)) {
      return [start, close];
    }
  }
  return null;
}

/** Split a trailing propagate/block keyword off the header text. */
function stripParam(head: string): [string, string | null] {
  const parts = words(head);
  if (parts.length && PRE_PARAMS.includes(parts[parts.length - 1])) {
    const last = parts[parts.length - 1];
    return [head.slice(0, head.lastIndexOf(last)).trimEnd(), last];
  }
  return [head, null];
}

function resolveBrackets(text: string): string {
  return text.split('\\[').join('[').split('\\]').join(']');
}

/**
 * Parse a block header; return [block, inline behaviour or null].
 *
 * In both contexts the separator may be omitted when no behaviour follows; a transition header
 * may additionally span several lines up to the separator.
 */
function parseHeader(
  text: string,
  lineno: number,
  errors: ActionError[],
  transition: boolean,
): [Block, string | null] {
  const stripped = text.trimEnd();
  for (const keyword of KEYWORDS) {
    const prefix = keyword + '/';
    if (stripped.startsWith(prefix)) {
      let inline = stripped.slice(prefix.length);
      if (inline.startsWith(' ')) {
        inline = inline.slice(1);
      }
      if (transition) {
        errors.push([
          lineno,
          `the ${prefix} block belongs to a state, not to a transition`,
          RESERVED_RULE,
        ]);
      }
      return [new Block(keyword), inline || null];
    }
  }
  const sep = findSeparator(stripped);
  let head: string;
  let inline: string | null;
  if (sep < 0) {
    head = stripped;
    inline = null;
  } else {
    head = stripped.slice(0, sep).trimEnd();
    inline = stripped.slice(sep + 1);
    if (inline.startsWith(' ')) {
      inline = inline.slice(1);
    }
  }
  // propagate/block sit directly before the separator, after the guard
  let param: string | null;
  [head, param] = stripParam(head);
  let guard: string | null = null;
  const span = findGuard(head, head.length);
  if (span !== null) {
    const [start, close] = span;
    guard = resolveBrackets(head.slice(start + 1, close));
    head = head.slice(0, start).trimEnd();
  }
  // defer sits directly after the separator
  if (inline !== null && param === null && (inline === DEFER || inline.startsWith(DEFER + ' '))) {
    param = DEFER;
    inline = inline.slice(DEFER.length).trimStart();
    if (transition) {
      errors.push([
        lineno,
        'defer on a transition; it belongs to an internal transition of a state',
        DEFER_RULE,
      ]);
    }
    if (inline) {
      errors.push([lineno, `behaviour ${repr(inline)} after defer`, DEFER_RULE]);
    }
  }
  const trigger = head;
  if (RESERVED.includes(trigger.trim())) {
    errors.push([lineno, `event name ${repr(trigger.trim())} is a reserved word`, RESERVED_RULE]);
  }
  if (param !== null && PRE_PARAMS.includes(param) && !trigger.trim()) {
    errors.push([lineno, `${param} without an event name`, PARAM_RULE]);
  }
  // an event description without the event name is a completion transition
  return [new Block(EVENT, trigger, param, guard), inline || null];
}

/**
 * Parse a dData behaviour value; return [blocks, errors].
 *
 * Blocks are separated by blank lines; an empty value is zero blocks. Errors are [line index,
 * message, rule] triples for the L3 checks: the syntax rule, or one of the 6.8.1/6.8.2
 * constraints (reserved event names, defer placement, propagate/block without an event, repeated
 * entry/exit/do blocks). The transition flag selects the label grammar of edges (separator
 * optional) over the node grammar (separator mandatory).
 */
export function parse(text: string | null, transition = false): [Block[], ActionError[]] {
  const blocks: Block[] = [];
  const errors: ActionError[] = [];
  if (text === null || text === undefined) {
    return [blocks, errors];
  }
  const lines = [...text.split('\n'), ''];
  let run: Array<[number, string]> = []; // [line index, line] of the current block
  lines.forEach((line, lineno) => {
    if (line.trim()) {
      run.push([lineno, line]);
      return;
    }
    if (!run.length) {
      return;
    }
    // a transition header runs up to the first line carrying the separator (without one the
    // whole block is the event); a node block header is its first line, and behaviour lines
    // demand the separator on it
    let headerEnd = 0;
    if (transition) {
      headerEnd = run.length - 1;
      for (let offset = 0; offset < run.length; offset++) {
        if (findSeparator(run[offset][1].trimEnd()) >= 0) {
          headerEnd = offset;
          break;
        }
      }
    } else if (run.length > 1 && findSeparator(run[0][1].trimEnd()) < 0) {
      errors.push([run[0][0], "missing '/' before the behaviour lines", SYNTAX]);
    }
    const header = run
      .slice(0, headerEnd + 1)
      .map(([, textLine]) => textLine)
      .join('\n');
    const [block, inline] = parseHeader(header, run[0][0], errors, transition);
    if (inline) {
      block.behaviour.push(inline);
    }
    block.behaviour.push(...run.slice(headerEnd + 1).map(([, textLine]) => textLine));
    block.verbatim = run.map(([, textLine]) => textLine).join('\n');
    if (block.param === DEFER && block.behaviour.length) {
      errors.push([run[0][0], 'behaviour lines after defer', DEFER_RULE]);
    }
    if (KEYWORDS.includes(block.kind) && blocks.some((b) => b.kind === block.kind)) {
      errors.push([run[0][0], `a second ${block.kind}/ block`, ONCE_RULE]);
    }
    blocks.push(block);
    run = [];
  });
  return [blocks, errors];
}

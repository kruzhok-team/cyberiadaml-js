/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The 6.8 behaviour text parser tests
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

import { parse } from '../../src/core/actions';

const MISSING_SEPARATOR = "missing '/' before the behaviour lines";

function kinds(text: string): string[] {
  return parse(text)[1].map((e) => e[2]);
}

test('empty value is zero blocks', () => {
  for (const text of [null, '', '\n', '  \n  ']) {
    const [blocks, errors] = parse(text);
    expect(blocks).toEqual([]);
    expect(errors).toEqual([]);
  }
});

test('entry block with body', () => {
  const [blocks, errors] = parse('entry/\nLED.on();');
  expect(errors).toEqual([]);
  expect(blocks.length).toBe(1);
  expect(blocks[0].kind).toBe('entry');
  expect(blocks[0].behaviour).toEqual(['LED.on();']);
});

test('inline behaviour after keyword', () => {
  const [blocks] = parse('exit/ LED.off();');
  expect(blocks[0].kind).toBe('exit');
  expect(blocks[0].behaviour).toEqual(['LED.off();']);
});

test('keyword with empty body', () => {
  for (const text of ['entry/', 'exit/', 'do/']) {
    const [blocks, errors] = parse(text);
    expect(errors).toEqual([]);
    expect(blocks[0].kind).toBe(text.slice(0, -1));
    expect(blocks[0].behaviour).toEqual([]);
  }
});

test('multiple blocks order preserved', () => {
  const [blocks, errors] = parse('entry/\na();\n\nTIMER/\nb();\n\nexit/\nc();');
  expect(errors).toEqual([]);
  expect(blocks.map((b) => b.kind)).toEqual(['entry', 'event', 'exit']);
  expect(blocks[1].trigger).toBe('TIMER');
  expect(blocks[1].behaviour).toEqual(['b();']);
});

test('consecutive blank lines make no empty blocks', () => {
  const [blocks] = parse('entry/\n\n\n\nexit/');
  expect(blocks.map((b) => b.kind)).toEqual(['entry', 'exit']);
});

test('trigger with guard and behaviour', () => {
  const [blocks, errors] = parse('TIMER(100) [cnt > 0]/ blink()');
  expect(errors).toEqual([]);
  const block = blocks[0];
  expect(block.kind).toBe('event');
  expect(block.trigger).toBe('TIMER(100)');
  expect(block.guard).toBe('cnt > 0');
  expect(block.behaviour).toEqual(['blink()']);
});

test('trigger with guard and empty behaviour', () => {
  const [blocks, errors] = parse('EVENT [x = 1]/');
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('EVENT');
  expect(blocks[0].guard).toBe('x = 1');
  expect(blocks[0].behaviour).toEqual([]);
});

test('event parameters', () => {
  for (const param of ['propagate', 'block']) {
    const [blocks, errors] = parse(`TIMER ${param}/ x()`);
    expect(errors).toEqual([]);
    expect(blocks[0].trigger).toBe('TIMER');
    expect(blocks[0].param).toBe(param);
  }
  const [blocks, errors] = parse('TIMER/ defer');
  expect(errors).toEqual([]);
  expect([blocks[0].trigger, blocks[0].param]).toEqual(['TIMER', 'defer']);
});

test('parameter with guard', () => {
  const [blocks] = parse('TIMER [cnt > 0] propagate/ x()');
  expect(blocks[0].trigger).toBe('TIMER');
  expect(blocks[0].param).toBe('propagate');
  expect(blocks[0].guard).toBe('cnt > 0');
});

test('else guard', () => {
  const [blocks, errors] = parse('[else]/ fallback()');
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('');
  expect(blocks[0].guard).toBe('else');
  expect(blocks[0].behaviour).toEqual(['fallback()']);
});

test('escaped brackets in guard', () => {
  const [blocks, errors] = parse('E [Строка.Содержит(\\[Пример\\])]/');
  expect(errors).toEqual([]);
  expect(blocks[0].guard).toBe('Строка.Содержит([Пример])');
});

test('exotic event names preserved', () => {
  for (const trigger of ['Module.Event', 'EVENT(a, b)', 'Событие']) {
    const [blocks, errors] = parse(trigger + '/');
    expect(errors).toEqual([]);
    expect(blocks[0].trigger).toBe(trigger);
  }
});

test('slash inside arguments not a separator', () => {
  const [blocks] = parse('E(a/b)/ x()');
  expect(blocks[0].trigger).toBe('E(a/b)');
  expect(blocks[0].behaviour).toEqual(['x()']);
});

test('multiline behaviour preserved', () => {
  const text = 'TIMER/\nfirst();\n  indented();\nlast();';
  const [blocks] = parse(text);
  expect(blocks[0].behaviour).toEqual(['first();', '  indented();', 'last();']);
  expect(blocks[0].verbatim).toBe(text);
});

test('event without separator', () => {
  const [blocks, errors] = parse('EV', true);
  expect(errors).toEqual([]);
  expect(blocks[0].kind).toBe('event');
  expect(blocks[0].trigger).toBe('EV');
  expect(blocks[0].guard).toBeNull();
  expect(blocks[0].behaviour).toEqual([]);
});

test('event with guard without separator', () => {
  const [blocks, errors] = parse('EV [x > 1]', true);
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('EV');
  expect(blocks[0].guard).toBe('x > 1');
  expect(blocks[0].behaviour).toEqual([]);
});

test('multiline header standard example', () => {
  const text = 'Сенсор.ЦельПолучена\n[Счетчик.ТекущееЗначениеСчетчика >= 2]';
  const [blocks, errors] = parse(text, true);
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('Сенсор.ЦельПолучена');
  expect(blocks[0].guard).toBe('Счетчик.ТекущееЗначениеСчетчика >= 2');
  expect(blocks[0].behaviour).toEqual([]);
  expect(blocks[0].verbatim).toBe(text);
});

test('separator on second line', () => {
  const [blocks, errors] = parse('EV\n[g]/ act()\nmore()', true);
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('EV');
  expect(blocks[0].guard).toBe('g');
  expect(blocks[0].behaviour).toEqual(['act()', 'more()']);
});

test('event parameter after guard', () => {
  const [blocks, errors] = parse('STOP [ready] block/ halt()');
  expect(errors).toEqual([]);
  expect([blocks[0].trigger, blocks[0].param, blocks[0].guard]).toEqual(['STOP', 'block', 'ready']);
});

test('keyword before guard stays in the event name', () => {
  const [blocks, errors] = parse('START propagate [g]/');
  expect(errors).toEqual([]);
  expect([blocks[0].trigger, blocks[0].param, blocks[0].guard]).toEqual([
    'START propagate',
    null,
    'g',
  ]);
});

test('pre separator parameter without guard', () => {
  const [blocks, errors] = parse('START propagate/');
  expect(errors).toEqual([]);
  expect([blocks[0].trigger, blocks[0].param]).toEqual(['START', 'propagate']);
});

test('defer after separator', () => {
  let [blocks, errors] = parse('TICK/ defer');
  expect(errors).toEqual([]);
  expect([blocks[0].trigger, blocks[0].param]).toEqual(['TICK', 'defer']);
  expect(blocks[0].behaviour).toEqual([]);
  [blocks, errors] = parse('TICK [g]/ defer\nact()');
  expect([blocks[0].param, blocks[0].guard]).toEqual(['defer', 'g']);
  expect(errors.map((e) => e[2])).toEqual(['defer-usage']);
  [blocks, errors] = parse('TICK/ defer', true);
  expect(errors.map((e) => e[2])).toEqual(['defer-usage']);
  [blocks] = parse('TICK/ deferred()');
  expect(blocks[0].param).toBeNull();
  expect(blocks[0].behaviour).toEqual(['deferred()']);
});

test('defer before separator stays in the event name', () => {
  const [blocks, errors] = parse('TICK defer/');
  expect(errors).toEqual([]);
  expect([blocks[0].trigger, blocks[0].param]).toEqual(['TICK defer', null]);
});

test('empty event name in node is accepted', () => {
  const [blocks, errors] = parse('/ x()');
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('');
  expect(blocks[0].behaviour).toEqual(['x()']);
});

test('completion transition', () => {
  let blocks = parse('/')[0];
  for (const text of ['/ finish()', '/', '[done]/ finish()']) {
    const [parsed, errors] = parse(text, true);
    blocks = parsed;
    expect(errors).toEqual([]);
    expect(blocks[0].kind).toBe('event');
    expect(blocks[0].trigger).toBe('');
  }
  expect(blocks[0].guard).toBe('done');
  expect(blocks[0].behaviour).toEqual(['finish()']);
});

test('node event without behaviour accepted', () => {
  const [blocks, errors] = parse('EV');
  expect(errors).toEqual([]);
  expect(blocks[0].trigger).toBe('EV');
  expect(blocks[0].behaviour).toEqual([]);
});

test('node behaviour lines require separator', () => {
  const [blocks, errors] = parse('EV\n[g]');
  expect(errors).toEqual([[0, MISSING_SEPARATOR, 'behaviour-syntax']]);
  expect(blocks[0].trigger).toBe('EV');
  expect(blocks[0].behaviour).toEqual(['[g]']);
});

test('error line numbers', () => {
  expect(parse('entry/\na()\n\nbroken\nlines')[1]).toEqual([
    [3, MISSING_SEPARATOR, 'behaviour-syntax'],
  ]);
  expect(parse('entry/\na()\n\n/ x()')[1]).toEqual([]);
});

test('reserved event names and empty event params', () => {
  for (const name of ['entry', 'exit', 'do', 'defer', 'else']) {
    expect(parse(`${name}/ x()`, true)[1].map((e) => e[2])).toEqual(['event-name-reserved']);
  }
  expect(kinds('ANY/ x()\n\nUNKNOWN/ y()')).toEqual([]);
  expect(parse('propagate/ x()', true)[1].map((e) => e[2])).toEqual(['param-needs-event']);
  expect(parse('[g] block/', true)[1].map((e) => e[2])).toEqual(['param-needs-event']);
  expect(kinds('entry/ a()\n\nexit/ b()\n\nentry/ c()')).toEqual(['behaviour-block-once']);
});

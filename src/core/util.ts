/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * Python's string helpers the ported checks rely on
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

/** Python's repr() of a string, for the finding messages. */
export function repr(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'None';
  }
  const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
  let out = '';
  for (const ch of value) {
    if (ch === '\\') out += '\\\\';
    else if (ch === quote) out += '\\' + quote;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f) {
      out += '\\x' + ch.charCodeAt(0).toString(16).padStart(2, '0');
    } else out += ch;
  }
  return quote + out + quote;
}

/** Python's str.split() without arguments. */
export function words(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

/** Python's float(): null for a value float() rejects. */
export function pyFloat(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.trim().toLowerCase().replace(/_/g, '');
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(text)) {
    return Number(text);
  }
  if (/^[+-]?(inf|infinity)$/.test(text)) {
    return text.startsWith('-') ? -Infinity : Infinity;
  }
  if (/^[+-]?nan$/.test(text)) {
    return NaN;
  }
  return null;
}

/** Python's sorted() order of strings: by code points. */
export function compareText(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0)! - y[i].codePointAt(0)!;
    if (d !== 0) {
      return d;
    }
  }
  return x.length - y.length;
}

/** Python's str() of an optional text. */
export function pyStr(value: string | null | undefined): string {
  return value === null || value === undefined ? 'None' : value;
}

/** Python's repr() of a float. */
export function pyFloatRepr(value: number): string {
  if (Number.isNaN(value)) {
    return 'nan';
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? 'inf' : '-inf';
  }
  if (value === 0) {
    return Object.is(value, -0) ? '-0.0' : '0.0';
  }
  const sign = value < 0 ? '-' : '';
  const [mantissa, exponent] = Math.abs(value).toExponential().split('e');
  const exp = Number(exponent);
  const digits = mantissa.replace('.', '');
  if (exp >= -4 && exp < 16) {
    if (exp < 0) {
      return `${sign}0.${'0'.repeat(-exp - 1)}${digits}`;
    }
    const whole = digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, '0');
    return `${sign}${whole}.${digits.slice(exp + 1) || '0'}`;
  }
  const head = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
  const power = String(Math.abs(exp)).padStart(2, '0');
  return `${sign}${head}e${exp < 0 ? '-' : '+'}${power}`;
}

/** Python's '%.2f' formatting: exact value, ties to even. */
export function pyFixed2(value: number): string {
  if (Number.isNaN(value)) {
    return 'nan';
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? 'inf' : '-inf';
  }
  const eighths = value * 8;
  // a tie at the third decimal is an odd number of eighths
  if (Number.isInteger(eighths) && Math.abs(eighths) % 2 === 1 && Math.abs(value) < 1e15) {
    let cents = Math.floor(Math.abs(value) * 100);
    if (cents % 2 === 1) {
      cents += 1;
    }
    return (value < 0 ? '-' : '') + (cents / 100).toFixed(2);
  }
  if (Math.abs(value) >= 1e21) {
    return (value < 0 ? '-' : '') + BigInt(Math.abs(value)).toString() + '.00';
  }
  return value.toFixed(2);
}

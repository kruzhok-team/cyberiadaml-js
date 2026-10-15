/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The L1 layer: encoding checks and the position-tracking XML parse
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

import { ERROR, INFO, WARNING } from './findings';
import { Context, declare } from './rules';

declare('xml-not-empty', null, 1, ERROR, 'the document is a non-empty XML file');
declare('xml-well-formed', null, 1, ERROR, 'the document is well-formed XML');
declare('doc-encoding', 'CGML-5.1-1', 1, WARNING, 'the document encoding is UTF-8');
declare(
  'xml-declaration',
  'CGML-5.1-2',
  1,
  WARNING,
  'the XML declaration carries version and encoding',
);
declare(
  'char-escaping',
  'CGML-5.2-1',
  1,
  ERROR,
  'XML markup characters in content are escaped',
  'detected by the well-formedness parse',
);
declare(
  'data-escaping',
  'CGML-6.8-7',
  1,
  ERROR,
  'XML special characters inside dData are escaped',
  'detected by the well-formedness parse',
);
declare(
  'xml-comments',
  'CGML-5.3-1',
  1,
  INFO,
  'XML text comments are ignored',
  'the parser drops XML comments',
);

/** An element of the parsed tree, the subset of ElementTree the checks use. */
export class XElement {
  attrib: Map<string, string>;
  children: XElement[] = [];
  text: string | null = null;
  tail: string | null = null;

  constructor(
    public tag: string,
    attrib: Map<string, string> | Record<string, string> = new Map(),
  ) {
    this.attrib = attrib instanceof Map ? new Map(attrib) : new Map(Object.entries(attrib));
  }

  get(name: string): string | null {
    const value = this.attrib.get(name);
    return value === undefined ? null : value;
  }

  set(name: string, value: string): void {
    this.attrib.set(name, value);
  }

  keys(): string[] {
    return [...this.attrib.keys()];
  }

  append(child: XElement): void {
    this.children.push(child);
  }

  insert(index: number, child: XElement): void {
    this.children.splice(index, 0, child);
  }

  remove(child: XElement): void {
    const index = this.children.indexOf(child);
    if (index < 0) {
      throw new Error('the element is not a child');
    }
    this.children.splice(index, 1);
  }

  /** The element and its descendants in document order, of one tag when given. */
  *iter(tag: string | null = null): Generator<XElement> {
    if (tag === null || this.tag === tag) {
      yield this;
    }
    for (const child of this.children) {
      yield* child.iter(tag);
    }
  }

  /** A deep copy of the element. */
  copy(): XElement {
    const elem = new XElement(this.tag, this.attrib);
    elem.text = this.text;
    elem.tail = this.tail;
    elem.children = this.children.map((child) => child.copy());
    return elem;
  }
}

/** [line, column, element path] of an element. */
export type Position = [number, number, string];

/** The element tree with the source positions of its elements. */
export class ParsedDocument {
  constructor(
    public root: XElement,
    // keyed by the element itself: a removed element's position never leaks into a new one
    public info: Map<XElement, Position> = new Map(),
    public declaration: [string | null, string | null, string | null] | null = null,
  ) {}

  /** Give an element created after the parse the position of donor. */
  inherit(elem: XElement, donor: XElement): void {
    const info = this.info.get(donor);
    if (info !== undefined) {
      this.info.set(elem, info);
    }
  }
}

class XmlError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
  ) {
    super(message);
  }
}

const NAME_START = /[A-Za-z_:À-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�]/;
const NAME_CHAR = /[-.0-9A-Za-z_:·À-ÖØ-öø-ͽͿ-῿‌-‍‿-⁀⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�]/;
// eslint-disable-next-line no-control-regex
const INVALID_CHAR = /[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/;
const PREDEFINED: Record<string, string> = { lt: '<', gt: '>', amp: '&', apos: "'", quot: '"' };

/** A non-namespace XML reader in the manner of expat: prefixes stay literal. */
class Reader {
  pos = 0;
  root: XElement | null = null;
  stack: XElement[] = [];
  info: Map<XElement, Position> = new Map();
  declaration: [string | null, string | null, string | null] | null = null;
  lineStarts: number[] = [0];

  constructor(public text: string) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  where(offset: number): [number, number] {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (this.lineStarts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return [low + 1, offset - this.lineStarts[low] + 1];
  }

  fail(message: string, offset: number = this.pos): never {
    const [line, column] = this.where(offset);
    throw new XmlError(message, line, column);
  }

  startsWith(token: string): boolean {
    return this.text.startsWith(token, this.pos);
  }

  skipSpace(): void {
    while (this.pos < this.text.length && ' \t\n'.includes(this.text[this.pos])) {
      this.pos++;
    }
  }

  name(): string {
    const start = this.pos;
    if (this.pos >= this.text.length || !NAME_START.test(this.text[this.pos])) {
      this.fail('not well-formed (invalid token)');
    }
    this.pos++;
    while (this.pos < this.text.length && NAME_CHAR.test(this.text[this.pos])) {
      this.pos++;
    }
    return this.text.slice(start, this.pos);
  }

  until(token: string, message: string): string {
    const end = this.text.indexOf(token, this.pos);
    if (end < 0) {
      this.fail(message);
    }
    const body = this.text.slice(this.pos, end);
    this.pos = end + token.length;
    return body;
  }

  /** Resolve the references of a text or an attribute value. */
  references(raw: string, offset: number): string {
    if (!raw.includes('&')) {
      return raw;
    }
    let out = '';
    let i = 0;
    while (i < raw.length) {
      const amp = raw.indexOf('&', i);
      if (amp < 0) {
        out += raw.slice(i);
        break;
      }
      out += raw.slice(i, amp);
      const semi = raw.indexOf(';', amp);
      if (semi < 0) {
        this.fail('not well-formed (invalid token)', offset + amp);
      }
      const ref = raw.slice(amp + 1, semi);
      if (ref.startsWith('#')) {
        const code = ref.startsWith('#x') ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
        const valid = /^#(x[0-9A-Fa-f]+|[0-9]+)$/.test(ref);
        const allowed =
          code === 0x9 ||
          code === 0xa ||
          code === 0xd ||
          (code >= 0x20 && code <= 0xd7ff) ||
          (code >= 0xe000 && code <= 0xfffd) ||
          (code >= 0x10000 && code <= 0x10ffff);
        if (!valid || !allowed) {
          this.fail('reference to invalid character number', offset + amp);
        }
        out += String.fromCodePoint(code);
      } else if (ref in PREDEFINED) {
        out += PREDEFINED[ref];
      } else {
        this.fail('undefined entity', offset + amp);
      }
      i = semi + 1;
    }
    return out;
  }

  addText(text: string): void {
    if (!this.stack.length) {
      if (text.trim()) {
        this.fail(this.root === null ? 'syntax error' : 'junk after document element');
      }
      return;
    }
    const current = this.stack[this.stack.length - 1];
    if (current.children.length) {
      const last = current.children[current.children.length - 1];
      last.tail = (last.tail ?? '') + text;
    } else {
      current.text = (current.text ?? '') + text;
    }
  }

  path(tag: string, attrs: Map<string, string>): string {
    const base = this.stack.length ? this.info.get(this.stack[this.stack.length - 1])![2] : '';
    let seg = tag;
    if (tag === 'data' && attrs.has('key')) {
      seg = `data[key=${attrs.get('key')}]`;
    } else if (attrs.has('id')) {
      seg = `${tag}[id=${attrs.get('id')}]`;
    }
    return `${base}/${seg}`;
  }

  declarationAt(): void {
    const body = this.until('?>', 'unclosed token');
    const attrs: Record<string, string> = {};
    const re = /\s*([A-Za-z]+)\s*=\s*("([^"]*)"|'([^']*)')/y;
    let rest = body.slice(5);
    let match: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((match = re.exec(rest)) !== null) {
      attrs[match[1]] = match[3] ?? match[4];
      rest = rest.slice(re.lastIndex);
      re.lastIndex = 0;
    }
    if (rest.trim()) {
      this.fail('XML declaration not well-formed', 0);
    }
    this.declaration = [attrs.version ?? null, attrs.encoding ?? null, attrs.standalone ?? null];
  }

  startTag(): void {
    const start = this.pos;
    this.pos++; // '<'
    const tag = this.name();
    const attrs = new Map<string, string>();
    for (;;) {
      const before = this.pos;
      this.skipSpace();
      if (this.startsWith('/>') || this.startsWith('>')) {
        break;
      }
      if (this.pos === before) {
        this.fail('not well-formed (invalid token)');
      }
      const attrStart = this.pos;
      const name = this.name();
      this.skipSpace();
      if (this.text[this.pos] !== '=') {
        this.fail('not well-formed (invalid token)');
      }
      this.pos++;
      this.skipSpace();
      const quote = this.text[this.pos];
      if (quote !== '"' && quote !== "'") {
        this.fail('not well-formed (invalid token)');
      }
      this.pos++;
      const valueStart = this.pos;
      const end = this.text.indexOf(quote, this.pos);
      if (end < 0) {
        this.fail('unclosed token');
      }
      const raw = this.text.slice(this.pos, end);
      const lt = raw.indexOf('<');
      if (lt >= 0) {
        this.fail('not well-formed (invalid token)', valueStart + lt);
      }
      this.pos = end + 1;
      if (attrs.has(name)) {
        this.fail('duplicate attribute', attrStart);
      }
      attrs.set(name, this.references(raw.replace(/[\t\n]/g, ' '), valueStart));
    }
    const elem = new XElement(tag, attrs);
    const [line, column] = this.where(start);
    this.info.set(elem, [line, column, this.path(tag, attrs)]);
    if (this.stack.length) {
      this.stack[this.stack.length - 1].append(elem);
    } else if (this.root === null) {
      this.root = elem;
    } else {
      this.fail('junk after document element', start);
    }
    if (this.startsWith('/>')) {
      this.pos += 2;
    } else {
      this.pos += 1;
      this.stack.push(elem);
    }
  }

  endTag(): void {
    const start = this.pos;
    this.pos += 2;
    const tag = this.name();
    this.skipSpace();
    if (this.text[this.pos] !== '>') {
      this.fail('not well-formed (invalid token)');
    }
    this.pos++;
    const open = this.stack.pop();
    if (open === undefined || open.tag !== tag) {
      this.fail('mismatched tag', start);
    }
  }

  parse(): void {
    const invalid = INVALID_CHAR.exec(this.text);
    if (invalid !== null) {
      this.fail('not well-formed (invalid token)', invalid.index);
    }
    if (this.text.startsWith('<?xml') && /^<\?xml[\s?]/.test(this.text)) {
      this.declarationAt();
    }
    let textStart = this.pos;
    while (this.pos < this.text.length) {
      const lt = this.text.indexOf('<', this.pos);
      const chunkEnd = lt < 0 ? this.text.length : lt;
      if (chunkEnd > this.pos) {
        const raw = this.text.slice(this.pos, chunkEnd);
        const cdataEnd = raw.indexOf(']]>');
        if (cdataEnd >= 0) {
          this.fail('not well-formed (invalid token)', this.pos + cdataEnd);
        }
        textStart = this.pos;
        this.addText(this.references(raw, textStart));
        this.pos = chunkEnd;
      }
      if (lt < 0) {
        break;
      }
      if (this.startsWith('<!--')) {
        this.pos += 4;
        const body = this.until('-->', 'unclosed token');
        if (body.includes('--') || body.endsWith('-')) {
          this.fail('not well-formed (invalid token)');
        }
      } else if (this.startsWith('<![CDATA[')) {
        if (!this.stack.length) {
          this.fail('not well-formed (invalid token)');
        }
        this.pos += 9;
        this.addText(this.until(']]>', 'unclosed CDATA section'));
      } else if (this.startsWith('<!DOCTYPE')) {
        if (this.root !== null || this.stack.length) {
          this.fail('not well-formed (invalid token)');
        }
        let depth = 0;
        while (this.pos < this.text.length) {
          const ch = this.text[this.pos++];
          if (ch === '[') depth++;
          else if (ch === ']') depth--;
          else if (ch === '>' && depth <= 0) break;
        }
      } else if (this.startsWith('<?')) {
        const at = this.pos;
        this.pos += 2;
        const target = this.name();
        if (target.toLowerCase() === 'xml') {
          this.fail('XML or text declaration not at start of entity', at);
        }
        this.until('?>', 'unclosed token');
      } else if (this.startsWith('</')) {
        this.endTag();
      } else {
        this.startTag();
      }
    }
    if (this.root === null) {
      this.fail('no element found');
    }
    if (this.stack.length) {
      this.fail('no element found');
    }
  }
}

// byte-order marks of the encodings the checks recognize
const BOMS: Array<[number[], string]> = [
  [[0x00, 0x00, 0xfe, 0xff], 'UTF-32BE'],
  [[0xff, 0xfe, 0x00, 0x00], 'UTF-32LE'],
  [[0xfe, 0xff], 'UTF-16BE'],
  [[0xff, 0xfe], 'UTF-16LE'],
  [[0xef, 0xbb, 0xbf], 'UTF-8'],
];

function bom(data: Uint8Array): string | null {
  for (const [marks, name] of BOMS) {
    if (marks.every((byte, i) => data[i] === byte)) {
      return name;
    }
  }
  return null;
}

function decode(data: Uint8Array, ctx: Context): string | null {
  const mark = bom(data);
  if (mark !== null && mark !== 'UTF-8') {
    ctx.emit('doc-encoding', `the document is encoded in ${mark}, not UTF-8`);
    if (mark.startsWith('UTF-16')) {
      return new TextDecoder(mark === 'UTF-16LE' ? 'utf-16le' : 'utf-16be').decode(data);
    }
    return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    // the line of the first byte the decoder rejects
    const text = new TextDecoder('utf-8').decode(data);
    const bad = text.indexOf('�');
    const line = bad < 0 ? 1 : text.slice(0, bad).split('\n').length;
    ctx.emit('doc-encoding', 'the document is not valid UTF-8 (invalid start byte)', null, {
      line,
    });
    return null;
  }
}

function checkDeclaration(reader: Reader, ctx: Context): void {
  const at = { line: 1, column: 1 };
  if (reader.declaration === null) {
    ctx.emit('xml-declaration', 'missing XML declaration', null, at);
    return;
  }
  const [version, encoding] = reader.declaration;
  if (!version) {
    ctx.emit('xml-declaration', 'the XML declaration has no version', null, at);
  }
  if (!encoding) {
    ctx.emit('xml-declaration', 'the XML declaration has no encoding', null, at);
  } else if (encoding.toUpperCase() !== 'UTF-8') {
    ctx.emit('doc-encoding', `the declared encoding is ${encoding}, not UTF-8`, null, at);
  }
}

/** Run the L1 checks; return the parsed document or null. */
export function load(data: string | Uint8Array, ctx: Context): ParsedDocument | null {
  let text: string | null;
  if (typeof data === 'string') {
    text = data.startsWith('﻿') ? data.slice(1) : data;
  } else {
    if (!data.length || !new TextDecoder('latin1').decode(data).trim()) {
      ctx.emit('xml-not-empty', 'the file is empty');
      return null;
    }
    text = decode(data, ctx);
    if (text === null) {
      ctx.emit('xml-well-formed', 'XML parse error: not well-formed (invalid token)');
      return null;
    }
    if (text.startsWith('﻿')) {
      text = text.slice(1);
    }
  }
  if (!text.trim()) {
    ctx.emit('xml-not-empty', 'the file is empty');
    return null;
  }
  const reader = new Reader(text.replace(/\r\n?/g, '\n'));
  try {
    reader.parse();
  } catch (err) {
    if (err instanceof XmlError) {
      ctx.emit('xml-well-formed', `XML parse error: ${err.message}`, null, {
        line: err.line,
        column: err.column,
      });
      return null;
    }
    throw err;
  }
  checkDeclaration(reader, ctx);
  return new ParsedDocument(reader.root!, reader.info, reader.declaration);
}

/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The base test document and its mutation helpers
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

export const DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';

export const GFORMAT = '  <data key="gFormat">Cyberiada-GraphML-1.0</data>\n';

// the subset of the appendix B declarations the base document uses
export const KEYS = `\
  <key id="gFormat" for="graphml" attr.name="format" attr.type="string"/>
  <key id="dName" for="graph" attr.name="name" attr.type="string"/>
  <key id="dName" for="node" attr.name="name" attr.type="string"/>
  <key id="dStateMachine" for="graph" attr.name="stateMachine"/>
  <key id="dNote" for="node" attr.name="note" attr.type="string"/>
  <key id="dVertex" for="node" attr.name="vertex" attr.type="string"/>
  <key id="dData" for="node" attr.name="data" attr.type="string"/>
  <key id="dData" for="edge" attr.name="data" attr.type="string"/>
`;

export const META_NODE = `\
    <node id="nMeta">
      <data key="dNote">formal</data>
      <data key="dName">CGML_META</data>
      <data key="dData">standardVersion/ 1.0</data>
    </node>
`;

export const MACHINE = `\
  <graph id="G" edgedefault="directed">
    <data key="dStateMachine"/>
    <data key="dName">Test machine</data>
${META_NODE}\
    <node id="init">
      <data key="dVertex">initial</data>
    </node>
    <node id="n0">
      <data key="dName">Idle</data>
    </node>
    <edge id="init-n0#1" source="init" target="n0"/>
  </graph>
`;

export interface Pieces {
  declaration?: string;
  gformat?: string;
  keys?: string;
  machines?: string;
}

/** The minimal valid CORE document text, with replaceable pieces. */
export function minimalText(pieces: Pieces = {}): string {
  const { declaration = DECLARATION, gformat = GFORMAT, keys = KEYS, machines = MACHINE } = pieces;
  return (
    declaration +
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n' +
    gformat +
    keys +
    machines +
    '</graphml>\n'
  );
}

/** The UTF-8 bytes of a text. */
export function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** The minimal valid CORE document bytes, with replaceable pieces. */
export function minimal(pieces: Pieces = {}): Uint8Array {
  return encode(minimalText(pieces));
}

/** The document bytes with every occurrence of a text replaced, as bytes.replace(). */
export function replace(data: Uint8Array, old: string, value: string): Uint8Array {
  return encode(new TextDecoder().decode(data).split(old).join(value));
}

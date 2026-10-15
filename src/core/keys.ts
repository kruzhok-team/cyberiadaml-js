/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The appendix B key inventory and the standard value enumerations
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

/** The binding key of a (key id, for) pair. */
export function binding(key: string, kind: string): string {
  return `${key}|${kind}`;
}

// (key id, for) -> attr.name, per the appendix B table of the standard
export const STANDARD_BINDINGS: Map<string, string> = new Map([
  [binding('gFormat', 'graphml'), 'format'],
  [binding('dName', 'graph'), 'name'],
  [binding('dName', 'node'), 'name'],
  [binding('dStateMachine', 'graph'), 'stateMachine'],
  [binding('dRegion', 'graph'), 'region'],
  [binding('dSubmachineState', 'node'), 'submachineState'],
  [binding('dGeometry', 'graph'), 'geometry'],
  [binding('dGeometry', 'node'), 'geometry'],
  [binding('dGeometry', 'edge'), 'geometry'],
  [binding('dSourcePoint', 'edge'), 'sourcePoint'],
  [binding('dTargetPoint', 'edge'), 'targetPoint'],
  [binding('dLabelGeometry', 'edge'), 'labelGeometry'],
  [binding('dNote', 'node'), 'note'],
  [binding('dVertex', 'node'), 'vertex'],
  [binding('dData', 'node'), 'data'],
  [binding('dData', 'edge'), 'data'],
  [binding('dPivot', 'edge'), 'pivot'],
  [binding('dChunk', 'edge'), 'chunk'],
  [binding('dCollapsed', 'node'), 'collapsed'],
  [binding('dMarkup', 'node'), 'markup'],
  [binding('dColor', 'node'), 'color'],
  [binding('dColor', 'edge'), 'color'],
  [binding('dFormalName', 'graph'), 'formalName'],
  [binding('dFormalName', 'node'), 'formalName'],
]);

/** The (key id, for) pairs of appendix B in their order. */
export const STANDARD_PAIRS: Array<[string, string]> = [
  ['gFormat', 'graphml'],
  ['dName', 'graph'],
  ['dName', 'node'],
  ['dStateMachine', 'graph'],
  ['dRegion', 'graph'],
  ['dSubmachineState', 'node'],
  ['dGeometry', 'graph'],
  ['dGeometry', 'node'],
  ['dGeometry', 'edge'],
  ['dSourcePoint', 'edge'],
  ['dTargetPoint', 'edge'],
  ['dLabelGeometry', 'edge'],
  ['dNote', 'node'],
  ['dVertex', 'node'],
  ['dData', 'node'],
  ['dData', 'edge'],
  ['dPivot', 'edge'],
  ['dChunk', 'edge'],
  ['dCollapsed', 'node'],
  ['dMarkup', 'node'],
  ['dColor', 'node'],
  ['dColor', 'edge'],
  ['dFormalName', 'graph'],
  ['dFormalName', 'node'],
];

export const STANDARD_KEY_IDS: Set<string> = new Set(STANDARD_PAIRS.map(([key]) => key));

// the appendix B keys declared without attr.type; every other one is a string
export const UNTYPED_KEYS: Set<string> = new Set([
  'dGeometry',
  'dSourcePoint',
  'dTargetPoint',
  'dLabelGeometry',
]);

// 9.2: the CSS/HTML named colours (CSS Color Module Level 4)
export const CSS_COLOR_NAMES: Set<string> = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black
blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate
coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod
darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen
fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow
grey honeydew hotpink indianred indigo ivory khaki lavender
lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray
lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred
midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive
olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred
papayawhip peachpuff peru pink plum powderblue purple rebeccapurple
red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell
sienna silver skyblue slateblue slategray slategrey snow springgreen
steelblue tan teal thistle tomato turquoise violet wheat
white whitesmoke yellow yellowgreen`.split(/\s+/),
);

export const VERTEX_CORE: string[] = ['initial', 'final', 'choice', 'terminate'];
export const VERTEX_EXT: string[] = ['shallowHistory', 'deepHistory', 'entryPoint', 'exitPoint'];
export const VERTEX_RESERVED: string[] = ['fork', 'join'];
export const NOTE_KINDS: string[] = ['informal', 'formal'];
export const GEOMETRY_MODES: string[] = ['none', 'short', 'full'];
export const TRANSITION_ORDERS: string[] = ['actionFirst', 'exitFirst'];
export const EVENT_PROPAGATIONS: string[] = ['block', 'propagate'];

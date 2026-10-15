/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The types of the 2.0 interface
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

export type CGMLPoint = { x: number; y: number };
export type CGMLRectangle = CGMLPoint & { width: number; height: number };
export type CGMLDimensions = { width: number; height: number };

export type CGMLPostfix = 'propagate' | 'block' | 'defer';

type CGMLBaseTrigger = {
  postfix?: CGMLPostfix;
  condition?: string; // the guard; 'else' for the else guard
};

/** A trigger of a transition: no event on a completion transition. */
export type CGMLTransitionTrigger = CGMLBaseTrigger & { event?: string };
/** A trigger of a state block: entry, exit, do or an event name. */
export type CGMLTrigger = CGMLBaseTrigger & { event: string };

export type CGMLAction = {
  trigger: CGMLTrigger;
  action?: string; // the behaviour lines
};

export type CGMLTransitionAction = {
  trigger?: CGMLTransitionTrigger;
  action?: string;
};

/** A data item the model does not type, written back in place. */
export type CGMLDataNode = {
  key: string;
  content: string; // '' when the item has no text
  point?: Array<CGMLPoint>;
  rect?: Array<CGMLRectangle>;
};

export type CGMLKeyNode = {
  id: string;
  for: string;
  'attr.name'?: string;
  'attr.type'?: string;
};

export type CGMLRegion = {
  id: string;
  name?: string;
  geometry?: CGMLRectangle;
  unsupportedDataNodes: Array<CGMLDataNode>;
};

export type CGMLState = {
  parent?: string; // the id of the parent state
  region?: string; // the id of the region inside the parent state
  name: string;
  bounds?: CGMLRectangle;
  actions: Array<CGMLAction>;
  unsupportedDataNodes: Array<CGMLDataNode>;
  color?: string;
  regions?: Array<CGMLRegion>;
};

/** @deprecated the same as CGMLState */
export type CGMLBaseState = CGMLState;

export type CGMLVertex = {
  parent?: string;
  region?: string;
  type: string;
  name?: string;
  position?: CGMLPoint | CGMLRectangle;
  unsupportedDataNodes?: Array<CGMLDataNode>;
  /** @deprecated not read, not written */
  data?: string;
};

export type NoteType = 'formal' | 'informal';

export type CGMLNote = {
  name?: string;
  position?: CGMLPoint | CGMLRectangle;
  text: string;
  type: NoteType;
  parent?: string;
  region?: string;
  unsupportedDataNodes: Array<CGMLDataNode>;
  /** @deprecated not read, not written */
  data?: string;
};

export type CGMLComponent = {
  id: string;
  type: string;
  parameters: { [id: string]: string };
  order?: number;
  unsupportedDataNodes: CGMLDataNode[];
};

export type CGMLTransition = {
  id: string;
  source: string;
  target: string;
  color?: string;
  position?: CGMLPoint; // the first point of the polyline
  polyline?: Array<CGMLPoint>;
  labelPosition?: CGMLPoint;
  sourcePoint?: CGMLPoint;
  targetPoint?: CGMLPoint;
  actions: Array<CGMLTransitionAction>;
  unsupportedDataNodes: Array<CGMLDataNode>;
  /** @deprecated a transition with a pivot is written as a comment link; read links from `links` */
  pivot?: string;
};

export type CGMLCommentLink = {
  id: string;
  source: string;
  target: string;
  pivot?: string; // dData, dName or empty
  chunk?: string;
  unsupportedDataNodes: Array<CGMLDataNode>;
};

export type CGMLMeta = {
  id: string;
  values: { [id: string]: string };
  unsupportedDataNodes?: Array<CGMLDataNode>; // the other data of the metadata node (document)
};

export type CGMLStateMachine = {
  name?: string;
  meta: CGMLMeta; // the document metadata over the machine parameters (mirror)
  standardVersion: string; // mirror
  platform?: string; // mirror
  position?: CGMLPoint;
  dimensions?: CGMLDimensions;
  states: { [id: string]: CGMLState };
  transitions: Record<string, CGMLTransition>;
  links?: Record<string, CGMLCommentLink>;
  components: { [id: string]: CGMLComponent };
  initialStates: { [id: string]: CGMLVertex };
  notes: { [id: string]: CGMLNote };
  finals: { [id: string]: CGMLVertex };
  choices: { [id: string]: CGMLVertex };
  terminates: { [id: string]: CGMLVertex };
  shallowHistory: { [id: string]: CGMLVertex };
  deepHistory: { [id: string]: CGMLVertex };
  unknownVertexes: { [id: string]: CGMLVertex };
  unsupportedDataNodes?: Array<CGMLDataNode>;
};

/** A finding of the reader or the writer check. */
export type CGMLFinding = {
  rule: string;
  req: string | null; // CGML-<clause>-<n> or LAPKI-D<n>
  layer: number; // 0 for the dialect pass, 1-4
  severity: string; // ERROR, WARNING or INFO
  message: string;
  line?: number | null;
  column?: number | null;
  path?: string | null;
};

export type CGMLElements = {
  stateMachines: { [id: string]: CGMLStateMachine };
  format: string;
  keys: Array<CGMLKeyNode>;
  meta?: CGMLMeta; // the document metadata
  findings?: Array<CGMLFinding>;
};

export type CGMLTextState = Omit<CGMLState, 'actions'> & { actions: string };
export type CGMLTextTransition = Omit<CGMLTransition, 'actions'> & { actions: string };
export type CGMLTextStateMachine = Omit<CGMLStateMachine, 'states' | 'transitions'> & {
  states: { [id: string]: CGMLTextState };
  transitions: { [id: string]: CGMLTextTransition };
};

export type CGMLTextElements = Omit<CGMLElements, 'stateMachines'> & {
  stateMachines: { [id: string]: CGMLTextStateMachine };
};

export type CGMLParseOptions = {
  strict?: boolean; // no dialect repairs, any ERROR finding throws
};

export const CGMLDataKeys = [
  'gFormat',
  'dData',
  'dName',
  'dGeometry',
  'dColor',
  'dNote',
  'dVertex',
  'dPivot',
  'dLabelGeometry',
  'dStateMachine',
  'dTargetPoint',
  'dSourcePoint',
] as const;

export type CGMLDataKey = (typeof CGMLDataKeys)[number];

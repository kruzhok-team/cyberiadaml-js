/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The standard-compliant core: reading, writing and the canonical dump
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

import { render } from './dump';
import type { Document } from './model';

export { Block } from './actions';
export { FORMAT_LAPKI, FORMAT_VALUE as FORMAT_STANDARD } from './dialect';
export { ERROR, Finding, INFO, WARNING } from './findings';
export { Param } from './meta';
export {
  Comment,
  CommentLink,
  Document,
  Extension,
  KeyDecl,
  Node,
  Point,
  Rect,
  Region,
  State,
  StateMachine,
  SubmachineState,
  Transition,
  Vertex,
} from './model';
export { CGMLError, read } from './reader';
export type { ReadOptions } from './reader';
export { write } from './writer';

/** Return the canonical dump of a document. */
export function dump(document: Document): string {
  return render(document);
}

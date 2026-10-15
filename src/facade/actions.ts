/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The behaviour text (6.8) of the 2.0 interface
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

import { CGMLAction, CGMLPostfix, CGMLTransitionAction, CGMLTransitionTrigger } from './types';

import { Block } from '../core/actions';

const KEYWORDS = ['entry', 'exit', 'do'];

/** The 2.0 action of a parsed block. */
export function blockAction(block: Block): CGMLTransitionAction {
  const result: CGMLTransitionAction = {};
  if (block.kind !== 'event') {
    result.trigger = { event: block.kind };
  } else {
    const trigger: CGMLTransitionTrigger = {};
    if (block.trigger !== '') {
      trigger.event = block.trigger;
    }
    if (block.guard !== null) {
      trigger.condition = block.guard;
    }
    if (block.param) {
      trigger.postfix = block.param as CGMLPostfix;
    }
    if (Object.keys(trigger).length) {
      result.trigger = trigger;
    }
  }
  if (block.behaviour.length) {
    result.action = block.behaviour.join('\n');
  }
  return result;
}

/** The 2.0 actions of a state: every trigger has an event, empty when the text has none. */
export function stateActions(blocks: Block[]): CGMLAction[] {
  return blocks.map((block) => {
    const action = blockAction(block);
    return { ...action, trigger: { event: '', ...action.trigger } };
  });
}

function guard(condition: string): string {
  return condition === 'else' ? 'else' : condition.replace(/[[\]]/g, (c) => '\\' + c);
}

/** The text of one block: the trigger line and the behaviour lines. */
function blockText(action: CGMLTransitionAction): string {
  const trigger = action.trigger ?? {};
  const event = trigger.event ?? '';
  let head = event;
  const keyword = KEYWORDS.includes(event) && trigger.condition === undefined && !trigger.postfix;
  if (!keyword) {
    if (trigger.condition !== undefined) {
      head += (head ? ' ' : '') + `[${guard(trigger.condition)}]`;
    }
    if (trigger.postfix === 'propagate' || trigger.postfix === 'block') {
      head += ' ' + trigger.postfix;
    }
  }
  head += '/';
  if (trigger.postfix === 'defer') {
    head += ' defer';
  }
  return action.action ? `${head}\n${action.action}` : head;
}

/** The behaviour text (6.8) of the actions, blocks separated by an empty line. */
export function serializeActions(actions: Array<CGMLAction> | Array<CGMLTransitionAction>): string {
  return (actions as CGMLTransitionAction[]).map(blockText).join('\n\n');
}

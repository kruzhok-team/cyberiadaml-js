import {
  CGMLAction,
  CGMLElements,
  CGMLMeta,
  CGMLTransitionAction,
  CGMLTransitionTrigger,
} from './types/import';

export function parseTrigger(trigger: string, regexes: Array<RegExp>): CGMLTransitionTrigger {
  for (const regex of regexes) {
    const regExec = regex.exec(trigger);
    if (!regExec?.groups) {
      continue;
    }
    return {
      event: regExec.groups['trigger'],
      condition: regExec.groups['condition'],
      postfix: regExec.groups['postfix'],
    };
  }
  throw new Error('No reg!');
}

export function emptyCGMLElements(): CGMLElements {
  return {
    states: {},
    transitions: {},
    components: {},
    initialStates: {},
    platform: '',
    meta: {
      id: '',
      values: {},
    },
    format: '',
    standardVersion: '',
    keys: [],
    notes: {},
    terminates: {},
    choices: {},
    finals: {},
    unknownVertexes: {},
  };
}

export function serialaizeParameters(parameters: { [id: string]: string }): string {
  let strParameters = '';
  for (const parameterName in parameters) {
    const value = parameters[parameterName];
    strParameters += `${parameterName}/ ${value}\n\n`;
  }
  return strParameters;
}

export function serializeMeta(meta: CGMLMeta, platform: string, standardVersion: string): string {
  return serialaizeParameters({
    platform: platform,
    standardVersion: standardVersion,
    ...meta.values,
  });
}

export function serializeActions(actions: Array<CGMLAction> | Array<CGMLTransitionAction>): string {
  let strActions = '';
  for (const action of actions) {
    if (action.trigger?.event) {
      strActions += `${action.trigger.event}`;
    }
    if (action.trigger?.condition) {
      strActions += `[${action.trigger.condition}]`;
    }
    if (action.trigger?.postfix) {
      strActions += ' ' + action.trigger.postfix;
    }
    strActions += '/\n';
    if (action.action) {
      strActions += action.action;
      strActions += '\n';
    }
    strActions += '\n';
  }

  return strActions;
}

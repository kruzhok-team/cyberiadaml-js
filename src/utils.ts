import {
  CGMLAction,
  CGMLStateMachine,
  CGMLMeta,
  CGMLTransitionAction,
  CGMLTransitionTrigger,
  CGMLElements,
  CGMLTextElements,
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

export function toArray<Type>(value: Type | Array<Type>): Array<Type> {
  return Array.isArray(value) ? value : [value];
}

export function emptyCGMLStateMachine(): CGMLStateMachine {
  return {
    platform: '',
    standardVersion: '',
    meta: {
      id: '',
      values: {},
    },
    states: {},
    transitions: {},
    components: {},
    initialStates: {},
    notes: {},
    terminates: {},
    choices: {},
    finals: {},
    unknownVertexes: {},
  };
}

export function createEmptyTextElements(): CGMLTextElements {
  return {
    stateMachines: {},
    format: '',
    keys: [],
  };
}

export function createEmptyElements(): CGMLElements {
  return {
    stateMachines: {},
    format: '',
    keys: [],
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

export function serializeMeta(meta: CGMLMeta, standardVersion: string, platform?: string): string {
  const parameters: { [id: string]: string } = {
    standardVersion: standardVersion,
    ...meta.values,
  };
  if (platform) {
    parameters['platform'] = platform;
  }
  return serialaizeParameters(parameters);
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

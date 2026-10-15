import { parse as parseMetaText } from './core/meta';
import {
  CGMLStateMachine,
  CGMLMeta,
  CGMLTransitionTrigger,
  CGMLElements,
  CGMLTextElements,
} from './facade/types';

export { serializeActions } from './facade/actions';

export function parseTrigger(trigger: string, regexes: Array<RegExp>): CGMLTransitionTrigger {
  for (const regex of regexes) {
    const regExec = regex.exec(trigger);
    if (!regExec?.groups) {
      continue;
    }
    return {
      event: regExec.groups['trigger'],
      condition: regExec.groups['condition'],
      postfix: regExec.groups['postfix'] as CGMLTransitionTrigger['postfix'],
    };
  }
  throw new Error('No reg!');
}

export function toArray<Type>(value: Type | Array<Type>): Array<Type> {
  return Array.isArray(value) ? value : [value];
}

export function emptyCGMLStateMachine(): CGMLStateMachine {
  return {
    shallowHistory: {},
    deepHistory: {},
    platform: '',
    standardVersion: '',
    meta: {
      id: '',
      values: {},
    },
    states: {},
    transitions: {},
    links: {},
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
    meta: { id: '', values: {} },
    findings: [],
  };
}

export function createEmptyElements(): CGMLElements {
  return {
    stateMachines: {},
    format: '',
    keys: [],
    meta: { id: '', values: {} },
    findings: [],
  };
}

// The parameter list of 6.9: name/ value items separated by an empty line.
export function parseParameters(text: string): { [id: string]: string } {
  const [params] = parseMetaText(text);
  const parameters: { [id: string]: string } = {};
  for (const param of params) {
    parameters[param.name.trim()] = param.value.trim();
  }
  return parameters;
}

export function serializeParameters(parameters: { [id: string]: string }): string {
  return Object.entries(parameters)
    .map(([name, value]) => `${name}/ ${value}`)
    .join('\n\n');
}

/** @deprecated use serializeParameters */
export const serialaizeParameters = serializeParameters;

export function serializeMeta(meta: CGMLMeta, standardVersion: string, platform?: string): string {
  const parameters: { [id: string]: string } = {
    standardVersion: standardVersion,
    ...meta.values,
  };
  if (platform) {
    parameters['platform'] = platform;
  }
  return serializeParameters(parameters);
}

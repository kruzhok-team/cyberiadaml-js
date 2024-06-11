import { CGMLState, CGMLTransition, CGMLElements } from './import';
export type CGMLTextElements = Omit<Omit<CGMLElements, 'states'>, 'transitions'> & {
  states: { [id: string]: CGMLTextState };
  transitions: { [id: string]: CGMLTextTransition };
};

export type CGMLTextState = Omit<CGMLState, 'actions'> & { actions: string };
export type CGMLTextTransition = Omit<CGMLTransition, 'actions'> & { actions: string };

import { CGMLState, CGMLTransition, CGMLStateMachine } from './import';
export type CGMLTextStateMachine = Omit<Omit<CGMLStateMachine, 'states'>, 'transitions'> & {
  states: { [id: string]: CGMLTextState };
  transitions: { [id: string]: CGMLTextTransition };
};

export type CGMLTextState = Omit<CGMLState, 'actions'> & { actions: string };
export type CGMLTextTransition = Omit<CGMLTransition, 'actions'> & { actions: string };

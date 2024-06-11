import { CGMLTransitionTrigger } from "../dist";

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

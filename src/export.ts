import { CGMLStateMachine } from './types/import';
import { templateExportGraphml } from './buildFunctions';
import { CGMLTextStateMachine } from './types/textImport';

export function exportGraphml(elements: CGMLStateMachine): string {
  return templateExportGraphml(elements, false);
}

export function exportTextGraphml(elements: CGMLTextStateMachine): string {
  return templateExportGraphml(elements, true);
}

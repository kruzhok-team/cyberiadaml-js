import { CGMLElements } from './types/import';
import { templateExportGraphml } from './buildFunctions';
import { CGMLTextStateMachine } from './types/textImport';

export function exportGraphml(elements: CGMLElements): string {
  return templateExportGraphml(elements, false);
}

export function exportTextGraphml(elements: CGMLElements): string {
  return templateExportGraphml(elements, true);
}

import { CGMLElements } from './types/import';
import { templateExportGraphml } from './buildFunctions';
import { CGMLTextElements } from './types/textImport';

export function exportGraphml(elements: CGMLElements): string {
  return templateExportGraphml(elements, false);
}

export function exportTextGraphml(elements: CGMLTextElements): string {
  return templateExportGraphml(elements, true);
}

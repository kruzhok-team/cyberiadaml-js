import { CGMLElements, CGMLTextElements } from './types/import';
import { templateExportGraphml } from './buildFunctions';

export function exportGraphml(elements: CGMLElements): string {
  return templateExportGraphml(elements, false);
}

export function exportTextGraphml(elements: CGMLTextElements): string {
  return templateExportGraphml(elements, true);
}

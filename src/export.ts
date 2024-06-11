import { CGMLElements } from './types/import';
import { templateExportGraphml } from './buildFunctions';
import { CGMLTextElements } from './types/text_import';

export function exportGraphml(elements: CGMLElements): string {
  return templateExportGraphml(elements, false);
}

export function exportTextGraphml(elements: CGMLTextElements): string {
  return templateExportGraphml(elements, true);
}

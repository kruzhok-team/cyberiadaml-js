import { XMLParser } from 'fast-xml-parser';

import { CGMLElements, CGML, CGMLTransition } from './types/import';
import {
  setFormatToMeta,
  processGraph,
  removeComponentsTransitions,
  getKeyNodes,
} from './parseFunctions';
import { CGMLTextElements, CGMLTextTransition } from './types/text_import';

export function parseCGML(graphml: string): CGMLElements {
  const parser = new XMLParser({
    textNodeName: 'content',
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (_name, _jpath, isLeafNode, isAttribute) => {
      return isLeafNode && !isAttribute;
    },
  });

  const elements: CGMLElements = {
    states: {},
    transitions: {},
    initialStates: {},
    components: {},
    platform: '',
    meta: {
      values: {},
      id: '',
    },
    standardVersion: '',
    format: '',
    keys: [],
    notes: {},
    choices: {},
    terminates: {},
    finals: {},
    unknownVertexes: {},
  };

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  processGraph(elements, xml.graphml.graph, false);
  elements.transitions = removeComponentsTransitions(
    elements.transitions,
    elements.meta.id,
  ) as Record<string, CGMLTransition>;
  elements.platform = elements.meta.values['platform'];
  elements.standardVersion = elements.meta.values['standardVersion'];
  delete elements.meta.values['platform'];
  delete elements.meta.values['standardVersion'];
  return elements;
}

export function createEmptyTextElements(): CGMLTextElements {
  return {
    states: {},
    transitions: {},
    initialStates: {},
    components: {},
    platform: '',
    meta: {
      values: {},
      id: '',
    },
    standardVersion: '',
    format: '',
    keys: [],
    notes: {},
    choices: {},
    terminates: {},
    finals: {},
    unknownVertexes: {},
  };
}

export function parseTextCGML(graphml: string): CGMLTextElements {
  const parser = new XMLParser({
    textNodeName: 'content',
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (_name, _jpath, isLeafNode, isAttribute) => {
      return isLeafNode && !isAttribute;
    },
  });

  const elements = createEmptyTextElements();

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  processGraph(elements, xml.graphml.graph, false);
  elements.transitions = removeComponentsTransitions(
    elements.transitions,
    elements.meta.id,
  ) as Record<string, CGMLTextTransition>;
  elements.platform = elements.meta.values['platform'];
  elements.standardVersion = elements.meta.values['standardVersion'];
  delete elements.meta.values['platform'];
  delete elements.meta.values['standardVersion'];
  return elements;
}

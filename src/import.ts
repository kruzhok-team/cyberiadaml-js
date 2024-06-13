import { XMLParser } from 'fast-xml-parser';

import {
  CGMLStateMachine,
  CGML,
  CGMLTransition,
  CGMLElements,
  CGMLTextElements,
} from './types/import';
import {
  setFormatToMeta,
  processGraph,
  removeComponentsTransitions,
  getKeyNodes,
} from './parseFunctions';
import { CGMLTextStateMachine, CGMLTextTransition } from './types/textImport';
import {
  createEmptyElements,
  createEmptyTextElements,
  emptyCGMLStateMachine,
  toArray,
} from './utils';

export function parseCGML(graphml: string): CGMLElements {
  const parser = new XMLParser({
    textNodeName: 'content',
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (_name, _jpath, isLeafNode, isAttribute) => {
      return isLeafNode && !isAttribute;
    },
  });

  const elements: CGMLElements = createEmptyElements();

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  for (const graph of toArray(xml.graphml.graph)) {
    const stateMachine = processGraph(elements, emptyCGMLStateMachine(), graph, false);
    stateMachine.transitions = removeComponentsTransitions(
      stateMachine.transitions,
      elements.meta.id,
    ) as Record<string, CGMLTransition>;
    elements.stateMachines[graph.id] = stateMachine as CGMLStateMachine;
  }
  elements.platform = elements.meta.values['platform'];
  elements.standardVersion = elements.meta.values['standardVersion'];
  delete elements.meta.values['platform'];
  delete elements.meta.values['standardVersion'];
  return elements;
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

  const elements: CGMLTextElements = createEmptyTextElements();

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  for (const graph of toArray(xml.graphml.graph)) {
    const stateMachine = processGraph(elements, emptyCGMLStateMachine(), graph, true);
    stateMachine.transitions = removeComponentsTransitions(
      stateMachine.transitions,
      elements.meta.id,
    ) as Record<string, CGMLTransition>;
    elements.stateMachines[graph.id] = stateMachine as CGMLTextStateMachine;
  }
  elements.platform = elements.meta.values['platform'];
  elements.standardVersion = elements.meta.values['standardVersion'];
  delete elements.meta.values['platform'];
  delete elements.meta.values['standardVersion'];
  return elements;
}

import { XMLParser } from 'fast-xml-parser';

import { CGMLStateMachine, CGML, CGMLTransition, CGMLElements } from './types/import';
import {
  setFormatToMeta,
  processGraph,
  removeComponentsTransitions,
  getKeyNodes,
} from './parseFunctions';
import { CGMLTextStateMachine, CGMLTextTransition } from './types/textImport';
import { createEmptyElements, emptyCGMLStateMachine } from './utils';

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
  console.log(xml.graphml.graph);
  for (const graph of xml.graphml.graph) {
    const stateMachine = processGraph(elements, emptyCGMLStateMachine(), graph, false);
    stateMachine.transitions = removeComponentsTransitions(
      stateMachine.transitions,
      elements.meta.id,
    ) as Record<string, CGMLTransition>;
  }
  elements.platform = elements.meta.values['platform'];
  elements.standardVersion = elements.meta.values['standardVersion'];
  delete elements.meta.values['platform'];
  delete elements.meta.values['standardVersion'];
  return elements;
}

export function createEmptyTextElements(): CGMLElements {
  return {
    stateMachines: {},
    platform: '',
    meta: {
      values: {},
      id: '',
    },
    standardVersion: '',
    format: '',
    keys: [],
  };
}

// export function parseTextCGML(graphml: string): CGMLTextStateMachine {
//   const parser = new XMLParser({
//     textNodeName: 'content',
//     ignoreAttributes: false,
//     attributeNamePrefix: '',
//     isArray: (_name, _jpath, isLeafNode, isAttribute) => {
//       return isLeafNode && !isAttribute;
//     },
//   });

//   const elements = createEmptyTextElements();

//   const xml = parser.parse(graphml) as CGML;

//   setFormatToMeta(elements, xml);
//   elements.keys = getKeyNodes(xml);
//   processGraph(elements, xml.graphml.graph, true);
//   elements.transitions = removeComponentsTransitions(
//     elements.transitions,
//     elements.meta.id,
//   ) as Record<string, CGMLTextTransition>;
//   elements.platform = elements.meta.values['platform'];
//   elements.standardVersion = elements.meta.values['standardVersion'];
//   delete elements.meta.values['platform'];
//   delete elements.meta.values['standardVersion'];
//   return elements;
// }

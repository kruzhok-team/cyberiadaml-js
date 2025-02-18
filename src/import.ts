import { XMLParser } from 'fast-xml-parser';

import {
  setFormatToMeta,
  processGraph,
  removeComponentsTransitions,
  getKeyNodes,
  resetComponentOrder,
  getStateMachineName,
  getStateMachineDataNode,
} from './parseFunctions';
import {
  CGMLStateMachine,
  CGML,
  CGMLTransition,
  CGMLElements,
  CGMLTextElements,
  CGMLDataNode,
  CGMLRectangle,
} from './types/import';
import { CGMLTextStateMachine } from './types/textImport';
import {
  createEmptyElements,
  createEmptyTextElements,
  emptyCGMLStateMachine,
  toArray,
} from './utils';

// TODO: Переделать эти функции на манер экспорта
export function parseCGML(graphml: string): CGMLElements {
  const parser = new XMLParser({
    textNodeName: 'content',
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (_name, _jpath, isLeafNode, isAttribute) => {
      return (_jpath.endsWith('edge') || _jpath.endsWith('node') || isLeafNode) && !isAttribute;
    },
  });
  const elements: CGMLElements = createEmptyElements();

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  for (const graph of toArray(xml.graphml.graph)) {
    resetComponentOrder();
    const stateMachine = processGraph(elements, emptyCGMLStateMachine(), graph, false);
    stateMachine.name = getStateMachineName(graph);
    const stateMachineRect = getStateMachineDataNode<CGMLRectangle | undefined>(
      graph,
      'dGeometry',
      (node: CGMLDataNode) => {
        if (node.rect && node.rect.length > 0) {
          const rect = node.rect[0];
          return {
            x: +rect.x,
            y: +rect.y,
            width: +rect.width,
            height: +rect.height,
          };
        }
      },
    );
    if (stateMachineRect) {
      stateMachine.position = {
        x: stateMachineRect.x,
        y: stateMachineRect.y,
      };
      stateMachine.dimensions = {
        width: stateMachineRect.width,
        height: stateMachineRect.height,
      };
    }
    stateMachine.platform = stateMachine.meta.values['platform'] ?? undefined;
    stateMachine.standardVersion = stateMachine.meta.values['standardVersion'];
    stateMachine.transitions = removeComponentsTransitions(
      stateMachine.transitions,
      stateMachine.meta.id,
    ) as Record<string, CGMLTransition>;
    delete stateMachine.meta.values['platform'];
    delete stateMachine.meta.values['standardVersion'];
    elements.stateMachines[graph.id] = stateMachine as CGMLStateMachine;
  }
  return elements;
}

export function parseTextCGML(graphml: string): CGMLTextElements {
  const parser = new XMLParser({
    textNodeName: 'content',
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (_name, _jpath, isLeafNode, isAttribute) => {
      return (_jpath.endsWith('edge') || _jpath.endsWith('node') || isLeafNode) && !isAttribute;
    },
  });
  const elements: CGMLTextElements = createEmptyTextElements();

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  for (const graph of toArray(xml.graphml.graph)) {
    resetComponentOrder();
    const stateMachine = processGraph(elements, emptyCGMLStateMachine(), graph, true);
    stateMachine.name = getStateMachineName(graph);
    const stateMachineRect = getStateMachineDataNode<CGMLRectangle | undefined>(
      graph,
      'dGeometry',
      (node: CGMLDataNode) => {
        if (node.rect && node.rect.length > 0) {
          const rect = node.rect[0];
          return {
            x: +rect.x,
            y: +rect.y,
            width: +rect.width,
            height: +rect.height,
          };
        }
      },
    );
    if (stateMachineRect) {
      stateMachine.position = {
        x: stateMachineRect.x,
        y: stateMachineRect.y,
      };
      stateMachine.dimensions = {
        width: stateMachineRect.width,
        height: stateMachineRect.height,
      };
    }
    stateMachine.platform = stateMachine.meta.values['platform'];
    stateMachine.standardVersion = stateMachine.meta.values['standardVersion'];
    stateMachine.transitions = removeComponentsTransitions(
      stateMachine.transitions,
      stateMachine.meta.id,
    ) as Record<string, CGMLTransition>;
    elements.stateMachines[graph.id] = stateMachine as CGMLTextStateMachine;
    delete stateMachine.meta.values['platform'];
    delete stateMachine.meta.values['standardVersion'];
  }
  return elements;
}

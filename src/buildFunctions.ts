import { XMLBuilder } from 'fast-xml-parser';

import {
  ExportCGML,
  ExportEdge,
  ExportKeyNode,
  ExportNode,
  ExportDataNode,
  ExportGraph,
  ExportRect,
  ExportPoint,
} from './types/export';
import {
  CGMLComponent,
  CGMLStateMachine,
  CGMLKeyNode,
  CGMLState,
  CGMLTransition,
  CGMLInitialState,
  CGMLNote,
  CGMLMeta,
  CGMLAction,
  CGMLVertex,
  CGMLPoint,
  CGMLRectangle,
  CGMLTransitionAction,
  CGMLElements,
  CGMLTextElements,
  CGMLDataNode,
} from './types/import';
import { CGMLTextState, CGMLTextStateMachine, CGMLTextTransition } from './types/textImport';
import { serialaizeParameters, serializeActions, serializeMeta } from './utils';

function getMetaNode(platform: string, meta: CGMLMeta, standardVersion: string): ExportNode {
  return {
    '@id': meta.id,
    data: [
      {
        '@key': 'dNote',
        content: 'formal',
      },
      {
        '@key': 'dName',
        content: 'CGML_META',
      },
      {
        '@key': 'dData',
        content: serializeMeta(meta, platform, standardVersion),
      },
    ],
  };
}

function stateToExportNode(
  state: CGMLState | CGMLTextState,
  id: string,
  textMode: boolean,
): ExportNode {
  const exportNode: ExportNode = {
    '@id': id,
    data: [
      {
        '@key': 'dName',
        content: state.name,
      },
      {
        '@key': 'dData',
        content: textMode
          ? (state.actions as string)
          : serializeActions(state.actions as CGMLAction[]),
      },
      getGeometryDataNode(state.bounds),
    ],
  };

  if (state.color !== undefined) {
    exportNode.data.push({
      '@key': 'dColor',
      content: state.color,
    });
  }

  for (const dataNode of state.unsupportedDataNodes) {
    exportNode.data.push({
      '@key': dataNode.key,
      content: dataNode.content,
    });
  }

  return exportNode;
}

function getVertexDataNode(type: string): ExportDataNode {
  return {
    '@key': 'dVertex',
    content: type,
  };
}

function isRect(value: any): value is CGMLRectangle {
  return value.width !== undefined && value.height !== undefined;
}

function getExportRect(position: CGMLRectangle): ExportRect {
  return {
    '@x': position.x,
    '@y': position.y,
    '@width': position.width,
    '@height': position.height,
  };
}

function getExportPoint(position: CGMLPoint): ExportPoint {
  return {
    '@x': position.x,
    '@y': position.y,
  };
}

function getGeometryDataNode(position: CGMLPoint | CGMLRectangle): ExportDataNode {
  if (isRect(position)) {
    return {
      '@key': 'dGeometry',
      content: '',
      rect: getExportRect(position),
    };
  } else {
    return {
      '@key': 'dGeometry',
      content: '',
      point: {
        '@x': position.x,
        '@y': position.y,
      },
    };
  }
}

function getLabelPositionNode(position: CGMLPoint): ExportDataNode {
  return {
    '@key': 'dLabelGeometry',
    content: '',
    point: {
      '@x': position.x,
      '@y': position.y,
    },
  };
}

function getNameDataNode(data: string): ExportDataNode {
  return {
    '@key': 'dName',
    content: data,
  };
}

function getExportNodes(
  states: { [id: string]: CGMLState | CGMLTextState },
  initialStates: { [id: string]: CGMLInitialState },
  terminates: { [id: string]: CGMLVertex },
  finals: { [id: string]: CGMLVertex },
  choices: { [id: string]: CGMLVertex },
  textMode: boolean,
): ExportNode[] {
  const nodes: { [id: string]: ExportNode } = {};
  const flattenNodes: { [id: string]: ExportNode } = {};
  const getExportNode = (stateId: string): ExportNode => {
    if (flattenNodes[stateId]) {
      return flattenNodes[stateId];
    } else {
      flattenNodes[stateId] = stateToExportNode(states[stateId], stateId, textMode);
      return flattenNodes[stateId];
    }
  };

  const addToParent = (parent: string | undefined, node: ExportNode, id: string) => {
    flattenNodes[id] = node;
    if (parent) {
      const parentNode: ExportNode = getExportNode(parent);
      if (parentNode.graph !== undefined) {
        const idx = parentNode.graph.node.findIndex((value) => value['@id'] === id);
        if (idx !== -1) {
          parentNode.graph.node[idx] = node;
          return;
        } else {
          parentNode.graph.node.push(node);
        }
      } else {
        parentNode.graph = {
          '@id': parentNode['@id'],
          node: [node],
          edge: [],
        };
      }
      const parentState = states[parent];
      if (parentState.parent) {
        addToParent(parentState.parent, parentNode, parent);
      } else {
        nodes[parent] = parentNode;
      }
    } else {
      nodes[id] = node;
    }
  };

  for (const stateId in states) {
    const state = states[stateId];
    const node: ExportNode = getExportNode(stateId);
    addToParent(state.parent, node, stateId);
  }

  for (const initialId in initialStates) {
    const initial = initialStates[initialId];
    const initialNode: ExportNode = {
      '@id': initialId,
      data: [getVertexDataNode('initial')],
    };
    if (initial.position) {
      initialNode.data.push(getGeometryDataNode(initial.position));
    }
    addToParent(initial.parent, initialNode, initialId);
  }
  const vertexes = { ...terminates, ...finals, ...choices };

  for (const vertexId in vertexes) {
    const vertex = vertexes[vertexId];
    const vertexNode = {
      '@id': vertexId,
      data: [getVertexDataNode(vertex.type)],
    };
    if (vertex.position) {
      vertexNode.data.push(getGeometryDataNode(vertex.position));
    }
    if (vertex.data) {
      vertexNode.data.push(getNameDataNode(vertex.data));
    }
    addToParent(vertex.parent, vertexNode, vertexId);
  }
  return Object.values(nodes);
}

function getSortedComponentsList(components: { [id: string]: CGMLComponent }): CGMLComponent[] {
  const sortedComponents: CGMLComponent[] = Object.values(components);
  return sortedComponents.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
}

function getComponentStates(components: { [id: string]: CGMLComponent }): ExportNode[] {
  const nodes: ExportNode[] = [];
  const sortedComponents = getSortedComponentsList(components);
  for (const component of sortedComponents) {
    const componentObj = Object.entries(components).find((value) => {
      return value[1].id === component.id;
    });
    if (!componentObj) {
      throw new Error('Internal error! Components id doesnt match!');
    }
    const componentNodeId = componentObj[0];
    nodes.push({
      '@id': componentNodeId,
      data: [
        {
          '@key': 'dNote',
          content: 'formal',
        },
        {
          '@key': 'dName',
          content: 'CGML_COMPONENT',
        },
        {
          '@key': 'dData',
          content: serialaizeParameters({
            id: component.id,
            type: component.type,
            ...component.parameters,
          }),
        },
        ...getNoteDataNodes(component.unsupportedDataNodes),
      ],
    });
  }

  return nodes;
}

function getNoteDataNodes(dataNodes: CGMLDataNode[]) {
  const exportNodes: ExportDataNode[] = [];
  for (const dataNode of dataNodes) {
    exportNodes.push({
      '@key': dataNode.key,
      content: dataNode.content,
      rect: dataNode.rect ? getExportRect(dataNode.rect[0]) : undefined,
      point: dataNode.point ? getExportPoint(dataNode.point[0]) : undefined,
    });
  }
  return exportNodes;
}

function getExportKeys(keys: Array<CGMLKeyNode>): ExportKeyNode[] {
  const exportKeyNodes: ExportKeyNode[] = [];

  for (const keyNode of keys) {
    exportKeyNodes.push({
      '@attr.name': keyNode['attr.name'],
      '@attr.type': keyNode['attr.type'],
      '@for': keyNode.for,
      '@id': keyNode.id,
    });
  }

  return exportKeyNodes;
}

function getEdges(
  transitions: Record<string, CGMLTransition> | Record<string, CGMLTextTransition>,
  textMode: boolean,
): ExportEdge[] {
  const edges: ExportEdge[] = [];

  for (const id in transitions) {
    const transition = transitions[id];
    const edge: ExportEdge = {
      '@id': transition.id,
      '@source': transition.source,
      '@target': transition.target,
      data: [],
    };
    if (transition.actions.length !== 0) {
      edge.data.push({
        '@key': 'dData',
        content: textMode
          ? (transition.actions as string)
          : serializeActions(transition.actions as CGMLTransitionAction[]),
      });
    }
    if (transition.color !== undefined) {
      edge.data.push({
        '@key': 'dColor',
        content: transition.color,
      });
    }
    if (transition.position !== undefined) {
      edge.data.push(getGeometryDataNode(transition.position));
    }

    if (transition.labelPosition) {
      edge.data.push(getLabelPositionNode(transition.labelPosition));
    }

    for (const dataNode of transition.unsupportedDataNodes) {
      edge.data.push({
        '@key': dataNode.key,
        content: dataNode.content,
      });
    }

    edges.push(edge);
  }

  return edges;
}

function getNoteNodes(notes: { [id: string]: CGMLNote }): ExportNode[] {
  const nodes: ExportNode[] = new Array<ExportNode>();
  for (const noteId in notes) {
    const note: CGMLNote = notes[noteId];
    const node: ExportNode = {
      '@id': noteId,
      data: [],
    };
    node.data.push(getGeometryDataNode(note.position));
    node.data.push({
      '@key': 'dNote',
      content: note.type,
    });
    node.data.push(...getNoteDataNodes(note.unsupportedDataNodes));
    if (note.name) {
      node.data.push(getNameDataNode(note.name));
    }
    node.data.push({
      '@key': 'dData',
      content: note.text,
    });

    nodes.push(node);
  }
  return nodes;
}

function getdStateMachineDataNode(): ExportDataNode {
  return {
    '@key': 'dStateMachine',
    content: '',
  };
}

function getGraphDataNodes(
  stateMachine: CGMLStateMachine | CGMLTextStateMachine,
): ExportDataNode[] {
  const dataNodes: ExportDataNode[] = [getdStateMachineDataNode()];
  if (stateMachine.name !== undefined) {
    dataNodes.push(getNameDataNode(stateMachine.name));
  }
  return dataNodes;
}

function getGraphs(elements: CGMLElements | CGMLTextElements, textMode: boolean): ExportGraph[] {
  const graphs: ExportGraph[] = [];
  for (const stateMachineId in elements.stateMachines) {
    const stateMachine = elements.stateMachines[stateMachineId];
    const graph = {
      '@id': stateMachineId,
      data: getGraphDataNodes(stateMachine),
      node: [
        ...getExportNodes(
          stateMachine.states,
          stateMachine.initialStates,
          stateMachine.terminates,
          stateMachine.finals,
          stateMachine.choices,
          textMode,
        ),
        ...getComponentStates(stateMachine.components),
        ...getNoteNodes(stateMachine.notes),
      ],
      edge: [...getEdges(stateMachine.transitions, textMode)],
    };
    graphs.push(graph);
  }
  graphs[0].node = [
    getMetaNode(elements.platform, elements.meta, elements.standardVersion),
    ...graphs[0].node,
  ];
  return graphs;
}

export function templateExportGraphml(
  elements: CGMLElements | CGMLTextElements,
  textMode: boolean,
): string {
  const builder = new XMLBuilder({
    textNodeName: 'content',
    ignoreAttributes: false,
    attributeNamePrefix: '@',

    format: true,
  });
  const xml: ExportCGML = {
    '?xml': {
      '@version': '1.0',
      '@encoding': 'UTF-8',
    },
    graphml: {
      '@xmlns': 'http://graphml.graphdrawing.org/xmlns',
      data: {
        '@key': 'gFormat',
        content: elements.format,
      },
      key: getExportKeys(elements.keys),
      graph: getGraphs(elements, textMode),
    },
  };
  return builder.build(xml);
}

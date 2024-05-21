import { XMLBuilder } from 'fast-xml-parser';

import { ExportCGML, ExportEdge, ExportKeyNode, ExportNode, ExportDataNode } from './types/export';
import {
  CGMLComponent,
  CGMLElements,
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
} from './types/import';

export function emptyCGMLElements(): CGMLElements {
  return {
    states: {},
    transitions: {},
    components: {},
    initialStates: {},
    platform: '',
    meta: {
      id: '',
      values: {},
    },
    format: '',
    standardVersion: '',
    keys: [],
    notes: {},
    terminates: {},
    choices: {},
    finals: {},
    unknownVertexes: {},
  };
}

export function serializeMeta(meta: CGMLMeta, platform: string, standardVersion: string): string {
  return serialaizeParameters({
    platform: platform,
    standardVersion: standardVersion,
    ...meta.values,
  });
}

export function serializeActions(actions: Array<CGMLAction> | Array<CGMLTransitionAction>): string {
  let strActions = '';
  for (const action of actions) {
    if (action.trigger?.event) {
      strActions += `${action.trigger.event}`;
    }
    if (action.trigger?.condition) {
      strActions += `[${action.trigger.condition}]`;
    }
    if (action.trigger?.postfix) {
      strActions += ' ' + action.trigger.postfix;
    }
    strActions += '/\n';
    if (action.action) {
      strActions += action.action;
      strActions += '\n';
    }
    strActions += '\n';
  }

  return strActions;
}

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

function stateToExportNode(state: CGMLState, id: string): ExportNode {
  const exportNode: ExportNode = {
    '@id': id,
    data: [
      {
        '@key': 'dName',
        content: state.name,
      },
      {
        '@key': 'dData',
        content: serializeActions(state.actions),
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

function getGeometryDataNode(position: CGMLPoint | CGMLRectangle): ExportDataNode {
  if (isRect(position)) {
    return {
      '@key': 'dGeometry',
      content: '',
      rect: {
        '@x': position.x,
        '@y': position.y,
        '@width': position.width,
        '@height': position.height,
      },
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

export function serialaizeParameters(parameters: { [id: string]: string }): string {
  let strParameters = '';
  for (const parameterName in parameters) {
    const value = parameters[parameterName];
    strParameters += `${parameterName}/ ${value}\n\n`;
  }
  return strParameters;
}

function getExportNodes(
  states: { [id: string]: CGMLState },
  initialStates: { [id: string]: CGMLInitialState },
  terminates: { [id: string]: CGMLVertex },
  finals: { [id: string]: CGMLVertex },
  choices: { [id: string]: CGMLVertex },
): ExportNode[] {
  const nodes: { [id: string]: ExportNode } = {};

  const getExportNode = (stateId: string): ExportNode => {
    if (nodes[stateId]) {
      return nodes[stateId];
    } else {
      return stateToExportNode(states[stateId], stateId);
    }
  };

  const addToParent = (parent: string | undefined, node: ExportNode, id: string) => {
    if (parent) {
      const parentNode: ExportNode = getExportNode(parent);
      if (parentNode.graph !== undefined) {
        parentNode.graph.node.push(node);
      } else {
        parentNode.graph = {
          '@id': parentNode['@id'],
          node: [node],
          edge: [],
        };
      }
      nodes[parent] = parentNode;
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

function getComponentStates(components: { [id: string]: CGMLComponent }): ExportNode[] {
  const nodes: ExportNode[] = [];

  for (const componentId in components) {
    const component = components[componentId];
    nodes.push({
      '@id': componentId,
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
      ],
    });
  }

  return nodes;
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

function getEdges(transitions: Record<string, CGMLTransition>): ExportEdge[] {
  const edges: ExportEdge[] = [];

  for (const id in transitions) {
    const transition = transitions[id];
    const edge: ExportEdge = {
      '@id': transition.id,
      '@source': transition.source,
      '@target': transition.target,
    };
    if (transition.actions.length !== 0) {
      edge.data = [
        {
          '@key': 'dData',
          content: serializeActions(transition.actions),
        },
      ];
    }
    if (transition.color !== undefined) {
      edge.data?.push({
        '@key': 'dColor',
        content: transition.color,
      });
    }
    if (transition.position !== undefined) {
      edge.data?.push(getGeometryDataNode(transition.position));
    }

    if (transition.labelPosition) {
      edge.data?.push(getLabelPositionNode(transition.labelPosition));
    }

    for (const dataNode of transition.unsupportedDataNodes) {
      edge.data?.push({
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

export function exportGraphml(elements: CGMLElements): string {
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
      graph: {
        '@id': 'G',
        node: [
          getMetaNode(elements.platform, elements.meta, elements.standardVersion),
          ...getExportNodes(
            elements.states,
            elements.initialStates,
            elements.terminates,
            elements.finals,
            elements.choices,
          ),
          ...getComponentStates(elements.components),
          ...getNoteNodes(elements.notes),
        ],
        edge: [...getEdges(elements.transitions)],
      },
    },
  };
  return builder.build(xml);
}

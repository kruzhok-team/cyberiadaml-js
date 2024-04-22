import { XMLParser } from 'fast-xml-parser';

import {
  NoteType,
  CGMLState,
  CGMLTransition,
  CGMLElements,
  CGMLDataNodeProcess,
  CGMLDataKey,
  CGMLDataKeys,
  CGMLDataNode,
  CGMLDataNodeProcessArgs,
  CGMLKeyNode,
  CGMLNode,
  CGML,
  CGMLGraph,
  CGMLEdge,
  CGMLNote,
  CGMLVertex,
} from './types/import';

function isDataKey(key: string): key is CGMLDataKey {
  return CGMLDataKeys.includes(key as CGMLDataKey);
}

function isNoteType(value: string): value is NoteType {
  return value == 'informal' || value == 'formal';
}

// Набор функций, обрабатывающих data-узлы в зависимости от их ключа.
const dataNodeProcess: CGMLDataNodeProcess = {
  dVertex({ elements, parentNode, node, vertex }) {
    if (!parentNode || !vertex) {
      throw new Error('Непредвиденный вызов dVertex!');
    }
    vertex.type = node.content;
  },
  gFormat({ elements, node }) {
    if (elements.format != '') {
      throw new Error(
        `Повторное указание формата! Старое значение: ${elements.format}. Новое значение: ${node.content}`,
      );
    }
    elements.format = node.content;
  },
  dData({ elements, state, parentNode, node, transition, note }) {
    if (parentNode !== undefined) {
      if (state !== undefined) {
        state.actions = node.content;
      } else if (note !== undefined) {
        note.text = node.content;
      }
    } else {
      if (transition == undefined) {
        throw new Error('Непредвиденный вызов dData.');
      }
      transition.actions = node.content;
      elements.transitions[transition.id] = transition;
    }
  },
  dName(data: CGMLDataNodeProcessArgs) {
    if (data.parentNode == undefined) {
      throw new Error('Непредвиденный вызов функции dName');
    }
    if (data.note !== undefined) {
      if (data.note.name !== undefined) {
        throw new Error('Для комментария уже указано поле dName!');
      }
      data.note.name = data.node.content;
      return;
    }
    if (data.state !== undefined) {
      data.state.name = data.node.content;
      return;
    }
    if (data.vertex !== undefined) {
      data.vertex.data = data.node.content;
      return;
    }
  },
  dGeometry(data: CGMLDataNodeProcessArgs) {
    if (data.node['x'] === undefined || data.node['y'] === undefined) {
      throw new Error('Не указаны x или y для узла data с ключом dGeometry');
    }
    const x = +data.node['x'];
    const y = +data.node['y'];

    if (data.state !== undefined) {
      data.state.bounds = {
        x: x,
        y: y,
        width: data.node['width'] ? +data.node['width'] : 0,
        height: data.node['height'] ? +data.node['height'] : 0,
      };
      return;
    }
    if (data.transition !== undefined) {
      data.transition.position = {
        x: x,
        y: y,
      };
      return;
    }
    if (data.note !== undefined) {
      data.note.position = {
        x: x,
        y: y,
      };
      return;
    }

    if (data.vertex !== undefined) {
      data.vertex.position = {
        x: x,
        y: y,
        width: data.node['width'] ? +data.node['width'] : 0,
        height: data.node['height'] ? +data.node['height'] : 0,
      };
    }

    throw new Error('Непредвиденный вызов функции dGeometry');
  },
  dColor(data: CGMLDataNodeProcessArgs) {
    if (data.transition !== undefined) {
      data.transition.color = data.node.content;
    } else if (data.state !== undefined) {
      data.state.color = data.node.content;
    }
  },
  dNote(data: CGMLDataNodeProcessArgs) {
    if (data.note == undefined) {
      throw new Error('Непредвиденный вызов функции dNote');
    }
    if (data.node.content == '' || data.node.content == undefined) {
      data.note.type = 'informal';
      return;
    }
    if (!isNoteType(data.node.content)) {
      throw new Error('Значение поля dNote должно быть formal или informal!');
    }
    data.note.type = data.node.content;
  },
};

function processTransitions(elements: CGMLElements, edges: CGMLEdge[]) {
  let foundInitial = false;
  for (const idx in edges) {
    const edge = edges[idx];
    const transition: CGMLTransition = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      actions: '',
      unsupportedDataNodes: [],
    };

    for (const dataNodeIndex in edge.data) {
      const dataNode: CGMLDataNode = edge.data[+dataNodeIndex];
      if (isDataKey(dataNode.key)) {
        const func = dataNodeProcess[dataNode.key];
        func({
          elements: elements,
          node: dataNode,
          parentNode: undefined,
          transition: transition,
        });
      } else {
        transition.unsupportedDataNodes.push(dataNode);
      }
    }
  }
}

// Функция, которая находит формат и присваивают его к Meta
function setFormatToMeta(elements: CGMLElements, xml: any) {
  for (const node of xml.graphml.data as CGMLDataNode[]) {
    if (isDataKey(node.key)) {
      const func = dataNodeProcess[node.key];
      func({ elements, node });
    }
  }
}

function createEmptyState(): CGMLState {
  return {
    name: '',
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    actions: '',
    unsupportedDataNodes: [],
  };
}

function createEmptyNote(): CGMLNote {
  return {
    name: undefined,
    type: 'informal',
    position: {
      x: 0,
      y: 0,
    },
    text: '',
  };
}

function createEmptyVertex(): CGMLVertex {
  return {
    type: '',
  };
}

// Обработка нод
function processNode(
  elements: CGMLElements,
  node: CGMLNode,
  parent?: CGMLNode,
): CGMLState | CGMLNote | CGMLVertex {
  // Если находим dNote среди дата-нод, то создаем пустую заметку, а состояние делаем undefined
  const note: CGMLNote | undefined = node.data?.find((dataNode) => dataNode.key === 'dNote')
    ? createEmptyNote()
    : undefined;

  const vertex: CGMLVertex | undefined = node.data?.find((dataNode) => dataNode.key === 'dVertex')
    ? createEmptyVertex()
    : undefined;

  const state: CGMLState | undefined =
    note === undefined && vertex === undefined ? createEmptyState() : undefined;
  if (node.data !== undefined) {
    for (const dataNode of node.data) {
      if (isDataKey(dataNode.key)) {
        const func = dataNodeProcess[dataNode.key];
        func({
          elements: elements,
          node: dataNode,
          parentNode: node,
          state: state,
          note: note,
          vertex: vertex,
        });
      }
    }
  }

  if (parent !== undefined && state !== undefined) {
    state.parent = parent.id;
  }

  if (node.graph !== undefined) {
    processGraph(elements, node.graph, node);
  }

  if (state !== undefined) {
    return state;
  }
  if (note !== undefined) {
    return note;
  }
  if (vertex !== undefined) {
    return vertex;
  }

  throw new Error('Отсутствует состояние или заметка для данного узла!');
}

function parseMeta(rawParameters: string): { [id: string]: string } {
  const splitedParameters = rawParameters.split('\n\n');
  const meta: { [id: string]: string } = {};
  for (const splitedParameter of splitedParameters) {
    const [name, value] = splitedParameter.split('/');
    meta[name] = value.trim();
  }

  return meta;
}

function isVertex(value: CGMLState | CGMLNote | CGMLVertex): value is CGMLVertex {
  return (
    (value as CGMLNote).text == undefined &&
    (value as CGMLState).actions == undefined &&
    (value as CGMLVertex).type !== undefined
  );
}

function isState(value: CGMLState | CGMLNote | CGMLVertex): value is CGMLState {
  return (value as CGMLState).actions !== undefined && (value as CGMLState).name !== undefined;
}

function processGraph(elements: CGMLElements, graph: CGMLGraph, parent?: CGMLNode) {
  for (const idx in graph.node) {
    const node = graph.node[idx];
    const processResult: CGMLState | CGMLNote | CGMLVertex = processNode(elements, node, parent);
    if (isState(processResult)) {
      elements.states[node.id] = processResult;
      continue;
    }
    if (isVertex(processResult)) {
      const vertex = processResult;
      switch (vertex.type) {
        case 'initial':
          elements.initialStates[node.id] = vertex;
          break;
        case 'choice':
          elements.choices[node.id] = vertex;
          break;
        case 'final':
          elements.finals[node.id] = vertex;
          break;
        case 'terminate':
          elements.terminates[node.id] = vertex;
          break;
        default:
          break;
      }
      continue;
    }

    const note = processResult;
    if (note.type == 'informal') {
      elements.notes[node.id] = note;
      continue;
    }
    switch (note.name) {
      case 'CGML_COMPONENT':
        if (elements.components[node.id] !== undefined) {
          throw new Error(`Компонент с идентификатором ${node.id} уже существует!`);
        }
        elements.components[node.id] = parseMeta(note.text);
        break;
      case 'CGML_META':
        elements.meta.values = parseMeta(note.text);
        elements.meta.id = node.id;
        break;
      default:
        throw new Error(
          `Неизвестный тип мета-информации ${note.text}. Ожидается CGML_META или CGML_COMPONENT.`,
        );
    }
  }

  if (graph.edge) {
    processTransitions(elements, graph.edge);
  }
}

function getKeyNodes(xml: CGML): Array<CGMLKeyNode> {
  const keyNodes: Array<CGMLKeyNode> = [];
  for (const node of xml.graphml.key) {
    keyNodes.push({
      id: node.id,
      for: node.for,
      'attr.name': node['attr.name'],
      'attr.type': node['attr.type'],
    });
  }

  return keyNodes;
}

function removeComponentsTransitions(
  transitions: Record<string, CGMLTransition>,
  metaId: string,
): Record<string, CGMLTransition> {
  const newTransitions: Record<string, CGMLTransition> = {};
  for (const transitionId in transitions) {
    const transition = transitions[transitionId];
    if (transition.source == metaId) {
      continue;
    }
    newTransitions[transitionId] = transition;
  }

  return newTransitions;
}

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
    format: '',
    keys: [],
    notes: {},
    choices: {},
    terminates: {},
    finals: {},
  };

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);
  elements.keys = getKeyNodes(xml);
  processGraph(elements, xml.graphml.graph);
  elements.transitions = removeComponentsTransitions(elements.transitions, elements.meta.id);
  elements.platform = elements.meta.values['platform'];
  return elements;
}

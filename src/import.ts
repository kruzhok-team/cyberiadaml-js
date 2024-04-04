import { XMLParser } from 'fast-xml-parser';

import {
  CGMLState,
  CGMLTransition,
  CGMLElements,
  CGMLKeyProperties,
  CGMLDataNodeProcess,
  CGMLDataKey,
  CGMLDataKeys,
  CGMLDataNode,
  CGMLDataNodeProcessArgs,
  CGMLKeyNode,
  CGMLNode,
  CGMLComponent,
  CGML,
  CGMLGraph,
  CGMLEdge,
  CGMLNote,
} from './types/import';

function isDataKey(key: string): key is CGMLDataKey {
  return CGMLDataKeys.includes(key as CGMLDataKey);
}

// Набор функций, обрабатывающих data-узлы в зависимости от их ключа.
const dataNodeProcess: CGMLDataNodeProcess = {
  gFormat({ elements, node }) {
    if (elements.format != '') {
      throw new Error(
        `Повторное указание формата! Старое значение: ${elements.format}. Новое значение: ${node.content}`,
      );
    }
    elements.format = node.content;
  },
  dData({ elements, state, parentNode, node, component, transition }) {
    if (parentNode !== undefined) {
      // Если это мета-компонент, то извлекаем мета-информацию
      if (parentNode.id === '') {
        elements.meta = node.content;
      } else {
        if (component !== undefined) {
          component.parameters = node.content;
        } else if (state !== undefined) {
          state.actions = node.content;
        }
      }
    } else {
      if (transition !== undefined) {
        transition.actions = node.content;
        elements.transitions[transition.id] = transition;
      }
    }
  },
  dName(data: CGMLDataNodeProcessArgs) {
    if (data.parentNode !== undefined) {
      // В мета-состоянии dName означает название платформы
      if (data.parentNode.id === '') {
        if (data.elements.platform === '') {
          data.elements.platform = data.node.content;
        } else {
          throw new Error(
            `Повторное указание платформы! Старое значение: ${data.elements.platform}. Новое значение: ${data.node.content}`,
          );
        }
      } else {
        if (data.component !== undefined) {
          data.component.parameters = data.node.content;
        } else if (data.state != undefined) {
          data.state.name = data.node.content;
        }
      }
    } else {
      throw new Error('Непредвиденный вызов функции dName');
    }
  },
  dInitial(data: CGMLDataNodeProcessArgs) {
    if (data.parentNode !== undefined) {
      if (data.elements.initialState !== null) {
        initialId = data.parentNode.id;
        data.elements.initialState.id = data.parentNode.id;
      }
    } else {
      throw new Error('Непредвиденный вызов функции dInitial');
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
    } else if (data.transition !== undefined) {
      data.transition.position = {
        x: x,
        y: y,
      };
    } else if (data.note !== undefined) {
      data.note.position = {
        x: x,
        y: y,
      };
    } else {
      throw new Error('Непредвиденный вызов функции dGeometry');
    }
  },
  dColor(data: CGMLDataNodeProcessArgs) {
    if (data.transition !== undefined) {
      data.transition.color = data.node.content;
    } else if (data.state !== undefined) {
      data.state.color = data.node.content;
    }
  },
  dNote(data: CGMLDataNodeProcessArgs) {
    if (data.note !== undefined) {
      data.note.text = data.node.content;
    } else {
      throw new Error('Непредвиденный вызов функции dNote');
    }
  },
};

function processTransitions(
  elements: CGMLElements,
  edges: CGMLEdge[],
  availableDataProperties: Map<string, Map<string, CGMLKeyProperties>>,
) {
  let foundInitial = false;
  for (const idx in edges) {
    const edge = edges[idx];
    if (!foundInitial && edge.source === initialId) {
      const bounds = elements.states[edge.source].bounds;
      delete elements.states[edge.source];
      if (elements.initialState !== null) {
        elements.initialState.position = {
          x: bounds.x,
          y: bounds.y,
        };
        elements.initialState.target = edge.target;
        elements.initialState.transitionId = edge.id;
        elements.transitions[edge.id] = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          unsupportedDataNodes: [],
        };
      } else {
        throw new Error('Непредвиденная ошибка. processTransitions: initialState == null');
      }
      foundInitial = true;
    }

    const transition: CGMLTransition = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      actions: '',
      unsupportedDataNodes: [],
    };

    for (const dataNodeIndex in edge.data) {
      const dataNode: CGMLDataNode = edge.data[+dataNodeIndex];
      if (!availableDataProperties.get('edge')?.has(dataNode.key)) {
        throw new Error(`Неизвестный key "${dataNode.key}" для узла edge!`);
      }
      if (isDataKey(dataNode.key)) {
        const func = dataNodeProcess[dataNode.key];
        func({
          elements: elements,
          node: dataNode,
          component: undefined,
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
    position: {
      x: 0,
      y: 0,
    },
    text: '',
  };
}

// Обработка нод
function processNode(
  elements: CGMLElements,
  node: CGMLNode,
  availableDataProperties: Map<string, Map<string, CGMLKeyProperties>>,
  parent?: CGMLNode,
  component?: CGMLComponent,
): CGMLState | CGMLNote {
  // Если находим dNote среди дата-нод, то создаем пустую заметку, а состояние делаем undefined
  const note: CGMLNote | undefined = node.data?.find((dataNode) => dataNode.key === 'dNote')
    ? createEmptyNote()
    : undefined;
  const state: CGMLState | undefined = note == undefined ? createEmptyState() : undefined;
  if (node.data !== undefined) {
    for (const dataNode of node.data) {
      if (!availableDataProperties.get('node')?.has(dataNode.key)) {
        throw new Error(`Неизвестный key "${dataNode.key}" для узла node!`);
      }
      if (isDataKey(dataNode.key)) {
        const func = dataNodeProcess[dataNode.key];
        func({
          elements: elements,
          node: dataNode,
          parentNode: node,
          state: state,
          component: component,
          note: note,
        });
      }
    }
  }

  if (parent !== undefined && state !== undefined) {
    state.parent = parent.id;
  }

  if (node.graph !== undefined) {
    processGraph(elements, node.graph, availableDataProperties, node);
  }

  if (state !== undefined) {
    return state;
  } else if (note !== undefined) {
    return note;
  } else {
    throw new Error('Отсутствует состояние или заметка для данного узла!');
  }
}

function emptyCGMLComponent(): CGMLComponent {
  return {
    transitionId: '',
    id: '',
    parameters: '',
  };
}

function isState(value: CGMLState | CGMLNote): value is CGMLState {
  return (value as CGMLState).actions !== undefined || (value as CGMLState).name !== undefined;
}

function processGraph(
  elements: CGMLElements,
  graph: CGMLGraph,
  availableDataProperties: Map<string, Map<string, CGMLKeyProperties>>,
  parent?: CGMLNode,
) {
  if (parent === undefined) {
    if (graph.edge) {
      for (const idx in graph.edge) {
        const edge = graph.edge[idx];
        if (edge.source === '') {
          elements.components[edge.target] = emptyCGMLComponent();
          elements.components[edge.target].transitionId = edge.id;
          delete graph.edge[idx];
        }
      }
    }

    for (const idx in graph.node) {
      const node = graph.node[idx];
      const component = elements.components[node.id];
      if (component !== undefined) {
        // Если у компонента уже присвоен id, то мы его уже обрабатывали
        if (component.id !== '') {
          throw new Error(`Компонент с id ${component.id} уже существует!`);
        }
        component.id = node.id;
        processNode(elements, node, availableDataProperties, parent, component);
        delete graph.node[idx];
      }
    }
  }

  for (const idx in graph.node) {
    const node = graph.node[idx];
    const processResult: CGMLState | CGMLNote = processNode(
      elements,
      node,
      availableDataProperties,
      parent,
    );
    if (isState(processResult)) {
      elements.states[node.id] = processResult;
    } else {
      elements.notes[node.id] = processResult;
    }
  }

  if (graph.edge) {
    processTransitions(elements, graph.edge, availableDataProperties);
  }
}

// Добавляет допустимые свойства у узлов (dData, dInitial и т.д)
function addPropertiesFromKeyNode(
  xml: CGML,
  elements: CGMLElements,
  availableDataProperties: Map<string, Map<string, CGMLKeyProperties>>, // Map<Название целевой ноды, Map<id свойства, аттрибуты свойства>>
) {
  for (const node of xml.graphml.key) {
    const keyNode: CGMLKeyNode = {
      id: node.id,
      for: node.for,
      'attr.name': node['attr.name'],
      'attr.type': node['attr.type'],
    };
    elements.keys.push(keyNode);
    // Если у нас уже есть список свойств для целевой ноды, то добавляем в уже существующий Map,
    // иначе - создаем новый.
    if (availableDataProperties.has(keyNode.for)) {
      const nodeProperties = availableDataProperties.get(keyNode.for);

      // Если есть такое свойство - вывести ошибку, иначе - добавить!
      if (nodeProperties?.has(keyNode.id)) {
        throw new Error(`Дублирование свойства ${keyNode.id} для узла ${keyNode.for}!`);
      } else {
        nodeProperties?.set(keyNode.id, {
          'attr.name': node['attr.name'],
          'attr.type': node['attr.type'],
        });
      }
    } else {
      availableDataProperties.set(
        keyNode.for,
        new Map<string, CGMLKeyProperties>([
          [keyNode.id, { 'attr.name': node['attr.name'], 'attr.type': node['attr.type'] }],
        ]),
      );
    }
  }
}

let initialId = '';

export function parseCGML(graphml: string): CGMLElements {
  initialId = '';
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
    initialState: {
      transitionId: '',
      id: '',
      target: '',
    },
    components: {},
    platform: '',
    meta: '',
    format: '',
    keys: [],
    notes: {},
  };

  const availableDataProperties = new Map<string, Map<string, CGMLKeyProperties>>();

  const xml = parser.parse(graphml) as CGML;

  setFormatToMeta(elements, xml);

  addPropertiesFromKeyNode(xml, elements, availableDataProperties);

  switch (elements.format) {
    case 'Cyberiada-GraphML': {
      const indexOfMetaNode = xml.graphml.graph.node.findIndex((node) => node.id === '');
      if (indexOfMetaNode !== -1) {
        processNode(elements, xml.graphml.graph.node[indexOfMetaNode], availableDataProperties);
        xml.graphml.graph.node = xml.graphml.graph.node.filter((value) => value.id !== '');
        processGraph(elements, xml.graphml.graph, availableDataProperties);
      } else {
        throw new Error('Отсутствует мета-узел!');
      }
      break;
    }
    default: {
      throw new Error(`ОШИБКА! НЕИЗВЕСТНЫЙ ФОРМАТ "${elements.format}"!`);
    }
  }
  return elements;
}

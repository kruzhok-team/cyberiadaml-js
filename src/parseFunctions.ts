import {
  NoteType,
  CGMLState,
  CGMLTransition,
  CGMLStateMachine,
  CGMLDataNodeProcess,
  CGMLDataKey,
  CGMLDataKeys,
  CGMLDataNode,
  CGMLDataNodeProcessArgs,
  CGMLTransitionAction,
  CGMLKeyNode,
  CGMLNode,
  CGML,
  CGMLGraph,
  CGMLEdge,
  CGMLNote,
  CGMLVertex,
  CGMLAction,
  CGMLElements,
  CGMLTextElements,
} from './types/import';
import { CGMLTextStateMachine, CGMLTextState, CGMLTextTransition } from './types/textImport';
import { parseTrigger } from './utils';

export let componentOrder = 0;

const regexes = [
  /^(?<trigger>[^\[\]]+)\[(?<condition>.+)\]$ (?<postfix>w+)$/,
  /^(?<trigger>[^\[\]]+) (?<postfix>.+)$/,
  /^(?<trigger>[^\[\]]+)\[(?<condition>.+)\]$/,
  /^\[(?<condition>.+)\]$/,
  /^(?<trigger>[^\[\]]+)$/,
];

function isDataKey(key: string): key is CGMLDataKey {
  return CGMLDataKeys.includes(key as CGMLDataKey);
}

function isNoteType(value: string): value is NoteType {
  return value == 'informal' || value == 'formal';
}

function parseActions(
  rawActions: string,
  triggerRequiered: boolean,
): Array<CGMLAction> | Array<CGMLTransitionAction> {
  const actions: Array<CGMLTransitionAction> = [];
  if (!rawActions) {
    return actions;
  }
  const splitedActions = rawActions.split('\n\n');
  for (const splitedAction of splitedActions) {
    let [rawTrigger, action] = splitedAction.split('/');
    const trigger = parseTrigger(rawTrigger, regexes);
    if (!trigger && triggerRequiered) {
      throw new Error('No trigger for actions, but its requiered!');
    }
    action = action.trim();
    actions.push({
      trigger: trigger,
      action: action === '' ? undefined : action,
    });
  }
  return actions;
}

// Набор функций, обрабатывающих data-узлы в зависимости от их ключа.
const dataNodeProcess: CGMLDataNodeProcess = {
  dVertex({ parentNode, node, vertex }) {
    if (!parentNode || !vertex) {
      throw new Error('Непредвиденный вызов dVertex!');
    }
    vertex.type = node.content;
  },
  gFormat({ elements, node }) {
    if (!elements) {
      throw new Error('Internal Error! Elements is undefined!');
    }
    if (elements.format != '') {
      throw new Error(
        `Повторное указание формата! Старое значение: ${elements.format}. Новое значение: ${node.content}`,
      );
    }
    elements.format = node.content;
  },
  dData({ stateMachine, state, parentNode, node, transition, note, textMode }) {
    if (!stateMachine) {
      throw new Error('Internal Error! stateMachine is undefined!');
    }
    if (parentNode !== undefined) {
      if (state !== undefined) {
        if (textMode) {
          state.actions = node.content;
        } else {
          state.actions = parseActions(node.content, true) as CGMLAction[];
        }
      } else if (note !== undefined) {
        note.text = node.content;
      }
    } else {
      if (transition == undefined) {
        throw new Error('Непредвиденный вызов dData.');
      }
      if (stateMachine.initialStates[transition.source]) {
        if (textMode) {
          transition.actions = node.content;
        } else {
          transition.actions = [
            {
              action: node.content,
            },
          ];
        }
      } else {
        if (textMode) {
          transition.actions = node.content;
        } else {
          transition.actions = parseActions(node.content, false);
        }
      }
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
    if (data.node.rect === undefined && data.node.point === undefined) {
      throw new Error('Не указаны point и rect для узла data с ключом dGeometry');
    }

    let x = 0;
    let y = 0;
    let width = -1;
    let height = -1;

    if (data.node.rect) {
      const rect = data.node.rect[0];
      x = +rect.x;
      y = +rect.y;
      width = +rect.width;
      height = +rect.height;
    } else if (data.node.point) {
      const point = data.node.point[0];
      x = +point.x;
      y = +point.y;
    } else {
      throw new Error('Internal error!');
    }
    if (data.state !== undefined) {
      data.state.bounds = {
        x: x,
        y: y,
        width: width,
        height: height,
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
        width: width,
        height: height,
      };
      return;
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
  dPivot(data: CGMLDataNodeProcessArgs) {
    if (data.transition == undefined) {
      throw new Error('Непредвиденный вызов функции dPivot!');
    }
    data.transition.pivot = data.node.content;
  },
  dLabelGeometry(data: CGMLDataNodeProcessArgs) {
    if (data.transition == undefined) {
      throw new Error('Непредвиденный вызов функции dPivot!');
    }
    if (data.node.point == undefined) {
      throw new Error('Нет дочернего <point> у <data> с ключом dLabelGeometry ');
    }
    const point = data.node.point[0];
    const x = +point.x;
    const y = +point.y;
    data.transition.labelPosition = {
      x: x,
      y: y,
    };
  },
  dStateMachine(data: CGMLDataNodeProcessArgs) {
    throw new Error('<data key="dStateMachine"> is not on the first level of the graph.');
  },
};

function processTransitions(
  stateMachine: CGMLStateMachine | CGMLTextStateMachine,
  edges: CGMLEdge[],
  textMode: boolean,
) {
  for (const idx in edges) {
    const edge = edges[idx];
    let transition: CGMLTextTransition | CGMLTransition;
    if (textMode) {
      transition = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        actions: '',
        unsupportedDataNodes: [],
        pivot: undefined,
        labelPosition: undefined,
      };
    } else {
      transition = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        actions: [],
        unsupportedDataNodes: [],
        pivot: undefined,
        labelPosition: undefined,
      };
    }
    stateMachine.transitions[edge.id] = transition;
    for (const dataNodeIndex in edge.data) {
      const dataNode: CGMLDataNode = edge.data[+dataNodeIndex];
      if (isDataKey(dataNode.key)) {
        const func = dataNodeProcess[dataNode.key];
        func({
          stateMachine: stateMachine,
          node: dataNode,
          parentNode: undefined,
          transition: transition,
          textMode: textMode,
        });
      } else {
        transition.unsupportedDataNodes.push(dataNode);
      }
    }
  }
}

// Функция, которая находит формат и присваивают его к Meta
export function setFormatToMeta(elements: CGMLElements | CGMLTextElements, xml: any) {
  for (const node of xml.graphml.data as CGMLDataNode[]) {
    if (isDataKey(node.key)) {
      const func = dataNodeProcess[node.key];
      func({ elements, node, textMode: false });
    }
  }
}

function createEmptyState(): CGMLState {
  return {
    name: '',
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    actions: [],
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
    unsupportedDataNodes: [],
  };
}

function createEmptyVertex(): CGMLVertex {
  return {
    type: '',
    data: '',
  };
}

// Обработка нод
function processNode(
  elements: CGMLElements | CGMLTextElements,
  stateMachine: CGMLStateMachine | CGMLTextStateMachine,
  node: CGMLNode,
  textMode: boolean,
  parent?: CGMLNode,
): CGMLState | CGMLTextState | CGMLNote | CGMLVertex {
  // Если находим dNote среди дата-нод, то создаем пустую заметку, а состояние делаем undefined
  const note: CGMLNote | undefined = node.data?.find((dataNode) => dataNode.key === 'dNote')
    ? createEmptyNote()
    : undefined;

  const vertex: CGMLVertex | undefined = node.data?.find((dataNode) => dataNode.key === 'dVertex')
    ? createEmptyVertex()
    : undefined;
  const unsupportedDataNodes: CGMLDataNode[] = [];
  const state: CGMLState | undefined =
    note === undefined && vertex === undefined ? createEmptyState() : undefined;
  if (node.data !== undefined) {
    for (const dataNode of node.data) {
      if (isDataKey(dataNode.key)) {
        const func = dataNodeProcess[dataNode.key];
        func({
          stateMachine: stateMachine,
          node: dataNode,
          parentNode: node,
          state: state,
          note: note,
          vertex: vertex,
          textMode: textMode,
        });
      } else {
        unsupportedDataNodes.push(dataNode);
      }
    }
  }

  if (parent !== undefined && state !== undefined) {
    state.parent = parent.id;
  }

  if (node.graph !== undefined) {
    processGraph(elements, stateMachine, node.graph, textMode, node);
  }

  if (state !== undefined) {
    state.unsupportedDataNodes = unsupportedDataNodes;
    return state;
  }
  if (note !== undefined) {
    note.unsupportedDataNodes = unsupportedDataNodes;
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

function isVertex(value: CGMLState | CGMLTextState | CGMLNote | CGMLVertex): value is CGMLVertex {
  return (
    (value as CGMLVertex).data !== undefined &&
    (value as CGMLNote).text == undefined &&
    (value as CGMLState).actions == undefined &&
    (value as CGMLVertex).type !== undefined
  );
}

function isState(value: CGMLState | CGMLTextState | CGMLNote | CGMLVertex): value is CGMLState {
  return (value as CGMLState).actions !== undefined && (value as CGMLState).name !== undefined;
}

function isTextState(
  value: CGMLState | CGMLTextState | CGMLNote | CGMLVertex,
): value is CGMLTextState {
  return (
    (value as CGMLTextState).actions !== undefined &&
    typeof (value as CGMLTextState).actions === 'string' &&
    (value as CGMLTextState).name !== undefined
  );
}

export function processGraph(
  elements: CGMLElements | CGMLTextElements,
  stateMachine: CGMLStateMachine | CGMLTextStateMachine,
  graph: CGMLGraph,
  textMode: boolean,
  parent?: CGMLNode,
): CGMLStateMachine | CGMLTextStateMachine {
  for (const idx in graph.node) {
    const node = graph.node[idx];
    const processResult: CGMLState | CGMLTextState | CGMLNote | CGMLVertex = processNode(
      elements,
      stateMachine,
      node,
      textMode,
      parent,
    );
    if (isState(processResult)) {
      stateMachine.states[node.id] = processResult;
      continue;
    }
    if (isTextState(processResult)) {
      stateMachine.states[node.id] = processResult;
      continue;
    }
    if (isVertex(processResult)) {
      const vertex = processResult;
      if (parent) {
        vertex.parent = parent.id;
      }
      switch (vertex.type) {
        case 'initial':
          stateMachine.initialStates[node.id] = vertex;
          break;
        case 'choice':
          stateMachine.choices[node.id] = vertex;
          break;
        case 'final':
          stateMachine.finals[node.id] = vertex;
          break;
        case 'terminate':
          stateMachine.terminates[node.id] = vertex;
          break;
        default:
          stateMachine.unknownVertexes[node.id] = vertex;
      }
      continue;
    }

    const note = processResult;
    if (note.type == 'informal') {
      stateMachine.notes[node.id] = note;
      continue;
    }
    switch (note.name) {
      case 'CGML_COMPONENT':
        if (stateMachine.components[node.id] !== undefined) {
          throw new Error(`Компонент с идентификатором ${node.id} уже существует!`);
        }
        const componentParameters = parseMeta(note.text);
        const componentId = componentParameters['id'];
        const componentType = componentParameters['type'];
        delete componentParameters['id'];
        delete componentParameters['type'];
        stateMachine.components[node.id] = {
          id: componentId,
          type: componentType,
          parameters: componentParameters,
          order: componentOrder,
          unsupportedDataNodes: note.unsupportedDataNodes,
        };
        componentOrder += 1;
        break;
      case 'CGML_META':
        if (
          !(Object.values(stateMachine.meta.values).length === 0) &&
          !(stateMachine.meta.id === '')
        ) {
          throw new Error('Double meta-node!');
        }
        stateMachine.meta.values = parseMeta(note.text);
        stateMachine.meta.id = node.id;
        break;
      default:
        throw new Error(
          `Неизвестный тип мета-информации ${note.text}. Ожидается CGML_META или CGML_COMPONENT.`,
        );
    }
  }

  if (graph.edge) {
    processTransitions(stateMachine, graph.edge, textMode);
  }
  return stateMachine;
}

export function getKeyNodes(xml: CGML): Array<CGMLKeyNode> {
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

export function getStateMachineDataNode<T>(
  graph: CGMLGraph,
  key: CGMLDataKey,
  getData: (node: CGMLDataNode) => T,
): T | undefined {
  if (graph.data === undefined) {
    return;
  }
  for (const graphData of graph.data) {
    if (graphData.key === key) {
      return getData(graphData);
    }
  }
}

export function getStateMachineName(graph: CGMLGraph): string | undefined {
  if (graph.data === undefined) {
    throw new Error(`There aren't <data> nodes in the first level graph with id '${graph.id}'`);
  }
  let isStateMachine = false;
  let name: string | undefined = undefined;
  for (const graphData of graph.data) {
    if (graphData.key === 'dName') {
      name = graphData.content;
      continue;
    }
    if (graphData.key === 'dStateMachine') {
      isStateMachine = true;
      undefined;
    }
  }

  if (!isStateMachine) {
    throw new Error("First level graph doesn't contain <data> with dStateMachine key!");
  }
  return name;
}

export function resetComponentOrder() {
  componentOrder = 0;
}

export function removeComponentsTransitions(
  transitions: Record<string, CGMLTransition> | Record<string, CGMLTextTransition>,
  metaId: string,
): Record<string, CGMLTransition> | Record<string, CGMLTextTransition> {
  const newTransitions: Record<string, CGMLTransition> | Record<string, CGMLTextTransition> = {};
  for (const transitionId in transitions) {
    const transition = transitions[transitionId];
    if (transition.source == metaId) {
      continue;
    }
    newTransitions[transitionId] = transition;
  }

  return newTransitions;
}

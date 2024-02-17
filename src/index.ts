import { XMLParser } from "fast-xml-parser";

import {
  CGMLState,
  CGMLTransition,
  CGMLElements,
  CGMLKeyProperties,
  CGMLDataNodeProcess,
  CGMLDataKey,
  DataKeys,
  CGMLDataNode,
  CGMLDataNodeProcessArgs,
  CGMLKeyNode,
  CGMLNode,
  CGMLComponent,
  CGML,
  CGMLGraph,
  CGMLEdge
} from "./types";

function isDataKey(key: string): key is CGMLDataKey {
  return DataKeys.includes(key as CGMLDataKey);
  // else
  //   throw new Error(
  //     `К сожалению, в данный момент не предусмотрена обработка data-узла с ключом ${key}`
  //   );
}

// Набор функций, обрабатывающих data-узлы в зависимости от их ключа.
const dataNodeProcess: CGMLDataNodeProcess = {
  gFormat({ elements, node }) {
    if (elements.format != '') {
      throw new Error(`Повторное указание формата! Старое значение: ${elements.format}. Новое значение: ${node.content}`);
    }
    elements.format = node.content;
  },
  dData({ elements, state, parentNode, node, component, transition }) {
    if (parentNode !== undefined) {
      // Если это мета-компонент, то извлекаем мета-информацию
      if (parentNode.id === "") {
        elements.meta = node.content;
      } else {
        if (component !== undefined) {
          component.parameters = node.content;
        } else if (state !== undefined) {
          state.actions = node.content
        }
      }
    } else {
      if (transition !== undefined) {
        transition.actions = node.content;
        elements.transitions.push(transition);
      }
    }
  },
  dName(data: CGMLDataNodeProcessArgs) {
    if (data.parentNode !== undefined) {
      // В мета-состоянии dName означает название платформы
      if (data.parentNode.id === "") {
        if (data.elements.platform === "") {
          data.elements.platform = data.node.content;
        } else {
          throw new Error(
            `Повторное указание платформы! Старое значение: ${data.elements.platform}. Новое значение: ${data.node.content}`
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
      throw new Error("Непредвиденный вызов функции dName");
    }
  },
  dInitial(data: CGMLDataNodeProcessArgs) {
    if (data.parentNode !== undefined) {
      if (data.elements.initialState !== null) {
        initialId = data.parentNode.id;
      }
    } else {
      throw new Error("Непредвиденный вызов функции dInitial");
    }
  },
  dGeometry(data: CGMLDataNodeProcessArgs) {
    if (data.node["x"] === undefined || data.node["y"] === undefined) {
      throw new Error("Не указаны x или y для узла data с ключом dGeometry");
    }
    const x = +data.node["x"];
    const y = +data.node["y"];
    if (data.parentNode !== undefined && data.parentNode.id == initialId) {
      if (data.elements.initialState !== null) {
        data.elements.initialState.position = {
          x: x,
          y: y,
        };
      } else {
        throw new Error(
          "Непредвиденная ошибка. dataNodeProcess.dGeometry: initialState == null"
        );
      }
    } else if (data.state !== undefined) {
      data.state.bounds = {
        x: x,
        y: y,
        width: data.node["width"] ? +data.node["width"] : 0,
        height: data.node["height"] ? +data.node["height"] : 0,
      };
    } else if (data.transition !== undefined) {
      data.transition.position = {
        x: x,
        y: y,
      };
    } else {
      throw new Error("Непредвиденный вызов функции dGeometry");
    }
  },
  dColor(data: CGMLDataNodeProcessArgs) {
    if (data.transition !== undefined) {
      data.transition.color = data.node.content;
    }
  },
};

function processTransitions(elements: CGMLElements, edges: CGMLEdge[]) {
  let foundInitial = false;
  for (const idx in edges) {
    const edge = edges[idx];
    if (!foundInitial && edge.source === initialId) {
      delete elements.states[edge.source];
      if (elements.initialState !== null) {
        elements.initialState.target = edge.target;
      } else {
        throw new Error(
          "Непредвиденная ошибка. processTransitions: initialState == null"
        );
      }
      foundInitial = true;
    }
    
    const transition: CGMLTransition = {
      source: edge.source,
      target: edge.target,
      position: {
        x: 0,
        y: 0,
      },
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
          component: undefined,
          parentNode: undefined,
          transition: transition,
        });
      }
      else {
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

// Обработка нод
function processNode(
  elements: CGMLElements,
  node: CGMLNode,
  awailableDataProperties: Map<string, Map<string, CGMLKeyProperties>>,
  parent?: CGMLNode,
  component?: CGMLComponent
): CGMLState {
  const state: CGMLState = createEmptyState();
  if (node.data !== undefined) {
    for (const dataNode of node.data) {
      // Проверяем, что ключ DataNode указан в начале схемы
      if (awailableDataProperties.get("node")?.has(dataNode.key)) {
        if (isDataKey(dataNode.key)) {
          const func = dataNodeProcess[dataNode.key];
          func({
            elements: elements,
            node: dataNode,
            parentNode: node,
            state: state,
            component: component,
          });
        }
        else {
          state.unsupportedDataNodes.push(dataNode);
        }
      } else {
        throw new Error(`Неизвестный key "${dataNode.key}" для узла node!`);
      }
    }
  }

  if (parent !== undefined) {
    state.parent = parent.id;
  }

  if (node.graph !== undefined) {
    processGraph(elements, node.graph, awailableDataProperties, node);
  }

  return state;
}

function emptyCGMLComponent(): CGMLComponent {
  return {
    id: '',
    parameters: '',
  };
}

function processGraph(
  elements: CGMLElements,
  graph: CGMLGraph,
  awailableDataProperties: Map<string, Map<string, CGMLKeyProperties>>,
  parent?: CGMLNode
) {
  if (parent === undefined) {
    if (graph.edge) {
      for (const idx in graph.edge) {
        const edge = graph.edge[idx];
        if (edge.source === "") {
          components_id.push(edge.target);
          delete graph.edge[idx];
        }
      }
    }

    for (const idx in graph.node) {
      const node = graph.node[idx];
      if (components_id.includes(node.id)) {
        const component = emptyCGMLComponent();
        component.id = node.id;
        processNode(
          elements,
          node,
          awailableDataProperties,
          parent,
          component
        );
        delete graph.node[idx];

        if (!elements.components[component.id]) {
          elements.components[component.id] = {
            id: component.id,
            parameters: component.parameters,
          };
        } else {
          throw new Error(
            `Компонент с id ${component.id} уже существует!`
          );
        }
      }
    }
  }

  for (const idx in graph.node) {
    const node = graph.node[idx];
    elements.states[node.id] = processNode(
      elements,
      node,
      awailableDataProperties,
      parent
    );
  }

  if (graph.edge) {
    processTransitions(elements, graph.edge);
  }
}

// Добавляет допустимые свойства у узлов (dData, dInitial и т.д)
function addPropertiesFromKeyNode(
  xml: CGML,
  awailableDataProperties: Map<string, Map<string, CGMLKeyProperties>> // Map<Название целевой ноды, Map<id свойства, аттрибуты свойства>>
) {
  for (const node of xml.graphml.key) {
    const keyNode: CGMLKeyNode = {
      id: node.id,
      for: node.for,
      'attr.name': node["attr.name"],
      'attr.type': node["attr.type"],
    };

    // Если у нас уже есть список свойств для целевой ноды, то добавляем в уже существующий Map,
    // иначе - создаем новый.
    if (awailableDataProperties.has(keyNode.for)) {
      const nodeProperties = awailableDataProperties.get(keyNode.for);

      // Если есть такое свойство - вывести ошибку, иначе - добавить!
      if (nodeProperties?.has(keyNode.id)) {
        throw new Error(
          `Дублирование свойства ${keyNode.id} для узла ${keyNode.for}!`
        );
      } else {
        nodeProperties?.set(keyNode.id, { 'attr.name': node["attr.name"], 'attr.type': node["attr.type"], } );
      }
    } else {
      awailableDataProperties.set(
        keyNode.for,
        new Map<string, CGMLKeyProperties>([[keyNode.id, { 'attr.name': node["attr.name"], 'attr.type': node["attr.type"], }]])
      );
    }
  }
}

let initialId = "";
const components_id = new Array<string>();

export function parseCGML(
  graphml: string,
): CGMLElements {
  initialId = '';
  components_id.splice(0);
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
    transitions: [],
    initialState: {
      target: '',
      position: { x: 0, y: 0 },
    },
    components: {},
    platform: '',
    meta: '',
    format: ''
  };

  const awailableDataProperties = new Map<
    string,
    Map<string, CGMLKeyProperties>
  >();

  const xml = parser.parse(graphml) as CGML;
  
  setFormatToMeta(elements, xml);
  
  addPropertiesFromKeyNode(xml, awailableDataProperties);
  
  switch (elements.format) {
    case "Cyberiada-GraphML": {
      const indexOfMetaNode = (
        xml.graphml.graph.node
      ).findIndex((node) => node.id === "");
      if (indexOfMetaNode !== -1) {
        processNode(
          elements,
          xml.graphml.graph.node[indexOfMetaNode],
          awailableDataProperties
        );
        xml.graphml.graph.node = (
          xml.graphml.graph.node
        ).filter((value) => value.id !== "");
        processGraph(
          elements,
          xml.graphml.graph,
          awailableDataProperties
        );
      } else {
        throw new Error("Отсутствует мета-узел!");
      }
      break;
    }
    default: {
      throw new Error(`ОШИБКА! НЕИЗВЕСТНЫЙ ФОРМАТ "${elements.format}"!`);
    }
  }
  return elements;
}

const data = parseCGML(`<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">

<data key="gFormat">Cyberiada-GraphML</data>
<key id="dName" for="node" attr.name="name" attr.type="string"/>
<key id="dData" for="edge" attr.name="data" attr.type="string"/>
<key id="dData" for="node" attr.name="data" attr.type="string"/>
<key id="dInitial" for="node" attr.name="initial" attr.type="string"/>
<key id="dGeometry" for="edge"/>
<key id="dGeometry" for="node"/>
<key id="dColor" for="edge"/>

<graph id="G" edgedefault="directed">
    <node id="">
        <data key="dName">ArduinoUno</data>
        <data key="dData">name/ Arduino-Blinker
description/ Включение и выключение лампочки по таймеру
        </data>
    </node>

    <node id="init">
        <data key="dInitial"></data>
        <data key="dGeometry" x="311" y="-94"></data>
    </node>
    
    <node id="LED1">
        <data key="dName">LED1</data>
        <data key="dData">type/ LED
name/ Светодиод
description/ Встроенный в плату светодиод, чтобы им мигать
pin/ 12
        </data>
    </node>

    <node id="timer1">
        <data key="dName">timer1</data>
        <data key="dData">type/ Timer
name/ Светодиод
description/ Программный таймер.
        </data>
    </node>

    <node id="diod1">
        <data key="dName">Включен</data>
        <data key="dData">entry/
LED1.on()
timer1.start(1000)
        </data>
        <data key="dGeometry" x="82" y="57"
            width="450.0" height="95" />
    </node>

    <node id="diod2">
        <data key="dName">Выключен</data>
        <data key="dData">entry/
LED1.off()
timer1.start(1000)
        </data>
        <data key="dGeometry" x="81" y="334"
            width="450" height="95" />
    </node>
    
    <edge source="" target="LED1"></edge>
    <edge source="" target="timer1"></edge>
    <edge source="init" target="diod1"></edge>
    <edge source="diod1" target="diod2">
        <data key="dData">timer1.timeout/</data>
        <data key="dColor">#F29727</data>
        <data key="dGeometry" x="457" y="173"/>
    </edge>

    <edge source="diod2" target="diod1">
        <data key="dData">timer1.timeout/</data>
        <data key="dGeometry" x="16" y="175"/>
        <data key="dColor">#F24C3D</data>
    </edge>

</graph>
</graphml>
`);

console.log(JSON.stringify(data, null, 2));

console.log('------------------------------------')

const data2 = parseCGML(`<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">

<data key="gFormat">Cyberiada-GraphML</data>

<key id="dName" for="node" attr.name="name" attr.type="string"/>
<key id="dData" for="edge" attr.name="data" attr.type="string"/>
<key id="dData" for="node" attr.name="data" attr.type="string"/>
<key id="dInitial" for="node" attr.name="initial" attr.type="string"/>
<key id="dGeometry" for="edge"/>
<key id="dGeometry" for="node"/>
<key id="dmyExtension" for="node"/>

<graph id="G" edgedefault="directed">

  <node id="">
    <data key="dName">BearlogaDefend</data>
    <data key="dData">name/ Автобортник
author/ Матросов В.М.
contact/ matrosov@mail.ru
description/ Пример описания схемы, 
который может быть многострочным, потому что так удобнее
unit/ Autoborder
    </data>
  </node>

  <node id="n0">
    <data key="dName">Бой</data>
    <data key="dData">entry/
exit/
</data>
<data key="dmyExtension"> really important information</data>
    <data key="dGeometry" x="-578.005" y="438.187256"
          width="672.532166" height="802.962646" />
    <graph>
      <node id="n0::n1">
        <data key="dName">Сближение</data>
        <data key="dData">entry/
МодульДвижения.ДвигатьсяКЦели()

exit/
</data>
        <data key="dGeometry" x="-525.738953" y="609.6686" 
              width="468" height="170" />    
      </node>
      <node id="n0::n2">
        <data key="dName">Атака</data>
        <data key="dData">entry/
ОружиеЦелевое.АтаковатьЦель()

exit/
</data>
        <data key="dGeometry" x="-630.2711" y="206.705933" 
              width="468" height="170" />
      </node>
    </graph>
  </node>
  <node id="n3">
    <data key="dName">Скан</data>
    <data key="dData">entry/
Сенсор.ПоискВрагаПоДистанции(мин)

exit/
Сенсор.ОстановкаПоиска()
</data>
    <data key="dGeometry" x="-1582.03857" y="606.497559" 
          width="468" height="330" />      
  </node>
  <node id="init">
    <data key="dInitial"></data>
    <data key="dGeometry" x="-1482.03857" y="606.497559" 
          width="20" height="20" />      
  </node>
  
  <edge source="init" target="n3"> </edge>
  <edge source="n0" target="n3">
    <data key="dData">АнализаторЦели.ЦельУничтожена/
</data>
  </edge>
  <edge source="n0" target="n3">
    <data key="dData">АнализаторЦели.ЦельПотеряна/
</data>
  </edge>
  <edge source="n3" target="n0::n1">
    <data key="dData">Сенсор.ЦельПолучена/
</data>
  </edge>
  <edge source="n0::n1" target="n0::n2">
      <data key="dData">ОружиеЦелевое.ЦельВошлаВЗонуАтаки/
</data>
  </edge>
  <edge source="n0::n2" target="n0::n1">
      <data key="dData">ОружиеЦелевое.ЦельВышлаИзЗоныАтаки/
</data>
  </edge>

</graph>

</graphml>
`)

console.log(JSON.stringify(data2, null, 2));
import { CGML, CGMLComponent, CGMLDataKey, CGMLElements, CGMLKeyNode, CGMLState, CGMLTransition } from "./types";
import { ExportCGML, ExportDataNode, ExportEdge, ExportGraph, ExportKeyNode, ExportNode } from "./export-types";
import { XMLBuilder } from "fast-xml-parser";

function getMetaNode(platform: string, meta: string): ExportNode {
  return {
    "@id": "",
    data: [
      {
        "@key": "dName",
        content: platform,
      },
      {
        "@key": "dData",
        content: meta,
      }
    ]
  }
}

function stateToExportNode(state: CGMLState, id: string): ExportNode {
  const exportNode: ExportNode = {
    "@id": id,
    data: [
      {
       "@key": "dName",
       content: state.name,         
      },
      {
        "@key": "dGeometry",
        "@width": state.bounds.width,
        "@height": state.bounds.height,
        "@x": state.bounds.x,
        "@y": state.bounds.y,
        content: '',
      },
      {
        "@key": "dData",
        content: state.actions,
      }
    ]
  };

  for (const dataNode of state.unsupportedDataNodes) { 
    exportNode.data.push(
      {
        "@key": dataNode.key,
        content: dataNode.content,
      }
    );
  }

  return exportNode;
}

function getExportNodes(states: { [id: string]: CGMLState }): ExportNode[] {
  const nodes: Map<string, ExportNode> = new Map<string, ExportNode>();

  const getExportNode = (stateId: string): ExportNode => {
    const node = nodes.get(stateId);
    if (node !== undefined) {
        return node;
      }
      else {
        return stateToExportNode(states[stateId], stateId);
      };
  };

  for (const stateId in states) {
    const state = states[stateId];
    const node: ExportNode = getExportNode(stateId);

    if (state.parent !== undefined) {
      const parent: ExportNode = getExportNode(state.parent);
      if (parent.graph !== undefined) {
        parent.graph.node.push(node);
      }
      else {
        parent.graph = {
          "@id": parent["@id"],
          node: [node],
          edge: [],
        }
      }
      nodes.set(state.parent, parent)
    }
    else {
      nodes.set(stateId, node);
    }
  }

  return [...nodes.values()];
}

function getComponentStates(components: {[id: string]: CGMLComponent }): ExportNode[] {
  const nodes: ExportNode[] = [];

  for (const componentId in components) {
    const component = components[componentId];
    nodes.push({
      "@id": component.id,
      data: [
        {
          "@key": "dName",
          content: component.id,
        },
        {
          "@key": "dData",
          content: component.parameters,
        }
      ],
    })
  }

  return nodes;
}

function getExportKeys(keys: Array<CGMLKeyNode>): ExportKeyNode[] {
  const exportKeyNodes: ExportKeyNode[] = [];

  for (const keyNode of keys) {
    exportKeyNodes.push(
      {
        "@attr.name": keyNode["attr.name"],
        "@attr.type": keyNode["attr.type"],
        "@for": keyNode.for,
        "@id": keyNode.id,
      }
    )
  }

  return exportKeyNodes;
}

function getComponentEdges(components: {[id: string]: CGMLComponent }): ExportEdge[] {
  const edges: ExportEdge[] = [];

  for (const componentId in components) {
    const component = components[componentId];
    edges.push({
      "@source": "",
      "@target": component.id,
      data: []
    })
  }

  return edges;
}

function getEdges(transitions: CGMLTransition[]): ExportEdge[] {
  const edges: ExportEdge[] = [];
  
  for (const transition of transitions) {
    const edge: ExportEdge = {
       "@source": transition.source,
       "@target": transition.target,
       data: [
        {
          "@key": "dData",
          content: transition.actions
        }
       ] 
      }
    
    if (transition.position !== undefined) {
      edge.data.push(
        {
          "@key": "dGeometry",
          "@x": transition.position.x,
          "@y": transition.position.y,
          content: '',
        },
      )
    }

    if (edge.data)
    for (const dataNode of transition.unsupportedDataNodes) {
      edge.data.push({
        "@key": dataNode.key,
        content: dataNode.content
      })
    }

    edges.push(edge);
  }

  return edges;
}

export function exportGraphml(elements: CGMLElements): string {
  const builder = new XMLBuilder({
    textNodeName: "content",
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    format: true,
  });
  const xml: ExportCGML = {
      "?xml": {
        "@version": "1.0",
        "@encoding": "UTF-8",
      },
      graphml: {
        "@xmlns": "http://graphml.graphdrawing.org/xmlns",
        data: {
          "@key": "gFormat",
          content: elements.format,
        },
        key: getExportKeys(elements.keys),
        graph: {
          "@id": "G",
          node: [ getMetaNode(elements.platform, elements.meta),
                  ...getExportNodes(elements.states), 
                  ...getComponentStates(elements.components)],
          edge: [...getEdges(elements.transitions), ...getComponentEdges(elements.components)],
        },
      }
  };

  return builder.build(xml);
}

console.log(
  exportGraphml({
      states: {
        "n0::n1": {
          name: "Сближение",
          bounds: {
            x: -525.738953,
            y: 609.6686,
            width: 468,
            height: 170
          },
          actions: "entry/\nМодульДвижения.ДвигатьсяКЦели()\n\nexit/",
          unsupportedDataNodes: [],
          parent: "n0"
        },
        "n0::n2": {
          name: "Атака",
          bounds: {
            x: -630.2711,
            y: 206.705933,
            width: 468,
            height: 170
          },
          actions: "entry/\nОружиеЦелевое.АтаковатьЦель()\n\nexit/",
          unsupportedDataNodes: [],
          parent: "n0"
        },
        n0: {
          name: "Бой",
          bounds: {
            x: -578.005,
            y: 438.187256,
            width: 672.532166,
            height: 802.962646
          },
          actions: "entry/\nexit/",
          unsupportedDataNodes: []
        },
        n3: {
          name: "Скан",
          bounds: {
            "x": -1582.03857,
            "y": 606.497559,
            "width": 468,
            "height": 330
          },
          actions: "entry/\nСенсор.ПоискВрагаПоДистанции(мин)\n\nexit/\nСенсор.ОстановкаПоиска()",
          unsupportedDataNodes: []
        }
      },
      transitions: [
        {
          source: "n0",
          target: "n3",
          actions: "АнализаторЦели.ЦельУничтожена/",
          unsupportedDataNodes: []
        },
        {
          source: "n0",
          target: "n3",
          actions: "АнализаторЦели.ЦельПотеряна/",
          unsupportedDataNodes: []
        },
        {
          source: "n3",
          target: "n0::n1",
          actions: "Сенсор.ЦельПолучена/",
          unsupportedDataNodes: []
        },
        {
          source: "n0::n1",
          target: "n0::n2",
          actions: "ОружиеЦелевое.ЦельВошлаВЗонуАтаки/",
          unsupportedDataNodes: []
        },
        {
          source: "n0::n2",
          target: "n0::n1",
          actions: "ОружиеЦелевое.ЦельВышлаИзЗоныАтаки/",
          unsupportedDataNodes: []
        }
      ],
      initialState: {
        target: "n3",
        position: {
          x: -1482.03857,
          y: 606.497559
        }
      },
      components: {},
      platform: "BearlogaDefend",
      meta: "name/ Автобортник\nauthor/ Матросов В.М.\ncontact/ matrosov@mail.ru\ndescription/ Пример описания схемы, \nкоторый может быть многострочным, потому что так удобнее\nunit/ Autoborder",
      format: "Cyberiada-GraphML",
      keys: [
        {
          id: "dName",
          for: "node",
          'attr.name': "name",
          'attr.type': "string",
        },
        {
          id: "dData",
          for: "edge",
          "attr.name": "data",
          "attr.type": "string",
        },
        {
          id: "dData",
          for: "node",
          "attr.name": "data",
          "attr.type": "string",
        },
        {
          id: "dInitial",
          for: "node",
          "attr.name": "initial",
          "attr.type": "string",
        },
        {
          id: "dGeometry",
          for: "edge",
          "attr.name": undefined,
          "attr.type": undefined,
        },
        {
          id: "dGeometry",
          for: "node",
          "attr.name": undefined,
          "attr.type": undefined,
        }
      ]
    })
)
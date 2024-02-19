import { CGML, CGMLComponent, CGMLDataKey, CGMLElements, CGMLKeyNode, CGMLState, CGMLTransition, InitialState } from "./types";
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

function getExportNodes(states: { [id: string]: CGMLState }, initialState: InitialState | null): ExportNode[] {
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

  if (initialState !== null) {
    nodes.set(initialState.id, {
      "@id": initialState.id,
      data: [{
        "@key": "dInitial",
        content: '',
      }]
    })
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
      }
    
    if (transition.actions !== undefined) {
      edge.data = [
        {
          "@key": "dData",
          content: transition.actions !== undefined ? transition.actions : ''
        }
       ] 
    }

    if (transition.position !== undefined) {
      edge.data?.push(
        {
          "@key": "dGeometry",
          "@x": transition.position.x,
          "@y": transition.position.y,
          content: '',
        },
      )
    }

    for (const dataNode of transition.unsupportedDataNodes) {
      edge.data?.push({
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
                  ...getExportNodes(elements.states, elements.initialState), 
                  ...getComponentStates(elements.components)],
          edge: [...getEdges(elements.transitions), ...getComponentEdges(elements.components)],
        },
      }
  };

  return builder.build(xml);
}

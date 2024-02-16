type ExportKeyNode = {
  "@id": string;
  "@for": string;
  "@attr.name"?: string;
  "@attr.type"?: string;
};

type ExportDataNode = {
  "@key": DataKey;
  "@x"?: number;
  "@y"?: number;
  "@width"?: number;
  "@height"?: number;
  content: string;
};

type ExportEdge = {
  "@source": string;
  "@target": string;
  data?: Array<ExportDataNode>;
};

type ExportGraph = {
  "@id": string;
  node: Array<ExportNode>;
  edge: Array<ExportEdge>;
};

type ExportNode = {
  "@id": string;
  data: Array<ExportDataNode>;
  graph?: ExportGraph;
};

function getArgsString(args: ArgList | undefined): string {
  if (args !== undefined) {
    return Object.values(args).join(", ");
  }

  return "";
}

function isVariable(object: any) {
  return object.component !== undefined;
}

function getOperandString(operand: Variable | string | Condition[] | number) {
  if (isVariable(operand)) {
    return `${(operand as Variable).component}.${(operand as Variable).method}`;
  } else {
    return operand;
  }
}

type Platforms = "ArduinoUno" | "BearlogaDefend";
type PlatformDataKeys = { [key in Platforms]: ExportKeyNode[] };
type ProcessDependPlatform = {
  [key in Platforms]: (
    elements: Elements,
    subplatform?: string
  ) => CyberiadaXML;
};
const PlatformKeys: PlatformDataKeys = {
  ArduinoUno: [
    {
      "@id": "dName",
      "@for": "node",
      "@attr.name": "name",
      "@attr.type": "string",
    },
    {
      "@id": "dData",
      "@for": "node",
      "@attr.name": "data",
      "@attr.type": "string",
    },
    {
      "@id": "dData",
      "@for": "edge",
      "@attr.name": "data",
      "@attr.type": "string",
    },
    {
      "@id": "dInitial",
      "@for": "node",
      "@attr.name": "initial",
      "@attr.type": "string",
    },
    {
      "@id": "dGeometry",
      "@for": "edge",
    },
    {
      "@id": "dGeometry",
      "@for": "node",
    },
    {
      "@id": "dColor",
      "@for": "edge",
    },
  ],
  BearlogaDefend: [
    {
      "@id": "dName",
      "@for": "node",
      "@attr.name": "name",
      "@attr.type": "string",
    },
    {
      "@id": "dData",
      "@for": "node",
      "@attr.name": "data",
      "@attr.type": "string",
    },
    {
      "@id": "dData",
      "@for": "edge",
      "@attr.name": "data",
      "@attr.type": "string",
    },
    {
      "@id": "dInitial",
      "@for": "node",
      "@attr.name": "initial",
      "@attr.type": "string",
    },
    {
      "@id": "dGeometry",
      "@for": "edge",
    },
    {
      "@id": "dGeometry",
      "@for": "node",
    },
  ],
};

type XMLNode = {
  "@version": string;
  "@encoding": string;
};

type GraphMLNode = {
  "@xmlns": string;
  data: ExportDataNode;
  key: ExportKeyNode[];
  graph: ExportGraph;
};

type CyberiadaXML = {
  "?xml": XMLNode;
  graphml: GraphMLNode;
};

// Пока что это копипаст, с небольшими изменениями
// Но, думаю, в целом это правильное решение разделить обработку каждой платформы
// TODO: Разбить этот монолит на функции
const processDependPlatform: ProcessDependPlatform = {
  ArduinoUno(elements: Elements): CyberiadaXML {
    const keyNodes = PlatformKeys.ArduinoUno;
    const description =
      "name/ Схема\ndescription/ Схема, сгенерированная с помощью Lapki IDE\n";
    const nodes: Map<string, ExportNode> = new Map<string, ExportNode>([
      [
        "",
        {
          "@id": "",
          data: [
            {
              "@key": "dName",
              content: "ArduinoUno",
            },
            {
              "@key": "dData",
              content: description,
            },
          ],
        },
      ],
    ]);

    const graph: ExportGraph = {
      "@id": "G",
      node: [],
      edge: [],
    };

    if (elements.initialState !== null) {
      graph.edge.push({
        "@source": "init",
        "@target": elements.initialState.target,
      });
      nodes.set("init", {
        "@id": "init",
        data: [
          {
            "@key": "dInitial",
            content: "",
          },
          {
            "@key": "dGeometry",
            "@x": elements.initialState.position.x,
            "@y": elements.initialState.position.y,
            "@width": 450,
            "@height": 95,
            content: "",
          },
        ],
      });
    }

    for (const component_idx in elements.components) {
      const component = elements.components[component_idx];
      let content = `type/ ${component.type}\n`;
      for (const parameter_idx in component.parameters) {
        const parameter = component.parameters[parameter_idx];
        content += `${parameter_idx}/ ${parameter}\n`;
      }

      nodes.set(component_idx, {
        "@id": component_idx,
        data: [
          {
            "@key": "dName",
            content: component_idx,
          },
          {
            "@key": "dData",
            content: content,
          },
        ],
      });
      const edge: ExportEdge = {
        "@source": "",
        "@target": component_idx,
      };
      graph.edge.push(edge);
    }
    for (const state_id in elements.states) {
      const state = elements.states[state_id];
      let node = nodes.get(state_id);
      if (node === undefined) {
        node = {
          "@id": state_id,
          data: [],
        };
      }

      node.data.push({
        "@key": "dName",
        content: state.name,
      });

      node.data.push({
        "@key": "dGeometry",
        "@x": state.bounds.x,
        "@y": state.bounds.y,
        "@width": state.bounds.width,
        "@height": state.bounds.height,
        content: "",
      });

      let content = "";

      for (const event of state.events) {
        let content_action = "";
        const component = event.trigger.component;
        const method = event.trigger.method;
        const args = getArgsString(event.trigger.args);
        let trigger = `${component}.${method}(${args})`;
        if (component === "System") {
          if (method === "onEnter") {
            trigger = "entry";
          } else if (method === "onExit") {
            trigger = "exit";
          }
        }

        for (const action of event.do) {
          content_action += `${action.component}.${
            action.method
          }(${getArgsString(action.args)})\n`;
        }

        content += `${trigger}/\n${content_action}\n`;
      }

      node.data.push({
        "@key": "dData",
        content: content,
      });

      if (state.parent !== undefined) {
        const parent = nodes.get(state.parent);
        if (parent !== undefined) {
          if (parent.graph !== undefined) {
            parent.graph.node.push(node);
          } else {
            parent.graph = {
              "@id": parent["@id"],
              node: [node],
              edge: [],
            };
          }
        } else {
          nodes.set(state.parent, {
            "@id": state.parent,
            data: [],
            graph: {
              "@id": state.parent,
              node: [node],
              edge: [],
            },
          });
        }
      } else {
        nodes.set(node["@id"], node);
      }
    }

    for (const transition of elements.transitions) {
      const edge: ExportEdge = {
        "@source": transition.source,
        "@target": transition.target,
        data: [],
      };
      edge.data?.push({
        "@key": "dGeometry",
        "@x": transition.position.x,
        "@y": transition.position.y,
        content: "",
      });
      edge.data?.push({
        "@key": "dColor",
        content: transition.color,
      });

      const trigger = `${transition.trigger.component}.${transition.trigger.method}`;
      let condition = "";
      if (transition.condition?.type !== undefined) {
        condition = `[${getOperandString(
          transition.condition.value[0].value
        )} ${invertOperatorAlias.get(
          transition.condition.type
        )} ${getOperandString(transition.condition.value[1].value)}]`;
      }

      let string_action = "";
      if (transition.do !== undefined) {
        for (const action of transition.do) {
          string_action += `${action.component}.${
            action.method
          }(${getArgsString(action.args)})\n`;
        }
      }
      edge.data?.push({
        "@key": "dData",
        content: `${trigger}${condition}/\n${string_action}`,
      });

      graph.edge.push(edge);
    }

    graph.node.push(...nodes.values());
    return {
      "?xml": {
        "@version": "1.0",
        "@encoding": "UTF-8",
      },
      graphml: {
        "@xmlns": "http://graphml.graphdrawing.org/xmlns",
        data: {
          "@key": "gFormat",
          content: "Cyberiada-GraphML",
        },
        key: keyNodes,
        graph: graph,
      },
    };
  },

  BearlogaDefend(elements: Elements, subplatform?: string): CyberiadaXML {
    const keyNodes = PlatformKeys.BearlogaDefend;
    let description = "";
    if (subplatform !== undefined) {
      description = `name/ Схема\ndescription/ Схема, сгенерированная с помощью Lapki IDE\nunit/ ${subplatform}`;
    } else {
      description = `name/ Схема\ndescription/ Схема, сгенерированная с помощью Lapki IDE\n`;
    }

    const nodes: Map<string, ExportNode> = new Map<string, ExportNode>([
      [
        "",
        {
          "@id": "",
          data: [
            {
              "@key": "dName",
              content: "BearlogaDefend",
            },
            {
              "@key": "dData",
              content: description,
            },
          ],
        },
      ],
    ]);

    const graph: ExportGraph = {
      "@id": "G",
      node: [],
      edge: [],
    };

    if (elements.initialState !== null) {
      graph.edge.push({
        "@source": "init",
        "@target": elements.initialState.target,
      });
      nodes.set("init", {
        "@id": "init",
        data: [
          {
            "@key": "dInitial",
            content: "",
          },
          {
            "@key": "dGeometry",
            "@x": elements.initialState.position.x,
            "@y": elements.initialState.position.y,
            "@width": 450,
            "@height": 95,
            content: "",
          },
        ],
      });
    }

    for (const state_id in elements.states) {
      const state = elements.states[state_id];
      let node = nodes.get(state_id);
      if (node === undefined) {
        node = {
          "@id": state_id,
          data: [],
        };
      }

      node.data.push({
        "@key": "dName",
        content: state.name,
      });

      node.data.push({
        "@key": "dGeometry",
        "@x": state.bounds.x,
        "@y": state.bounds.y,
        "@width": state.bounds.width,
        "@height": state.bounds.height,
        content: "",
      });

      let content = "";

      for (const event of state.events) {
        let content_action = "";
        const component = event.trigger.component;
        const method = event.trigger.method;
        const args = getArgsString(event.trigger.args);
        let trigger = `${component}.${method}(${args})`;
        if (component === "System") {
          if (method === "onEnter") {
            trigger = "entry";
          } else if (method === "onExit") {
            trigger = "exit";
          }
        }

        for (const action of event.do) {
          content_action += `${action.component}.${
            action.method
          }(${getArgsString(action.args)})\n`;
        }

        content += `${trigger}/\n${content_action}\n`;
      }

      node.data.push({
        "@key": "dData",
        content: content,
      });

      if (state.parent !== undefined) {
        const parent = nodes.get(state.parent);
        if (parent !== undefined) {
          if (parent.graph !== undefined) {
            parent.graph.node.push(node);
          } else {
            parent.graph = {
              "@id": parent["@id"],
              node: [node],
              edge: [],
            };
          }
        } else {
          nodes.set(state.parent, {
            "@id": state.parent,
            data: [],
            graph: {
              "@id": state.parent,
              node: [node],
              edge: [],
            },
          });
        }
      } else {
        nodes.set(node["@id"], node);
      }
    }

    for (const transition of elements.transitions) {
      const edge: ExportEdge = {
        "@source": transition.source,
        "@target": transition.target,
        data: [],
      };
      edge.data?.push({
        "@key": "dGeometry",
        "@x": transition.position.x,
        "@y": transition.position.y,
        content: "",
      });
      edge.data?.push({
        "@key": "dColor",
        content: transition.color,
      });

      const trigger = `${transition.trigger.component}.${transition.trigger.method}`;
      let condition = "";
      if (transition.condition?.type !== undefined) {
        condition = `[${getOperandString(
          transition.condition.value[0].value
        )} ${invertOperatorAlias.get(
          transition.condition.type
        )} ${getOperandString(transition.condition.value[1].value)}]`;
      }

      let string_action = "";
      if (transition.do !== undefined) {
        for (const action of transition.do) {
          string_action += `${action.component}.${action.method}\n`;
        }
      }
      edge.data?.push({
        "@key": "dData",
        content: `${trigger}${condition}/\n${string_action}`,
      });

      graph.edge.push(edge);
    }

    graph.node.push(...nodes.values());
    return {
      "?xml": {
        "@version": "1.0",
        "@encoding": "UTF-8",
      },
      graphml: {
        "@xmlns": "http://graphml.graphdrawing.org/xmlns",
        data: {
          "@key": "gFormat",
          content: "Cyberiada-GraphML",
        },
        key: keyNodes,
        graph: graph,
      },
    };
  },
};

export function exportGraphml(elements: Elements): string {
  const builder = new XMLBuilder({
    textNodeName: "content",
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    format: true,
  });
  let xml = {};
  if (elements.platform == "ArduinoUno") {
    xml = processDependPlatform.ArduinoUno(elements);
  } else if (elements.platform.startsWith("BearlogaDefend")) {
    const subplatform = elements.platform.split("-")[1];
    xml = processDependPlatform.BearlogaDefend(elements, subplatform);
  } else {
    console.log("Неизвестная платформа");
  }
  return builder.build(xml);
}
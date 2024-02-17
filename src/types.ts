type Point = { x: number; y: number };
type Rectangle = Point & { width: number; height: number };

export type CGMLState = {
  parent?: string;
  name: string;
  bounds: Rectangle;
  actions: string;
  unsupportedDataNodes: Array<CGMLDataNode>;
};

export type InitialState = {
  target: string;
  position: Point;
};

export type CGMLTransition = {
  //id: string;
  source: string;
  target: string;
  color?: string;
  position: Point;
  actions: string;
  unsupportedDataNodes: Array<CGMLDataNode>;
};

export type CGMLComponent = {
  id: string;
  parameters: string;
};

export type CGMLElements = {
  states: { [id: string]: CGMLState };
  transitions: CGMLTransition[];
  components: { [id: string]: CGMLComponent };
  initialState: InitialState | null;
  platform: string;
  meta: string;
  format: string;
}

export type CGMLNode = {
  id: string;
  data?: Array<CGMLDataNode>;
  graph?: CGMLGraph;
};

export type CGMLEdge = {
  source: string;
  target: string;
  data?: Array<CGMLDataNode>;
};

export type CGMLGraph = {
  node: Array<CGMLNode>;
  edge: Array<CGMLEdge>;
  edgedefault: string;
  id?: string;
};

export type CGMLKeyProperties = {
  'attr.name'?: string;
  'attr.type': string;
};

export type CGMLDataNode = {
  key: string;
  content: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type CGMLKeyNode = {
  id: string;
  for: string;
  'attr.name'?: string;
  'attr.type': string;
};

export type CGMLDataNodeProcess = {
  [key in CGMLDataKey]: (data: CGMLDataNodeProcessArgs) => void;
};

export const DataKeys = [
  "gFormat",
  "dData",
  "dName",
  "dInitial",
  "dGeometry",
  "dColor",
] as const;

export type CGMLDataKey = (typeof DataKeys)[number];

export interface CGMLDataNodeProcessArgs {
  elements: CGMLElements;
  meta?: string;
  node: CGMLDataNode;
  component?: CGMLComponent;
  parentNode?: CGMLNode;
  state?: CGMLState;
  transition?: CGMLTransition;
}

export type XMLProperies = {
  version: string,
  encoding: string
}

export type CGMLGraphmlNode = {
  xmlns: string,
  data: Array<CGMLDataNode>,
  key: Array<CGMLKeyNode>,
  graph: CGMLGraph,
}

export type CGML = {
  "?xml": XMLProperies,
  graphml: CGMLGraphmlNode
}
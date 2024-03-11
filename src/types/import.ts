export type CGMLPoint = { x: number; y: number };
export type CGMLRectangle = CGMLPoint & { width: number; height: number };

export type CGMLState = {
  parent?: string;
  name: string;
  bounds: CGMLRectangle;
  actions: string;
  unsupportedDataNodes: Array<CGMLDataNode>;
  color?: string;
};

export type CGMLInitialState = {
  transitionId: string;
  id: string;
  target: string;
  position?: CGMLPoint;
};

export type CGMLTransition = {
  id: string;
  source: string;
  target: string;
  color?: string;
  position?: CGMLPoint;
  actions?: string;
  unsupportedDataNodes: Array<CGMLDataNode>;
};

export type CGMLComponent = {
  id: string;
  transitionId: string;
  parameters: string;
};

export type CGMLElements = {
  states: { [id: string]: CGMLState };
  transitions: Record<string, CGMLTransition>;
  components: { [id: string]: CGMLComponent };
  initialState: CGMLInitialState | null;
  platform: string;
  meta: string;
  format: string;
  keys: Array<CGMLKeyNode>;
  notes: { [id: string]: CGMLNote };
};

export type CGMLNote = {
  position: CGMLPoint;
  text: string;
};

export type CGMLNode = {
  id: string;
  data?: Array<CGMLDataNode>;
  graph?: CGMLGraph;
};

export type CGMLEdge = {
  id: string;
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
  'attr.type'?: string;
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
  'attr.type'?: string;
};

export type CGMLDataNodeProcess = {
  [key in CGMLDataKey]: (data: CGMLDataNodeProcessArgs) => void;
};

export const CGMLDataKeys = [
  'gFormat',
  'dData',
  'dName',
  'dInitial',
  'dGeometry',
  'dColor',
  'dNote',
] as const;

export type CGMLDataKey = (typeof CGMLDataKeys)[number];

export interface CGMLDataNodeProcessArgs {
  elements: CGMLElements;
  meta?: string;
  node: CGMLDataNode;
  component?: CGMLComponent;
  parentNode?: CGMLNode;
  state?: CGMLState;
  transition?: CGMLTransition;
  note?: CGMLNote;
}

export type XMLProperies = {
  version: string;
  encoding: string;
};

export type CGMLGraphmlNode = {
  xmlns: string;
  data: Array<CGMLDataNode>;
  key: Array<CGMLKeyNode>;
  graph: CGMLGraph;
};

export type CGML = {
  '?xml': XMLProperies;
  graphml: CGMLGraphmlNode;
};

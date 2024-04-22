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

export type CGMLVertex = {
  type: string;
  data?: string;
  position?: CGMLPoint | CGMLRectangle;
};

// export type CGMLComponent = {
// id: string;
//   transitionId: string;
//   parameters: string;
// };

export type CGMLFinalState = {
  position: CGMLPoint;
};

export type CGMLChoice = {
  position: CGMLPoint;
};

export type CGMLTerminate = {
  position: CGMLPoint;
  exitCode: number;
};

export type CGMLMeta = {
  id: string;
  values: { [id: string]: string };
};

export type CGMLComponent = { [id: string]: string };

export type CGMLElements = {
  states: { [id: string]: CGMLState };
  transitions: Record<string, CGMLTransition>;
  components: { [id: string]: CGMLComponent };
  initialStates: { [id: string]: CGMLInitialState };
  platform: string;
  meta: CGMLMeta;
  format: string;
  keys: Array<CGMLKeyNode>;
  notes: { [id: string]: CGMLNote };
  finals: { [id: string]: CGMLVertex };
  choices: { [id: string]: CGMLVertex };
  terminates: { [id: string]: CGMLVertex };
};

export type NoteType = 'formal' | 'informal';

export type CGMLNote = {
  name: string | undefined;
  position: CGMLPoint;
  text: string;
  type: 'formal' | 'informal';
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

// export type VertexType = 'final' | 'initial' | 'terminate' | 'choice' | '';

export const CGMLDataKeys = [
  'gFormat',
  'dData',
  'dName',
  'dGeometry',
  'dColor',
  'dNote',
  'dVertex',
] as const;

export type CGMLDataKey = (typeof CGMLDataKeys)[number];

export interface CGMLDataNodeProcessArgs {
  elements: CGMLElements;
  meta?: string;
  node: CGMLDataNode;
  parentNode?: CGMLNode;
  state?: CGMLState;
  transition?: CGMLTransition;
  note?: CGMLNote;
  vertex?: CGMLVertex;
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

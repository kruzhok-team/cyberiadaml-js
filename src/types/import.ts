import { CGMLTextElements, CGMLTextState, CGMLTextTransition } from './text_import';

export type CGMLPoint = { x: number; y: number };
export type CGMLRectangle = CGMLPoint & { width: number; height: number };

export type CGMLTransitionAction = {
  trigger?: CGMLTransitionTrigger;
  action?: string;
};

type CGMLBaseTrigger = {
  postfix?: string; // propagate/block
  condition?: string;
};

export type CGMLTransitionTrigger = CGMLBaseTrigger & { event?: string };
export type CGMLTrigger = CGMLBaseTrigger & { event: string };

export type CGMLBaseState = {
  parent?: string;
  name: string;
  bounds: CGMLRectangle;
  actions: Array<CGMLAction>;
  unsupportedDataNodes: Array<CGMLDataNode>;
  color?: string;
};

export type CGMLAction = {
  trigger: CGMLTrigger;
  action?: string;
};

export type CGMLState = {
  parent?: string;
  name: string;
  bounds: CGMLRectangle;
  actions: Array<CGMLAction>;
  unsupportedDataNodes: Array<CGMLDataNode>;
  color?: string;
};

export type CGMLInitialState = {
  parent?: string;
  position?: CGMLPoint;
};

export type CGMLTransition = {
  id: string;
  source: string;
  target: string;
  color?: string;
  position?: CGMLPoint;
  labelPosition: CGMLPoint | undefined;
  actions: Array<CGMLTransitionAction>;
  unsupportedDataNodes: Array<CGMLDataNode>;
  pivot: string | undefined;
};

export type CGMLVertex = {
  parent?: string;
  type: string;
  data: string;
  position?: CGMLPoint | CGMLRectangle;
};

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

export type CGMLComponent = {
  id: string;
  type: string;
  parameters: { [id: string]: string };
};

export type CGMLElements = {
  states: { [id: string]: CGMLState };
  transitions: Record<string, CGMLTransition>;
  components: { [id: string]: CGMLComponent };
  initialStates: { [id: string]: CGMLVertex };
  platform: string;
  standardVersion: string;
  meta: CGMLMeta;
  format: string;
  keys: Array<CGMLKeyNode>;
  notes: { [id: string]: CGMLNote };
  finals: { [id: string]: CGMLVertex };
  choices: { [id: string]: CGMLVertex };
  terminates: { [id: string]: CGMLVertex };
  unknownVertexes: { [id: string]: CGMLVertex };
};

export type NoteType = 'formal' | 'informal';

export type CGMLNote = {
  name: string | undefined;
  position: CGMLPoint;
  text: string;
  type: NoteType;
  data?: string;
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
  rect: Array<CGMLRectangle> | undefined;
  point: Array<CGMLPoint> | undefined;
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
  'dPivot',
  'dLabelGeometry',
] as const;

export type CGMLDataKey = (typeof CGMLDataKeys)[number];

export interface CGMLDataNodeProcessArgs {
  elements: CGMLElements | CGMLTextElements;
  meta?: string;
  node: CGMLDataNode;
  parentNode?: CGMLNode;
  state?: CGMLState | CGMLTextState;
  transition?: CGMLTransition | CGMLTextTransition;
  note?: CGMLNote;
  vertex?: CGMLVertex;
  textMode: boolean;
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

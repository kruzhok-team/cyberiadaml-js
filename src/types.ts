type Point = { x: number; y: number };
type Rectangle = Point & { width: number; height: number };

export type CGMLState = {
  parent?: string;
  name: string;
  bounds: Rectangle;
  actions: string;
};

export type InitialState = {
  target: string;
  position: Point;
};

export type Variable = {
  component: string;
  method: string;
  args?: { [key: string]: string };
};

export type CGMLTransition = {
  //id: string;
  source: string;
  target: string;
  color?: string;
  position: Point;
  actions: string;
};

export type CGMLComponent = {
  parameters: string;
};

export type CGMLElements = {
  states: { [id: string]: CGMLState };
  transitions: CGMLTransition[];
  components: { [id: string]: CGMLComponent };
  initialState: InitialState | null;
  platform: string;
  meta: string;
}

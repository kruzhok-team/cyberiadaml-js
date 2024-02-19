export type ExportKeyNode = {
  "@id": string;
  "@for": string;
  "@attr.name"?: string;
  "@attr.type"?: string;
};

export type ExportDataNode = {
  "@key": string;
  "@x"?: number;
  "@y"?: number;
  "@width"?: number;
  "@height"?: number;
  content: string;
};

export type ExportEdge = {
  "@source": string;
  "@target": string;
//   id: string;
  data: Array<ExportDataNode>;
};

export type ExportGraph = {
  "@id": string;
  node: Array<ExportNode>;
  edge: Array<ExportEdge>;
};

export type ExportNode = {
  "@id": string;
  data: Array<ExportDataNode>;
  graph?: ExportGraph;
};

export type ExportXMLNode = {
  "@version": string;
  "@encoding": string;
};

export type ExportCGMLGraphmlNode = {
  "@xmlns": string;
  data: ExportDataNode;
  key: ExportKeyNode[];
  graph: ExportGraph;
};

export type ExportCGML = {
  "?xml": ExportXMLNode;
  graphml: ExportCGMLGraphmlNode;
};
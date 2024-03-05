import { CGMLPoint } from './import';

export type ExportKeyNode = {
  '@id': string;
  '@for': string;
  '@attr.name'?: string;
  '@attr.type'?: string;
};

export type ExportDataNode = {
  '@key': string;
  '@x'?: number;
  '@y'?: number;
  '@width'?: number;
  '@height'?: number;
  content: string;
};

export type ExportEdge = {
  '@id': string;
  '@source': string;
  '@target': string;
  data?: Array<ExportDataNode>;
};

export type ExportNote = {
  '@id': string;
  position: CGMLPoint;
  text: string;
};

export type ExportGraph = {
  '@id': string;
  node: Array<ExportNode>;
  edge: Array<ExportEdge>;
};

export type ExportNode = {
  '@id': string;
  data: Array<ExportDataNode>;
  graph?: ExportGraph;
};

export type ExportXMLNode = {
  '@version': string;
  '@encoding': string;
};

export type ExportCGMLGraphmlNode = {
  '@xmlns': string;
  data: ExportDataNode;
  key: ExportKeyNode[];
  graph: ExportGraph;
};

export type ExportCGML = {
  '?xml': ExportXMLNode;
  graphml: ExportCGMLGraphmlNode;
};

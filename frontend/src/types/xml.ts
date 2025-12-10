export interface XmlNode {
  tag: string;
  attributes: Record<string, string>;
  text: string | null;
  children: XmlNode[];
  path: string;
  xpath: string;
}

export interface XmlParseResponse {
  root: XmlNode;
  total_nodes: number;
  max_depth: number;
}

export interface XmlFlattenedRecord {
  path: string;
  tag: string;
  attributes: Record<string, string>;
  text: string | null;
}

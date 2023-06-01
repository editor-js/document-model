import { FormattingNodeData, FormattingNodeName } from '../FormattingNode';

export interface InlineNode {
  length: number;

  getText(start?: number, end?: number): string;

  format(name: FormattingNodeName, start?: number, end?: number, data?: FormattingNodeData): InlineNode[];

  insertText(text: string, index?: number): void;

  serialized: InlineNodeSerialized;
}

export interface InlineFragment {
  name: FormattingNodeName;
  data?: FormattingNodeData;
  range: [number, number];
}

export interface InlineNodeSerialized {
  text: string;
  fragments: InlineFragment[];
}

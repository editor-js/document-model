import { InlineToolData, InlineToolName } from '../FormattingNode';

export interface InlineNode {
  length: number;

  getText(start?: number, end?: number): string;

  format(name: InlineToolName, start?: number, end?: number, data?: InlineToolData): InlineNode[];

  insertText(text: string, index?: number): void;

  removeText(start?: number, end?: number): string;

  split(index?: number): InlineNode | null;

  serialized: InlineNodeSerialized;
}

export interface InlineFragment {
  tool: InlineToolName;
  data?: InlineToolData;
  range: [number, number];
}

export interface InlineNodeSerialized {
  text: string;
  fragments: InlineFragment[];
}

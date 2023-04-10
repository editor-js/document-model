import { DataKey } from './DataKey';
import { TextNode } from '../../TextNode';
import { ValueNode } from '../../ValueNode';
import { FormattingNode } from '../../FormattingNode';

export type BlockNodeChildren = Record<DataKey, ValueNode | (FormattingNode | TextNode)[]>;

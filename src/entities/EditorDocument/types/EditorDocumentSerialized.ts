import { BlockNodeSerialized } from '../../BlockNode/types';
import { Properties } from './Properties';

export interface EditorDocumentSerialized {
    blocks: BlockNodeSerialized[];
    properties: Properties;
}

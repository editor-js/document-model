import { BlockTuneSerialized } from '../../BlockTune';
import { ValueSerialized } from '../../ValueNode/types';
import { TextNodeSerialized } from '../../inline-fragments';

/**
 * Union type of serialized BlockNode child nodes
 */
export type BlockChildNodeSerialized = ValueSerialized | TextNodeSerialized;

/**
 * Reccurrent type representing serialized BlockNode data
 */
export type BlockNodeDataSerializedValue = BlockChildNodeSerialized | BlockChildNodeSerialized[] | BlockNodeDataSerialized | BlockNodeDataSerialized[];

/**
 * Root type representing serialized BlockNode data
 */
export interface BlockNodeDataSerialized {
  [key: string]: BlockNodeDataSerializedValue;
}


/**
 * Serialized version of the BlockNode
 */
export interface BlockNodeSerialized {
  /**
   * The name of the tool created a Block
   */
  name: string;

  /**
   * The content of the Block
   */
  data: BlockNodeDataSerialized;

  /**
   * Serialized BlockTunes associated with the BlockNode
   */
  tunes?: Record<string, BlockTuneSerialized>;
}

import { BlockTuneSerialized } from '../../BlockTune';

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
  data: Record<string, unknown>; // @todo replace unknown type with serialized root node and value node

  /**
   * Serialized BlockTunes associated with the BlockNode
   */
  tunes: Record<string, BlockTuneSerialized>;
}

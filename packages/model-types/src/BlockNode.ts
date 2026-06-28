import type { TextNodeSerialized } from './Text.js';
import type { ValueSerialized } from './Value.js';
import type { BlockTuneSerialized } from './BlockTune.js';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type BlockChildNodeSerialized = ValueSerialized | TextNodeSerialized;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type BlockNodeDataSerializedValue = BlockChildNodeSerialized | BlockChildNodeSerialized[] | BlockNodeDataSerialized | BlockNodeDataSerialized[];

/** Record mapping data keys to serialized block child values */
export interface BlockNodeDataSerialized {
  [key: string]: BlockNodeDataSerializedValue;
}

/** Describes a block with its id, tool name, data and optional tunes */
export interface BlockData {
  /** Block identifier */
  id: string;
  /** Tool name used to render the block */
  name: string;
  /** Block content data */
  data: BlockNodeDataSerialized;
  /** Optional block tune data */
  tunes?: Record<string, BlockTuneSerialized>;
}

/** Minimum data required to initialise a block */
export interface BlockNodeInitBase {
  /** Tool name to use for the block */
  name: string;
}

/** Partial block data used for initialisation */
export type BlockNodeInit = BlockNodeInitBase & Partial<Omit<BlockData, 'name'>>;

/** Serialized version of a block node (alias for BlockData) */
export type BlockNodeSerialized = BlockData;

import { BlockNode } from '../BlockNode';
import { BlockTuneConstructorParameters, BlockTuneName, createBlockTuneName } from './types';

/**
 * BlockTune class represents a set of additional information associated with a BlockNode.
 * This information can be used by a BlockTool to modify the behavior of the BlockNode.
 */
export class BlockTune {
  /**
   * Private field representing the name of the tune
   */
  #name: BlockTuneName;

  /**
   * Private field representing any additional data associated with the tune
   */
  #data: Record<string, unknown>;

  /**
   * Private field representing the BlockNode associated with this tune
   */
  #block: BlockNode;

  /**
   * Constructor for BlockTune class.
   *
   * @param args - BlockTune constructor arguments.
   * @param args.name - The name of the tune.
   * @param args.data - Any additional data associated with the tune.
   * @param args.block - The BlockNode associated with this tune.
   */
  constructor({ name, data, block }: BlockTuneConstructorParameters) {
    this.#name = name;
    this.#data = data;
    this.#block = block;
  }
}

export {
  BlockTuneName,
  createBlockTuneName
};

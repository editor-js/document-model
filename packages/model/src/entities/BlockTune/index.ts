import { getContext } from '../../utils/Context.js';
import { IndexBuilder } from '../Index/IndexBuilder.js';
import type { BlockTuneConstructorParameters, BlockTuneSerialized, BlockTuneName } from './types';
import { createBlockTuneName } from './types/index.js';
import { EventBus } from '../../EventBus/EventBus.js';
import { TuneModifiedEvent } from '../../EventBus/events/index.js';

/**
 * BlockTune class represents a set of additional information associated with a BlockNode.
 * This information can be used by a BlockTool to modify the behavior of the BlockNode.
 */
export class BlockTune extends EventBus {
  /**
   * Private field representing the name of the tune
   */
  #name: BlockTuneName;

  /**
   * Private field representing any additional data associated with the tune
   */
  #data: Record<string, unknown>;

  /**
   * Constructor for BlockTune class.
   *
   * @param args - BlockTune constructor arguments.
   * @param args.name - The name of the tune.
   * @param args.data - Any additional data associated with the tune.
   */
  constructor({ name, data = {} }: BlockTuneConstructorParameters) {
    super();

    this.#name = name;
    this.#data = data;
  }

  /**
   * Updates data associated with the tune.
   *
   * @param key - The key of the data to update
   * @param value - The value to update the data with
   */
  public update(key: string, value: unknown): void {
    const previousValue = this.#data[key];

    this.#data[key] = value;

    const builder = new IndexBuilder();

    builder.addTuneKey(key);

    this.dispatchEvent(
      new TuneModifiedEvent(builder.build(), {
        value: this.#data[key],
        previous: previousValue,
      }, getContext<string | number>()!)
    );
  }

  /**
   * Returns serialized version of the BlockTune.
   */
  public get serialized(): BlockTuneSerialized {
    return this.#data;
  }
}

export type { BlockTuneName };
export { createBlockTuneName };

export type {
  BlockTuneSerialized
};

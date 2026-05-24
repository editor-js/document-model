import type { BlockId, DataKey } from '@editorjs/model';
import { injectable } from 'inversify';

/**
 * A registry that maps (blockId, dataKey) pairs to their DOM input elements.
 *
 * Inputs are stored in a Map keyed by BlockId, so inserting or removing a block
 * is a single O(1) Map operation — no positional shifting needed.
 */
@injectable()
export class InputsRegistry {
  /**
   * Key = block id. Each entry is a (dataKey → element) map for that block.
   */
  #inputs: Map<BlockId, Map<DataKey, HTMLElement>> = new Map();

  /**
   * Registers (or replaces) an input element for a given block + data key.
   * @param blockId - unique id of the block
   * @param dataKey - data key of the input within the block
   * @param element - the DOM element to register
   */
  public register(blockId: BlockId, dataKey: DataKey, element: HTMLElement): void {
    let blockMap = this.#inputs.get(blockId);

    if (blockMap === undefined) {
      blockMap = new Map();
      this.#inputs.set(blockId, blockMap);
    }

    blockMap.set(dataKey, element);
  }

  /**
   * Removes the registration for a specific input.
   * If no dataKey is given, removes all inputs for the block.
   * @param blockId - unique id of the block
   * @param dataKey - optional specific data key to unregister
   */
  public unregister(blockId: BlockId, dataKey?: DataKey): void {
    if (dataKey === undefined) {
      this.#inputs.delete(blockId);

      return;
    }

    this.#inputs.get(blockId)?.delete(dataKey);
  }

  /**
   * Looks up a single input by block id and data key.
   * @param blockId - unique id of the block
   * @param dataKey - data key of the input
   */
  public getInput(blockId: BlockId, dataKey: DataKey): HTMLElement | undefined {
    return this.#inputs.get(blockId)?.get(dataKey);
  }

  /**
   * Returns all inputs for a block as a (dataKey → element) map.
   * @param blockId - unique id of the block
   */
  public getBlockInputs(blockId: BlockId): Map<DataKey, HTMLElement> | undefined {
    return this.#inputs.get(blockId);
  }

  /**
   * Returns all registered entries as an iterable of [blockId, dataKey, element] tuples.
   * Useful for CaretAdapter to iterate all inputs during selection mapping.
   * @yields
   */
  public *entries(): Iterable<[BlockId, DataKey, HTMLElement]> {
    for (const [blockId, keyMap] of this.#inputs) {
      for (const [dataKey, element] of keyMap) {
        yield [blockId, dataKey, element];
      }
    }
  }

  /**
   * Reserves a slot for a new block. No-op if the block is already registered
   * (the slot is created lazily on first {@link register} call anyway).
   * @param blockId - unique id of the new block
   */
  public insertBlock(blockId: BlockId): void {
    if (!this.#inputs.has(blockId)) {
      this.#inputs.set(blockId, new Map());
    }
  }

  /**
   * Removes all registered inputs for the given block.
   * @param blockId - unique id of the removed block
   */
  public removeBlock(blockId: BlockId): void {
    this.#inputs.delete(blockId);
  }
}

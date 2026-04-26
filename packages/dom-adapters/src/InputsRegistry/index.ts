import type { DataKey } from '@editorjs/model';
import { injectable } from 'inversify';

/**
 * A registry that maps (blockIndex, dataKey) pairs to their DOM input elements.
 *
 * Inputs are stored in an array indexed by block position, so inserting or
 * removing a block is a single Array.splice() call — no manual key-shifting needed.
 */
@injectable()
export class InputsRegistry {
  /**
   * Index = block position. Each entry is a (dataKey → element) map for that block.
   */
  #inputs: Map<DataKey, HTMLElement>[] = [];

  /**
   * Registers (or replaces) an input element for a given block + data key.
   *
   * @param blockIndex - position of the block in the document
   * @param dataKey - data key of the input within the block
   * @param element - the DOM element to register
   */
  public register(blockIndex: number, dataKey: DataKey, element: HTMLElement): void {
    if (this.#inputs[blockIndex] === undefined) {
      this.#inputs[blockIndex] = new Map();
    }

    this.#inputs[blockIndex].set(dataKey, element);
  }

  /**
   * Removes the registration for a specific input.
   * If no dataKey is given, removes all inputs for the block.
   *
   * @param blockIndex - position of the block
   * @param dataKey - optional specific data key to unregister
   */
  public unregister(blockIndex: number, dataKey?: DataKey): void {
    if (dataKey === undefined) {
      this.#inputs.splice(blockIndex, 1);

      return;
    }

    this.#inputs[blockIndex]?.delete(dataKey);
  }

  /**
   * Looks up a single input by block index and data key.
   *
   * @param blockIndex - position of the block
   * @param dataKey - data key of the input
   */
  public getInput(blockIndex: number, dataKey: DataKey): HTMLElement | undefined {
    return this.#inputs[blockIndex]?.get(dataKey);
  }

  /**
   * Returns all inputs for a block as a (dataKey → element) map.
   *
   * @param blockIndex - position of the block
   */
  public getBlockInputs(blockIndex: number): Map<DataKey, HTMLElement> | undefined {
    return this.#inputs[blockIndex];
  }

  /**
   * Returns all registered entries as an iterable of [blockIndex, dataKey, element] tuples.
   * Useful for CaretAdapter to iterate all inputs during selection mapping.
   *
   * @yields
   */
  public *entries(): Iterable<[number, DataKey, HTMLElement]> {
    for (let blockIndex = 0; blockIndex < this.#inputs.length; blockIndex++) {
      const keyMap = this.#inputs[blockIndex];

      if (keyMap === undefined) {
        continue;
      }

      for (const [dataKey, element] of keyMap) {
        yield [blockIndex, dataKey, element];
      }
    }
  }

  /**
   * Inserts an empty slot at blockIndex, shifting all subsequent blocks up by one.
   * Call this before registering inputs for a newly inserted block.
   *
   * @param blockIndex - position of the new block
   */
  public insertBlock(blockIndex: number): void {
    this.#inputs.splice(blockIndex, 0, new Map());
  }

  /**
   * Removes the slot at blockIndex, shifting all subsequent blocks down by one.
   * Call this when a block is removed from the document.
   *
   * @param blockIndex - position of the removed block
   */
  public removeBlock(blockIndex: number): void {
    this.#inputs.splice(blockIndex, 1);
  }
}

import type { BlockId } from '@editorjs/model-types';

/**
 * Error thrown when attempting to add a block whose id already exists in the document.
 */
export class BlockAlreadyExistsError extends Error {
  /**
   * @param blockId - The id of the block that already exists
   */
  constructor(blockId: BlockId) {
    super(`EditorDocument: block with id "${blockId}" already exists`);
    this.name = 'BlockAlreadyExistsError';
  }
}

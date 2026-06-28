import type { BlockData, DocumentData, Index, ModelEvents, ModifiedEventData } from '@editorjs/model-types';

/**
 * Parameters for insertData and removeData methods
 */
export interface InsertRemoveDataParams {
  /** User identifier attributed to the change */
  userId: string | number | undefined;
  /** Position in the document tree where data should be inserted or removed */
  index: Index;
  /** Text or blocks to insert or remove */
  data: string | BlockData[];
}

/**
 * Parameters for modifyData method
 */
export interface ModifyDataParams {
  /** User identifier attributed to the change */
  userId: string | number | undefined;
  /** Position in the document tree where data should be modified */
  index: Index;
  /** Modification data containing current and previous values */
  data: ModifiedEventData;
}

/**
 * Document API interface
 * Provides methods to work with Editor's document object
 */
export interface DocumentAPI {
  /**
   * Returns serialized document object
   */
  get data(): DocumentData;

  /**
   * Registers model's update callback. Returns a cleanup function
   * @param callback - callback called on model update
   */
  onUpdate(callback: (event: ModelEvents) => void): () => void;

  /**
   * Inserts data at the specified index
   * @param params - insert operation parameters
   */
  insertData(params: InsertRemoveDataParams): void;

  /**
   * Removes data at the specified index
   * @param params - remove operation parameters
   */
  removeData(params: InsertRemoveDataParams): void;

  /**
   * Modifies data at the specified index
   * @param params - modify operation parameters
   */
  modifyData(params: ModifyDataParams): void;

  /**
   * Undoes the last change in the document
   */
  undo(): void;

  /**
   * Redoes the last undone change in the document
   */
  redo(): void;
}

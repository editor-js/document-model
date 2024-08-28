import type { Index } from '@editorjs/model';

/**
 * Type of the operation
 */
export enum OperationType {
  Insert = 'insert',
  Delete = 'delete',
  Modify = 'modify'
}

/**
 * Data for the operation
 */
export interface OperationData {
  /**
   * Value before the operation
   */
  prevValue: string;

  /**
   * Value after the operation
   */
  newValue: string;
}


/**
 * Class representing operation on the document model tree
 */
export class Operation {
  /**
   * Operation type
   */
  public type: OperationType;

  /**
   * Index in the document model tree
   */
  public index: Index;

  /**
   * Operation data
   */
  public data: OperationData;

  /**
   * Creates an instance of Operation
   *
   * @param type - operation type
   * @param index - index in the document model tree
   * @param data - operation data
   */
  constructor(type: OperationType, index: Index, data: OperationData) {
    this.type = type;
    this.index = index;
    this.data = data;
  }
}

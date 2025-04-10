import { IndexBuilder, type Index, type BlockNodeSerialized } from '@editorjs/model';

/**
 * Type of the operation
 */
export enum OperationType {
  Insert = 'insert',
  Delete = 'delete',
  Modify = 'modify'
}

/**
 * Operation payload could be string (for Text operations), or serialized Block data (for Block operations)
 */
type OperationPayload = string | BlockNodeSerialized;

/**
 * Data for the operation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface InsertOrDeleteOperationData<T extends OperationPayload = any> {
  /**
   * Operation payload
   */
  payload: ArrayLike<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModifyOperationData<T extends Record<any, any> = Record<any, any>> {
  /**
   * Previous payload for undo/redo purposes
   */
  payload?: T | null;

  /**
   * Previous payload for undo/redo purposes
   */
  prevPayload?: T | null;
}

/**
 * Serialized operation object
 */
export interface SerializedOperation<T extends OperationType = OperationType> {
  /**
   * Operation type
   */
  type: T;

  /**
   * Serialized index of the operation
   */
  index: string;

  /**
   * Operation data
   */
  data: OperationTypeToData<T>;

  /**
   * Revision of the document operation was applied at
   */
  rev: number;

  /**
   * Identifier of the user who caused the change
   */
  userId: string | number;
}

/**
 * Helper type to convert operation type to operation data interface
 */
export type OperationTypeToData<T extends OperationType> = T extends OperationType.Modify
  ? ModifyOperationData
  : InsertOrDeleteOperationData;

/**
 * Helper type to get invert operation type
 */
export type InvertedOperationType<T extends OperationType> = T extends OperationType.Insert
  ? OperationType.Delete
  : T extends OperationType.Delete
    ? OperationType.Insert
    : OperationType.Modify;


/**
 * Class representing operation on the document model tree
 */
export class Operation<T extends OperationType = OperationType> {
  /**
   * Operation type
   */
  public type: T;

  /**
   * Index in the document model tree
   */
  public index: Index;

  /**
   * Operation data
   */
  public data: OperationTypeToData<T>;

  /**
   * Identifier of a user who created an operation;
   */
  public userId: string | number;

  /**
   * Document revision on which operation was applied
   */
  public rev?: number;

  /**
   * Creates an instance of Operation
   *
   * @param type - operation type
   * @param index - index in the document model tree
   * @param data - operation data
   * @param userId - user identifier
   * @param rev - document revision
   */
  constructor(type: T, index: Index, data: OperationTypeToData<T>, userId: string | number, rev?: number) {
    this.type = type;
    this.index = index;
    this.data = data;
    this.userId = userId;
    this.rev = rev;
  }

  /**
   * Creates an operation from another operation or serialized operation
   *
   * @param op - operation to copy
   */
  public static from<T extends OperationType>(op: Operation<T>): Operation<T>;
  /**
   * Creates an operation from another operation or serialized operation
   *
   * @param json - serialized operation to copy
   */
  public static from<T extends OperationType>(json: SerializedOperation<T>): Operation<T>;
  /**
   * Creates an operation from another operation or serialized operation
   *
   * @param opOrJSON - operation or serialized operation to copy
   */
  public static from<T extends OperationType>(opOrJSON: Operation<T> | SerializedOperation<T>): Operation<T> {
    let index: Index;

    /**
     * Because of TypeScript guards we need to use an if statement here
     */
    if (typeof opOrJSON.index === 'string') {
      index = new IndexBuilder().from(opOrJSON.index)
        .build();
    } else {
      index = new IndexBuilder().from(opOrJSON.index)
        .build();
    }

    return new Operation(opOrJSON.type, index, opOrJSON.data, opOrJSON.userId, opOrJSON.rev);
  }

  /**
   * Returns an inverted operation
   */
  public inverse(): Operation<InvertedOperationType<T>> {
    const index = this.index;

    switch (this.type) {
      case OperationType.Insert: {
        const data = this.data as InsertOrDeleteOperationData;

        return new Operation(OperationType.Delete, index, data, this.userId) as Operation<InvertedOperationType<T>>;
      }
      case OperationType.Delete: {
        const data = this.data as InsertOrDeleteOperationData;

        return new Operation(OperationType.Insert, index, data, this.userId) as Operation<InvertedOperationType<T>>;
      }
      case OperationType.Modify: {
        const data = this.data as ModifyOperationData;

        return new Operation(OperationType.Modify, index, {
          payload: data.prevPayload,
          prevPayload: data.payload,
        }, this.userId) as Operation<InvertedOperationType<T>>;
      }

      default:
        throw Error('Unsupported operation type');
    }
  }

  /**
   * Transforms the operation against another operation
   *
   * @param againstOp - operation to transform against
   */
  public transform(againstOp: Operation): Operation<T> {
    /**
     * Do not transform operations if they are on different documents
     */
    if (this.index.documentId !== againstOp.index.documentId) {
      return this;
    }

    /**
     * Do not transform if the againstOp index is greater or if againstOp is Modify op
     */
    if (!this.#shouldTransform(againstOp.index) || againstOp.type === OperationType.Modify) {
      return this;
    }

    const newIndexBuilder = new IndexBuilder().from(this.index);

    switch (againstOp.type) {
      case OperationType.Insert: {
        const payload = (againstOp as Operation<OperationType.Insert>).data.payload;

        if (againstOp.index.isBlockIndex) {
          newIndexBuilder.addBlockIndex(this.index.blockIndex! + payload.length);

          break;
        }

        newIndexBuilder.addTextRange([this.index.textRange![0] + payload.length, this.index.textRange![1] + payload.length]);

        break;
      }

      case OperationType.Delete: {
        const payload = (againstOp as Operation<OperationType.Delete>).data.payload;

        if (againstOp.index.isBlockIndex) {
          newIndexBuilder.addBlockIndex(this.index.blockIndex! - payload.length);

          break;
        }

        newIndexBuilder.addTextRange([this.index.textRange![0] - payload.length, this.index.textRange![1] - payload.length]);

        break;
      }

      default:
        throw new Error('Unsupported operation type');
    }

    const operation = Operation.from(this);

    operation.index = newIndexBuilder.build();

    return operation;
  }

  /**
   * Serializes an operation
   */
  public serialize(): SerializedOperation {
    return {
      type: this.type,
      index: this.index.serialize(),
      data: this.data,
      userId: this.userId,
      rev: this.rev!,
    };
  }

  /**
   * Checks if operation needs to be transformed:
   * 1. If relative operation (againstOp) happened in the block before or at the same index of the Block of _this_ operation
   * 2. If relative operation happened in the same block and same data key and before the text range of _this_ operation
   *
   * @param indexToCompare - index of a relative operation
   */
  #shouldTransform(indexToCompare: Index): boolean {
    if (indexToCompare.isBlockIndex && this.index.blockIndex !== undefined) {
      return indexToCompare.blockIndex! <= this.index.blockIndex;
    }

    if (indexToCompare.isTextIndex && this.index.isTextIndex) {
      return indexToCompare.dataKey === this.index.dataKey && indexToCompare.textRange![0] <= this.index.textRange![0];
    }

    return false;
  }
}

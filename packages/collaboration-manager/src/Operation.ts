import { IndexBuilder, type Index, type BlockNodeSerialized } from '@editorjs/model';
import { OperationsTransformer } from './OperationsTransformer';

/**
 * Type of the operation
 */
export enum OperationType {
  Insert = 'insert',
  Delete = 'delete',
  Modify = 'modify',
  Neutral = 'neutral',
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

export interface NeutralOperationData {
  /**
   * Payload for neutral operation could be anything, we dont care about it
   */
  payload: string | BlockNodeSerialized[];
};

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
  : T extends OperationType.Neutral
    ? NeutralOperationData 
    : InsertOrDeleteOperationData;

/**
 * Helper type to get invert operation type
 */
export type InvertedOperationType<T extends OperationType> = T extends OperationType.Insert
  ? OperationType.Delete
  : T extends OperationType.Delete
    ? OperationType.Insert
    : T extends OperationType.Neutral
      ? OperationType.Neutral
      : OperationType.Modify;


/**
 * Class representing operation on the document model tree
 */
export class Operation<T extends OperationType = OperationType> {
  /**
   * Operation type
   */
  public type: T | OperationType.Neutral;

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
   * Transformer for operations
   */
  #transformer: OperationsTransformer = new OperationsTransformer();

  /**
   * Creates an instance of Operation
   *
   * @param type - operation type
   * @param index - index in the document model tree
   * @param data - operation data
   * @param userId - user identifier
   * @param rev - document revision
   */
  constructor(type: T | OperationType.Neutral, index: Index, data: OperationTypeToData<T> | OperationTypeToData<OperationType.Neutral>, userId: string | number, rev?: number) {
    this.type = type;
    this.index = index;
    this.data = data as OperationTypeToData<T>;
    this.userId = userId;
    this.rev = rev;
  }

  /**
   * Creates an operation from another operation or serialized operation
   *
   * @param op - operation to copy
   */
  public static from<T extends OperationType>(op: Operation<T> | Operation<OperationType.Neutral>): Operation<T>;
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
   * If operation is not transformable returns null
   *
   * @param againstOp - operation to transform against
   */
  public transform<K extends OperationType>(againstOp: Operation<K> | Operation<OperationType.Neutral>): Operation<T | OperationType.Neutral> {
    return this.#transformer.transform(this, againstOp);
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
}

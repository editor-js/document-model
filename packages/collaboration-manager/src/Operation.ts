import { IndexBuilder, type Index } from '@editorjs/model';

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

   /**
   * Makes an inverse operation
   */
   public inverse(): Operation {
    const index = this.index;

    switch (this.type) {
      case OperationType.Insert:

        const textRange = index.textRange;

        if (textRange == undefined) {
          throw new Error('Unsupported index');
        }

        const [ textRangeStart ] = textRange;

        const newIndex = new IndexBuilder()
          .from(index)
          .addTextRange([textRangeStart, textRangeStart + this.data.newValue.length])
          .build();

        return new Operation(OperationType.Delete, newIndex, {
          prevValue: this.data.newValue,
          newValue: this.data.prevValue,
        });
      case OperationType.Delete:
        return new Operation(OperationType.Insert, index, {
          prevValue: this.data.newValue,
          newValue: this.data.prevValue,
        });
      case OperationType.Modify:
        return new Operation(OperationType.Modify, index, {
          prevValue: this.data.newValue,
          newValue: this.data.prevValue,
        });
    }
  }

  public transform(againstOp: Operation): Operation {
    if (!this.index.isTextIndex || !againstOp.index.isTextIndex) {
      throw new Error('Unsupported index');
    }

    if (this.type === OperationType.Modify || againstOp.type === OperationType.Modify) {
      throw new Error('Unsupported operation type');
    }

    /**
     * Do not transform operations if they are on different blocks or documents
     */
    if (this.index.documentId !== againstOp.index.documentId || this.index.blockIndex !== againstOp.index.blockIndex) {
      return this;
    }

    const [ receivedStartIndex ] = this.index.textRange!;
    const [ localStartIndex ] = againstOp.index.textRange!;

    switch (true) {
      case this.type === OperationType.Insert && againstOp.type === OperationType.Insert:
        if (receivedStartIndex <= localStartIndex) {
          return this;
        } else {
          return this.shiftOperation(againstOp.data.newValue.length);
        }

      case this.type === OperationType.Delete && againstOp.type === OperationType.Delete:
        if (receivedStartIndex < localStartIndex) {
          return this;
        } else if (receivedStartIndex > localStartIndex) {
          return this.shiftOperation(-againstOp.data.prevValue.length);
        } else {
          // If both delete at the same index, adjust the length of deletion
          const minLength = Math.min(this.data.prevValue.length, againstOp.data.prevValue.length);

          return new Operation(OperationType.Delete, this.index, {
            prevValue: this.data.prevValue.slice(minLength),
            newValue: '',
          });
        }

      case this.type === OperationType.Insert && againstOp.type === OperationType.Delete:
        if (receivedStartIndex <= localStartIndex) {
          return this;
        } else {
          return this.shiftOperation(-againstOp.data.prevValue.length);
        }

      case this.type === OperationType.Delete && againstOp.type === OperationType.Insert:
        if (receivedStartIndex < localStartIndex) {
          return this;
        } else {
          return this.shiftOperation(againstOp.data.newValue.length);
        }

      default:
        throw new Error('Unsupported operation type');
    }
  }

  /**
   *
   * @param shift
   */
  private shiftOperation(shift: number): Operation {
    if (!this.index.isTextIndex) {
      throw new Error('Unsupported index');
    }

    const [ textRangeStart ] = this.index.textRange!;

    return new Operation(
      this.type,
      new IndexBuilder().from(this.index)
        .addTextRange([textRangeStart + shift, textRangeStart + shift])
        .build(),
      this.data
    );
  }
}

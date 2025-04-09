import { type ModifyOperationData, type Operation, OperationType } from '@editorjs/collaboration-manager';
import { type BlockNodeSerialized, type EditorDocumentSerialized, EditorJSModel } from '@editorjs/model';

/**
 * Class to process operations and aplly them to the document state
 */
export class DocumentManager {
  /**
   * Array of applied operations
   */
  #operations: Operation[] = [];

  /**
   * Current document revision
   */
  #currentRev = 0;

  /**
   * Editor model with the current document state
   */
  #model: EditorJSModel;

  /**
   * DocumentManager constructor function
   * @param identifier - identifier of the document to manage
   */
  constructor(identifier: string) {
    this.#model = new EditorJSModel('server', { identifier });
  }

  /**
   * Return current document revision
   */
  public get currentRev(): number {
    return this.#currentRev;
  }

  /**
   * Process new operation
   * - Transform relative to operations in stack if needed
   * - Puts operation to the operations array
   * - Updates models state
   * @todo ensure the operations are processed consequently
   * @param operation - operation from the client to process
   */
  public process(operation: Operation): Operation | null {
    if (operation.rev! > this.#currentRev) {
      console.error('Operation rejected due to incorrect revision %o', operation);

      return null;
    }

    const conflictingOps = this.#operations.filter(op => op.rev! >= operation.rev!);
    const transformedOp = conflictingOps.reduce((result, op) => result.transform(op), operation);

    transformedOp.rev = this.#currentRev;

    this.#currentRev += 1;

    this.#operations.push(transformedOp);

    this.#applyOperationToModel(transformedOp);

    return transformedOp;
  }

  /**
   * Return serialised current state of the document
   */
  public currentModelState(): EditorDocumentSerialized {
    return this.#model.serialized;
  }

  /**
   * Applies operation to the model
   * @param operation - operation to apply
   */
  #applyOperationToModel(operation: Operation): void {
    switch (operation.type) {
      case OperationType.Insert:
        this.#model.insertData(operation.userId, operation.index, operation.data.payload as string | BlockNodeSerialized[]);
        break;
      case OperationType.Delete:
        this.#model.removeData(operation.userId, operation.index, operation.data.payload as string | BlockNodeSerialized[]);
        break;
      case OperationType.Modify:
        this.#model.modifyData(operation.userId, operation.index, {
          value: operation.data.payload,
          previous: (operation.data as ModifyOperationData).prevPayload,
        });
        break;
      default:
        throw new Error('Unknown operation type');
    }
  }
}

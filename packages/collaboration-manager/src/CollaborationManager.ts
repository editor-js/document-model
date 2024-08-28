import type { EditorJSModel, ModelEvents } from '@editorjs/model';
import { EventType, TextAddedEvent, TextRemovedEvent } from '@editorjs/model';
import { Operation, OperationType } from './Operation.js';

/**
 * CollaborationManager listens to EditorJSModel events and applies operations
 */
export class CollaborationManager {
  /**
   * EditorJSModel instance to listen to and apply operations
   */
  #model: EditorJSModel;

  /**
   * Creates an instance of CollaborationManager
   *
   * @param model - EditorJSModel instance to listen to and apply operations
   */
  constructor(model: EditorJSModel) {
    this.#model = model;
    model.addEventListener(EventType.Changed, this.#handleEvent.bind(this));
  }

  /**
   * Applies operation to the model
   *
   * @param operation - operation to apply
   */
  public applyOperation(operation: Operation): void {
    const { blockIndex, dataKey, textRange } = operation.index;

    if (blockIndex == undefined || dataKey == undefined || textRange == undefined) {
      throw new Error('Unsupported index');
    }

    switch (operation.type) {
      case OperationType.Insert:
        this.#model.insertText(blockIndex, dataKey, operation.data.newValue);
        break;
      case OperationType.Delete:
        this.#model.removeText(blockIndex, dataKey, textRange[0], textRange[1]);
        break;
      case OperationType.Modify:
        console.log('modify operation is not implemented yet');
        // this.#model.insertText(blockIndex, dataKey, operation.data.newValue);
        break;
      default:
        throw new Error('Unknown operation type');
    }
  }

  /**
   * Handles EditorJSModel events
   *
   * @param e - event to handle
   */
  #handleEvent(e: ModelEvents): void {
    let operation: Operation | null = null;

    switch (true) {
      case (e instanceof TextAddedEvent):
        operation = new Operation(OperationType.Insert, e.detail.index, {
          prevValue: '',
          newValue: e.detail.data,
        });
        break;
      case (e instanceof TextRemovedEvent):
        operation = new Operation(OperationType.Delete, e.detail.index, {
          prevValue: e.detail.data,
          newValue: '',
        });
        break;
      default:
        console.error('Unknown event type', e);
    }
    console.log('operation', operation);
  }
}

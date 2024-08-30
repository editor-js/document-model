import type { EditorJSModel, ModelEvents } from '@editorjs/model';
import { EventType, TextAddedEvent, TextRemovedEvent } from '@editorjs/model';
import { Operation, OperationType } from './Operation.js';
import { UndoRedoManager } from './UndoRedoManager.js';

/**
 * CollaborationManager listens to EditorJSModel events and applies operations
 */
export class CollaborationManager {
  /**
   * EditorJSModel instance to listen to and apply operations
   */
  #model: EditorJSModel;

  /**
   * UndoRedoManager instance to manage undo/redo operations
   */
  #undoRedoManager: UndoRedoManager;

  /**
   * Flag to control whether events should be handled to avoid putting operations to the stack on undo/redo. Used for preventing operations infinity loop on undo/redo
   */
  #shouldHandleEvents = true;


  /**
   * Creates an instance of CollaborationManager
   *
   * @param model - EditorJSModel instance to listen to and apply operations
   */
  constructor(model: EditorJSModel) {
    this.#model = model;
    this.#undoRedoManager = new UndoRedoManager();
    model.addEventListener(EventType.Changed, this.#handleEvent.bind(this));
  }

  /**
   * Undo last operation in the local stack
   */
  public undo(): void {
    const operation = this.#undoRedoManager.undo();

    if (operation === undefined) {
      return;
    }

    // Disable event handling
    this.#shouldHandleEvents = false;

    this.applyOperation(operation);

    // Re-enable event handling
    this.#shouldHandleEvents = true;
  }

  /**
   * Redo last undone operation in the local stack
   */
  public redo(): void {
    const operation = this.#undoRedoManager.redo();

    if (operation === undefined) {
      return;
    }

    // Disable event handling
    this.#shouldHandleEvents = false;

    this.applyOperation(operation);

    // Re-enable event handling
    this.#shouldHandleEvents = true;
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
        this.#model.insertData(operation.index, operation.data.newValue);
        break;
      case OperationType.Delete:
        this.#model.removeData(operation.index);
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
    if (!this.#shouldHandleEvents) {
      return;
    }
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

    if (operation !== null) {
      this.#undoRedoManager.put(operation);
    }
  }
}

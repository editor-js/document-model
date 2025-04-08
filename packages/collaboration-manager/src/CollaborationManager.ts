import {
  BlockAddedEvent, type BlockNodeSerialized,
  BlockRemovedEvent,
  type EditorJSModel,
  EventType,
  type ModelEvents,
  TextAddedEvent,
  TextFormattedEvent, TextRemovedEvent,
  TextUnformattedEvent
} from '@editorjs/model';
import { type ModifyOperationData, Operation, OperationType } from './Operation.js';
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
    switch (operation.type) {
      case OperationType.Insert:
        this.#model.insertData(operation.index, operation.data.payload as string | BlockNodeSerialized[]);
        break;
      case OperationType.Delete:
        this.#model.removeData(operation.index, operation.data.payload as string | BlockNodeSerialized[]);
        break;
      case OperationType.Modify:
        this.#model.modifyData(operation.index, {
          value: operation.data.payload,
          previous: (operation.data as ModifyOperationData).prevPayload,
        });
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

    /**
     * @todo add all model events
     */
    switch (true) {
      case (e instanceof TextAddedEvent):
        operation = new Operation(OperationType.Insert, e.detail.index, {
          payload: e.detail.data,
        });
        break;
      case (e instanceof TextRemovedEvent):
        operation = new Operation(OperationType.Delete, e.detail.index, {
          payload: e.detail.data,
        });
        break;
      case (e instanceof TextFormattedEvent):
        operation = new Operation(OperationType.Modify, e.detail.index, {
          payload: e.detail.data,
          prevPayload: null,
        });
        break;
      case (e instanceof TextUnformattedEvent):
        operation = new Operation(OperationType.Modify, e.detail.index, {
          prevPayload: e.detail.data,
          payload: null,
        });
        break;
      case (e instanceof BlockAddedEvent):
        operation = new Operation(OperationType.Insert, e.detail.index, {
          payload: [ e.detail.data ],
        });
        break;
      case (e instanceof BlockRemovedEvent):
        operation = new Operation(OperationType.Delete, e.detail.index, {
          payload: [ e.detail.data ],
        });
        break;
      // Stryker disable next-line ConditionalExpression
      default:
        // Stryker disable next-line StringLiteral
        console.error('Unknown event type', e);
    }

    if (operation !== null) {
      this.#undoRedoManager.put(operation);
    }
  }
}

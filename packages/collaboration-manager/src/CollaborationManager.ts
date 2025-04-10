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
import type { CoreConfig } from '@editorjs/sdk';
import { OTClient } from './client/index.js';
import { OperationsBatch } from './OperationsBatch.js';
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
   * Current operations batch
   */
  #currentBatch: OperationsBatch | null = null;

  /**
   * Editor's config
   */
  #config: Required<CoreConfig>;

  /**
   * OT Client
   */
  #client: OTClient | null = null;

  /**
   * Creates an instance of CollaborationManager
   *
   * @param config - Editor's config
   * @param model - EditorJSModel instance to listen to and apply operations
   */
  constructor(config: Required<CoreConfig>, model: EditorJSModel) {
    this.#config = config;
    this.#model = model;
    this.#undoRedoManager = new UndoRedoManager();
    model.addEventListener(EventType.Changed, this.#handleEvent.bind(this));
  }

  /**
   * Connects to OT server
   */
  public connect(): void {
    if (this.#config.collaborationServer === undefined) {
      return;
    }

    this.#client = new OTClient(
      this.#config.collaborationServer,
      this.#config.userId,
      (data) => {
        if (!data) {
          return;
        }

        this.#model.initializeDocument(data);
      },
      (op) => {
        this.applyOperation(op);
      }
    );

    void this.#client.connectDocument(this.#model.serialized);
  }

  /**
   * Undo last operation in the local stack
   */
  public undo(): void {
    this.#currentBatch?.terminate();

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
    this.#currentBatch?.terminate();

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
        }, e.detail.userId);
        break;
      case (e instanceof TextRemovedEvent):
        operation = new Operation(OperationType.Delete, e.detail.index, {
          payload: e.detail.data,
        }, e.detail.userId);
        break;
      case (e instanceof TextFormattedEvent):
        operation = new Operation(OperationType.Modify, e.detail.index, {
          payload: e.detail.data,
          prevPayload: null,
        }, e.detail.userId);
        break;
      case (e instanceof TextUnformattedEvent):
        operation = new Operation(OperationType.Modify, e.detail.index, {
          prevPayload: e.detail.data,
          payload: null,
        }, e.detail.userId);
        break;
      case (e instanceof BlockAddedEvent):
        operation = new Operation(OperationType.Insert, e.detail.index, {
          payload: [ e.detail.data ],
        }, e.detail.userId);
        break;
      case (e instanceof BlockRemovedEvent):
        operation = new Operation(OperationType.Delete, e.detail.index, {
          payload: [ e.detail.data ],
        }, e.detail.userId);
        break;
      // Stryker disable next-line ConditionalExpression
      default:
        // Stryker disable next-line StringLiteral
        console.error('Unknown event type', e);
    }

    if (operation === null) {
      return;
    }

    if (operation.userId === this.#config.userId) {
      void this.#client?.send(operation);
    } else {
      return;
    }

    const onBatchTermination = (batch: OperationsBatch, lastOp?: Operation): void => {
      const effectiveOp = batch.getEffectiveOperation();

      if (effectiveOp) {
        this.#undoRedoManager.put(effectiveOp);
      }

      /**
       * lastOp is the operation on which the batch was terminated.
       * So if there is one, we need to create a new batch
       *
       * lastOp could be null if the batch was terminated by time out
       */
      this.#currentBatch = lastOp === undefined ? null : new OperationsBatch(onBatchTermination, lastOp);
    };

    if (this.#currentBatch === null) {
      this.#currentBatch = new OperationsBatch(onBatchTermination, operation);

      return;
    }

    this.#currentBatch.add(operation);
  }
}

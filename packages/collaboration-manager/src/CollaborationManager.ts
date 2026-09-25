import {
  BlockAddedEvent, type BlockNodeSerialized,
  BlockRemovedEvent,
  type ModelEvents,
  TextAddedEvent,
  TextFormattedEvent, TextRemovedEvent,
  TextUnformattedEvent
} from '@editorjs/sdk';
import type {
  UndoCoreEvent,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  RedoCoreEvent
} from '@editorjs/sdk';
import {
  CoreEventType,
  PluginType
} from '@editorjs/sdk';
import { OTClient } from './client/index.js';
import { BatchedOperation } from './BatchedOperation.js';
import { type ModifyOperationData, Operation, OperationType } from './Operation.js';
import { UndoRedoManager } from './UndoRedoManager.js';

const DEBOUNCE_TIMEOUT = 500;

/**
 * CollaborationManager is a Plugin that listens to document API events and applies operations.
 * It also manages undo/redo history and a connection to an OT server.
 */
export class CollaborationManager implements EditorjsPlugin {
  /**
   * Plugin type
   */
  public static readonly type = PluginType.Plugin;

  /**
   * Plugin name used to identify the plugin across the editor
   */
  public static readonly name = 'collaboration';

  /**
   * Editor API instance used to interact with the document
   */
  #api: EditorAPI;

  /**
   * UndoRedoManager instance to manage undo/redo operations
   */
  #undoRedoManager: UndoRedoManager;

  /**
   * Flag to control whether events should be handled to avoid putting operations to the stack on undo/redo.
   * Used for preventing operations infinity loop on undo/redo
   */
  #shouldHandleEvents = true;

  /**
   * Current operations batch
   */
  #currentBatch: BatchedOperation<OperationType> | null = null;

  /**
   * OT Client
   */
  #client: OTClient | null = null;

  /**
   * Debounce timer to move current batch to undo stack after a delay
   */
  #debounceTimer?: ReturnType<typeof setTimeout>;

  /**
   * Cleanup callback for document updates listener
   */
  #unsubscribeDocumentUpdates?: () => void;

  /**
   * Cleanup callback for undo event listener
   */
  #unsubscribeUndo?: () => void;

  /**
   * Cleanup callback for redo event listener
   */
  #unsubscribeRedo?: () => void;

  /**
   * Cleanup callback for ready event listener
   */
  #unsubscribeReady?: () => void;

  /**
   * Editor's config
   */
  #config: EditorjsPluginParams['config'];

  /**
   * Creates an instance of CollaborationManager plugin
   * @param params - plugin constructor parameters
   */
  constructor(params: EditorjsPluginParams) {
    const { api, config, eventBus } = params;

    this.#api = api;
    this.#config = config;
    this.#undoRedoManager = new UndoRedoManager();

    const onUndo = (e: UndoCoreEvent): void => {
      e.preventDefault();

      this.undo();
    };
    const onRedo = (e: RedoCoreEvent): void => {
      e.preventDefault();

      this.redo();
    };
    const onReady = (): void => {
      this.#connect();
    };

    this.#unsubscribeDocumentUpdates = api.document.onUpdate(this.#handleEvent.bind(this));

    eventBus.addEventListener(`core:${CoreEventType.Undo}`, onUndo);
    this.#unsubscribeUndo = () => void eventBus.removeEventListener(`core:${CoreEventType.Undo}`, onUndo);

    eventBus.addEventListener(`core:${CoreEventType.Redo}`, onRedo);
    this.#unsubscribeRedo = () => void eventBus.removeEventListener(`core:${CoreEventType.Redo}`, onRedo);

    eventBus.addEventListener(`core:${CoreEventType.Ready}`, onReady);
    this.#unsubscribeReady = () => void eventBus.removeEventListener(`core:${CoreEventType.Ready}`, onReady);
  }

  /**
   * Undo last operation in the local stack
   */
  public undo(): void {
    this.#putBatchToUndo();

    const operation = this.#undoRedoManager.undo();

    if (operation === undefined) {
      return;
    }

    // Disable  handling
    this.#shouldHandleEvents = false;

    this.applyOperation(operation);

    // Re-enable event handling
    this.#shouldHandleEvents = true;
  }

  /**
   * Redo last undone operation in the local stack
   */
  public redo(): void {
    this.#putBatchToUndo();

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
   * Applies operation to the document via API
   * @param operation - operation to apply
   */
  public applyOperation(operation: Operation | BatchedOperation): void {
    /**
     * If operation is a batcher operation, apply all operations in the batch
     */
    if (operation instanceof BatchedOperation) {
      operation.operations.forEach(op => this.applyOperation(op));

      return;
    }

    if (operation.type === OperationType.Neutral) {
      return;
    }

    switch (operation.type) {
      case OperationType.Insert:
        this.#api.document.insertData({
          userId: operation.userId,
          index: operation.index,
          data: operation.data.payload as string | BlockNodeSerialized[],
        });
        break;
      case OperationType.Delete:
        this.#api.document.removeData({
          userId: operation.userId,
          index: operation.index,
          data: operation.data.payload as string | BlockNodeSerialized[],
        });
        break;
      case OperationType.Modify:
        this.#api.document.modifyData({
          userId: operation.userId,
          index: operation.index,
          data: {
            value: operation.data.payload,
            previous: (operation.data as ModifyOperationData).prevPayload,
          },
        });
        break;
      default:
        throw new Error('Unknown operation type');
    }
  }

  /**
   * Handles document update events
   * @param e - model event to handle
   */
  #handleEvent(e: ModelEvents): void {
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
          payload: [e.detail.data],
        }, e.detail.userId);
        break;
      case (e instanceof BlockRemovedEvent):
        operation = new Operation(OperationType.Delete, e.detail.index, {
          payload: [e.detail.data],
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

    /**
     * If operation is local, send it to the server
     */
    if (operation.userId === this.#config.userId) {
      void this.#client?.send(operation);
    } else {
      this.#putBatchToUndo();

      /**
       * If operation is remote, transform undo/redo stacks
       */
      this.#undoRedoManager.transformStacks(operation);

      return;
    }

    if (!this.#shouldHandleEvents) {
      return;
    }

    /**
     * If there is no current batch, create a new one with current operation
     */
    if (this.#currentBatch === null) {
      this.#currentBatch = new BatchedOperation(operation);
      this.#debounce();

      return;
    }

    /**
     * If current operation could not be added to the batch, then terminate current batch and create a new one with current operation
     */
    if (!this.#currentBatch.canAdd(operation)) {
      this.#putBatchToUndo();

      this.#currentBatch = new BatchedOperation(operation);
      this.#debounce();

      return;
    }

    this.#currentBatch.add(operation);
    this.#debounce();
  }

  /**
   * Connects to the OT server if a collaboration server is configured
   */
  #connect(): void {
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

        this.#api.blocks.render(data);
      },
      (op) => {
        this.applyOperation(op);
      }
    );

    void this.#client.connectDocument(this.#api.document.data);
  }

  /**
   * Puts current batch to the undo stack and clears the batch
   */
  #putBatchToUndo(): void {
    if (this.#currentBatch !== null) {
      this.#undoRedoManager.put(this.#currentBatch);

      this.#currentBatch = null;
    }
  }

  /**
   * Debouneces timer of #putBatchToUndo method
   */
  #debounce(): void {
    clearTimeout(this.#debounceTimer);

    this.#debounceTimer = setTimeout(() => {
      this.#putBatchToUndo();
    }, DEBOUNCE_TIMEOUT);
  }

  /**
   * Destroys the plugin instance: clears the debounce timer
   */
  public destroy(): void {
    clearTimeout(this.#debounceTimer);
    this.#unsubscribeDocumentUpdates?.();
    this.#unsubscribeUndo?.();
    this.#unsubscribeRedo?.();
    this.#unsubscribeReady?.();
    this.#client?.close();
    this.#client = null;
  }
}

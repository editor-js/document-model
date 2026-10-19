import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import { EditorJSModel } from '@editorjs/model';
import {
  BlockIndex,
  type BlockNodeSerialized,
  CoreConfigValidated,
  CoreEventType,
  EventAction,
  EventBus,
  EventPayloadBase,
  EventType,
  type ModelEvents,
  ModifiedEventData,
  RedoCoreEvent,
  UndoCoreEvent,
  TextIndex
} from '@editorjs/sdk';
import { TOKENS } from '../tokens.js';

/**
 * Timeout in milliseconds to debounce grouping of consecutive operations.
 * All events that occur within this window are merged into a single undo step.
 */
const DEBOUNCE_TIMEOUT = 500;

/**
 * UndoRedoManager is a core component that provides local undo/redo history
 * for single-user editing.
 *
 * It listens to document model events directly, groups consecutive changes into
 * debounced steps, and re-applies or inverts them through the Editor API when
 * undo/redo is requested.
 *
 * Events are first buffered per browser task: all changes a single user action makes
 * synchronously (e.g. a block split on Enter, or a paste) end up in one undo step,
 * while single changes per task (typing) keep the consecutive-text batching.
 *
 * This component is intentionally designed for single-user scenarios only and
 * has no dependency on Operational-Transformation (OT) infrastructure.
 */
@injectable()
export class UndoRedoManager {
  /**
   * Editor Model instance to apply undo/redo operations back to the document.
   */
  #model: EditorJSModel;

  /**
   * Editor's EventBus instance
   */
  #eventBus: EventBus;

  /**
   * Editor configuration (provides the current user id).
   */
  #config: CoreConfigValidated;

  /**
   * Stack of events or batches that can be undone.
   * Each entry is an ordered list of events applied in one debounce window.
   */
  #undoStack: EventPayloadBase<EventAction>[][] = [];

  /**
   * Stack of events or batches that can be redone.
   */
  #redoStack: EventPayloadBase<EventAction>[][] = [];

  /**
   * Array that temporarily stores current batched group of events
   * On timeout or not batchable event form the Model, this array is being put to undo stack (see #putBatchToundo method)
   */
  #batch: EventPayloadBase<EventAction>[] | null = null;

  /**
   * Timer handle for the debounce flush.
   */
  #debounceTimer?: ReturnType<typeof setTimeout>;

  /**
   * Local events dispatched during the current browser task, not yet added to a batch
   */
  #taskEvents: EventPayloadBase<EventAction>[] = [];

  /**
   * Timer handle that fires once the current browser task (and its microtasks) is over
   */
  #taskTimer?: ReturnType<typeof setTimeout>;

  /**
   * Flag to properly handling events that are triggered by undo/redo operations
   */
  #isApplying = false;

  /**
   * Undo Core Event listener. Stored to be removed on destroy
   * @param event - undo core event
   */
  #undoListener = (event: UndoCoreEvent): void => {
    if (event.defaultPrevented) {
      return;
    }

    this.undo();
  };

  /**
   * Redo Core Event listener. Stored to be removed on destroy
   * @param event - redo core event
   */
  #redoListener = (event: RedoCoreEvent): void => {
    if (event.defaultPrevented) {
      return;
    }

    this.redo();
  };

  /**
   * Model updates listener. Stored to be removed on destroy
   * @param e - model event
   */
  #modelUpdatesListener = (e: ModelEvents): void => {
    this.#handleEvent(e);
  };

  /**
   * UndoRedoManager constructor.
   * All parameters are injected through the IoC container.
   * @param model - Editor's Document Model instance
   * @param eventBus - Editor's EventBus instance
   * @param config - Editor validated configuration
   */
  constructor(
    model: EditorJSModel,
    eventBus: EventBus,
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated
  ) {
    this.#config = config;
    this.#model = model;
    this.#eventBus = eventBus;

    model.addEventListener(EventType.Changed, this.#modelUpdatesListener);

    eventBus.addEventListener(`core:${CoreEventType.Undo}`, this.#undoListener);
    eventBus.addEventListener(`core:${CoreEventType.Redo}`, this.#redoListener);
  }

  /**
   * Undoes the last recorded group of events.
   * Flushes the current task and debounce group first so they are included in the step.
   */
  public undo(): void {
    this.#closeTask();
    this.#putBatchToUndo();

    const events = this.#undoStack.pop();

    if (events === undefined) {
      return;
    }

    this.#isApplying = true;

    try {
      events.forEach(e => this.#apply(e));
    } finally {
      this.#isApplying = false;
    }

    this.#redoStack.push(events.map(e => this.#inverse(e)).reverse());
  }

  /**
   * Redoes the last undone group of events.
   */
  public redo(): void {
    this.#closeTask();
    this.#putBatchToUndo();

    const events = this.#redoStack.pop();

    if (events === undefined) {
      return;
    }

    this.#isApplying = true;

    try {
      events.forEach(e => this.#apply(e));
    } finally {
      this.#isApplying = false;
    }

    this.#undoStack.push(events.map(this.#inverse).reverse());
  }

  /**
   * Releases resources held by the manager (the pending debounce timer).
   */
  public destroy(): void {
    clearTimeout(this.#debounceTimer);
    clearTimeout(this.#taskTimer);
    this.#taskEvents = [];
    this.#eventBus.removeEventListener(`core:${CoreEventType.Undo}`, this.#undoListener);
    this.#eventBus.removeEventListener(`core:${CoreEventType.Redo}`, this.#redoListener);
    this.#model.removeEventListener(EventType.Changed, this.#modelUpdatesListener);
  }

  /**
   * Applies inverted event back to the document
   * @param event - event to apply
   */
  #apply(event: EventPayloadBase<EventAction>): void {
    switch (event.action) {
      case EventAction.Added:
      case EventAction.Removed: {
        /**
         * Block events carry a single serialized block, while the model inserts and removes blocks as a list
         */
        const data = event.index instanceof BlockIndex
          ? [event.data as BlockNodeSerialized]
          : event.data as string;

        /**
         * @todo currently undo of deleting forward sets the caret in the wrong place
         */
        this.#model[event.action === EventAction.Removed ? 'insertData' : 'removeData'](
          event.userId,
          event.index,
          data
        );
        break;
      }
      case EventAction.Modified:
        this.#model.modifyData(
          event.userId,
          event.index,
          {
            value: (event as EventPayloadBase<EventAction.Modified, ModifiedEventData>).data.previous,
            previous: (event as EventPayloadBase<EventAction.Modified, ModifiedEventData>).data.value,
          }
        );
        break;
    }
  }

  /**
   * Inverse event action type
   * @param event - event to inverse
   */
  #inverse(event: EventPayloadBase<EventAction>): EventPayloadBase<EventAction> {
    let newAction;
    let newPayload = event.data;

    switch (event.action) {
      case EventAction.Added:
        newAction = EventAction.Removed;
        break;
      case EventAction.Removed:
        newAction = EventAction.Added;
        break;
      case EventAction.Modified:
        newAction = EventAction.Modified;
        newPayload = {
          previous: (event.data as ModifiedEventData).value,
          value: (event.data as ModifiedEventData).previous,
        } as ModifiedEventData;
        break;
    }

    return {
      ...event,
      action: newAction,
      data: newPayload,
    };
  }

  /**
   * Receives a raw model event and buffers it for the current browser task
   * if it belongs to the current user.
   * @param e - model event emitted by EditorJSModel
   */
  #handleEvent(e: ModelEvents): void {
    if (this.#isApplying) {
      return;
    }

    const { detail } = e;

    /**
     * Internal history manager doesn't support remote changes
     */
    if (detail.userId !== this.#config.userId) {
      return;
    }

    this.#redoStack = [];

    this.#taskEvents.push(detail);

    /**
     * The first event of a task schedules the task's end.
     * Zero-delay timeout runs after the current task and all its microtasks
     */
    if (this.#taskEvents.length === 1) {
      this.#taskTimer = setTimeout(() => this.#closeTask(), 0);
    }
  }

  /**
   * Adds events of the finished browser task to the batch.
   * A single event is batched by the consecutive-text rule (typing).
   * Several events are a single user action, so they always start a new batch
   */
  #closeTask(): void {
    clearTimeout(this.#taskTimer);

    const events = this.#taskEvents;

    if (events.length === 0) {
      return;
    }

    this.#taskEvents = [];

    if (events.length === 1 && this.#canAddToBatch(events[0])) {
      this.#batch!.push(events[0]);
    } else {
      this.#putBatchToUndo();
      this.#batch = events;
    }

    this.#debounce();
  }

  /**
   * Checks if the given event can be added to the current batch
   * Events are batched only for insert and remove text operations if they:
   * 1. The same type (text inserted or removed)
   * 2. Have consecutive indexes
   * @param payload - event to check
   */
  #canAddToBatch(payload: EventPayloadBase<EventAction>): boolean {
    const lastEvent = this.#batch?.[this.#batch?.length - 1];

    if (lastEvent === undefined) {
      return false;
    }

    if (payload.action === EventAction.Modified) {
      return false;
    }

    if (lastEvent.action !== payload.action) {
      return false;
    }

    const index = payload.index;
    const prevIndex = lastEvent.index;

    if (!(index instanceof TextIndex) || !(prevIndex instanceof TextIndex)) {
      return false;
    }

    if (index.blockIndex !== prevIndex.blockIndex || index.dataKey !== prevIndex.dataKey) {
      return false;
    }

    // Check consecutive text ranges
    const lastRange = prevIndex.textRange!;
    const newRange = index.textRange!;

    const lastPayload = lastEvent.data as string;

    if (payload.action === EventAction.Added) {
      return newRange[0] === lastRange[1] + lastPayload.length;
    } else {
      return (newRange[1] === lastRange[0]) || (newRange[0] === lastRange[0]);
    }
  }

  /**
   * Moves the batch to the undo stack and cancels the debounce timer.
   */
  #putBatchToUndo(): void {
    clearTimeout(this.#debounceTimer);

    if (this.#batch !== null) {
      this.#undoStack.push(this.#batch.reverse());
      this.#batch = null;
    }
  }

  /**
   * Restarts the debounce timer so that the current group is flushed after
   * DEBOUNCE_TIMEOUT milliseconds of inactivity.
   */
  #debounce(): void {
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => this.#putBatchToUndo(), DEBOUNCE_TIMEOUT);
  }
}

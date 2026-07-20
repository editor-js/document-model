/* eslint-disable jsdoc/require-jsdoc */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { BeforeInputUIEvent, EditorAPI, EditorjsPluginParams } from '@editorjs/sdk';
import { BeforeInputUIEventName, CoreEventType, EventBus } from '@editorjs/sdk';
import type { BlocksHolderRenderedUIEvent } from './events/index.js';
import { BlocksUI } from './Blocks.js';

interface BlocksUITestContext {
  blocksUI: BlocksUI;
  eventBus: EventBus;
  blocksHolder: HTMLElement;
  undoMock: jest.Mock;
  redoMock: jest.Mock;
}

function createBlocksUI(): BlocksUITestContext {
  const eventBus = new EventBus();
  let blocksHolder: HTMLElement | null = null;

  eventBus.addEventListener('ui:blocks:rendered', (event) => {
    blocksHolder = (event as BlocksHolderRenderedUIEvent).detail.blocksHolder;
  });

  const undoMock = jest.fn();
  const redoMock = jest.fn();
  const api = {
    document: {
      undo: undoMock,
      redo: redoMock,
    },
  } as unknown as EditorAPI;

  const blocksUI = new BlocksUI({
    eventBus,
    api,
  } as unknown as EditorjsPluginParams);

  if (blocksHolder === null) {
    throw new Error('BlocksHolderRenderedUIEvent was not dispatched');
  }

  return {
    blocksUI,
    eventBus,
    blocksHolder,
    undoMock,
    redoMock,
  };
}

function dispatchBlockAdded(eventBus: EventBus, blockElement: HTMLElement, index: number): void {
  eventBus.dispatchEvent(new CustomEvent(`core:${CoreEventType.BlockAdded}`, {
    detail: {
      ui: blockElement,
      index,
    },
  }));
}

function dispatchBlockRemoved(eventBus: EventBus, index: number): void {
  eventBus.dispatchEvent(new CustomEvent(`core:${CoreEventType.BlockRemoved}`, {
    detail: {
      index,
    },
  }));
}

function dispatchBeforeInput(blocksHolder: HTMLElement, data = 'a'): InputEvent {
  const event = new InputEvent('beforeinput', {
    inputType: 'insertText',
    data,
    cancelable: true,
  });

  /**
   * Jsdom does not implement InputEvent.getTargetRanges(), so it is stubbed on the instance
   */
  Object.defineProperty(event, 'getTargetRanges', {
    value: () => [],
  });

  blocksHolder.dispatchEvent(event);

  return event;
}

function dispatchUndoRedoKeydown(
  blocksHolder: HTMLElement,
  { shiftKey = false,
    modifier = 'ctrl' }: { shiftKey?: boolean;
    modifier?: 'ctrl' | 'meta' | 'none'; } = {}
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    code: 'KeyZ',
    ctrlKey: modifier === 'ctrl',
    metaKey: modifier === 'meta',
    shiftKey,
    cancelable: true,
  });

  blocksHolder.dispatchEvent(event);

  return event;
}

describe('BlocksUI', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should dispatch BlocksHolderRenderedUIEvent with the blocks holder when constructed', () => {
      const { blocksHolder } = createBlocksUI();

      expect(blocksHolder).toBeInstanceOf(HTMLElement);
    });
  });

  describe('blocks rendering', () => {
    it('should append the block element to the blocks holder when BlockAddedCoreEvent is received', () => {
      const { eventBus, blocksHolder } = createBlocksUI();
      const blockElement = document.createElement('div');

      dispatchBlockAdded(eventBus, blockElement, 0);

      expect(blocksHolder.contains(blockElement)).toBe(true);
    });

    it('should remove the block element from the blocks holder when BlockRemovedCoreEvent is received', () => {
      const { eventBus, blocksHolder } = createBlocksUI();
      const blockElement = document.createElement('div');

      dispatchBlockAdded(eventBus, blockElement, 0);
      dispatchBlockRemoved(eventBus, 0);

      expect(blocksHolder.contains(blockElement)).toBe(false);
    });
  });

  describe('input handling', () => {
    it('should dispatch BeforeInputUIEvent with the normalized payload when beforeinput occurs on the blocks holder', () => {
      const { eventBus, blocksHolder } = createBlocksUI();
      const beforeInputListener = jest.fn();

      eventBus.addEventListener(`ui:${BeforeInputUIEventName}`, beforeInputListener);

      const nativeEvent = dispatchBeforeInput(blocksHolder, 'a');

      expect(beforeInputListener).toHaveBeenCalledTimes(1);

      const dispatchedEvent = beforeInputListener.mock.calls[0][0] as BeforeInputUIEvent;

      expect(dispatchedEvent.detail.data).toBe('a');
      expect(dispatchedEvent.detail.inputType).toBe('insertText');
      expect(dispatchedEvent.detail.isCrossInputSelection).toBe(false);
      expect(nativeEvent.defaultPrevented).toBe(true);
    });

    it('should call undo when Ctrl+Z is pressed on the blocks holder', () => {
      const { blocksHolder, undoMock, redoMock } = createBlocksUI();

      const nativeEvent = dispatchUndoRedoKeydown(blocksHolder);

      expect(undoMock).toHaveBeenCalledTimes(1);
      expect(redoMock).not.toHaveBeenCalled();
      expect(nativeEvent.defaultPrevented).toBe(true);
    });

    it('should call undo when Cmd+Z is pressed on the blocks holder', () => {
      const { blocksHolder, undoMock, redoMock } = createBlocksUI();

      const nativeEvent = dispatchUndoRedoKeydown(blocksHolder, { modifier: 'meta' });

      expect(undoMock).toHaveBeenCalledTimes(1);
      expect(redoMock).not.toHaveBeenCalled();
      expect(nativeEvent.defaultPrevented).toBe(true);
    });

    it('should not call undo or redo when Z is pressed without a modifier', () => {
      const { blocksHolder, undoMock, redoMock } = createBlocksUI();

      const nativeEvent = dispatchUndoRedoKeydown(blocksHolder, { modifier: 'none' });

      expect(undoMock).not.toHaveBeenCalled();
      expect(redoMock).not.toHaveBeenCalled();
      expect(nativeEvent.defaultPrevented).toBe(false);
    });

    it('should call redo when Ctrl+Shift+Z is pressed on the blocks holder', () => {
      const { blocksHolder, undoMock, redoMock } = createBlocksUI();

      const nativeEvent = dispatchUndoRedoKeydown(blocksHolder, { shiftKey: true });

      expect(redoMock).toHaveBeenCalledTimes(1);
      expect(undoMock).not.toHaveBeenCalled();
      expect(nativeEvent.defaultPrevented).toBe(true);
    });
  });

  describe('.destroy()', () => {
    it('should remove rendered block elements when destroy is called', () => {
      const { blocksUI, eventBus, blocksHolder } = createBlocksUI();
      const blockElement = document.createElement('div');

      dispatchBlockAdded(eventBus, blockElement, 0);

      blocksUI.destroy();

      expect(blocksHolder.contains(blockElement)).toBe(false);
    });

    it('should detach the blocks holder from the DOM when destroy is called', () => {
      const { blocksUI, blocksHolder } = createBlocksUI();

      document.body.appendChild(blocksHolder);

      blocksUI.destroy();

      expect(blocksHolder.isConnected).toBe(false);
    });

    it('should stop dispatching BeforeInputUIEvent when destroy is called', () => {
      const { blocksUI, eventBus, blocksHolder } = createBlocksUI();
      const beforeInputListener = jest.fn();

      eventBus.addEventListener(`ui:${BeforeInputUIEventName}`, beforeInputListener);

      blocksUI.destroy();

      dispatchBeforeInput(blocksHolder, 'a');

      expect(beforeInputListener).not.toHaveBeenCalled();
    });

    it('should stop handling undo and redo shortcuts when destroy is called', () => {
      const { blocksUI, blocksHolder, undoMock, redoMock } = createBlocksUI();

      blocksUI.destroy();

      dispatchUndoRedoKeydown(blocksHolder);
      dispatchUndoRedoKeydown(blocksHolder, { shiftKey: true });

      expect(undoMock).not.toHaveBeenCalled();
      expect(redoMock).not.toHaveBeenCalled();
    });
  });
});

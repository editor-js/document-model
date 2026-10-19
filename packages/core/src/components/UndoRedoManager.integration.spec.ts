/* eslint-disable @typescript-eslint/no-magic-numbers */
import { jest, beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import type { CoreConfigValidated, DataKey } from '@editorjs/sdk';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type { BlocksManager } from './BlockManager';
// @ts-expect-error - TS don't import types via import() so have to import them here as well
import type ToolsManager from '../tools/ToolsManager';
import { EventBus } from '@editorjs/sdk';
import { EditorJSModel } from '@editorjs/model';

const USER_ID = 'integration-user';
const DOCUMENT_ID = 'integration-doc';

/**
 * Mock ToolsManager — tools rendering is not part of this integration scope.
 * Paragraphs can be split, so a split moves the text after the caret into a new paragraph
 */
jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    blockTools: {
      get: jest.fn((name: string) => ({
        name,
        options: { canBeSplit: true },
        create: jest.fn(() => ({
          render: jest.fn(() => Promise.resolve(document.createElement('div'))),
        })),
      })),
    },
  })),
}));

const ToolsManager = (await import('../tools/ToolsManager')).default;
const { BlocksManager } = await import('./BlockManager.js');
const { UndoRedoManager } = await import('./UndoRedoManager.js');

/**
 * Ends the current browser task, so UndoRedoManager groups the events dispatched so far
 */
function endTask(): void {
  jest.advanceTimersByTime(0);
}

describe('UndoRedoManager integration (real model, mocked tools)', () => {
  let model: InstanceType<typeof EditorJSModel>;
  let blocksManager: BlocksManager;
  let undoRedoManager: InstanceType<typeof UndoRedoManager>;

  const config = {
    defaultBlock: 'paragraph',
    userId: USER_ID,
    documentId: DOCUMENT_ID,
    holder: {} as HTMLElement,
  } as CoreConfigValidated;

  const paragraph = (value: string): Record<string, unknown> => ({
    text: {
      $t: 't',
      value,
      fragments: [],
    },
  });

  beforeEach(() => {
    jest.useFakeTimers();

    model = new EditorJSModel(USER_ID, { identifier: DOCUMENT_ID });

    const eventBus = new EventBus();

    // @ts-expect-error — mock constructor
    const toolsManager = new ToolsManager();

    blocksManager = new BlocksManager(model, eventBus, toolsManager, config);
    undoRedoManager = new UndoRedoManager(model, eventBus, config);

    /**
     * The initial paragraph is its own undo step
     */
    model.addBlock(USER_ID, {
      name: 'paragraph',
      data: paragraph('Hello world'),
    });
    endTask();
    jest.runAllTimers();
  });

  afterEach(() => {
    undoRedoManager.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should undo a mid-paragraph Enter split in one step', () => {
    const before = structuredClone(model.serialized.blocks);

    blocksManager.splitBlock(0, 'text' as DataKey, 5);
    endTask();

    expect(model.length).toBe(2);

    undoRedoManager.undo();

    expect(model.serialized.blocks).toEqual(before);
  });

  /**
   * Building a block dispatches a BlockAddedEvent and, in a microtask, one DataNodeAddedEvent
   * per data key. Those deferred events reach the undo manager without a userId, so they are not
   * recorded — which is required: the BlockAddedEvent already carries the block's data, and
   * re-applying both on redo would create the same data node twice (AlreadyExistingKeyError).
   * If this test starts failing after userId forwarding is fixed, skip data-node events that are
   * covered by a BlockAddedEvent of the same step instead of recording them.
   */
  it('should undo and redo a multi-change task that adds a block with text without AlreadyExistingKeyError', async () => {
    blocksManager.splitBlock(0, 'text' as DataKey, 5);

    /**
     * Let the deferred DataNodeAddedEvents run inside the same task
     */
    await Promise.resolve();
    endTask();

    const afterSplit = structuredClone(model.serialized.blocks);

    undoRedoManager.undo();

    expect(model.length).toBe(1);

    expect(() => undoRedoManager.redo()).not.toThrow();
    expect(model.serialized.blocks).toEqual(afterSplit);
  });
});

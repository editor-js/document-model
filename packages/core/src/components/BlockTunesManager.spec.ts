/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';

let blockSelectedListener: (event: CustomEvent) => void;

jest.unstable_mockModule('@editorjs/sdk', () => ({
  BlockSelectedCoreEvent: jest.fn(function (this: { detail: unknown }, payload: unknown) {
    this.detail = payload;
  }),
  BlockSelectedUIEvent: jest.fn(),
  CoreEventType: { BlockSelected: 'block:selected' },
  EventBus: jest.fn(() => ({
    addEventListener: jest.fn((name: string, handler: (e: CustomEvent) => void) => {
      if (name === 'ui:blocks:block-selected') {
        blockSelectedListener = handler;
      }
    }),
    dispatchEvent: jest.fn(),
  })),
}));

const fakeFacade = { create: jest.fn(() => ({ render: jest.fn() })) };

jest.unstable_mockModule('../tools/ToolsManager', () => ({
  default: jest.fn(() => ({
    blockTunes: new Map([
      ['moveUp', fakeFacade],
    ]),
  })),
}));

jest.unstable_mockModule('../api/index.js', () => ({
  EditorAPI: jest.fn(),
}));

const { BlockSelectedCoreEvent, EventBus } = await import('@editorjs/sdk');
const ToolsManager = (await import('../tools/ToolsManager')).default;
const { BlockTunesManager } = await import('./BlockTunesManager.js');

describe('BlockTunesManager', () => {
  const mockBlockId = 'block-id-42';

  const mockApi = {
    blocks: {
      getIdByIndex: jest.fn(() => mockBlockId),
    },
  };

  const eventBus = new EventBus();
  // @ts-expect-error — mocked instance
  const toolsManager = new ToolsManager();

  new BlockTunesManager(
    { userId: 'user' } as unknown as CoreConfigValidated,
    eventBus,
    toolsManager,
    mockApi as unknown as import('../api/index.js').EditorAPI
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIdByIndex.mockReturnValue(mockBlockId);
  });

  it('emits BlockSelectedCoreEvent with tune instances when a block is selected', () => {
    blockSelectedListener({ detail: { index: 2,
      block: {} } } as unknown as CustomEvent);

    expect(mockApi.blocks.getIdByIndex).toHaveBeenCalledWith(2);
    expect(BlockSelectedCoreEvent).toHaveBeenCalledWith(expect.objectContaining({
      index: 2,
      blockId: mockBlockId,
      availableBlockTunes: expect.any(Map),
    }));
    expect(eventBus.dispatchEvent).toHaveBeenCalled();
  });

  it('does not emit when blockId is undefined', () => {
    mockApi.blocks.getIdByIndex.mockReturnValue(undefined as unknown as string);

    blockSelectedListener({ detail: { index: 99,
      block: {} } } as unknown as CustomEvent);

    expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
  });

  it('calls facade.create() for each registered tune with blockId and api', () => {
    blockSelectedListener({ detail: { index: 0,
      block: {} } } as unknown as CustomEvent);

    expect(fakeFacade.create).toHaveBeenCalledWith({}, mockBlockId, mockApi);
  });
});

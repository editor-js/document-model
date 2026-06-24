/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';

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
  EditorJSAdapterPlugin: jest.fn(),
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

  const mockTuneAdapter = {};

  const mockAdapter = {
    getBlockTuneAdapter: jest.fn(() => mockTuneAdapter),
    createBlockTuneAdapter: jest.fn(() => mockTuneAdapter),
    createBlockToolAdapter: jest.fn(),
    destroyBlockToolAdapter: jest.fn(),
    destroyBlockTuneAdapters: jest.fn(),
  };

  const eventBus = new EventBus();
  // @ts-expect-error — mocked instance
  const toolsManager = new ToolsManager();

  new BlockTunesManager(
    eventBus,
    toolsManager,
    mockApi as unknown as import('../api/index.js').EditorAPI,
    mockAdapter as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIdByIndex.mockReturnValue(mockBlockId);
    mockAdapter.getBlockTuneAdapter.mockReturnValue(mockTuneAdapter);
  });

  it('should emit BlockSelectedCoreEvent with tune instances when a block is selected', () => {
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

  it('should not emit when blockId is undefined', () => {
    mockApi.blocks.getIdByIndex.mockReturnValue(undefined as unknown as string);

    blockSelectedListener({ detail: { index: 99,
      block: {} } } as unknown as CustomEvent);

    expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
  });

  it('should call facade.create() for each registered tune with blockId, api, and adapter', () => {
    blockSelectedListener({ detail: { index: 0,
      block: {} } } as unknown as CustomEvent);

    expect(fakeFacade.create).toHaveBeenCalledWith({}, mockBlockId, mockApi, mockTuneAdapter);
  });

  it('should use an existing adapter when getBlockTuneAdapter returns one', () => {
    const existingAdapter = { existing: true };

    mockAdapter.getBlockTuneAdapter.mockReturnValue(existingAdapter);

    blockSelectedListener({ detail: { index: 0,
      block: {} } } as unknown as CustomEvent);

    expect(mockAdapter.createBlockTuneAdapter).not.toHaveBeenCalled();
    expect(fakeFacade.create).toHaveBeenCalledWith({}, mockBlockId, mockApi, existingAdapter);
  });

  it('should create a new adapter when getBlockTuneAdapter returns undefined', () => {
    mockAdapter.getBlockTuneAdapter.mockReturnValue(undefined as never);

    blockSelectedListener({ detail: { index: 0,
      block: {} } } as unknown as CustomEvent);

    expect(mockAdapter.createBlockTuneAdapter).toHaveBeenCalled();
    expect(fakeFacade.create).toHaveBeenCalledWith({}, mockBlockId, mockApi, mockTuneAdapter);
  });
});

/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  ToolType: { Tune: 'tune' },
}));

jest.unstable_mockModule('@codexteam/icons', () => ({
  IconChevronDown: '<svg/>',
}));

let clickHandler: () => void;

jest.unstable_mockModule('@editorjs/dom', () => ({
  make: jest.fn(() => ({
    addEventListener: jest.fn((event: string, handler: () => void) => {
      if (event === 'click') {
        clickHandler = handler;
      }
    }),
    innerHTML: '',
    title: '',
  })),
}));

const { MoveDownTune } = await import('./index.js');

describe('MoveDownTune', () => {
  const mockApi = {
    blocks: {
      getIndexById: jest.fn(() => 1),
      getBlocksCount: jest.fn(() => 3),
      move: jest.fn(),
    },
  };

  const mockBlockId = 'block-id-789' as unknown as import('@editorjs/model').BlockId;

  const tune = new MoveDownTune({
    api: mockApi as unknown as import('@editorjs/sdk').EditorAPI,
    blockId: mockBlockId,
    data: undefined,
    config: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIndexById.mockReturnValue(1);
    mockApi.blocks.getBlocksCount.mockReturnValue(3);
  });

  it('render() returns an element', () => {
    const element = tune.render();

    expect(element).toBeDefined();
  });

  it('click moves block down by one position', () => {
    tune.render();
    clickHandler();

    expect(mockApi.blocks.getIndexById).toHaveBeenCalledWith(String(mockBlockId));
    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 2,
      fromIndex: 1 });
  });

  it('click does nothing when block is already last', () => {
    mockApi.blocks.getIndexById.mockReturnValue(2);
    mockApi.blocks.getBlocksCount.mockReturnValue(3);
    tune.render();
    clickHandler();

    expect(mockApi.blocks.move).not.toHaveBeenCalled();
  });

  it('resolves index at click-time, not construction-time', () => {
    mockApi.blocks.getIndexById.mockReturnValue(0);
    mockApi.blocks.getBlocksCount.mockReturnValue(5);
    tune.render();
    clickHandler();

    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 1,
      fromIndex: 0 });
  });
});

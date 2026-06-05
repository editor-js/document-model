/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  ToolType: { Tune: 'tune' },
}));

jest.unstable_mockModule('@codexteam/icons', () => ({
  IconCross: '<svg/>',
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

const { DeleteBlockTune } = await import('./index.js');

describe('DeleteBlockTune', () => {
  const mockApi = {
    blocks: {
      getIndexById: jest.fn(() => 1),
      delete: jest.fn(),
    },
  };

  const mockBlockId = 'block-id-456' as unknown as import('@editorjs/model').BlockId;

  const tune = new DeleteBlockTune({
    api: mockApi as unknown as import('@editorjs/sdk').EditorAPI,
    blockId: mockBlockId,
    data: undefined,
    config: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIndexById.mockReturnValue(1);
  });

  it('render() returns an element', () => {
    const element = tune.render();

    expect(element).toBeDefined();
  });

  it('click deletes the block at the resolved index', () => {
    tune.render();
    clickHandler();

    expect(mockApi.blocks.getIndexById).toHaveBeenCalledWith(String(mockBlockId));
    expect(mockApi.blocks.delete).toHaveBeenCalledWith({ block: 1 });
  });

  it('resolves index at click-time, not construction-time', () => {
    mockApi.blocks.getIndexById.mockReturnValue(4);
    tune.render();
    clickHandler();

    expect(mockApi.blocks.delete).toHaveBeenCalledWith({ block: 4 });
  });
});

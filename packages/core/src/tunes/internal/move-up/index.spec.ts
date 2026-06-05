/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  ToolType: { Tune: 'tune' },
}));

jest.unstable_mockModule('@codexteam/icons', () => ({
  IconChevronUp: '<svg/>',
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

const { MoveUpTune } = await import('./index.js');

describe('MoveUpTune', () => {
  const mockApi = {
    blocks: {
      getIndexById: jest.fn(() => 2),
      move: jest.fn(),
    },
  };

  const mockBlockId = 'block-id-123' as unknown as import('@editorjs/model').BlockId;

  const tune = new MoveUpTune({
    api: mockApi as unknown as import('@editorjs/sdk').EditorAPI,
    blockId: mockBlockId,
    data: undefined,
    config: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIndexById.mockReturnValue(2);
  });

  it('render() returns an element', () => {
    const element = tune.render();

    expect(element).toBeDefined();
  });

  it('click moves block up by one position', () => {
    tune.render();
    clickHandler();

    expect(mockApi.blocks.getIndexById).toHaveBeenCalledWith(String(mockBlockId));
    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 1,
      fromIndex: 2 });
  });

  it('click does nothing when block is already first', () => {
    mockApi.blocks.getIndexById.mockReturnValue(0);
    tune.render();
    clickHandler();

    expect(mockApi.blocks.move).not.toHaveBeenCalled();
  });

  it('resolves index at click-time, not construction-time', () => {
    mockApi.blocks.getIndexById.mockReturnValue(3);
    tune.render();
    clickHandler();

    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 2,
      fromIndex: 3 });
  });
});

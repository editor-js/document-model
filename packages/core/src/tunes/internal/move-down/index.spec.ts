/* eslint-disable @typescript-eslint/no-magic-numbers, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import type { BlockId } from '@editorjs/model';
import type { EditorAPI } from '@editorjs/sdk';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  ToolType: { Tune: 'tune' },
}));

jest.unstable_mockModule('@codexteam/icons', () => ({
  IconChevronDown: '<svg/>',
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

  const mockBlockId = 'block-id-789' as unknown as BlockId;

  const tune = new MoveDownTune({
    api: mockApi as unknown as EditorAPI,
    blockId: mockBlockId,
    data: undefined,
    config: {},
    adapter: {} as never,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIndexById.mockReturnValue(1);
    mockApi.blocks.getBlocksCount.mockReturnValue(3);
  });

  it('should have title and icon', () => {
    expect(tune.title).toBe('Move down');
    expect(tune.icon).toBeDefined();
  });

  it('should move block down by one position on activate()', () => {
    tune.activate();

    expect(mockApi.blocks.getIndexById).toHaveBeenCalledWith(String(mockBlockId));
    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 2,
      fromIndex: 1 });
  });

  it('should be disabled when block is last', () => {
    mockApi.blocks.getIndexById.mockReturnValue(2);
    mockApi.blocks.getBlocksCount.mockReturnValue(3);

    expect(tune.isDisabled()).toBe(true);
  });

  it('should not be disabled when block is not last', () => {
    mockApi.blocks.getIndexById.mockReturnValue(1);
    mockApi.blocks.getBlocksCount.mockReturnValue(3);

    expect(tune.isDisabled()).toBe(false);
  });

  it('should do nothing on activate() when block is already last', () => {
    mockApi.blocks.getIndexById.mockReturnValue(2);
    mockApi.blocks.getBlocksCount.mockReturnValue(3);
    tune.activate();

    expect(mockApi.blocks.move).not.toHaveBeenCalled();
  });

  it('should resolve index at activate-time, not construction-time', () => {
    mockApi.blocks.getIndexById.mockReturnValue(0);
    mockApi.blocks.getBlocksCount.mockReturnValue(5);
    tune.activate();

    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 1,
      fromIndex: 0 });
  });
});

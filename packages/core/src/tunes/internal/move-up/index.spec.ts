/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  ToolType: { Tune: 'tune' },
}));

jest.unstable_mockModule('@codexteam/icons', () => ({
  IconChevronUp: '<svg/>',
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

  it('should have title and icon', () => {
    expect(tune.title).toBe('Move up');
    expect(tune.icon).toBeDefined();
  });

  it('should move block up by one position on activate()', () => {
    tune.activate();

    expect(mockApi.blocks.getIndexById).toHaveBeenCalledWith(String(mockBlockId));
    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 1,
      fromIndex: 2 });
  });

  it('should be disabled when block is first', () => {
    mockApi.blocks.getIndexById.mockReturnValue(0);

    expect(tune.isDisabled()).toBe(true);
  });

  it('should not be disabled when block is not first', () => {
    mockApi.blocks.getIndexById.mockReturnValue(1);

    expect(tune.isDisabled()).toBe(false);
  });

  it('should do nothing on activate() when block is already first', () => {
    mockApi.blocks.getIndexById.mockReturnValue(0);
    tune.activate();

    expect(mockApi.blocks.move).not.toHaveBeenCalled();
  });

  it('should resolve index at activate-time, not construction-time', () => {
    mockApi.blocks.getIndexById.mockReturnValue(3);
    tune.activate();

    expect(mockApi.blocks.move).toHaveBeenCalledWith({ toIndex: 2,
      fromIndex: 3 });
  });
});

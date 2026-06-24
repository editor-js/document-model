/* eslint-disable @typescript-eslint/no-magic-numbers, @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import type { BlockId } from '@editorjs/model';
import type { EditorAPI } from '@editorjs/sdk';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  ToolType: { Tune: 'tune' },
}));

jest.unstable_mockModule('@codexteam/icons', () => ({
  IconCross: '<svg/>',
}));

const { DeleteBlockTune } = await import('./index.js');

describe('DeleteBlockTune', () => {
  const mockApi = {
    blocks: {
      getIndexById: jest.fn(() => 1),
      delete: jest.fn(),
    },
  };

  const mockBlockId = 'block-id-456' as unknown as BlockId;

  const tune = new DeleteBlockTune({
    api: mockApi as unknown as EditorAPI,
    blockId: mockBlockId,
    data: undefined,
    config: {},
    adapter: {} as never,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.blocks.getIndexById.mockReturnValue(1);
  });

  it('should have title and icon', () => {
    expect(tune.title).toBe('Delete');
    expect(tune.icon).toBeDefined();
  });

  it('should delete the block at the resolved index on activate()', () => {
    tune.activate();

    expect(mockApi.blocks.getIndexById).toHaveBeenCalledWith(String(mockBlockId));
    expect(mockApi.blocks.delete).toHaveBeenCalledWith({ block: 1 });
  });

  it('should resolve index at activate-time, not construction-time', () => {
    mockApi.blocks.getIndexById.mockReturnValue(4);
    tune.activate();

    expect(mockApi.blocks.delete).toHaveBeenCalledWith({ block: 4 });
  });
});

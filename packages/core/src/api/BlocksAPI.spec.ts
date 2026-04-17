/* eslint-disable @typescript-eslint/no-magic-numbers,@typescript-eslint/naming-convention */
import { jest } from '@jest/globals';

// Mock BlocksManager before importing BlocksAPI
jest.unstable_mockModule('../components/BlockManager', () => ({
  BlocksManager: jest.fn(() => ({
    clear: jest.fn(),
    render: jest.fn(),
    deleteBlock: jest.fn(),
    move: jest.fn(),
    insertMany: jest.fn(),
    insert: jest.fn(),
    blocksCount: 0,
  })),
}));

const { BlocksManager } = await import('../components/BlockManager');
const { BlocksAPI } = await import('./BlocksAPI.js');

import type { CoreConfigValidated } from '@editorjs/sdk';

describe('BlocksAPI', () => {
  const defaultBlock = 'paragraph';
  // @ts-expect-error - mock object, don't need to pass any arguments
  const blocksManager = new BlocksManager();

  describe('.clear()', () => {
    it('should call blocksManager.clear', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      api.clear();

      expect(blocksManager.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('.render()', () => {
    it('should call blocksManager.render with provided document', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);
      const doc = { identifier: 'doc',
        blocks: [],
        properties: {} };

      api.render(doc);

      expect(blocksManager.render).toHaveBeenCalledWith(doc);
    });
  });

  describe('.delete()', () => {
    it('should pass explicit index to blocksManager.deleteBlock', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      api.delete(2);

      expect(blocksManager.deleteBlock).toHaveBeenCalledWith(2);
    });

    it('should pass undefined when index is omitted', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      api.delete();

      expect(blocksManager.deleteBlock).toHaveBeenCalledWith(undefined);
    });
  });

  describe('.move()', () => {
    it('should call blocksManager.move with toIndex and fromIndex', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      api.move(3, 1);

      expect(blocksManager.move).toHaveBeenCalledWith(3, 1);
    });
  });

  describe('.getBlocksCount()', () => {
    it('should return blocksManager.blocksCount', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      // @ts-expect-error - need to assign a value to check the method
      blocksManager.blocksCount = 5;

      expect(api.getBlocksCount()).toBe(5);
    });
  });

  describe('.insertMany()', () => {
    it('should pass blocks and index to blocksManager.insertMany', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      const blocks = [{ name: 'a',
        data: {} }];

      api.insertMany(blocks as never, 4);

      expect(blocksManager.insertMany).toHaveBeenCalledWith(blocks, 4);
    });

    it('should pass undefined index to blocksManager.insertMany when omitted', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      const blocks = [{ name: 'a',
        data: {} }];

      api.insertMany(blocks as never);

      expect(blocksManager.insertMany).toHaveBeenCalledWith(blocks, undefined);
    });
  });

  describe('.insert()', () => {
    it('should use defaults and pass payload to blocksManager.insert', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      api.insert();

      expect(blocksManager.insert).toHaveBeenCalledWith({
        type: defaultBlock,
        data: {},
        index: undefined,
        replace: undefined,
      });
    });

    it('should pass provided params to blocksManager.insert and ignore compatibility args', () => {
      const api = new BlocksAPI(blocksManager, { defaultBlock } as CoreConfigValidated);

      api.insert(
        'header',
        { text: 'Title' },
        2,
        true,
        true,
        'id-1'
      );

      expect(blocksManager.insert).toHaveBeenCalledWith({
        type: 'header',
        data: { text: 'Title' },
        index: 2,
        replace: true,
        focus: true,
      });
    });
  });
});

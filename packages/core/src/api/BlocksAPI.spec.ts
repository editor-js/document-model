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

jest.unstable_mockModule('@editorjs/model', () => ({
  EditorJSModel: jest.fn(),
  createBlockId: jest.fn(id => id),
  createDataKey: jest.fn(key => key),
  createBlockTuneName: jest.fn(name => name),
}));

const { BlocksManager } = await import('../components/BlockManager');
const { EditorJSModel } = await import('@editorjs/model');
const { BlocksAPI } = await import('./BlocksAPI.js');

import type { CoreConfigValidated } from '@editorjs/sdk';

describe('BlocksAPI', () => {
  const defaultBlock = 'paragraph';
  // @ts-expect-error - mock object, don't need to pass any arguments
  const blocksManager = new BlocksManager();

  describe('.clear()', () => {
    it('should call blocksManager.clear', () => {
      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      api.clear();

      expect(blocksManager.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('.render()', () => {
    it('should call blocksManager.render with provided document', () => {
      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );
      const doc = {
        identifier: 'doc',
        blocks: [],
        properties: {},
      };

      api.render(doc);

      expect(blocksManager.render).toHaveBeenCalledWith(doc);
    });
  });

  describe('.delete()', () => {
    it('should pass explicit index to blocksManager.deleteBlock', () => {
      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'userId',
        } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      api.delete({ block: 2 });

      expect(blocksManager.deleteBlock).toHaveBeenCalledWith(2, 'userId');
    });

    it('should pass undefined when index is omitted', () => {
      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'userId',
        } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      api.delete();

      expect(blocksManager.deleteBlock).toHaveBeenCalledWith(undefined, 'userId');
    });
  });

  describe('.move()', () => {
    it('should call blocksManager.move with toIndex and fromIndex', () => {
      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'userId',
        } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      api.move({
        toIndex: 3,
        fromIndex: 1,
      });

      expect(blocksManager.move).toHaveBeenCalledWith(3, 1, 'userId');
    });
  });

  describe('.getBlocksCount()', () => {
    it('should return blocksManager.blocksCount', () => {
      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      // @ts-expect-error - need to assign a value to check the method
      blocksManager.blocksCount = 5;

      expect(api.getBlocksCount()).toBe(5);
    });
  });

  describe('.insertMany()', () => {
    it('should pass blocks and index to blocksManager.insertMany', () => {
      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'userId',
        } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      const blocks = [{
        name: 'a',
        data: {},
      }];

      api.insertMany({
        blocks: blocks,
        index: 4,
      });

      expect(blocksManager.insertMany).toHaveBeenCalledWith(blocks, 4, 'userId');
    });

    it('should pass undefined index to blocksManager.insertMany when omitted', () => {
      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'userId',
        } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      const blocks = [{
        name: 'a',
        data: {},
      }];

      api.insertMany({ blocks });

      expect(blocksManager.insertMany).toHaveBeenCalledWith(blocks, undefined, 'userId');
    });
  });

  describe('.insert()', () => {
    it('should use defaults and pass payload to blocksManager.insert', () => {
      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      api.insert();

      expect(blocksManager.insert).toHaveBeenCalledWith({
        type: defaultBlock,
        data: {},
        index: undefined,
        replace: undefined,
      });
    });

    it('should pass provided params to blocksManager.insert and ignore compatibility args', () => {
      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        new EditorJSModel('userId', { identifier: 'docId' })
      );

      api.insert({
        type: 'header',
        data: { text: 'Title' },
        index: 2,
        focus: true,
        replace: true,
        id: 'id-1',
      });

      expect(blocksManager.insert).toHaveBeenCalledWith({
        type: 'header',
        data: { text: 'Title' },
        index: 2,
        replace: true,
        focus: true,
      });
    });
  });

  describe('.getTuneData()', () => {
    it('should return the tune data for the given block and tune name', () => {
      const tuneData = { align: 'left' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = new EditorJSModel('userId', { identifier: 'docId' }) as any;

      model.getBlockSerialized = jest.fn().mockReturnValue({ tunes: { myTune: tuneData } });

      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        model
      );

      const result = api.getTuneData({ block: 0,
        tuneName: 'myTune' });

      expect(result).toEqual(tuneData);
      expect(model.getBlockSerialized).toHaveBeenCalledWith(0);
    });

    it('should return an empty object when the tune has no data', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = new EditorJSModel('userId', { identifier: 'docId' }) as any;

      model.getBlockSerialized = jest.fn().mockReturnValue({ tunes: {} });

      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        model
      );

      const result = api.getTuneData({ block: 0,
        tuneName: 'missingTune' });

      expect(result).toEqual({});
    });

    it('should return an empty object when the block has no tunes', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = new EditorJSModel('userId', { identifier: 'docId' }) as any;

      model.getBlockSerialized = jest.fn().mockReturnValue({});

      const api = new BlocksAPI(
        blocksManager,
        { defaultBlock } as CoreConfigValidated,
        model
      );

      const result = api.getTuneData({ block: 0,
        tuneName: 'anyTune' });

      expect(result).toEqual({});
    });
  });

  describe('.updateTuneData()', () => {
    it('should call model.updateTuneData with userId, block, tuneName, and data', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = new EditorJSModel('userId', { identifier: 'docId' }) as any;

      model.updateTuneData = jest.fn();

      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'user1',
        } as CoreConfigValidated,
        model
      );

      api.updateTuneData({ block: 1,
        tuneName: 'align',
        data: { align: 'center' } });

      expect(model.updateTuneData).toHaveBeenCalledWith('user1', 1, 'align', { align: 'center' });
    });

    it('should use the provided userId instead of the config userId', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = new EditorJSModel('userId', { identifier: 'docId' }) as any;

      model.updateTuneData = jest.fn();

      const api = new BlocksAPI(
        blocksManager,
        {
          defaultBlock,
          userId: 'defaultUser',
        } as CoreConfigValidated,
        model
      );

      api.updateTuneData({ block: 0,
        tuneName: 'align',
        data: {},
        userId: 'overrideUser' });

      expect(model.updateTuneData).toHaveBeenCalledWith('overrideUser', 0, 'align', {});
    });
  });
});

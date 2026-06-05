/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/naming-convention */

import { describe, expect, it, jest } from '@jest/globals';
import { ToolType } from '../../entities/EntityType.js';
import { BlockTuneFacade } from './BlockTuneFacade.js';
import type { BlockTuneConstructor, BlockTuneConstructorOptions } from '../../entities/BlockTune.js';
import type { EditorAPI } from '../../api/EditorAPI.js';
import type { BlockId } from '@editorjs/model';

const mockBlockId = 'test-block-id' as unknown as BlockId;
const mockApi = {} as EditorAPI;

function createTuneFacade(): { facade: BlockTuneFacade; constructorSpy: jest.Mock } {
  const constructorSpy = jest.fn();

  class MockTune {
    public static readonly type = ToolType.Tune;
    public static readonly name = 'mockTune';

    constructor(options: BlockTuneConstructorOptions) {
      constructorSpy(options);
    }

    public render(): HTMLElement {
      return document.createElement('button');
    }
  }

  const facade = new BlockTuneFacade({
    name: 'mockTune',
    constructable: MockTune as unknown as BlockTuneConstructor,
    useToolOptions: {},
    api: {} as import('@editorjs/editorjs').API,
    isDefault: false,
    defaultPlaceholder: false,
  });

  return { facade,
    constructorSpy };
}

describe('BlockTuneFacade', () => {
  describe('create()', () => {
    it('passes data, blockId and api to the tune constructor', () => {
      const { facade, constructorSpy } = createTuneFacade();
      const tuneData = { foo: 'bar' };

      facade.create(tuneData, mockBlockId, mockApi);

      expect(constructorSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: tuneData,
        blockId: mockBlockId,
        api: mockApi,
      }));
    });

    it('returns the tune instance created by the constructor', () => {
      const { facade } = createTuneFacade();

      const instance = facade.create({}, mockBlockId, mockApi);

      expect(instance).toBeDefined();
      expect(typeof instance.render).toBe('function');
    });
  });
});

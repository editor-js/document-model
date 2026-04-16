/* eslint-disable jsdoc/require-jsdoc -- test doubles and nested literals */

import { describe, expect, it } from '@jest/globals';
import type { API as ApiMethods } from '@editorjs/editorjs';
import type { BlockToolConstructor } from '../../entities/BlockTool.js';
import { ToolType } from '../../entities/EntityType.js';
import type { ToolOptions } from './BaseToolFacade.js';
import { UserToolOptions } from './BaseToolFacade.js';
import { BlockToolFacade } from './BlockToolFacade.js';

const emptyApi = {} as ApiMethods;

/**
 * Block tool facade with only fields needed to exercise BaseToolFacade getters.
 * @param staticOptions - optional object set on the mock class as static `options`
 * @param useToolOptions - second argument of `use(Tool, options)`
 * @param facadeOpts - `isDefault` / `defaultPlaceholder` for the facade constructor
 */
function createBlockFacade(
  staticOptions: Record<string, unknown> | undefined,
  useToolOptions: ToolOptions,
  facadeOpts: {
    isDefault?: boolean;
    defaultPlaceholder?: string | false;
  } = {}
): BlockToolFacade {
  class MockBlockTool {
    public static type = ToolType.Block;
  }

  if (staticOptions !== undefined) {
    Object.defineProperty(MockBlockTool, 'options', {
      value: staticOptions,
      writable: true,
      configurable: true,
    });
  }

  return new BlockToolFacade({
    api: emptyApi,
    constructable: MockBlockTool as unknown as BlockToolConstructor,
    defaultPlaceholder: facadeOpts.defaultPlaceholder,
    isDefault: facadeOpts.isDefault ?? false,
    name: 'test-tool',
    useToolOptions,
  });
}

describe('BaseToolFacade (via BlockToolFacade)', () => {
  describe('options getter', () => {
    it('merges static options with use() options, later keys win', () => {
      class BlockToolWithStaticOptions {
        public static type = ToolType.Block;
        public static readonly options = {
          shortcut: 'CMD+STATIC',
          onlyStatic: true,
          overlap: 'from-class',
        };
      }

      const facade = new BlockToolFacade({
        api: emptyApi,
        constructable: BlockToolWithStaticOptions as unknown as BlockToolConstructor,
        isDefault: false,
        name: 'b',
        useToolOptions: {
          shortcut: 'CMD+USE',
          onlyUse: 2,
          overlap: 'from-use',
        } as ToolOptions,
      });

      expect(facade.options).toEqual({
        shortcut: 'CMD+USE',
        onlyStatic: true,
        onlyUse: 2,
        overlap: 'from-use',
      });
    });

    it('uses only use() options when the tool class has no static options', () => {
      const facade = createBlockFacade(undefined, {
        foo: 'bar',
      } as ToolOptions);

      expect(facade.options).toEqual({
        foo: 'bar',
      });
    });
  });

  describe('config getter', () => {
    it('merges static options().config with use(Tool, options).config, later keys win', () => {
      const facade = createBlockFacade(
        {
          config: {
            a: 1,
            shared: 'class',
          },
        },
        {
          [UserToolOptions.Config]: {
            b: 2,
            shared: 'use',
          },
        } as ToolOptions
      );

      expect(facade.config).toEqual({
        a: 1,
        b: 2,
        shared: 'use',
      });
    });

    it('fills placeholder from editor config when tool is default and config has no placeholder', () => {
      const facade = createBlockFacade(
        {
          config: {
            title: 'Paragraph',
          },
        },
        {} as ToolOptions,
        {
          isDefault: true,
          defaultPlaceholder: 'Start writing...',
        }
      );

      expect(facade.config).toEqual({
        title: 'Paragraph',
        placeholder: 'Start writing...',
      });
    });

    it('does not override user config placeholder with editor default', () => {
      const facade = createBlockFacade(
        {},
        {
          [UserToolOptions.Config]: {
            placeholder: 'User hint',
          },
        } as ToolOptions,
        {
          isDefault: true,
          defaultPlaceholder: 'Editor default',
        }
      );

      expect(facade.config).toEqual({
        placeholder: 'User hint',
      });
    });

    it('does not inject placeholder when the tool is not the default block', () => {
      const facade = createBlockFacade({}, {} as ToolOptions, {
        isDefault: false,
        defaultPlaceholder: 'Ignored',
      });

      expect(facade.config).toEqual({});
    });
  });
});

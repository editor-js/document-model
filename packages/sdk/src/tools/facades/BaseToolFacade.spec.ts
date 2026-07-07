/* eslint-disable jsdoc/require-jsdoc,@typescript-eslint/no-magic-numbers */

import { describe, expect, it } from '@jest/globals';
import type { BlockToolConstructor, BlockToolData } from '../../entities/BlockTool.js';
import { BlockToolOptionKey } from '../../entities/BlockTool.js';
import { ToolType } from '../../entities/EntityType.js';
import type { ToolOptions } from './BaseToolFacade.js';
import { UserToolOptions } from './BaseToolFacade.js';
import { BlockToolFacade } from './BlockToolFacade.js';
import type { InlineFragment } from '@editorjs/model-types';
import { BlockChildType, NODE_TYPE_HIDDEN_PROP } from '@editorjs/model-types';
import type { EditorAPI } from '@/api';

const emptyApi = {} as EditorAPI;

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

  describe('exportTextContent', () => {
    it('throws when the tool has no conversionConfig.export', () => {
      const facade = createBlockFacade({}, {} as ToolOptions);

      expect(() => facade.exportTextContent({})).toThrow(
        /does not have export configuration/
      );
    });

    it('calls the export function when conversionConfig.export is a function', () => {
      const exportFn = (data: BlockToolData): string => (data.text as { value: string }).value;
      const facade = createBlockFacade(
        { [BlockToolOptionKey.ConversionConfig]: { export: exportFn } },
        {} as ToolOptions
      );

      const result = facade.exportTextContent({ text: { value: 'hello' } });

      expect(result).toBe('hello');
    });

    it('reads a top-level string key from data', () => {
      const facade = createBlockFacade(
        { [BlockToolOptionKey.ConversionConfig]: { export: 'text' } },
        {} as ToolOptions
      );

      const result = facade.exportTextContent({
        text: {
          value: 'hello',
          fragments: [],
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        },
      });

      expect(result).toBe('hello');
    });

    it('reads a dot-notation keypath from data', () => {
      const facade = createBlockFacade(
        { [BlockToolOptionKey.ConversionConfig]: { export: 'items.0.text' } },
        {} as ToolOptions
      );

      const result = facade.exportTextContent({
        items: [
          {
            text: {
              value: 'hello',
              fragments: [],
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            },
          },
        ],
      });

      expect(result).toBe('hello');
    });
  });

  describe('importTextContent', () => {
    it('throws when the tool has no conversionConfig.import', () => {
      const facade = createBlockFacade({}, {} as ToolOptions);

      expect(() => facade.importTextContent('hello', [])).toThrow(
        /does not have import configuration/
      );
    });

    it('calls the import function when conversionConfig.import is a function', () => {
      const importFn = (text: string): BlockToolData => ({ text: { value: text } });
      const facade = createBlockFacade(
        { [BlockToolOptionKey.ConversionConfig]: { import: importFn } },
        {} as ToolOptions
      );

      const result = facade.importTextContent('hello', []);

      expect(result).toEqual({ text: { value: 'hello' } });
    });

    it('creates a top-level key when conversionConfig.import is a simple string', () => {
      const facade = createBlockFacade(
        { [BlockToolOptionKey.ConversionConfig]: { import: 'text' } },
        {} as ToolOptions
      );
      const fragments = [{
        tool: 'bold',
        range: [0, 5],
      }] as InlineFragment[];

      const result = facade.importTextContent('hello', fragments);

      expect(result).toEqual({
        text: {
          value: 'hello',
          fragments,
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        },
      });
    });

    it('creates nested structure when conversionConfig.import is a dot-notation key', () => {
      const facade = createBlockFacade(
        { [BlockToolOptionKey.ConversionConfig]: { import: 'items.0.text' } },
        {} as ToolOptions
      );
      const fragments = [{
        tool: 'bold',
        range: [0, 5],
      }] as InlineFragment[];

      const result = facade.importTextContent('hello', fragments);

      expect(result).toEqual({
        items: [
          {
            text: {
              value: 'hello',
              fragments,
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            },
          },
        ],
      });
    });
  });
});

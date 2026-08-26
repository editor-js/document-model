/* eslint-disable jsdoc/require-jsdoc,@typescript-eslint/no-magic-numbers */

import { describe, expect, it } from '@jest/globals';
import type { BlockToolConstructor } from '../../entities/index.js';
import { BlockToolOptionKey, ToolType } from '../../entities/index.js';
import type { ToolOptions } from './BaseToolFacade.js';
import { UserToolOptions } from './BaseToolFacade.js';
import { BlockToolFacade } from './BlockToolFacade.js';
import type { EditorAPI } from '../../api';

const emptyApi = {} as EditorAPI;

interface LevelsConfig {
  levels?: number[];
}

function createFacade(staticOptions: unknown, useToolOptions: ToolOptions = {} as ToolOptions): BlockToolFacade {
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
    isDefault: false,
    name: 'test-tool',
    useToolOptions,
  });
}

describe('BlockToolFacade', () => {
  describe('toolbox getter with a plain options object', () => {
    it('should return undefined when the tool declares no toolbox', () => {
      const facade = createFacade({});

      expect(facade.toolbox).toBeUndefined();
    });

    it('should wrap a single toolbox entry into an array', () => {
      const facade = createFacade({
        [BlockToolOptionKey.Toolbox]: {
          title: 'Text',
          icon: '<svg/>',
        },
      });

      expect(facade.toolbox).toEqual([{
        title: 'Text',
        icon: '<svg/>',
      }]);
    });

    it('should hide the tool when the use()-time toolbox is false', () => {
      const facade = createFacade(
        { [BlockToolOptionKey.Toolbox]: { title: 'Text' } },
        { [UserToolOptions.Toolbox]: false } as ToolOptions
      );

      expect(facade.toolbox).toBeUndefined();
    });

    it('should merge a use()-time toolbox array onto the tool array positionally', () => {
      const facade = createFacade(
        {
          [BlockToolOptionKey.Toolbox]: [
            {
              title: 'H1',
              icon: 'tool-1',
            },
            {
              title: 'H2',
              icon: 'tool-2',
            },
          ],
        },
        {
          [UserToolOptions.Toolbox]: [{ title: 'Heading 1' }],
        } as ToolOptions
      );

      expect(facade.toolbox).toEqual([{
        title: 'Heading 1',
        icon: 'tool-1',
      }]);
    });

    it('should merge a use()-time toolbox object onto a tool toolbox object', () => {
      const facade = createFacade(
        {
          [BlockToolOptionKey.Toolbox]: {
            title: 'Text',
            icon: 'tool-icon',
          },
        },
        {
          [UserToolOptions.Toolbox]: { title: 'Paragraph' },
        } as ToolOptions
      );

      expect(facade.toolbox).toEqual([{
        title: 'Paragraph',
        icon: 'tool-icon',
      }]);
    });
  });

  describe('toolbox getter with an options factory', () => {
    it('should derive toolbox entries from the config passed at use() time', () => {
      const facade = createFacade(
        (config: LevelsConfig): Record<string, unknown> => ({
          [BlockToolOptionKey.Toolbox]: (config.levels ?? [1, 2, 3]).map(level => ({
            title: `Heading ${level}`,
            data: { level },
          })),
        }),
        { [UserToolOptions.Config]: { levels: [2, 4] } } as ToolOptions
      );

      expect(facade.toolbox).toEqual([
        {
          title: 'Heading 2',
          data: { level: 2 },
        },
        {
          title: 'Heading 4',
          data: { level: 4 },
        },
      ]);
    });

    it('should merge a use()-time toolbox override onto a factory-derived value', () => {
      const facade = createFacade(
        (config: LevelsConfig): Record<string, unknown> => ({
          [BlockToolOptionKey.Toolbox]: (config.levels ?? [1]).map(level => ({
            title: `Heading ${level}`,
            icon: `icon-${level}`,
          })),
        }),
        {
          [UserToolOptions.Config]: { levels: [1, 2] },
          [UserToolOptions.Toolbox]: [{ title: 'Title' }],
        } as ToolOptions
      );

      expect(facade.toolbox).toEqual([{
        title: 'Title',
        icon: 'icon-1',
      }]);
    });

    it('should hide the tool when a use()-time toolbox is false despite a factory-derived value', () => {
      const facade = createFacade(
        (config: LevelsConfig): Record<string, unknown> => ({
          [BlockToolOptionKey.Toolbox]: (config.levels ?? [1]).map(level => ({ title: `Heading ${level}` })),
        }),
        {
          [UserToolOptions.Config]: { levels: [1, 2] },
          [UserToolOptions.Toolbox]: false,
        } as ToolOptions
      );

      expect(facade.toolbox).toBeUndefined();
    });
  });

  describe('isReadOnlySupported getter', () => {
    it('should read isReadOnlySupported from a plain options object', () => {
      const facade = createFacade({ [BlockToolOptionKey.IsReadOnlySupported]: true });

      expect(facade.isReadOnlySupported).toBe(true);
    });

    it('should read isReadOnlySupported from the resolved static options', () => {
      const facade = createFacade(
        (config: LevelsConfig): Record<string, unknown> => ({
          [BlockToolOptionKey.IsReadOnlySupported]: (config.levels ?? []).length > 0,
        }),
        { [UserToolOptions.Config]: { levels: [1] } } as ToolOptions
      );

      expect(facade.isReadOnlySupported).toBe(true);
    });
  });
});

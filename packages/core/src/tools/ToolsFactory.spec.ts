/* eslint-disable jsdoc/require-jsdoc -- inline test stubs */
import { describe, it, expect } from '@jest/globals';
import type { EditorAPI, ToolConstructable, ToolStaticOptions } from '@editorjs/sdk';
import { BlockToolFacade, InlineToolFacade, ToolType } from '@editorjs/sdk';
import type { EditorConfig } from 'editorjs-v2';
import { ToolsFactory } from './ToolsFactory.js';

class StubBlockTool {
  public static type = ToolType.Block as const;
  public static name = 'paragraph';
}

class StubInlineTool {
  public static type = ToolType.Inline as const;
  public static name = 'bold';
}

/**
 * Builds a factory holding both stub tools, optionally registering the block tool
 * with `use()`-time options. The factory only reads `defaultBlock`
 * and `placeholder` off the editor config, so a partial object stands in for it,
 * and `get()` never instantiates a tool — so the stubs implement no tool methods
 * and are cast to satisfy the registration signature.
 * @param blockToolSettings - second argument of `use()` for the block tool
 */
function createFactory(blockToolSettings?: ToolStaticOptions): ToolsFactory {
  const factory = new ToolsFactory(
    {},
    { defaultBlock: 'paragraph' } as EditorConfig,
    {} as EditorAPI
  );

  factory.setTools([
    [StubBlockTool as unknown as ToolConstructable, blockToolSettings],
    [StubInlineTool as unknown as ToolConstructable, undefined],
  ]);

  return factory;
}

describe('ToolsFactory', () => {
  describe('.get()', () => {
    it('should wrap a block tool in a BlockToolFacade', () => {
      expect(createFactory().get('paragraph')).toBeInstanceOf(BlockToolFacade);
    });

    it('should wrap an inline tool in an InlineToolFacade', () => {
      expect(createFactory().get('bold')).toBeInstanceOf(InlineToolFacade);
    });

    it('should mark the configured defaultBlock tool as default', () => {
      expect(createFactory().get('paragraph').isDefault).toBe(true);
      expect(createFactory().get('bold').isDefault).toBe(false);
    });

    it('should hand the registration options to the facade it builds', () => {
      const factory = createFactory({ config: { placeholder: 'Type here' } });

      expect(factory.get('paragraph').config).toEqual({ placeholder: 'Type here' });
    });

    it('should throw naming a tool that was never registered', () => {
      expect(() => createFactory().get('header')).toThrow('Tool header is not registered');
    });
  });
});

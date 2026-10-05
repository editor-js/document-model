import { describe, expect, it, jest } from '@jest/globals';
import type { CoreConfigValidated, InlineToolConstructor } from '@editorjs/sdk';
import { EventBus, ToolType } from '@editorjs/sdk';
import ToolsManager from './ToolsManager.js';
import type { EditorAPI } from '../api/index.js';

describe('ToolsManager', () => {
  describe('.prepareTools()', () => {
    it('should destroy the inline tool instance created for validation', async () => {
      const destroy = jest.fn();

      /**
       * Inline tool with a static prepare(), so the validation branch runs
       */
      class ProbeInlineTool {
        public static type = ToolType.Inline;

        public static name = 'probe';

        public static prepare = jest.fn(() => Promise.resolve());

        public destroy = destroy;
      }

      const manager = new ToolsManager(
        { tools: {} } as unknown as CoreConfigValidated,
        () => ({}) as EditorAPI,
        new EventBus()
      );

      await manager.prepareTools([[ProbeInlineTool as unknown as InlineToolConstructor, undefined]]);

      expect(destroy).toHaveBeenCalledTimes(1);
    });
  });
});

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

    /**
     * Prepares a single inline tool whose instance is built by `create`
     * @param instance - prototype members of the tool instance
     */
    const prepareInlineTool = async (instance: Record<string, unknown>): Promise<ToolsManager> => {
      /**
       * Inline tool whose instance carries the given members
       */
      class ProbeInlineTool {
        public static type = ToolType.Inline;

        public static name = 'probe';

        /**
         * Copies the given members onto the instance
         */
        constructor() {
          Object.assign(this, instance);
        }

        /**
         * Static prepare, so the validation branch runs
         */
        public static prepare(): Promise<void> {
          return Promise.resolve();
        }
      }

      const manager = new ToolsManager(
        { tools: {} } as unknown as CoreConfigValidated,
        () => ({}) as EditorAPI,
        new EventBus()
      );

      await manager.prepareTools([[ProbeInlineTool as unknown as InlineToolConstructor, undefined]]);

      return manager;
    };

    it('should make an inline tool without render available', async () => {
      const manager = await prepareInlineTool({});

      expect(manager.inlineTools.get('probe')).toBeDefined();
      expect(manager.unavailable.get('probe')).toBeUndefined();
    });

    it('should mark an inline tool implementing the v2 render method as unavailable', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const manager = await prepareInlineTool({ render: () => undefined });

      expect(manager.inlineTools.get('probe')).toBeUndefined();
      expect(manager.unavailable.get('probe')).toBeDefined();

      log.mockRestore();
    });
  });
});

import { describe, expect, it, jest } from '@jest/globals';
import type { CoreConfigValidated, InlineToolConstructor } from '@editorjs/sdk';
import { EventBus, ToolType } from '@editorjs/sdk';
import ToolsManager from './ToolsManager.js';
import type { EditorAPI } from '../api/index.js';

describe('ToolsManager', () => {
  describe('.prepareTools()', () => {
    it('should not destroy the shared inline tool instance it validates', async () => {
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

      expect(destroy).not.toHaveBeenCalled();
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

  describe('.destroy()', () => {
    /**
     * Inline tool class whose instances call `onDestroy` from their destroy() hook
     * @param name - static name the tool is registered under
     * @param onDestroy - called by the instance's destroy()
     * @param withPrepare - give the tool a static prepare(), so prepareTools validates it
     */
    const inlineTool = (name: string, onDestroy: () => void, withPrepare = false): InlineToolConstructor => {
      /**
       * Inline tool that reports when its instance is destroyed
       */
      class ProbeInlineTool {
        public static type = ToolType.Inline;

        public static name = name;

        /**
         * Destroy hook under test
         */
        public destroy(): void {
          onDestroy();
        }
      }

      if (withPrepare) {
        Object.assign(ProbeInlineTool, { prepare: (): Promise<void> => Promise.resolve() });
      }

      return ProbeInlineTool as unknown as InlineToolConstructor;
    };

    /**
     * Creates a manager with the given tools prepared
     * @param tools - inline tool classes to prepare
     */
    const prepared = async (...tools: InlineToolConstructor[]): Promise<ToolsManager> => {
      const manager = new ToolsManager(
        { tools: {} } as unknown as CoreConfigValidated,
        () => ({}) as EditorAPI,
        new EventBus()
      );

      await manager.prepareTools(tools.map(tool => [tool, undefined]));

      return manager;
    };

    it('should destroy each inline tool instance once', async () => {
      const destroyA = jest.fn();
      const destroyB = jest.fn();
      const manager = await prepared(inlineTool('a', destroyA), inlineTool('b', destroyB, true));

      manager.inlineTools.get('a')?.create();

      manager.destroy();
      manager.destroy();

      expect(destroyA).toHaveBeenCalledTimes(1);
      expect(destroyB).toHaveBeenCalledTimes(1);
    });

    it('should not create an instance for a tool that was never used', async () => {
      const destroy = jest.fn();
      const manager = await prepared(inlineTool('unused', destroy));

      manager.destroy();

      expect(destroy).not.toHaveBeenCalled();
    });

    it('should log a throwing destroy() and still destroy the other tools', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const destroyB = jest.fn();
      const manager = await prepared(
        inlineTool('a', () => {
          throw new Error('broken tool');
        }, true),
        inlineTool('b', destroyB, true)
      );

      expect(() => manager.destroy()).not.toThrow();
      expect(destroyB).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith('[ToolsManager] Inline tool a failed to destroy', expect.any(Error));

      error.mockRestore();
    });
  });
});

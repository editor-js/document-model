/* eslint-disable jsdoc/require-jsdoc,@typescript-eslint/no-magic-numbers */

import { describe, expect, it } from '@jest/globals';
import type { PluginDataFor, PluginsAPI, ToolPluginOptions } from './index.js';

/**
 * Public API a fake plugin exposes — stands in for a real plugin package's API type
 */
interface ProbePluginApi {
  /**
   * Arbitrary method used to check the inferred signature survives the map lookup
   * @param value - value to echo back
   */
  echo(value: string): string;
}

/**
 * Options a tool may address to the fake plugin
 */
interface ProbeToolOptions {
  /**
   * Arbitrary option used to check the declaration is type-checked
   */
  level: number;
}

/**
 * Per-block data the fake plugin stores in the Model
 */
interface ProbePluginData {
  /**
   * Arbitrary key used to check the data shape is type-checked
   */
  id: string;
}

/**
 * Augments the maps the same way a real plugin package does, but through a relative
 * specifier since this file lives inside the declaring package itself
 */
declare module './index.js' {
  interface EditorjsPluginApiMap {
    /**
     * Fake plugin's public API
     */
    probe: ProbePluginApi;
  }

  interface ToolPluginOptionsMap {
    /**
     * Fake plugin's tool-directed options
     */
    probe: ProbeToolOptions;
  }

  interface EditorjsPluginDataMap {
    /**
     * Fake plugin's per-block data
     */
    probe: ProbePluginData;
  }
}

describe('Plugin type maps', () => {
  describe('EditorjsPluginApiMap', () => {
    it('should type an augmented key as the plugin API', () => {
      const plugins: PluginsAPI = {
        probe: { echo: value => value },
      };

      const api: ProbePluginApi | undefined = plugins.probe;

      expect(api?.echo('called')).toBe('called');
    });

    it('should make every entry optional so an unregistered plugin is representable', () => {
      const plugins: PluginsAPI = {};

      expect(plugins.probe).toBeUndefined();
    });

    it('should reject reading a key no plugin has augmented', () => {
      const plugins: PluginsAPI = {};

      // @ts-expect-error -- `unknownPlugin` is absent from EditorjsPluginApiMap
      expect(plugins.unknownPlugin).toBeUndefined();
    });

    it('should reject an API value that does not match the augmented type', () => {
      const plugins: PluginsAPI = {
        // @ts-expect-error -- `echo` must return a string
        probe: { echo: () => 42 },
      };

      expect(plugins.probe).toBeDefined();
    });
  });

  describe('EditorjsPluginDataMap', () => {
    it('should resolve an augmented id to the declared data shape', () => {
      const data: PluginDataFor<'probe'> = { id: 'intro' };

      const typed: ProbePluginData = data;

      expect(typed.id).toBe('intro');
    });

    it('should reject data that does not match the declared shape', () => {
      // @ts-expect-error -- `id` is a string
      const data: PluginDataFor<'probe'> = { id: 42 };

      expect(data).toBeDefined();
    });

    it('should fall back to a plain record for an id no package has augmented', () => {
      const data: PluginDataFor<'unknownPlugin'> = { anything: true };

      expect(data.anything).toBe(true);
    });
  });

  describe('ToolPluginOptionsMap', () => {
    it('should type an augmented key as the tool-directed options', () => {
      const options: ToolPluginOptions = {
        probe: { level: 1 },
      };

      const probeOptions: ProbeToolOptions | undefined = options.probe;

      expect(probeOptions?.level).toBe(1);
    });

    it('should reject options declared for a plugin no package has augmented', () => {
      const options: ToolPluginOptions = {
        // @ts-expect-error -- `unknownPlugin` is absent from ToolPluginOptionsMap
        unknownPlugin: { level: 1 },
      };

      expect(options).toBeDefined();
    });

    it('should reject an option value of the wrong type', () => {
      const options: ToolPluginOptions = {
        // @ts-expect-error -- `level` is a number
        probe: { level: 'high' },
      };

      expect(options.probe).toBeDefined();
    });
  });
});

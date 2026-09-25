/* eslint-disable jsdoc/require-jsdoc */

import { describe, expect, it } from '@jest/globals';
import type { EditorAPI, EditorjsPluginParams } from '@editorjs/sdk';
import { PluginRegistry } from './PluginRegistry.js';

/**
 * Public API the second plugin exposes
 */
interface LateProbeApi {
  /**
   * Arbitrary method the earlier plugin calls once everything is initialized
   */
  answer(): number;
}

declare module '@editorjs/sdk' {
  interface EditorjsPluginApiMap {
    /**
     * Public API of the plugin constructed second
     */
    lateProbe: LateProbeApi;
  }
}

const ANSWER = 42;

/**
 * Reproduces how `Core.#initializePlugin` hands out the API and fills the registry: every plugin
 * receives the same API object at construction time, and its public API is registered right after.
 *
 * The API object mirrors `EditorAPI.plugins`, which is a getter delegating to the registry —
 * that getter, plus the registry's single shared record, is what makes registration order
 * irrelevant. Booting a full `Core` is not possible here: it needs a real DOM.
 * @param plugins - plugin constructors, in registration order
 */
function initializePlugins(
  plugins: { name: string;
    ctor: new (params: EditorjsPluginParams) => object; }[]
): { instances: object[];
    api: EditorAPI; } {
  const registry = new PluginRegistry();
  const api = {
    get plugins() {
      return registry.api;
    },
  } as EditorAPI;

  const instances = plugins.map(({ name, ctor }) => {
    const instance = new ctor({ api } as EditorjsPluginParams);
    const { publicApi } = instance as { publicApi?: unknown };

    if (publicApi !== undefined) {
      registry.register(name, publicApi);
    }

    return instance;
  });

  return {
    instances,
    api,
  };
}

/**
 * Plugin constructed first; it grabs the API object and reads from it both immediately and later
 */
class EarlyPlugin {
  public readonly api: EditorAPI;

  public readonly seenDuringConstruction: LateProbeApi | undefined;

  constructor(params: EditorjsPluginParams) {
    this.api = params.api;
    this.seenDuringConstruction = params.api.plugins.lateProbe;
  }

  /**
   * Reads the other plugin's API the way a handler running after `core:ready` would
   */
  public readLater(): LateProbeApi | undefined {
    return this.api.plugins.lateProbe;
  }
}

/**
 * Plugin constructed second, exposing the API the earlier plugin wants
 */
class LatePlugin {
  public readonly publicApi: LateProbeApi = { answer: () => ANSWER };

  constructor(_params: EditorjsPluginParams) {}
}

describe('PluginRegistry (integration with the API object handed to plugins)', () => {
  it('should expose a later plugin API to a plugin constructed before it', () => {
    const { instances } = initializePlugins([
      { name: 'early',
        ctor: EarlyPlugin },
      { name: 'lateProbe',
        ctor: LatePlugin },
    ]);
    const [early] = instances as [EarlyPlugin];

    expect(early.readLater()?.answer()).toBe(ANSWER);
  });

  it('should yield undefined when a plugin reads another plugin API during construction', () => {
    const { instances } = initializePlugins([
      { name: 'early',
        ctor: EarlyPlugin },
      { name: 'lateProbe',
        ctor: LatePlugin },
    ]);
    const [early] = instances as [EarlyPlugin];

    expect(early.seenDuringConstruction).toBeUndefined();
  });

  it('should expose a plugin API regardless of the order the plugins were registered in', () => {
    const reversed = initializePlugins([
      { name: 'lateProbe',
        ctor: LatePlugin },
      { name: 'early',
        ctor: EarlyPlugin },
    ]);

    expect(reversed.api.plugins.lateProbe?.answer()).toBe(ANSWER);
  });

  it('should fail initialization when two plugins share a name', () => {
    expect(() => initializePlugins([
      { name: 'lateProbe',
        ctor: LatePlugin },
      { name: 'lateProbe',
        ctor: LatePlugin },
    ])).toThrow(/lateProbe/);
  });
});

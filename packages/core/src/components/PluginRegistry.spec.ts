/* eslint-disable jsdoc/require-jsdoc */

import { describe, expect, it } from '@jest/globals';
import { PluginRegistry } from './PluginRegistry.js';

/**
 * Public API a fake plugin exposes
 */
interface RegistryProbeApi {
  /**
   * Arbitrary method used to check the registered object is handed back untouched
   */
  ping(): string;
}

declare module '@editorjs/sdk' {
  interface EditorjsPluginApiMap {
    /**
     * Fake plugin's public API
     */
    registryProbe: RegistryProbeApi;
  }
}

describe('PluginRegistry', () => {
  it('should expose a registered public API under the plugin name', () => {
    const registry = new PluginRegistry();
    const publicApi: RegistryProbeApi = { ping: () => 'pong' };

    registry.register('registryProbe', publicApi);

    expect(registry.api.registryProbe).toBe(publicApi);
  });

  it('should return undefined for a plugin that was never registered', () => {
    const registry = new PluginRegistry();

    expect(registry.api.registryProbe).toBeUndefined();
  });

  it('should return the same record object across reads so late writes stay visible', () => {
    const registry = new PluginRegistry();
    const captured = registry.api;

    registry.register('registryProbe', { ping: () => 'pong' });

    expect(captured).toBe(registry.api);
    expect(captured.registryProbe).toBeDefined();
  });

  it('should throw when two plugins register under the same name', () => {
    const registry = new PluginRegistry();

    registry.register('registryProbe', { ping: () => 'first' });

    expect(() => registry.register('registryProbe', { ping: () => 'second' }))
      .toThrow(/registryProbe/);
  });

  it('should throw when a plugin name is empty', () => {
    const registry = new PluginRegistry();

    expect(() => registry.register('', { ping: () => 'pong' })).toThrow();
  });

  it('should remove the entry on unregister', () => {
    const registry = new PluginRegistry();

    registry.register('registryProbe', { ping: () => 'pong' });
    registry.unregister('registryProbe');

    expect(registry.api.registryProbe).toBeUndefined();
  });

  it('should allow registering a name again after it was unregistered', () => {
    const registry = new PluginRegistry();

    registry.register('registryProbe', { ping: () => 'first' });
    registry.unregister('registryProbe');

    expect(() => registry.register('registryProbe', { ping: () => 'second' })).not.toThrow();
  });
});

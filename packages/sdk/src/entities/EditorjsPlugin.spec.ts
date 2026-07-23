/* eslint-disable jsdoc/require-jsdoc,@typescript-eslint/no-magic-numbers */

import { describe, expect, it } from '@jest/globals';
import type { EditorjsPlugin, EditorjsPluginConstructor, EditorjsPluginParams } from './EditorjsPlugin.js';
import type { PluginId } from '../index.js';
import { PluginType } from './EntityType.js';

/**
 * Public API the fake plugin exposes
 */
interface ContractProbeApi {
  /**
   * Arbitrary method used to check the API type survives the map lookup
   */
  ping(): string;
}

declare module '../index.js' {
  interface EditorjsPluginApiMap {
    /**
     * Fake plugin's public API
     */
    contractProbe: ContractProbeApi;
  }
}

/**
 * Plugin that declares its name explicitly, as every plugin is expected to
 */
class ProbePlugin implements EditorjsPlugin<'contractProbe'> {
  public static readonly type = PluginType.Plugin;

  public static readonly name = 'contractProbe';

  public readonly publicApi: ContractProbeApi = {
    ping: () => 'pong',
  };

  /**
   * @param _params - plugin dependencies, unused by the probe
   */
  constructor(_params: EditorjsPluginParams) {}
}

/**
 * Plugin that omits the `name` declaration and so inherits `Function.name`
 */
class UnnamedPlugin implements EditorjsPlugin {
  public static readonly type = PluginType.Plugin;

  /**
   * @param _params - plugin dependencies, unused by the probe
   */
  constructor(_params: EditorjsPluginParams) {}
}

describe('EditorjsPlugin contract', () => {
  it('should infer the id literal from a declared static name', () => {
    const ctor: EditorjsPluginConstructor<'contractProbe', ProbePlugin> = ProbePlugin;

    expect(ctor.name).toBe('contractProbe');
  });

  it('should type publicApi from the augmented map for a declared id', () => {
    const plugin = new ProbePlugin({} as EditorjsPluginParams);
    const api: ContractProbeApi = plugin.publicApi;

    expect(api.ping()).toBe('pong');
  });

  it('should reject a publicApi that does not match the augmented map', () => {
    class MismatchedPlugin implements EditorjsPlugin<'contractProbe'> {
      public static readonly type = PluginType.Plugin;

      public static readonly name = 'contractProbe';

      // @ts-expect-error -- `ping` must return a string
      public readonly publicApi: ContractProbeApi = { ping: () => 42 };
    }

    expect(MismatchedPlugin.name).toBe('contractProbe');
  });

  it('should fall back to the class name when the declaration is omitted', () => {
    expect(UnnamedPlugin.name).toBe('UnnamedPlugin');
  });

  it('should reject a publicApi on a plugin that does not narrow its id', () => {
    class UndeclaredNamePlugin implements EditorjsPlugin {
      public static readonly type = PluginType.Plugin;

      /**
       * Without a narrowed id, `publicApi` resolves to `never`
       */
      // @ts-expect-error -- publicApi is `never` until the plugin declares which id it is
      public readonly publicApi: ContractProbeApi = { ping: () => 'pong' };
    }

    expect(UndeclaredNamePlugin.name).toBe('UndeclaredNamePlugin');
  });

  it('should reject registering a plugin whose name is inherited from Function.name', () => {
    /**
     * Models the `use()` overload: the id is inferred from the constructor's static `name`
     * @param _plugin - plugin constructor being registered
     */
    function use<Id extends PluginId>(_plugin: EditorjsPluginConstructor<Id>): void {}

    use(ProbePlugin);

    class InheritedNamePlugin {
      public static readonly type = PluginType.Plugin;

      public readonly publicApi: ContractProbeApi = { ping: () => 'pong' };
    }

    // @ts-expect-error -- `name` widens to `string`, so `publicApi` is expected to be `never`
    use(InheritedNamePlugin);

    expect(InheritedNamePlugin.name).toBe('InheritedNamePlugin');
  });

  it('should reject a static name that drifts from the augmented map key', () => {
    class DriftedPlugin implements EditorjsPlugin<'contractProbe'> {
      public static readonly type = PluginType.Plugin;

      public static readonly name = 'contractProb';

      public readonly publicApi: ContractProbeApi = { ping: () => 'pong' };
    }

    // @ts-expect-error -- 'contractProb' is not the key the public API was augmented under
    const ctor: EditorjsPluginConstructor<'contractProbe', DriftedPlugin> = DriftedPlugin;

    expect(ctor.name).toBe('contractProb');
  });
});

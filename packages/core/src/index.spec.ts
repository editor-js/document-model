/* eslint-disable jsdoc/require-jsdoc -- inline test stubs */
import { describe, it, expect } from '@jest/globals';
import { PluginType, ToolType } from '@editorjs/sdk';
import type { CoreConfig } from '@editorjs/sdk';
import Core from './index.js';

/**
 * `Core` is headless: it registers nothing by default, so `initialize()` validates
 * that the caller supplied a rendering adapter and the `defaultBlock` tool before
 * resolving any module.
 *
 * These tests drive a real `Core` (real IoC containers, real model) rather than a
 * mock, because the behavior under test is precisely the wiring `use()` performs.
 * With an empty document and stub registrations nothing reaches into the DOM, so a
 * plain object stands in for the holder and this package's `node` test environment
 * is enough to cover both the throwing and the succeeding paths.
 */

/**
 * Minimal stand-in for the holder element. `Core` only stores it during
 * construction — precondition validation never reads from it.
 */
const holderStub = {} as HTMLElement;

/**
 * Builds a config with the holder pre-filled so the constructor doesn't fall back
 * to looking up `#editorjs` via `document`, which doesn't exist under this
 * package's `node` test environment.
 * @param overrides - config fields to override on top of the defaults
 */
function createConfig(overrides: Partial<CoreConfig> = {}): CoreConfig {
  return {
    holder: holderStub,
    data: { blocks: [] },
    ...overrides,
  } as CoreConfig;
}

class StubAdapter {
  public static type = PluginType.Adapter as const;
}

class StubBlockTool {
  public static type = ToolType.Block as const;
  public static name = 'paragraph';
}

class StubPlugin {
  public static type = PluginType.Plugin as const;
  public static name = 'stub-plugin';

  public static instances = 0;

  constructor() {
    StubPlugin.instances += 1;
  }
}

describe('Core', () => {
  describe('initialize() preconditions', () => {
    it('should throw naming the rendering adapter when no adapter has been registered', async () => {
      const core = new Core(createConfig());

      core.use(StubBlockTool);

      await expect(core.initialize()).rejects.toThrow(/rendering adapter/i);
    });

    it('should throw naming the default block tool when it has not been registered', async () => {
      const core = new Core(createConfig());

      core.use(StubAdapter);

      await expect(core.initialize()).rejects.toThrow(/Default block tool "paragraph"/);
    });

    it('should throw naming the configured defaultBlock when a different block tool is registered', async () => {
      const core = new Core(createConfig({ defaultBlock: 'header' }));

      core.use(StubAdapter);
      core.use(StubBlockTool);

      await expect(core.initialize()).rejects.toThrow(/Default block tool "header"/);
    });

    it('should resolve when an adapter, the default block tool and a plugin are registered', async () => {
      const core = new Core(createConfig());

      core.use(StubAdapter);
      core.use(StubBlockTool);
      core.use(StubPlugin);

      await expect(core.initialize()).resolves.toBeUndefined();
    });

    it('should initialize registered plugins during boot', async () => {
      StubPlugin.instances = 0;

      const core = new Core(createConfig());

      core.use(StubAdapter);
      core.use(StubBlockTool);
      core.use(StubPlugin);

      await core.initialize();

      expect(StubPlugin.instances).toBe(1);
    });
  });
});

/* eslint-disable jsdoc/require-jsdoc -- inline test stubs */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CoreEventType, PluginType, ToolType } from '@editorjs/sdk';
import type { CoreConfig, EditorjsPluginParams } from '@editorjs/sdk';
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

  describe('destroy()', () => {
    /**
     * Records teardown calls across plugins, tools and the adapter, in order
     */
    let log: string[];

    beforeEach(() => {
      log = [];
    });

    /**
     * Adapter recording its teardown
     */
    const createAdapter = (): unknown => class RecordingAdapter {
      public static type = PluginType.Adapter as const;
      public static name = 'recording-adapter';

      public createBlockToolAdapter(): object {
        return {};
      }

      /**
       * The v2 data import assigns block ids, so the id isn't recorded
       */
      public destroyBlockToolAdapter(): void {
        log.push('adapter:block');
      }

      public destroy(): void {
        log.push('adapter');
      }
    };

    /**
     * Block tool recording its construction and teardown
     */
    const createBlockTool = (): unknown => class RecordingBlockTool {
      public static type = ToolType.Block as const;
      public static name = 'paragraph';

      public render(): Promise<object> {
        return Promise.resolve({});
      }

      public destroy(): void {
        log.push('tool');
      }
    };

    /**
     * Plugin recording its teardown under the given name
     * @param name - static name the plugin registers its public API under
     * @param onCreate - receives the plugin's constructor params
     */
    const createPlugin = (name: string, onCreate?: (params: EditorjsPluginParams) => void): unknown => class RecordingPlugin {
      public static type = PluginType.Plugin as const;
      public static name = name;

      public publicApi = { name };

      constructor(params: EditorjsPluginParams) {
        onCreate?.(params);
      }

      public destroy(): void {
        log.push(`plugin:${name}`);
      }
    };

    /**
     * Creates a core with one block of data and the recording adapter and block tool registered
     * @param overrides - config overrides
     */
    const createCore = (overrides: Partial<CoreConfig> = {}): Core => {
      const core = new Core(createConfig({
        data: { blocks: [{ id: 'block-1',
          type: 'paragraph',
          data: {} }] },
        ...overrides,
      } as Partial<CoreConfig>));

      core.use(createAdapter() as typeof StubAdapter);
      core.use(createBlockTool() as typeof StubBlockTool);

      return core;
    };

    /**
     * Lets the block render promise settle
     */
    const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

    it('should call plugin destroy in reverse construction order', async () => {
      const core = createCore();

      core.use(createPlugin('a') as typeof StubPlugin);
      core.use(createPlugin('b') as typeof StubPlugin);
      core.use(createPlugin('c') as typeof StubPlugin);
      await core.initialize();

      core.destroy();

      expect(log.filter(entry => entry.startsWith('plugin:'))).toEqual(['plugin:c', 'plugin:b', 'plugin:a']);
    });

    it('should unregister plugin public APIs', async () => {
      let params: EditorjsPluginParams | undefined;
      const core = createCore();

      core.use(createPlugin('probe', (p) => {
        params = p;
      }) as typeof StubPlugin);
      await core.initialize();

      expect((params?.api.plugins as Record<string, unknown>).probe).toBeDefined();

      core.destroy();

      expect((params?.api.plugins as Record<string, unknown>).probe).toBeUndefined();
    });

    it('should continue teardown and log when a plugin destroy throws', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const core = createCore();

      core.use(createPlugin('a') as typeof StubPlugin);
      core.use(class BrokenPlugin {
        public static type = PluginType.Plugin as const;
        public static name = 'broken';

        public destroy(): void {
          throw new Error('broken plugin');
        }
      } as unknown as typeof StubPlugin);
      await core.initialize();
      await flush();

      expect(() => core.destroy()).not.toThrow();
      expect(error).toHaveBeenCalled();
      expect(log).toEqual(['plugin:a', 'tool', 'adapter:block', 'adapter']);

      error.mockRestore();
    });

    it('should destroy plugins, then rendered blocks, then the adapter', async () => {
      const core = createCore();

      core.use(createPlugin('a') as typeof StubPlugin);
      await core.initialize();
      await flush();

      core.destroy();

      expect(log).toEqual(['plugin:a', 'tool', 'adapter:block', 'adapter']);
    });

    it('should not emit model events during destroy', async () => {
      const onModelUpdate = jest.fn();
      const core = createCore({ onModelUpdate });

      await core.initialize();
      await flush();
      onModelUpdate.mockClear();

      core.destroy();

      expect(onModelUpdate).not.toHaveBeenCalled();
    });

    it('should be a no-op when called twice', async () => {
      const core = createCore();

      core.use(createPlugin('a') as typeof StubPlugin);
      await core.initialize();
      await flush();

      core.destroy();
      core.destroy();

      expect(log).toEqual(['plugin:a', 'tool', 'adapter:block', 'adapter']);
    });

    it('should not construct anything when destroyed before initialize', () => {
      const created = jest.fn();
      const core = createCore();

      core.use(createPlugin('a', created) as typeof StubPlugin);

      core.destroy();

      expect(created).not.toHaveBeenCalled();
      expect(log).toEqual([]);
    });

    it('should resolve initialize without dispatching ready when destroyed mid-initialization', async () => {
      let resolvePrepare: () => void = () => undefined;
      const ready = jest.fn();
      const onModelUpdate = jest.fn();
      const core = createCore({ onModelUpdate });

      core.use(createPlugin('a', ({ eventBus }) => {
        eventBus.addEventListener(`core:${CoreEventType.Ready}`, ready);
      }) as typeof StubPlugin);
      core.use(class SlowInlineTool {
        public static type = ToolType.Inline as const;
        public static name = 'slow';

        public static prepare(): Promise<void> {
          return new Promise((resolve) => {
            resolvePrepare = resolve;
          });
        }
      } as unknown as typeof StubBlockTool);

      const initialization = core.initialize();

      /**
       * Let the tools queue reach the pending prepare()
       */
      await flush();
      core.destroy();
      resolvePrepare();

      await expect(initialization).resolves.toBeUndefined();
      await flush();

      expect(ready).not.toHaveBeenCalled();
      expect(onModelUpdate).not.toHaveBeenCalled();
      expect(log).toEqual(['plugin:a', 'adapter']);
    });

    it('should throw from use and initialize after destroy', async () => {
      const core = createCore();

      core.destroy();

      expect(() => core.use(createPlugin('a') as typeof StubPlugin)).toThrow(/destroyed/);
      await expect(core.initialize()).rejects.toThrow(/destroyed/);
    });
  });
});

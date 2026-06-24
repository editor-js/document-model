/* eslint-disable @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import type { ModelEvents } from '@editorjs/model';

/**
 * Mock inversify to avoid ESM parse errors in jest
 */
jest.mock('inversify', () => ({
  injectable: () => () => undefined,
  inject: () => () => undefined,
}));

jest.mock('reflect-metadata', () => ({}));

/**
 * Mock @editorjs/model to avoid DOM/model dependencies
 */
jest.mock('@editorjs/model', () => ({
  TuneModifiedEvent: class TuneModifiedEvent {},
}));

/**
 * Minimal stand-in for BlockTuneAdapter that the DOMBlockTuneAdapter extends.
 * We keep it simple to isolate what DOMBlockTuneAdapter adds on top.
 */
jest.mock('@editorjs/sdk', () => {
  class FakeBlockTuneAdapter extends EventTarget {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public _api: any;
    public blockId: string = '';
    public tuneName: string = '';
    public _cleanup: (() => void) | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(api: any) {
      super();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this._api = api;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this._cleanup = api.document.onUpdate(jest.fn());
    }

    public setBlockId(id: string): void {
      this.blockId = id;
    }

    public setTuneName(name: string): void {
      this.tuneName = name;
    }

    public getData(): Record<string, unknown> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return this._api.blocks.getTuneData({ block: this.blockId,
        tuneName: this.tuneName });
    }

    public setData(data: Record<string, unknown>): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this._api.blocks.updateTuneData({ block: this.blockId,
        tuneName: this.tuneName,
        data });
    }

    public destroy(): void {
      if (this._cleanup) {
        this._cleanup();
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected handleModelUpdate(_event: ModelEvents): void { /* noop */ }
  }

  return { BlockTuneAdapter: FakeBlockTuneAdapter };
});

import { DOMBlockTuneAdapter } from './index.js';

describe('DOMBlockTuneAdapter', () => {
  const makeApi = (): {
    api: {
      blocks: { getTuneData: ReturnType<typeof jest.fn>;
        updateTuneData: ReturnType<typeof jest.fn>; };
      document: { onUpdate: ReturnType<typeof jest.fn> };
    };
    cleanupFn: ReturnType<typeof jest.fn>;
    onUpdate: ReturnType<typeof jest.fn>;
  } => {
    const cleanupFn = jest.fn();
    const onUpdate = jest.fn<() => () => void>().mockReturnValue(cleanupFn);

    return {
      api: {
        blocks: {
          getTuneData: jest.fn<() => Record<string, unknown>>().mockReturnValue({ result: true }),
          updateTuneData: jest.fn(),
        },
        document: { onUpdate },
      },
      cleanupFn,
      onUpdate,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a DOMBlockTuneAdapter instance', () => {
      const { api } = makeApi();
      const adapter = new DOMBlockTuneAdapter(api as never);

      expect(adapter).toBeInstanceOf(DOMBlockTuneAdapter);
    });

    it('should subscribe to model updates on construction', () => {
      const { api, onUpdate } = makeApi();

      new DOMBlockTuneAdapter(api as never);

      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('.setBlockId()', () => {
    it('should set the block id so getData uses it when reading tune data', () => {
      const { api } = makeApi();
      const adapter = new DOMBlockTuneAdapter(api as never);

      adapter.setBlockId('block-abc' as never);
      adapter.getData();

      expect(api.blocks.getTuneData).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'block-abc' })
      );
    });
  });

  describe('.setTuneName()', () => {
    it('should set the tune name so getData uses it when reading tune data', () => {
      const { api } = makeApi();
      const adapter = new DOMBlockTuneAdapter(api as never);

      adapter.setTuneName('align');
      adapter.getData();

      expect(api.blocks.getTuneData).toHaveBeenCalledWith(
        expect.objectContaining({ tuneName: 'align' })
      );
    });
  });

  describe('.getData()', () => {
    it('should return tune data from the API for the configured block and tune', () => {
      const { api } = makeApi();
      const adapter = new DOMBlockTuneAdapter(api as never);

      adapter.setBlockId('block-1' as never);
      adapter.setTuneName('fontSize');

      const result = adapter.getData();

      expect(api.blocks.getTuneData).toHaveBeenCalledWith({ block: 'block-1',
        tuneName: 'fontSize' });
      expect(result).toEqual({ result: true });
    });
  });

  describe('.setData()', () => {
    it('should call updateTuneData on the API with block, tune name, and data', () => {
      const { api } = makeApi();
      const adapter = new DOMBlockTuneAdapter(api as never);

      adapter.setBlockId('block-2' as never);
      adapter.setTuneName('myTune');

      adapter.setData({ key: 'value' });

      expect(api.blocks.updateTuneData).toHaveBeenCalledWith({
        block: 'block-2',
        tuneName: 'myTune',
        data: { key: 'value' },
      });
    });
  });

  describe('.destroy()', () => {
    it('should invoke the cleanup function returned by api.document.onUpdate', () => {
      const cleanupFn = jest.fn();
      const { api, onUpdate } = makeApi();

      onUpdate.mockReturnValueOnce(cleanupFn);

      const adapter = new DOMBlockTuneAdapter(api as never);

      adapter.destroy();

      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });
  });
});

/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { EditorjsPluginParams, EventBus } from '@editorjs/sdk';

class FakeElement extends EventTarget {
  public children: FakeElement[] = [];

  public classList = { add: jest.fn() };

  public appendChild = jest.fn((child: FakeElement) => {
    this.children.push(child);

    return child;
  });

  public remove = jest.fn();
}

class FakeUIEvent {
  constructor(public readonly detail: unknown) {}
}

class KeydownUIEvent extends FakeUIEvent {}

class CopyUIEvent extends FakeUIEvent {}

jest.unstable_mockModule('@editorjs/sdk', () => ({
  CoreEventType: {
    BlockAdded: 'block-added',
    BlockRemoved: 'block-removed',
  },
  UiComponentType: { Blocks: 'Blocks' },
  BeforeInputUIEvent: class extends FakeUIEvent {},
  KeydownUIEvent,
  CopyUIEvent,
}));

jest.unstable_mockModule('@editorjs/dom', () => ({
  make: jest.fn(() => new FakeElement()),
  isNativeInput: jest.fn(() => false),
}));

jest.unstable_mockModule('./Blocks.module.pcss', () => ({ default: {} }));

jest.unstable_mockModule('./Blocks.const.js', () => ({
  blocksCss: { blocks: 'blocks' },
  blockCss: {
    block: 'block',
    contents: 'contents',
  },
}));

jest.unstable_mockModule('./events/index.js', () => ({
  BlocksHolderRenderedUIEvent: class extends FakeUIEvent {},
  BlockSelectedUIEvent: class extends FakeUIEvent {},
}));

(globalThis as unknown as { document: unknown }).document = {
  createElement: () => new FakeElement(),
  createTextNode: () => ({}),
};

const { BlocksUI } = await import('./Blocks.js');

function createParams(): { params: EditorjsPluginParams;
  dispatchEvent: jest.Mock; } {
  const dispatchEvent = jest.fn();
  const eventBus = {
    addEventListener: jest.fn(),
    dispatchEvent,
  } as unknown as EventBus;

  return {
    params: {
      eventBus,
      api: {},
    } as unknown as EditorjsPluginParams,
    dispatchEvent,
  };
}

function getBlocksHolder(dispatchEvent: jest.Mock): FakeElement {
  const [renderedEvent] = dispatchEvent.mock.calls[0] as [ { detail: { blocksHolder: FakeElement } } ];

  return renderedEvent.detail.blocksHolder;
}

function dispatchedOfType(dispatchEvent: jest.Mock, type: new (...args: never[]) => unknown): unknown[] {
  return dispatchEvent.mock.calls.filter(([event]) => event instanceof type);
}

describe('BlocksUI', () => {
  describe('.destroy()', () => {
    it('should stop delegating keydown events from the blocks holder', () => {
      const { params, dispatchEvent } = createParams();
      const blocksUI = new BlocksUI(params);
      const holder = getBlocksHolder(dispatchEvent);

      holder.dispatchEvent(new Event('keydown'));

      expect(dispatchedOfType(dispatchEvent, KeydownUIEvent)).toHaveLength(1);

      blocksUI.destroy();
      holder.dispatchEvent(new Event('keydown'));

      expect(dispatchedOfType(dispatchEvent, KeydownUIEvent)).toHaveLength(1);
    });

    it('should stop delegating copy events from the blocks holder', () => {
      const { params, dispatchEvent } = createParams();
      const blocksUI = new BlocksUI(params);
      const holder = getBlocksHolder(dispatchEvent);

      holder.dispatchEvent(new Event('copy'));

      expect(dispatchedOfType(dispatchEvent, CopyUIEvent)).toHaveLength(1);

      blocksUI.destroy();
      holder.dispatchEvent(new Event('copy'));

      expect(dispatchedOfType(dispatchEvent, CopyUIEvent)).toHaveLength(1);
    });

    it('should detach the blocks holder', () => {
      const { params, dispatchEvent } = createParams();
      const blocksUI = new BlocksUI(params);
      const holder = getBlocksHolder(dispatchEvent);

      blocksUI.destroy();

      expect(holder.remove).toHaveBeenCalled();
    });
  });
});

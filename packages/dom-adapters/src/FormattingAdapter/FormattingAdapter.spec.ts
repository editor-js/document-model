import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import type { DataKey, EditorAPI, EventBus, InlineTool, InlineToolName } from '@editorjs/sdk';
import { CoreEventType, Index, TextFormattedEvent } from '@editorjs/sdk';
import type { CaretAdapter } from '../CaretAdapter/index.js';

/**
 * The DOM helpers package ships extensionless ESM imports that Node can't resolve
 */
jest.unstable_mockModule('@editorjs/dom', () => ({
  isNativeInput: jest.fn(() => false),
}));

const { FormattingAdapter } = await import('./index.js');

/**
 * Adapter under test with handles on its stubs
 */
interface Harness {
  adapter: InstanceType<typeof FormattingAdapter>;
  eventBus: EventTarget;
  unsubscribeUpdates: jest.Mock;
  findInput: jest.Mock;
  emitModelUpdate: (event: unknown) => void;
}

/**
 * Creates an adapter wired to a real EventTarget standing in for the EventBus
 */
function createAdapter(): Harness {
  const unsubscribeUpdates = jest.fn();
  const findInput = jest.fn(() => undefined);
  const eventBus = new EventTarget();
  let onUpdate: (event: unknown) => void = () => undefined;
  const api = {
    document: {
      onUpdate: jest.fn((callback: (event: unknown) => void) => {
        onUpdate = callback;

        return unsubscribeUpdates;
      }),
    },
  } as unknown as EditorAPI;

  const adapter = new FormattingAdapter(api, { findInput } as unknown as CaretAdapter, eventBus as EventBus);

  return { adapter,
    eventBus,
    unsubscribeUpdates,
    findInput,
    emitModelUpdate: event => onUpdate(event) };
}

/**
 * Dispatches a ToolLoaded event for an inline tool whose instance is created by `create`
 * @param eventBus - bus to dispatch on
 * @param create - creates the inline tool instance
 */
function loadInlineTool(eventBus: EventTarget, create: () => object): void {
  eventBus.dispatchEvent(Object.assign(new Event(`core:${CoreEventType.ToolLoaded}`), {
    detail: {
      tool: {
        name: 'bold',
        isInline: () => true,
        create,
      },
    },
  }));
}

describe('FormattingAdapter', () => {
  it('should look up the input of a formatted text range on model update', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { eventBus, findInput, emitModelUpdate } = createAdapter();

    loadInlineTool(eventBus, () => ({}));
    emitModelUpdate(new TextFormattedEvent(
      Index.text([{ blockIndex: 0,
        dataKey: 'text' as DataKey,
        textRange: [0, 1] }]),
      { tool: 'bold' as InlineToolName },
      'user'
    ));

    expect(findInput).toHaveBeenCalledWith(0, 'text');

    warn.mockRestore();
  });

  it('should call destroy on attached inline tools', () => {
    const destroy = jest.fn();
    const { adapter, eventBus } = createAdapter();

    loadInlineTool(eventBus, () => ({ destroy }));
    adapter.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should ignore core:ToolLoaded after destroy', () => {
    const create = jest.fn(() => ({}));
    const { adapter, eventBus } = createAdapter();

    adapter.destroy();
    loadInlineTool(eventBus, create);

    expect(create).not.toHaveBeenCalled();
  });

  it('should ignore model updates after destroy', () => {
    const { adapter, unsubscribeUpdates } = createAdapter();

    adapter.destroy();

    expect(unsubscribeUpdates).toHaveBeenCalledTimes(1);
  });

  it('should destroy a tool instance replaced by a re-attached one', () => {
    const destroy = jest.fn();
    const { adapter, eventBus } = createAdapter();

    loadInlineTool(eventBus, () => ({ destroy }));
    loadInlineTool(eventBus, () => ({}));

    expect(destroy).toHaveBeenCalledTimes(1);

    adapter.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should not destroy a tool instance attached again', () => {
    const destroy = jest.fn();
    const { adapter } = createAdapter();
    const tool = { destroy } as unknown as InlineTool;

    adapter.attachTool('bold' as InlineToolName, tool);
    adapter.attachTool('bold' as InlineToolName, tool);

    expect(destroy).not.toHaveBeenCalled();
  });

  it('should replace a tool instance that has no destroy', () => {
    const { adapter } = createAdapter();

    adapter.attachTool('bold' as InlineToolName, {} as InlineTool);

    expect(() => adapter.attachTool('bold' as InlineToolName, {} as InlineTool)).not.toThrow();
  });
});

/* @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import type { DataKey, EditorAPI, EventBus, InlineFragment, InlineTool, InlineToolName } from '@editorjs/sdk';
import { CoreEventType, Index, TextFormattedEvent, TextUnformattedEvent } from '@editorjs/sdk';
import type { CaretAdapter } from '../CaretAdapter/index.js';

/**
 * The DOM helpers package ships extensionless ESM imports that Jest can't resolve
 */
jest.unstable_mockModule('@editorjs/dom', () => ({
  isNativeInput: jest.fn(() => false),
}));

const { FormattingAdapter } = await import('./index.js');

/**
 * Adapter under test with handles on its stubs
 */
interface LifecycleHarness {
  adapter: InstanceType<typeof FormattingAdapter>;
  eventBus: EventTarget;
  unsubscribeUpdates: jest.Mock;
  findInput: jest.Mock;
  emitModelUpdate: (event: unknown) => void;
}

/**
 * Creates an adapter wired to a real EventTarget standing in for the EventBus
 */
function createAdapter(): LifecycleHarness {
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

const bold = 'bold' as InlineToolName;
const italic = 'italic' as InlineToolName;

/**
 * Creates an inline tool that wraps text in the passed tag
 * @param tag - wrapper tag name
 */
function createTool(tag: string): InlineTool {
  return {
    createWrapper: () => document.createElement(tag),
  } as unknown as InlineTool;
}

/**
 * Range passed to the API's getFragments()
 */
interface TextQuery {
  start: number;
  end: number;
}

/**
 * Adapter rendering into a single input, with the model's fragments under the test's control
 */
interface Harness {
  input: HTMLElement;

  /**
   * Replaces the model's fragments and dispatches a model event for the changed range
   */
  format: (fragments: InlineFragment[], tool: InlineToolName, start: number, end: number) => void;

  /**
   * Same as format, but dispatches an unformat event
   */
  unformat: (fragments: InlineFragment[], tool: InlineToolName, start: number, end: number) => void;
}

/**
 * Creates the adapter with an input holding the passed text as a single text node
 * @param text - input text, taken literally
 */
function createHarness(text: string): Harness {
  const input = document.createElement('div');

  /**
   * An attribute rather than the contentEditable property, which jsdom doesn't implement: the adapter looks for the attribute
   */
  input.setAttribute('contenteditable', 'true');
  input.append(document.createTextNode(text));
  document.body.append(input);

  let fragments: InlineFragment[] = [];
  let onUpdate: (event: unknown) => void = () => undefined;

  const api = {
    document: {
      onUpdate: (callback: (event: unknown) => void) => {
        onUpdate = callback;

        return () => undefined;
      },
    },
    text: {
      /**
       * Model semantics: whole fragments sharing a character with the range
       * @param query - text range to return fragments for
       */
      getFragments: (query: TextQuery) => fragments
        .filter(item => query.start < query.end && item.range[0] < query.end && item.range[1] > query.start),
    },
  } as unknown as EditorAPI;
  const caretAdapter = { findInput: () => input } as unknown as CaretAdapter;
  const adapter = new FormattingAdapter(api, caretAdapter, new EventTarget() as EventBus);

  adapter.attachTool(bold, createTool('b'));
  adapter.attachTool(italic, createTool('i'));

  const dispatch = (EventClass: typeof TextFormattedEvent | typeof TextUnformattedEvent, next: InlineFragment[], tool: InlineToolName, start: number, end: number): void => {
    fragments = next;
    onUpdate(new EventClass(
      Index.text([
        {
          blockIndex: 0,
          dataKey: 'text' as DataKey,
          textRange: [start, end],
        },
      ]),
      { tool },
      'user'
    ));
  };

  return {
    input,
    format: (next, tool, start, end) => dispatch(TextFormattedEvent, next, tool, start, end),
    unformat: (next, tool, start, end) => dispatch(TextUnformattedEvent, next, tool, start, end),
  };
}

/**
 * Creates a fragment
 * @param tool - inline tool name
 * @param start - range start
 * @param end - range end
 */
function fragment(tool: InlineToolName, start: number, end: number): InlineFragment {
  return {
    tool,
    range: [start, end],
  };
}

/**
 * Returns the wrapper tags around each character of the input, sorted, e.g. ['b', 'b,i', '']
 * @param input - input element
 */
function tagsPerCharacter(input: HTMLElement): string[] {
  const result: string[] = [];
  const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const tags: string[] = [];

    for (let parent = node.parentElement; parent !== null && parent !== input; parent = parent.parentElement) {
      tags.push(parent.tagName.toLowerCase());
    }

    const key = tags.sort().join(',');

    for (let index = 0; index < (node.textContent ?? '').length; index++) {
      result.push(key);
    }
  }

  return result;
}

describe('FormattingAdapter', () => {
  describe('lifecycle', () => {
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

    it('should not destroy the shared inline tool instances it uses', () => {
      const destroy = jest.fn();
      const { adapter, eventBus } = createAdapter();

      loadInlineTool(eventBus, () => ({ destroy }));
      adapter.destroy();

      expect(destroy).not.toHaveBeenCalled();
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

    it('should not destroy a tool instance it replaces', () => {
      const destroy = jest.fn();
      const { eventBus } = createAdapter();

      loadInlineTool(eventBus, () => ({ destroy }));
      loadInlineTool(eventBus, () => ({}));

      expect(destroy).not.toHaveBeenCalled();
    });
  });

  describe('text that looks like markup', () => {
    it('should keep literal tags as text when re-rendering around them', () => {
      const text = 'x<b>y</b>z';
      const { input, format } = createHarness(text);

      format([fragment(italic, 0, 10)], italic, 0, 10);

      expect(input.textContent).toBe(text);
      expect(input.querySelectorAll('b')).toHaveLength(0);
      expect(tagsPerCharacter(input)).toEqual(Array(10).fill('i'));
    });

    it('should keep entity-like text as it is', () => {
      const text = 'a &lt; b &amp; c';
      const { input, format } = createHarness(text);

      format([fragment(bold, 2, 6)], bold, 2, 6);

      expect(input.textContent).toBe(text);
      expect(tagsPerCharacter(input).slice(2, 6)).toEqual(['b', 'b', 'b', 'b']);
      expect(tagsPerCharacter(input)[6]).toBe('');
    });

    it('should not create elements from text that contains HTML', () => {
      const text = '<img src="x" onerror="window.injected = true">';
      const { input, format } = createHarness(text);

      format([fragment(bold, 0, 5)], bold, 0, 5);

      expect(input.querySelector('img')).toBeNull();
      expect(input.textContent).toBe(text);
      expect((window as unknown as { injected?: boolean }).injected).toBeUndefined();
    });
  });

  describe('re-rendering widened ranges', () => {
    it('should keep formatting that only overlaps the widened range', () => {
      const { input, format } = createHarness('abcdefghij');

      format([fragment(italic, 0, 2)], italic, 0, 2);
      format([fragment(bold, 0, 10), fragment(italic, 0, 2)], bold, 0, 10);
      format([fragment(bold, 0, 10), fragment(italic, 0, 2), fragment(italic, 8, 9)], italic, 8, 9);

      expect(input.textContent).toBe('abcdefghij');
      expect(tagsPerCharacter(input)).toEqual(['b,i', 'b,i', 'b', 'b', 'b', 'b', 'b', 'b', 'b,i', 'b']);
    });

    it('should keep formatting around a partially unformatted fragment', () => {
      const { input, format, unformat } = createHarness('abcdefghij');

      format([fragment(bold, 0, 10)], bold, 0, 10);
      format([fragment(bold, 0, 10), fragment(italic, 0, 2)], italic, 0, 2);
      format([fragment(bold, 0, 10), fragment(italic, 0, 2), fragment(italic, 8, 10)], italic, 8, 10);
      unformat([fragment(bold, 0, 4), fragment(italic, 0, 2), fragment(bold, 6, 10), fragment(italic, 8, 10)], bold, 4, 6);

      expect(input.textContent).toBe('abcdefghij');
      expect(tagsPerCharacter(input)).toEqual(['b,i', 'b,i', 'b', 'b', '', '', 'b', 'b', 'b,i', 'b,i']);
    });

    it('should re-render a range unformatted before a remaining fragment', () => {
      const { input, format, unformat } = createHarness('abcdefghij');

      format([fragment(bold, 2, 8)], bold, 2, 8);
      unformat([fragment(bold, 5, 8)], bold, 2, 5);

      expect(tagsPerCharacter(input)).toEqual(['', '', '', '', '', 'b', 'b', 'b', '', '']);
    });
  });
});

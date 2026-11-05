import 'reflect-metadata';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { CoreConfig, DataKey, EditorAPI } from '@editorjs/sdk';
import { Index } from '@editorjs/sdk';

/**
 * The DOM helpers package ships extensionless ESM imports that Node can't resolve
 */
jest.unstable_mockModule('@editorjs/dom', () => ({
  isNativeInput: jest.fn(() => false),
}));

const { CaretAdapter } = await import('./index.js');
const { InputsRegistry } = await import('../InputsRegistry/index.js');

/**
 * Stand-in for `document`, where the shared selection watcher adds its listener
 */
const fakeDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.assign(globalThis, { document: fakeDocument });

/**
 * Adapter under test with handles on its API stubs
 */
interface Harness {
  adapter: InstanceType<typeof CaretAdapter>;
  unsubscribeCaret: jest.Mock;
  getIdByIndex: jest.Mock;
  emitCaretUpdate: (event: unknown) => void;
}

/**
 * Adapters created by a test, destroyed after it so the shared selection watcher starts empty
 */
const created: InstanceType<typeof CaretAdapter>[] = [];

/**
 * Creates an adapter with a stub API recording its caret subscription
 */
function createAdapter(): Harness {
  const unsubscribeCaret = jest.fn();
  const getIdByIndex = jest.fn(() => undefined);
  let onCaretUpdate: (event: unknown) => void = () => undefined;
  const api = {
    selection: {
      createCaret: jest.fn(() => ({ index: null,
        userId: 'user' })),
      onCaretUpdate: jest.fn((callback: (event: unknown) => void) => {
        onCaretUpdate = callback;

        return unsubscribeCaret;
      }),
    },
    blocks: { getIdByIndex },
  } as unknown as EditorAPI;

  const adapter = new CaretAdapter(
    { holder: {} as HTMLElement,
      userId: 'user' } as Required<CoreConfig>,
    api,
    new InputsRegistry()
  );

  created.push(adapter);

  return { adapter,
    unsubscribeCaret,
    getIdByIndex,
    emitCaretUpdate: event => onCaretUpdate(event) };
}

describe('CaretAdapter', () => {
  afterEach(() => {
    created.splice(0).forEach(adapter => adapter.destroy());
  });

  it('should look up the input for the current user\'s model caret update', () => {
    const { emitCaretUpdate, getIdByIndex } = createAdapter();

    emitCaretUpdate({
      detail: {
        userId: 'user',
        index: Index.text([{ blockIndex: 0,
          dataKey: 'text' as DataKey,
          textRange: [0, 1] }]).serialize(),
      },
    });

    expect(getIdByIndex).toHaveBeenCalledWith(0);
  });

  it('should stop updating the model caret on selectionchange after destroy', () => {
    fakeDocument.addEventListener.mockClear();

    const { adapter } = createAdapter();

    adapter.destroy();

    const [call] = fakeDocument.addEventListener.mock.calls.filter(([type]) => type === 'selectionchange');

    expect((call[2] as AddEventListenerOptions | undefined)?.signal?.aborted).toBe(true);
  });

  it('should not touch the DOM selection on model caret updates after destroy', () => {
    const { adapter, unsubscribeCaret } = createAdapter();

    adapter.destroy();

    expect(unsubscribeCaret).toHaveBeenCalledTimes(1);
  });

  it('should be safe to destroy twice', () => {
    const { adapter, unsubscribeCaret } = createAdapter();

    adapter.destroy();
    adapter.destroy();

    expect(unsubscribeCaret).toHaveBeenCalledTimes(1);
  });
});

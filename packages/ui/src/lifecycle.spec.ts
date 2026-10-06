/** @jest-environment jsdom */ // eslint-disable-line jsdoc/check-tag-names -- Jest directive, not an API comment.
/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/naming-convention */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BlockAddedCoreEvent, BlockRemovedCoreEvent, CoreEventType, createDataKey, EventBus, TextIndex } from '@editorjs/sdk';
import type { EditorjsPluginParams } from '@editorjs/sdk';

interface Item {
  onActivate?: () => void;
}

// Only the owned popover boundary is substituted. DOM, EventBus and
// AbortController are real; this does not assert vendor window-listener cleanup.
class TestPopover {
  public static instances: TestPopover[] = [];
  public readonly element = document.createElement('div');
  public readonly items: Item[];
  public readonly callbacks = new Map<string, () => void>();
  public readonly show = jest.fn();
  public readonly hide = jest.fn();
  public readonly destroy = jest.fn(() => {
    this.callbacks.get('closed')?.();
    this.element.remove();
  });

  public readonly addItem = jest.fn((item: Item) => this.items.push(item));

  constructor({ items }: { items: Item[] }) {
    this.items = [...items];
    TestPopover.instances.push(this);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public on(event: string, callback: () => void): void {
    this.callbacks.set(event, callback);
  }
}

jest.unstable_mockModule('@editorjs/ui-kit', () => ({
  PopoverDesktop: TestPopover,
  PopoverInline: TestPopover,
  PopoverEvent: { Closed: 'closed' },
  PopoverItemType: { Default: 'default',
    Html: 'html',
    Separator: 'separator' },
}));

const { BlocksUI, EditorjsUI, ToolbarUI, ToolboxUI, InlineToolbarUI } = await import('./index.js');

describe('UI plugin listener lifetime', () => {
  let eventBus: EventBus;
  let host: HTMLElement;
  let params: EditorjsPluginParams;
  const plugins: Array<{ destroy: () => void }> = [];
  const insert = jest.fn();

  function retain<T extends { destroy: () => void }>(plugin: T): T {
    plugins.push(plugin);

    return plugin;
  }

  function emit(type: string, detail: unknown = {}): void {
    eventBus.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function rendered(type: string, key: string): () => HTMLElement {
    let node: HTMLElement;

    eventBus.addEventListener(type, ((event: CustomEvent<Record<string, HTMLElement>>) => {
      node = event.detail[key];
      host.append(node);
    }) as EventListener);

    return () => node;
  }

  function selected(index = 0, top = 20): HTMLElement {
    const block = document.createElement('div');

    Object.defineProperty(block, 'offsetTop', { value: top });
    emit('ui:blocks:block-selected', { block,
      index });

    return block;
  }

  function selection(getToolbarConfig: () => unknown): void {
    const text = document.createTextNode('hello');
    const range = document.createRange();

    host.append(text);
    range.setStart(text, 0);
    range.setEnd(text, 2);
    // jsdom provides selection, but not layout measurement.
    Object.defineProperty(range, 'getBoundingClientRect', {
      value: () => ({ x: 0,
        y: 0,
        top: 0,
        height: 10 }),
    });
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    emit(`core:${CoreEventType.SelectionChanged}`, {
      index: new TextIndex([{ blockIndex: 0,
        dataKey: createDataKey('text'),
        textRange: [0, 2] }]),
      fragments: [],
      availableInlineTools: [{
        name: 'bold',
        options: {},
        create: () => ({ getToolbarConfig,
          isActive: () => false }),
      }],
    });
  }

  async function flushRender(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    eventBus = new EventBus();
    host = document.createElement('div');
    document.body.append(host);
    insert.mockClear();
    TestPopover.instances = [];
    params = {
      eventBus,
      config: { holder: host },
      api: { blocks: { insert },
        document: { undo: jest.fn(),
          redo: jest.fn() } },
    } as unknown as EditorjsPluginParams;
  });

  afterEach(() => {
    plugins.splice(0).reverse()
      .forEach(plugin => plugin.destroy());
    window.getSelection()?.removeAllRanges();
    document.body.replaceChildren();
  });

  it('should stop old BlocksUI core handlers while preserving unrelated and replacement consumers', () => {
    const getHolder = rendered('ui:blocks:rendered', 'blocksHolder');
    const old = retain(new BlocksUI(params));
    const oldHolder = getHolder();
    const content = document.createElement('p');

    eventBus.dispatchEvent(new BlockAddedCoreEvent({ tool: 'p',
      data: {},
      ui: content,
      index: 0 }));
    expect(oldHolder.contains(content)).toBe(true);
    eventBus.dispatchEvent(new BlockRemovedCoreEvent({ tool: 'p',
      index: 0 }));
    expect(oldHolder.contains(content)).toBe(false);
    old.destroy();
    old.destroy();

    const unrelated = jest.fn();

    eventBus.addEventListener(`core:${CoreEventType.BlockAdded}`, unrelated);
    retain(new BlocksUI(params));

    const replacement = getHolder();
    const replacementContent = document.createElement('p');

    eventBus.dispatchEvent(new BlockAddedCoreEvent({ tool: 'p',
      data: {},
      ui: replacementContent,
      index: 0 }));
    expect(replacement.contains(replacementContent)).toBe(true);
    expect(oldHolder.querySelectorAll('.block')).toHaveLength(0);
    expect(oldHolder.children).toHaveLength(1); // Safari host span only.
    expect(unrelated).toHaveBeenCalledTimes(1);

    const errors: unknown[] = [];
    const onError = (event: ErrorEvent): void => {
      errors.push(event.error);
      event.preventDefault();
    };

    window.addEventListener('error', onError);
    try {
      eventBus.dispatchEvent(new BlockRemovedCoreEvent({ tool: 'p',
        index: 0 }));
      expect(errors).toHaveLength(0);
      expect(replacement.contains(replacementContent)).toBe(false);
    } finally {
      window.removeEventListener('error', onError);
    }
  });

  it('should stop mouseenter on a retained block wrapper after destruction', () => {
    const getHolder = rendered('ui:blocks:rendered', 'blocksHolder');
    const plugin = retain(new BlocksUI(params));
    const content = document.createElement('p');
    const listener = jest.fn();

    eventBus.addEventListener('ui:blocks:block-selected', listener);
    eventBus.dispatchEvent(new BlockAddedCoreEvent({ tool: 'p',
      data: {},
      ui: content,
      index: 0 }));

    const wrapper = getHolder().lastElementChild as HTMLElement;

    wrapper.dispatchEvent(new MouseEvent('mouseenter'));
    expect(listener).toHaveBeenCalledTimes(1);
    plugin.destroy();
    host.append(wrapper);
    wrapper.dispatchEvent(new MouseEvent('mouseenter'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ui:toolbar:rendered', 'toolbar'],
    ['ui:inline-toolbar:rendered', 'toolbar'],
    ['ui:blocks:rendered', 'blocksHolder'],
  ])('should stop the destroyed shell consuming %s', (type, key) => {
    const shell = retain(new EditorjsUI(params));
    const wrapper = host.firstElementChild as HTMLElement;
    const first = document.createElement('div');

    emit(type, { [key]: first });
    expect(wrapper.contains(first)).toBe(true);
    shell.destroy();
    shell.destroy();

    const later = document.createElement('div');

    host.append(later);
    emit(type, { [key]: later });
    expect(later.parentElement).toBe(host);
    retain(new EditorjsUI(params));

    const replacement = host.lastElementChild as HTMLElement;

    emit(type, { [key]: later });
    expect(replacement.contains(later)).toBe(true);
    expect(wrapper.contains(later)).toBe(false);
  });

  it('should stop toolbar bus and button effects after destruction', () => {
    const initialOffset = 20;
    const movedOffset = 40;
    const destroyedOffset = 60;
    const replacementOffset = 80;
    const getToolbar = rendered('ui:toolbar:rendered', 'toolbar');
    const toolbar = retain(new ToolbarUI(params));
    const element = getToolbar();
    const button = element.querySelector('button') as HTMLElement;
    const opened = jest.fn();

    eventBus.addEventListener('ui:toolbox:open', opened);
    selected(0, initialOffset);
    expect(element.style.top).toBe('20px');
    emit('ui:toolbox:opened');
    selected(0, movedOffset);
    expect(element.style.top).toBe('20px');
    emit('ui:toolbox:closed');
    selected(0, movedOffset);
    expect(element.style.top).toBe('40px');
    button.click();
    expect(opened).toHaveBeenCalledTimes(1);

    const toolbox = document.createElement('div');

    emit('ui:toolbox:rendered', { toolbox });
    expect(element.contains(toolbox)).toBe(true);
    toolbar.destroy();
    toolbar.destroy();
    host.append(element);
    selected(0, destroyedOffset);
    button.click();

    const later = document.createElement('div');

    host.append(later);
    emit('ui:toolbox:rendered', { toolbox: later });
    expect(element.style.top).toBe('40px');
    expect(opened).toHaveBeenCalledTimes(1);
    expect(later.parentElement).toBe(host);
    retain(new ToolbarUI(params));
    selected(0, replacementOffset);
    expect(getToolbar().style.top).toBe('80px');
    expect(element.style.top).toBe('40px');
  });

  it('should release the toolbox once and stop handling later tool/open events', () => {
    const toolbox = retain(new ToolboxUI(params));
    const popover = TestPopover.instances[0];
    const closed = jest.fn();
    const tool = { name: 'paragraph',
      options: {},
      isBlock: () => true };

    eventBus.addEventListener('ui:toolbox:closed', closed);
    emit(`core:${CoreEventType.ToolLoaded}`, { tool });
    expect(popover.addItem).toHaveBeenCalledTimes(1);
    selected(2);
    popover.items[0].onActivate?.();
    expect(insert).toHaveBeenLastCalledWith({ type: 'paragraph',
      data: {},
      index: 3,
      focus: true });
    emit('ui:toolbox:open');
    expect(popover.show).toHaveBeenCalledTimes(1);
    popover.callbacks.get('closed')?.();
    expect(closed).toHaveBeenCalledTimes(1);
    toolbox.destroy();
    toolbox.destroy();
    expect(popover.destroy).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
    emit(`core:${CoreEventType.ToolLoaded}`, { tool });
    emit('ui:toolbox:open');
    expect(popover.addItem).toHaveBeenCalledTimes(1);
    expect(popover.show).toHaveBeenCalledTimes(1);
    retain(new ToolboxUI(params));
    emit(`core:${CoreEventType.ToolLoaded}`, { tool });
    emit('ui:toolbox:open');
    expect(TestPopover.instances[1].addItem).toHaveBeenCalledTimes(1);
    expect(TestPopover.instances[1].show).toHaveBeenCalledTimes(1);
    expect(popover.show).toHaveBeenCalledTimes(1);
  });

  it('should render inline tools while active and dispose once on destruction', async () => {
    const getHolder = rendered('ui:inline-toolbar:rendered', 'toolbar');
    const toolbar = retain(new InlineToolbarUI(params));
    const config = jest.fn(() => ({ type: 'default',
      icon: 'B' }));

    selection(config);
    await flushRender();
    expect(config).toHaveBeenCalledTimes(1);
    expect(TestPopover.instances).toHaveLength(1);

    const popover = TestPopover.instances[0];

    expect(getHolder().contains(popover.element)).toBe(true);
    expect(popover.show).toHaveBeenCalledTimes(1);
    toolbar.destroy();
    toolbar.destroy();
    expect(popover.destroy).toHaveBeenCalledTimes(1);
    selection(config);
    await flushRender();
    expect(config).toHaveBeenCalledTimes(1);
    retain(new InlineToolbarUI(params));
    selection(config);
    await flushRender();
    expect(config).toHaveBeenCalledTimes(2);
    expect(TestPopover.instances).toHaveLength(2);
  });

  it('should not create a popover when an in-flight config resolves after destruction', async () => {
    const getHolder = rendered('ui:inline-toolbar:rendered', 'toolbar');
    const toolbar = retain(new InlineToolbarUI(params));
    const holder = getHolder();
    let resolveConfig!: (value: { type: string;
      icon: string; }) => void;
    const pending = new Promise<{ type: string;
      icon: string; }>((resolve) => {
      resolveConfig = resolve;
    });
    const config = jest.fn(() => pending);

    selection(config);
    expect(config).toHaveBeenCalledTimes(1);
    toolbar.destroy();
    resolveConfig({ type: 'default',
      icon: 'B' });
    await flushRender();
    expect(TestPopover.instances).toHaveLength(0);
    expect(holder.childElementCount).toBe(0);
    expect(holder.style.top).toBe('');
    expect(holder.isConnected).toBe(false);
  });
});

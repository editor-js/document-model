import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { KeyAddedEvent, KeyRemovedEvent, ToolType, ValueNodeChangedEvent } from '@editorjs/sdk';
import type { EditorAPI } from '@editorjs/sdk';
import type { DOMBlockToolAdapter } from '@editorjs/dom-adapters';
import { Header } from './index.js';
import type { HeaderData, HeaderConfig, HeadingLevel } from './index.js';

function createMockAdapter() {
  const base = new EventTarget();
  const realAddEventListener = base.addEventListener.bind(base);

  return Object.assign(base, {
    registerTextInputKey: jest.fn(),
    registerValueKey: jest.fn(),
    setInput: jest.fn(),
    getBlockId: jest.fn<() => string>().mockReturnValue('test-block-id'),
    getBlockIndex: jest.fn<() => number>().mockReturnValue(0),
    addEventListener: jest.fn(realAddEventListener),
  });
}

function createHeader(
  levelInput: unknown,
  configOverrides: Partial<HeaderConfig> = {}
): InstanceType<typeof Header> {
  return new Header({
    adapter: mockAdapter as unknown as DOMBlockToolAdapter,
    data: { level: levelInput } as unknown as HeaderData,
    config: configOverrides as HeaderConfig,
    api: {} as EditorAPI,
  } as never);
}

let mockAdapter: ReturnType<typeof createMockAdapter>;

beforeEach(() => {
  mockAdapter = createMockAdapter();
});

describe('Header', () => {
  describe('static fields', () => {
    it('should have type set to Block and name set to header', () => {
      expect(Header.type).toBe(ToolType.Block);
      expect(Header.name).toBe('header');
    });

    it('should have toolbox entries for levels 1, 2, and 3', () => {
      const { toolbox } = Header.options;
      expect(Array.isArray(toolbox)).toBe(true);
      const entries = toolbox as unknown as Array<{ title: string; data: { level: number } }>;
      expect(entries).toHaveLength(3);
      expect(entries[0].data.level).toBe(1);
      expect(entries[1].data.level).toBe(2);
      expect(entries[2].data.level).toBe(3);
    });

    it('should have conversionConfig with import and export pointing to the text key', () => {
      const { conversionConfig } = Header.options;
      expect(conversionConfig).toEqual({ import: 'text', export: 'text' });
    });

    it('should have canBeSplit set to false', () => {
      expect(Header.options.canBeSplit).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should register text and level data nodes and subscribe to adapter events', () => {
      createHeader(2);

      expect(mockAdapter.registerTextInputKey).toHaveBeenCalledWith('text', undefined);
      expect(mockAdapter.registerValueKey).toHaveBeenCalledWith('level', 2);
      expect(mockAdapter.addEventListener).toHaveBeenCalledWith(
        'adapter:updated',
        expect.any(Function)
      );
    });

    describe('level normalisation via registerValueKey', () => {
      it.each([1, 2, 3, 4, 5, 6] as const)(
        'should register level %i as-is when data.level is a valid integer',
        (level) => {
          createHeader(level);
          expect(mockAdapter.registerValueKey).toHaveBeenCalledWith('level', level);
        }
      );

      it.each([undefined, null, 'text', 0, 7, -1, 1.5])(
        'should register default level 2 when data.level is %p',
        (level) => {
          createHeader(level);
          expect(mockAdapter.registerValueKey).toHaveBeenCalledWith('level', 2);
        }
      );

      it('should use config.defaultLevel when raw level is invalid', () => {
        createHeader(undefined, { defaultLevel: 4 });
        expect(mockAdapter.registerValueKey).toHaveBeenCalledWith('level', 4);
      });

      it('should fall back to 2 when both data.level and config.defaultLevel are invalid', () => {
        createHeader(undefined, { defaultLevel: 99 as HeadingLevel });
        expect(mockAdapter.registerValueKey).toHaveBeenCalledWith('level', 2);
      });
    });
  });

  describe('render()', () => {
    it('should return an HTMLElement', () => {
      const header = createHeader(2);
      expect(header.render()).toBeInstanceOf(HTMLElement);
    });

    it('should return the same element on subsequent calls', () => {
      const header = createHeader(2);
      expect(header.render()).toBe(header.render());
    });
  });

  describe('#onUpdate — KeyAddedEvent text', () => {
    it.each([1, 2, 3, 4, 5, 6] as const)(
      'should create h%i, call setInput, and append to wrapper when text key is added with level %i',
      (level) => {
        const header = createHeader(level);
        const wrapper = header.render();

        mockAdapter.dispatchEvent(new KeyAddedEvent('text'));

        const heading = wrapper.querySelector(`h${level}`) as HTMLElement;
        expect(heading).not.toBeNull();
        expect(heading.contentEditable).toBe('true');
        expect(mockAdapter.setInput).toHaveBeenCalledWith('text', heading);
      }
    );

    it('should not react to KeyAddedEvent for keys other than text', () => {
      const header = createHeader(2);
      header.render();

      mockAdapter.dispatchEvent(new KeyAddedEvent('someOtherKey'));

      expect(mockAdapter.setInput).not.toHaveBeenCalled();
    });
  });

  describe('#onUpdate — KeyRemovedEvent text', () => {
    it('should call setInput with undefined and remove element from wrapper', () => {
      const header = createHeader(2);
      const wrapper = header.render();
      mockAdapter.dispatchEvent(new KeyAddedEvent('text'));
      expect(wrapper.firstElementChild).not.toBeNull();

      mockAdapter.setInput.mockClear();
      mockAdapter.dispatchEvent(new KeyRemovedEvent('text'));

      expect(mockAdapter.setInput).toHaveBeenCalledWith('text', undefined);
      expect(wrapper.firstElementChild).toBeNull();
    });

    it('should not react to KeyRemovedEvent for keys other than text', () => {
      const header = createHeader(2);
      header.render();
      mockAdapter.dispatchEvent(new KeyAddedEvent('text'));
      mockAdapter.setInput.mockClear();

      mockAdapter.dispatchEvent(new KeyRemovedEvent('someOtherKey'));

      expect(mockAdapter.setInput).not.toHaveBeenCalled();
    });
  });

  describe('#onUpdate — ValueNodeChangedEvent level', () => {
    function setupWithHeading(initialLevel: HeadingLevel): {
      header: InstanceType<typeof Header>;
      wrapper: HTMLElement;
    } {
      const header = createHeader(initialLevel);
      const wrapper = header.render();
      mockAdapter.dispatchEvent(new KeyAddedEvent('text'));
      mockAdapter.setInput.mockClear();
      return { header, wrapper };
    }

    it.each<[HeadingLevel, HeadingLevel]>([[2, 1], [1, 6], [3, 4]])(
      'should replace h%i with h%i and call setInput with new element when level changes',
      (from, to) => {
        const { wrapper } = setupWithHeading(from);

        mockAdapter.dispatchEvent(new ValueNodeChangedEvent('level', to));

        const heading = wrapper.querySelector(`h${to}`) as HTMLElement;
        expect(heading).not.toBeNull();
        expect(mockAdapter.setInput).toHaveBeenCalledWith('text', heading);
      }
    );

    it('should not recreate the element when the level value is identical', () => {
      const { wrapper } = setupWithHeading(2);
      const originalHeading = wrapper.querySelector('h2');

      mockAdapter.dispatchEvent(new ValueNodeChangedEvent('level', 2));

      expect(wrapper.querySelector('h2')).toBe(originalHeading);
      expect(mockAdapter.setInput).not.toHaveBeenCalled();
    });

    it('should not react to ValueNodeChangedEvent for keys other than level', () => {
      const { wrapper } = setupWithHeading(2);
      const originalHeading = wrapper.querySelector('h2');

      mockAdapter.dispatchEvent(new ValueNodeChangedEvent('someOtherKey', 'value'));

      expect(wrapper.querySelector('h2')).toBe(originalHeading);
      expect(mockAdapter.setInput).not.toHaveBeenCalled();
    });
  });
});

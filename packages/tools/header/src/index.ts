import type { ToolConfig } from '@editorjs/editorjs';
import type { TextNodeSerialized } from '@editorjs/model';
import type {
  BlockTool,
  BlockToolConstructor,
  BlockToolConstructorOptions,
  BlockToolData,
} from '@editorjs/sdk';
import { KeyAddedEvent, KeyRemovedEvent, ToolType, ValueNodeChangedEvent } from '@editorjs/sdk';
import type { DOMBlockToolAdapter } from '@editorjs/dom-adapters';
import { IconH1, IconH2, IconH3 } from '@codexteam/icons';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeaderData = BlockToolData<{
  text: TextNodeSerialized;
  level: HeadingLevel;
}>;

export type HeaderConfig = ToolConfig<{
  placeholder?: string;
  defaultLevel?: HeadingLevel;
  levels?: HeadingLevel[];
}>;

export class Header implements BlockTool<HeaderData, HeaderConfig> {
  public static type = ToolType.Block as const;
  public static name = 'header';
  public static readonly options = {
    toolbox: [
      { title: 'Heading 1', icon: IconH1, data: { level: 1 as HeadingLevel } },
      { title: 'Heading 2', icon: IconH2, data: { level: 2 as HeadingLevel } },
      { title: 'Heading 3', icon: IconH3, data: { level: 3 as HeadingLevel } },
    ],
    conversionConfig: {
      import: 'text',
      export: 'text',
    },
    canBeSplit: false as const,
  };

  static readonly #defaultLevel: HeadingLevel = 2;
  static readonly #minLevel = 1;
  static readonly #maxLevel = 6;

  #adapter: DOMBlockToolAdapter;
  #config: HeaderConfig;
  #currentLevel: HeadingLevel;
  #wrapper: HTMLDivElement | undefined;
  #headingEl: HTMLElement | undefined;

  constructor({ adapter, data, config }: BlockToolConstructorOptions<HeaderData, HeaderConfig, DOMBlockToolAdapter>) {
    this.#adapter = adapter;
    this.#config = config ?? {} as HeaderConfig;

    const level = this.#normalizeLevel(data?.level);
    this.#currentLevel = level;

    adapter.addEventListener('adapter:updated', this.#onUpdate);
    adapter.registerTextInputKey('text', data?.text);
    adapter.registerValueKey<HeadingLevel>('level', level);
  }

  public render(): HTMLElement {
    if (this.#wrapper === undefined) {
      this.#wrapper = document.createElement('div');
    }
    return this.#wrapper;
  }

  #normalizeLevel(raw: unknown): HeadingLevel {
    if (
      typeof raw === 'number' &&
      Number.isInteger(raw) &&
      raw >= Header.#minLevel &&
      raw <= Header.#maxLevel
    ) {
      return raw as HeadingLevel;
    }
    const fallback = this.#config.defaultLevel;
    if (
      fallback !== undefined &&
      Number.isInteger(fallback) &&
      fallback >= Header.#minLevel &&
      fallback <= Header.#maxLevel
    ) {
      return fallback;
    }
    return Header.#defaultLevel;
  }

  #createHeadingEl(level: HeadingLevel): HTMLElement {
    const el = document.createElement(`h${level}`);
    el.style.outline = 'none';
    el.style.whiteSpace = 'pre-wrap';
    el.style.margin = '0';
    el.style.minHeight = '1em';
    el.contentEditable = 'true';
    return el;
  }

  #swapHeadingTag(level: HeadingLevel): void {
    if (this.#headingEl === undefined) {
      return;
    }
    const newEl = this.#createHeadingEl(level);
    this.#headingEl.replaceWith(newEl);
    this.#headingEl = newEl;
    this.#adapter.setInput('text', newEl);
  }

  #onUpdate = (event: Event): void => {
    if (event instanceof KeyAddedEvent) {
      if (event.detail.key !== 'text') {
        return;
      }
      const el = this.#createHeadingEl(this.#currentLevel);
      this.#headingEl = el;
      this.#wrapper?.append(el);
      this.#adapter.setInput('text', el);
    } else if (event instanceof KeyRemovedEvent) {
      if (event.detail.key !== 'text') {
        return;
      }
      this.#adapter.setInput('text', undefined);
      this.#headingEl?.remove();
      this.#headingEl = undefined;
    } else if (event instanceof ValueNodeChangedEvent) {
      if (event.detail.key !== 'level') {
        return;
      }
      const newLevel = this.#normalizeLevel(event.detail.value);
      if (newLevel === this.#currentLevel) {
        return;
      }
      this.#currentLevel = newLevel;
      this.#swapHeadingTag(newLevel);
    }
  };
}

Header satisfies BlockToolConstructor<HeaderData, HeaderConfig, DOMBlockToolAdapter>;

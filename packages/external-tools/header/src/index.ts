import type { ToolConfig } from '@editorjs/editorjs';
import type { TextNodeSerialized } from '@editorjs/model';
import type {
  BlockTool,
  BlockToolAdapter,
  BlockToolConstructorOptions,
  BlockToolData
} from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import Style from './index.module.pcss';

/**
 * Heading levels supported by the Header tool
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Data structure describing the tool's input/output data
 */
export type HeaderData = BlockToolData<{
  /**
   * Text content of the heading
   */
  text: TextNodeSerialized;

  /**
   * Heading level (1–6)
   */
  level: HeadingLevel;
}>;

/**
 * User-end configuration for the tool
 */
export type HeaderConfig = ToolConfig<{
  /**
   * Placeholder for an empty heading
   */
  placeholder?: string;

  /**
   * Default heading level when none is provided
   */
  defaultLevel?: HeadingLevel;

  /**
   * Heading levels available to the user
   */
  levels?: HeadingLevel[];
}>;

/**
 * Header block tool
 */
export class Header implements BlockTool<HeaderData, HeaderConfig> {
  public static type = ToolType.Block as const;

  public static name = 'header';

  /**
   * Minimum valid HTML heading level
   */
  static readonly #minLevel = 1;

  /**
   * Maximum HTML heading level (h6)
   */
  static readonly #maxLevel = 2 + 2 + 2;

  /**
   * Adapter for linking block data with the DOM
   */
  #adapter: BlockToolAdapter;

  /**
   * Tool's input/output data
   */
  #data: HeaderData;

  /**
   * User-end configuration
   */
  #config: HeaderConfig;

  /**
   * @param options - Block tool constructor options
   */
  constructor({ adapter, data, config }: BlockToolConstructorOptions<HeaderData, HeaderConfig>) {
    this.#adapter = adapter;
    this.#data = data;
    this.#config = config ?? {};
  }

  /**
   * Normalizes a raw value to a valid HeadingLevel (1–6).
   * If `config.levels` is provided, the value must also be present in that list.
   * Falls back to the configured default level, then to 2.
   * @param raw - Raw level value from persisted data or config
   */
  #normalizeLevel(raw: unknown): HeadingLevel {
    const fallback: HeadingLevel = this.#config.defaultLevel ?? 2;
    const allowed = this.#config.levels;
    const isGloballyValid = typeof raw === 'number'
      && Number.isInteger(raw)
      && raw >= Header.#minLevel
      && raw <= Header.#maxLevel;
    const candidate = isGloballyValid ? raw as HeadingLevel : null;

    if (candidate !== null && (allowed === undefined || allowed.includes(candidate))) {
      return candidate;
    }

    if (allowed !== undefined && !allowed.includes(fallback)) {
      return allowed[0] ?? 2;
    }

    return fallback;
  }

  /**
   * Returns the current heading level, normalized to a valid value
   */
  get #level(): HeadingLevel {
    return this.#normalizeLevel(this.#data.level ?? this.#config.defaultLevel);
  }

  /**
   * Creates the heading element
   */
  public render(): HTMLElement {
    const tag = `h${this.#level}` as keyof HTMLElementTagNameMap;
    const heading = document.createElement(tag) as HTMLHeadingElement;

    heading.classList.add(Style['header']);
    heading.contentEditable = 'true';

    this.#adapter.attachInput('text', heading);

    return heading;
  }
}

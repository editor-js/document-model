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
   * Returns the current heading level, falling back to the configured default or 2
   */
  get #level(): HeadingLevel {
    return this.#data.level ?? this.#config.defaultLevel ?? 2;
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

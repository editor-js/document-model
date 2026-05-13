import {
  BlockIndexOrId,
  createDataKey,
  createInlineToolData,
  createInlineToolName,
  EditorJSModel, InlineFragment
} from '@editorjs/model';
import type { CoreConfigValidated } from '@editorjs/sdk';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens';
import { TextAPI as TextAPIInterface } from '@editorjs/sdk';

/**
 * Text API to work with the text content of the document
 */
@injectable()
export class TextAPI implements TextAPIInterface {
  /**
   * EditorJS Model instance
   */
  #model: EditorJSModel;

  /**
   * Validated Editor's Config
   */
  #config: CoreConfigValidated;

  /**
   * Class constructor function
   * @param config - Editor's validated config
   * @param model - EditorJS model instance
   */
  constructor(
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated,
    model: EditorJSModel
  ) {
    this.#model = model;
    this.#config = config;
  }

  /**
   * Inserts text at a given position
   * @param text - new text to insert
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - start offset
   */
  public insert(
    text: string,
    blockIndexOrId: number | string,
    dataKey: string,
    start?: number
  ): void {
    this.#model.insertText(
      this.#config.userId,
      blockIndexOrId as BlockIndexOrId,
      createDataKey(dataKey),
      text,
      start
    );
  }

  /**
   * Removes text from a given range. Returns removed text
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   */
  public remove(
    blockIndexOrId: number | string,
    dataKey: string,
    start?: number,
    end?: number
  ): string {
    return this.#model.removeText(
      this.#config.userId,
      blockIndexOrId as BlockIndexOrId,
      createDataKey(dataKey),
      start,
      end
    );
  }

  /**
   * Formats the given range
   * @param tool - tool to apply
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   * @param data - optional tool's data
   */
  public format(
    tool: string,
    blockIndexOrId: number | string,
    dataKey: string,
    start: number,
    end: number,
    data?: Record<string, unknown>
  ): void {
    this.#model.format(
      this.#config.userId,
      blockIndexOrId as BlockIndexOrId,
      createDataKey(dataKey),
      createInlineToolName(tool),
      start,
      end,
      data !== undefined ? createInlineToolData(data) : undefined
    );
  }

  /**
   * Unformats the given range
   * @param tool - tool to remove
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   */
  public unformat(
    tool: string,
    blockIndexOrId: number | string,
    dataKey: string,
    start: number,
    end: number
  ): void {
    this.#model.unformat(
      this.#config.userId,
      blockIndexOrId as BlockIndexOrId,
      createDataKey(dataKey),
      createInlineToolName(tool),
      start,
      end
    );
  }

  /**
   * Returns applied inline fragments for a given range
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   * @param tool - optional filter tool. If provided, will return only fragments of the given tool
   */
  public getFragments(
    blockIndexOrId: number | string,
    dataKey: string,
    start?: number,
    end?: number,
    tool?: string
  ): InlineFragment[] {
    return this.#model.getFragments(
      blockIndexOrId as BlockIndexOrId,
      createDataKey(dataKey),
      start,
      end,
      tool !== undefined ? createInlineToolName(tool) : undefined
    );
  }

  /**
   * Returns text content of the text node
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   */
  public get(
    blockIndexOrId: number | string,
    dataKey: string
  ): string {
    return this.#model.getText(
      blockIndexOrId as BlockIndexOrId,
      createDataKey(dataKey)
    );
  }
}

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
   * @param params - insert parameters
   * @param params.text - new text to insert
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - start offset
   * @param [params.userId] - user id to attribute the change to
   */
  public insert({ text, block, key, start, userId = this.#config.userId }: Parameters<TextAPIInterface['insert']>[0]): void {
    this.#model.insertText(
      userId,
      block as BlockIndexOrId,
      createDataKey(key),
      text,
      start
    );
  }

  /**
   * Removes text from a given range. Returns removed text
   * @param params - remove parameters
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param [params.userId] - user id to attribute the change to
   */
  public remove({ block, key, start, end, userId = this.#config.userId }: Parameters<TextAPIInterface['remove']>[0]): string {
    return this.#model.removeText(
      userId,
      block as BlockIndexOrId,
      createDataKey(key),
      start,
      end
    );
  }

  /**
   * Formats the given range
   * @param params - format parameters
   * @param params.tool - tool to apply
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param params.data - optional tool's data
   * @param [params.userId] - user id to attribute the change to
   */
  public format({ tool, block, key, start, end, data, userId = this.#config.userId }: Parameters<TextAPIInterface['format']>[0]): void {
    this.#model.format(
      userId,
      block as BlockIndexOrId,
      createDataKey(key),
      createInlineToolName(tool),
      start,
      end,
      data !== undefined ? createInlineToolData(data) : undefined
    );
  }

  /**
   * Unformats the given range
   * @param params - unformat parameters
   * @param params.tool - tool to remove
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param [params.userId] - user id to attribute the change to
   */
  public unformat({ tool, block, key, start, end, userId = this.#config.userId }: Parameters<TextAPIInterface['unformat']>[0]): void {
    this.#model.unformat(
      userId,
      block as BlockIndexOrId,
      createDataKey(key),
      createInlineToolName(tool),
      start,
      end
    );
  }

  /**
   * Returns applied inline fragments for a given range
   * @param params - getFragments parameters
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param params.tool - optional filter tool. If provided, will return only fragments of the given tool
   */
  public getFragments({ block, key, start, end, tool }: Parameters<TextAPIInterface['getFragments']>[0]): InlineFragment[] {
    return this.#model.getFragments(
      block as BlockIndexOrId,
      createDataKey(key),
      start,
      end,
      tool !== undefined ? createInlineToolName(tool) : undefined
    );
  }

  /**
   * Returns text content of the text node
   * @param params - get parameters
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   */
  public get({ block, key }: Parameters<TextAPIInterface['get']>[0]): string {
    return this.#model.getText(
      block as BlockIndexOrId,
      createDataKey(key)
    );
  }
}

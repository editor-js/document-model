import { EditorDocument } from './entities';

/**
 * EditorJSModel is a wrapper around EditorDocument that prevent access to  internal structures
 */
export class EditorJSModel {
  #document: EditorDocument;

  /**
   * Returns serialized data associated with the document
   *
   * Data contains:
   * - blocks - array of serialized blocks
   * - properties - JSON object with document properties (eg read-only)
   */
  public get serialized(): EditorDocument['serialized'] {
    return this.#document.serialized;
  }

  /**
   * Returns count of child BlockNodes of the EditorDocument.
   */
  public get length(): EditorDocument['length'] {
    return this.#document.length;
  }

  /**
   * Returns the serialised properties of the EditorDocument.
   */
  public get properties(): EditorDocument['properties'] {
    return this.#document.properties;
  }

  /**
   * Constructor for EditorJSModel class.
   *
   * @param [parameters] - EditorDocument constructor arguments.
   * @param [parameters.children] - The child BlockNodes of the EditorDocument.
   * @param [parameters.properties] - The properties of the document.
   * @param [parameters.toolsRegistry] - ToolsRegistry instance for the current document. Defaults to a new ToolsRegistry instance.
   */
  constructor(...parameters: ConstructorParameters<typeof EditorDocument>) {
    this.#document = new EditorDocument(...parameters);
  }

  /**
   * Returns property by name.
   * Returns undefined if property does not exist.
   *
   * @param parameters - getProperty method parameters
   * @param parameters.name - The name of the property to return
   */
  public getProperty(...parameters: Parameters<EditorDocument['getProperty']>): ReturnType<EditorDocument['getProperty']> {
    return this.#document.getProperty(...parameters);
  }

  /**
   * Updates a property of the EditorDocument.
   * Adds the property if it does not exist.
   *
   * @param parameters - setProperty method parameters
   * @param parameters.name - The name of the property to update
   * @param parameters.value - The value to update the property with
   */
  public setProperty(...parameters: Parameters<EditorDocument['setProperty']>): ReturnType<EditorDocument['setProperty']> {
    return this.#document.setProperty(...parameters);
  }

  /**
   * Adds a BlockNode to the EditorDocument at the specified index.
   * If no index is provided, the BlockNode will be added to the end of the array.
   *
   * @param parameters - addBlock method parameters
   * @param parameters.blockNodeData - The data to create the BlockNode with
   * @param parameters.index - The index at which to add the BlockNode
   * @throws Error if the index is out of bounds
   */
  public addBlock(...parameters: Parameters<EditorDocument['addBlock']>): ReturnType<EditorDocument['addBlock']> {
    return this.#document.addBlock(...parameters);
  }


  /**
   * Removes a BlockNode from the EditorDocument at the specified index.
   *
   * @param parameters - removeBlock method parameters
   * @param parameters.index - The index of the BlockNode to remove
   * @throws Error if the index is out of bounds
   */
  public removeBlock(...parameters: Parameters<EditorDocument['removeBlock']>): ReturnType<EditorDocument['removeBlock']> {
    return this.#document.removeBlock(...parameters);
  }

  /**
   * Updates the ValueNode data associated with the BlockNode at the specified index.
   *
   * @param parameters - updateValue method parameters
   * @param parameters.blockIndex - The index of the BlockNode to update
   * @param parameters.dataKey - The key of the ValueNode to update
   * @param parameters.value - The new value of the ValueNode
   * @throws Error if the index is out of bounds
   */
  public updateValue(...parameters: Parameters<EditorDocument['updateValue']>): ReturnType<EditorDocument['updateValue']> {
    return this.#document.updateValue(...parameters);
  }

  /**
   * Updates BlockTune data associated with the BlockNode at the specified index.
   *
   * @param parameters - updateTuneData method parameters
   * @param parameters.blockIndex - The index of the BlockNode to update
   * @param parameters.tuneName - The name of the BlockTune to update
   * @param parameters.data - The data to update the BlockTune with
   * @throws Error if the index is out of bounds
   */
  public updateTuneData(...parameters: Parameters<EditorDocument['updateTuneData']>): ReturnType<EditorDocument['updateTuneData']> {
    return this.#document.updateTuneData(...parameters);
  }

  /**
   * Inserts text to the specified block
   *
   * @param parameters - insertText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param parameters.text - text to insert
   * @param [parameters.start] - char index where to insert text
   */
  public insertText(...parameters: Parameters<EditorDocument['insertText']>): ReturnType<EditorDocument['insertText']> {
    return this.#document.insertText(...parameters);
  }

  /**
   * Removes text from specified block
   *
   * @param parameters - removeText method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param [parameters.start] - start char index of the range
   * @param [parameters.end] - end char index of the range
   */
  public removeText(...parameters: Parameters<EditorDocument['removeText']>): ReturnType<EditorDocument['removeText']> {
    return this.#document.removeText(...parameters);
  }

  /**
   * Formats text in the specified block
   *
   * @param parameters - format method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.dataKey - key of the data
   * @param parameters.tool - name of the Inline Tool to apply
   * @param parameters.start - start char index of the range
   * @param parameters.end - end char index of the range
   * @param [parameters.data] - Inline Tool data if applicable
   */
  public format(...parameters: Parameters<EditorDocument['format']>): ReturnType<EditorDocument['format']> {
    return this.#document.format(...parameters);
  }

  /**
   * Removes formatting from the specified block
   *
   * @param parameters - unformat method parameters
   * @param parameters.blockIndex - index of the block
   * @param parameters.key - key of the data
   * @param parameters.tool - name of the Inline Tool to remove
   * @param parameters.start - start char index of the range
   * @param parameters.end - end char index of the range
   */
  public unformat(...parameters: Parameters<EditorDocument['unformat']>): ReturnType<EditorDocument['unformat']> {
    return this.#document.unformat(...parameters);
  }
}

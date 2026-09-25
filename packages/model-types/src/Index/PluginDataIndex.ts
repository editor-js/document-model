import type { PluginDataName } from '../PluginData.js';
import type { DocumentId } from '../indexing.js';
import { IndexBase, IndexKind } from './IndexBase.js';

/**
 * Index scoped to one key of one plugin's per-block data
 */
export class PluginDataIndex extends IndexBase {
  readonly #blockIndex: number;
  readonly #pluginName: PluginDataName;
  readonly #pluginKey: string;
  readonly #documentId?: DocumentId;

  /**
   * @param blockIndex - zero-based block position
   * @param pluginName - name of the plugin owning the data
   * @param pluginKey - key within the plugin's data
   * @param documentId - optional document identifier
   */
  constructor(
    blockIndex: number,
    pluginName: PluginDataName,
    pluginKey: string,
    documentId?: DocumentId
  ) {
    super(IndexKind.PluginData);
    this.#blockIndex = blockIndex;
    this.#pluginName = pluginName;
    this.#pluginKey = pluginKey;
    this.#documentId = documentId;
  }

  /**
   * The zero-based position of the indexed block
   */
  public get blockIndex(): number {
    return this.#blockIndex;
  }

  /**
   * The name of the plugin owning the indexed data
   */
  public get pluginName(): PluginDataName {
    return this.#pluginName;
  }

  /**
   * The key within the plugin's data
   */
  public get pluginKey(): string {
    return this.#pluginKey;
  }

  /**
   * The unique identifier of the indexed document
   */
  public override get documentId(): DocumentId | undefined {
    return this.#documentId;
  }

  /**
   * @param blockIndex - updated block position
   */
  public override withBlockIndex(blockIndex: number): PluginDataIndex {
    return new PluginDataIndex(blockIndex, this.#pluginName, this.#pluginKey, this.#documentId);
  }

  /**
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): PluginDataIndex {
    return new PluginDataIndex(this.#blockIndex, this.#pluginName, this.#pluginKey, documentId);
  }

  /**
   * Creates a deep copy
   */
  public clone(): PluginDataIndex {
    return new PluginDataIndex(
      this.#blockIndex,
      this.#pluginName,
      this.#pluginKey,
      this.#documentId
    );
  }

  /**
   * Serializes to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      k: 'plugin',
      b: this.#blockIndex,
      plugin: this.#pluginName,
      key: this.#pluginKey,
      ...(this.#documentId !== undefined && { id: this.#documentId }),
    });
  }
}

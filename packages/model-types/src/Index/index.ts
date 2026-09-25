export { IndexBase, IndexKind, type IndexFields, type TextSegment } from './IndexBase.js';
export { DocumentIndex } from './DocumentIndex.js';
export { PropertyIndex } from './PropertyIndex.js';
export { BlockIndex } from './BlockIndex.js';
export { PluginDataIndex } from './PluginDataIndex.js';
export { DataIndex } from './DataIndex.js';
export { TextIndex } from './TextIndex.js';
export { PartialIndex } from './PartialIndex.js';

import { IndexBase, IndexKind, type TextSegment } from './IndexBase.js';
import type { DocumentId } from '../indexing.js';
import type { PluginDataName } from '../PluginData.js';
import type { DataKey } from '../DataKey.js';
import type { TextRange } from '../Text.js';
import { DocumentIndex } from './DocumentIndex.js';
import { PropertyIndex } from './PropertyIndex.js';
import { BlockIndex } from './BlockIndex.js';
import { PluginDataIndex } from './PluginDataIndex.js';
import { DataIndex } from './DataIndex.js';
import { TextIndex } from './TextIndex.js';

/**
 * Shape of the JSON object produced when serializing a single-segment TextIndex
 */
interface SerializedTextSegment {
  /** Block index */
  b: number;
  /** Data key */
  data: DataKey;
  /** Text range */
  r: TextRange;
  /** Document identifier */
  id?: DocumentId;
}

/**
 * Parsed serialized index structure used in {@link Index.parse}
 */
interface ParsedIndex {
  /** Kind discriminator */
  k: string;
  [key: string]: unknown;
}

/**
 * Parses a single serialized text segment into a {@link TextSegment}
 * @param seg - serialized segment object
 */
function parseSegmentObject(seg: SerializedTextSegment): TextSegment {
  return {
    blockIndex: seg.b,
    dataKey: seg.data,
    textRange: seg.r,
    documentId: seg.id,
  };
}

/**
 * Factory class for all document model index types.
 * Extends IndexBase with static factory methods; concrete subclasses extend IndexBase directly.
 *
 * Symbol.hasInstance is overridden so that `value instanceof Index` returns true
 * for any IndexBase instance, preserving the expected runtime behaviour even
 * though concrete classes extend IndexBase rather than Index.
 */
export abstract class Index extends IndexBase {
  /**
   * Returns true for any IndexBase instance, keeping `instanceof Index` consistent
   * with the expected public API even though concrete classes extend IndexBase directly.
   * @param instance - value to test
   */
  public static [Symbol.hasInstance](instance: unknown): boolean {
    return instance instanceof IndexBase;
  }

  /**
   * Creates a DocumentIndex
   * @param documentId - unique document identifier
   */
  public static document(documentId: DocumentId): DocumentIndex {
    return new DocumentIndex(documentId);
  }

  /**
   * Creates a PropertyIndex
   * @param propertyName - name of the document property
   * @param documentId - optional document identifier
   */
  public static property(
    propertyName: string,
    documentId?: DocumentId
  ): PropertyIndex {
    return new PropertyIndex(propertyName, documentId);
  }

  /**
   * Creates a BlockIndex
   * @param blockIndex - zero-based block position
   * @param documentId - optional document identifier
   */
  public static block(
    blockIndex: number,
    documentId?: DocumentId
  ): BlockIndex {
    return new BlockIndex(blockIndex, documentId);
  }

  /**
   * Creates a PluginDataIndex
   * @param blockIndex - zero-based block position
   * @param pluginName - name of the plugin owning the data
   * @param pluginKey - key within the plugin's data
   * @param documentId - optional document identifier
   */
  public static pluginData(
    blockIndex: number,
    pluginName: PluginDataName,
    pluginKey: string,
    documentId?: DocumentId
  ): PluginDataIndex {
    return new PluginDataIndex(blockIndex, pluginName, pluginKey, documentId);
  }

  /**
   * Creates a DataIndex
   * @param blockIndex - zero-based block position
   * @param dataKey - key identifying block data
   * @param documentId - optional document identifier
   */
  public static data(
    blockIndex: number,
    dataKey: DataKey,
    documentId?: DocumentId
  ): DataIndex {
    return new DataIndex(blockIndex, dataKey, documentId);
  }

  /**
   * Creates a TextIndex from one or more text segments
   * @param segments - one or more text segments
   */
  public static text(segments: TextSegment[]): TextIndex {
    return new TextIndex(segments);
  }

  /**
   * Deserializes a JSON string produced by {@link IndexBase.serialize} back into an Index instance
   * @param serialized - JSON string produced by serialize()
   */
  public static parse(serialized: string): IndexBase {
    const obj = JSON.parse(serialized) as ParsedIndex;

    if (typeof obj !== 'object' || obj === null || typeof obj.k !== 'string') {
      throw new Error(
        'Invalid serialized index: must be a JSON object with a "k" field'
      );
    }

    switch (obj.k) {
      case 'doc':
        return new DocumentIndex(obj.id as DocumentId);

      case 'prop':
        return new PropertyIndex(
          obj.name as string,
          obj.id as DocumentId | undefined
        );

      case 'block':
        return new BlockIndex(
          obj.b as number,
          obj.id as DocumentId | undefined
        );

      case 'plugin':
        return new PluginDataIndex(
          obj.b as number,
          obj.plugin as PluginDataName,
          obj.key as string,
          obj.id as DocumentId | undefined
        );

      case 'data':
        return new DataIndex(
          obj.b as number,
          obj.data as DataKey,
          obj.id as DocumentId | undefined
        );

      case 'text':
        return new TextIndex([
          parseSegmentObject(obj as unknown as SerializedTextSegment),
        ]);

      case 'composite':
        return new TextIndex(
          (obj.segs as SerializedTextSegment[]).map(parseSegmentObject)
        );

      default:
        throw new Error(`Unknown index kind: ${obj.k}`);
    }
  }

  /**
   * Merges one or more TextIndex instances into a single composite TextIndex
   * @param segments - array of Index instances (must all be TextIndex)
   */
  public static fromCompositeSegments(segments: IndexBase[]): TextIndex {
    if (segments.length === 0) {
      throw new Error('fromCompositeSegments requires at least one segment');
    }

    const textSegments = segments.flatMap((s) => {
      if (s.kind !== IndexKind.Text) {
        throw new Error('fromCompositeSegments requires text index instances');
      }

      return (s as TextIndex).segments as TextSegment[];
    });

    return new TextIndex(textSegments);
  }
}

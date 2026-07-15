import type { DataKey } from '../DataKey.js';
import type { DocumentId } from '../indexing.js';
import type { TextRange } from '../Text.js';
import { IndexBase, IndexKind, type TextSegment } from './IndexBase.js';

/**
 * Index scoped to one or more inline text ranges.
 * A single-segment instance represents a simple text index;
 * a multi-segment instance is a composite covering disjoint ranges.
 */
export class TextIndex extends IndexBase {
  #segments: TextSegment[];

  /**
   * @param segments - one or more text segments
   */
  constructor(segments: TextSegment[]) {
    if (segments.length === 0) {
      throw new Error('TextIndex requires at least one segment');
    }
    super(IndexKind.Text);
    this.#segments = segments;
  }

  /**
   * Read-only view of all segments in this index
   */
  public get segments(): readonly TextSegment[] {
    return this.#segments;
  }

  /**
   * True when this index has exactly one segment
   */
  public get isTextIndex(): boolean {
    return this.#segments.length === 1;
  }

  /**
   * True when this index has more than one segment
   */
  public get isComposite(): boolean {
    return this.#segments.length > 1;
  }

  /**
   * Block index of the sole segment; undefined for composite instances
   */
  public get blockIndex(): number | undefined {
    return this.#segments.length === 1
      ? this.#segments[0].blockIndex
      : undefined;
  }

  /**
   * Data key of the sole segment; undefined for composite instances
   */
  public get dataKey(): DataKey | undefined {
    return this.#segments.length === 1
      ? this.#segments[0].dataKey
      : undefined;
  }

  /**
   * Text range of the sole segment; undefined for composite instances
   */
  public get textRange(): TextRange | undefined {
    return this.#segments.length === 1
      ? this.#segments[0].textRange
      : undefined;
  }

  /**
   * Document identifier of the sole segment; undefined for composite instances
   */
  public override get documentId(): DocumentId | undefined {
    return this.#segments.length === 1
      ? this.#segments[0].documentId
      : undefined;
  }

  /**
   * Expands each segment into its own single-segment TextIndex
   */
  public getTextSegments(): TextIndex[] {
    return this.#segments.map(seg => new TextIndex([seg]));
  }

  /**
   * Returns a new TextIndex with the block index updated across all segments
   * @param blockIndex - updated block position
   */
  public override withBlockIndex(blockIndex: number): TextIndex {
    return new TextIndex(
      this.#segments.map(seg => ({
        ...seg,
        blockIndex,
      }))
    );
  }

  /**
   * Returns a new single-segment TextIndex with the text range replaced.
   * Throws if this is a composite (multi-segment) index.
   * @param textRange - updated character range
   */
  public override withTextRange(textRange: TextRange): TextIndex {
    if (this.#segments.length !== 1) {
      throw new Error('withTextRange requires a single-segment TextIndex');
    }

    return new TextIndex([
      {
        ...this.#segments[0],
        textRange,
      },
    ]);
  }

  /**
   * Returns a new TextIndex with the document id updated across all segments
   * @param documentId - updated document identifier
   */
  public override withDocumentId(documentId: DocumentId): TextIndex {
    return new TextIndex(
      this.#segments.map(seg => ({
        ...seg,
        documentId,
      }))
    );
  }

  /**
   * Creates a deep copy
   */
  public clone(): TextIndex {
    return new TextIndex(this.#segments.map(seg => ({ ...seg })));
  }

  /**
   * Serializes to JSON. Single-segment instances produce a `text` object;
   * composite instances produce a `composite` object with a `segs` array.
   */
  public serialize(): string {
    if (this.#segments.length === 1) {
      return this.#serializeSegment(this.#segments[0]);
    }

    return JSON.stringify({
      k: 'composite',
      segs: this.#segments.map(seg => this.#segmentToJSON(seg)),
    });
  }

  /**
   * Converts a segment to its JSON representation (used inside composite serialization)
   * @param seg - segment to convert
   */
  #segmentToJSON(seg: TextSegment): object {
    return {
      b: seg.blockIndex,
      data: seg.dataKey,
      r: seg.textRange,
      ...(seg.documentId !== undefined && { id: seg.documentId }),
    };
  }

  /**
   * Serializes a single segment to a JSON string
   * @param seg - segment to serialize
   */
  #serializeSegment(seg: TextSegment): string {
    return JSON.stringify({
      k: 'text',
      b: seg.blockIndex,
      data: seg.dataKey,
      r: seg.textRange,
      ...(seg.documentId !== undefined && { id: seg.documentId }),
    });
  }
}

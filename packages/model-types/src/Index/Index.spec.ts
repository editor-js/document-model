/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { DataKey, BlockTuneName, DocumentId } from '@editorjs/model-types';
import {
  Index,
  IndexKind,
  BlockIndex,
  DataIndex,
  DocumentIndex,
  PropertyIndex,
  TextIndex,
  TuneIndex
} from './index.js';

describe('Index', () => {
  describe('factory methods', () => {
    describe('Index.document()', () => {
      it('creates a DocumentIndex with the given id', () => {
        const idx = Index.document('doc1' as DocumentId);

        expect(idx).toBeInstanceOf(DocumentIndex);
        expect(idx.kind).toBe(IndexKind.Document);
        expect(idx.documentId).toBe('doc1');
      });
    });

    describe('Index.property()', () => {
      it('creates a PropertyIndex with the given name', () => {
        const idx = Index.property('time');

        expect(idx).toBeInstanceOf(PropertyIndex);
        expect(idx.kind).toBe(IndexKind.Property);
        expect(idx.propertyName).toBe('time');
        expect(idx.documentId).toBeUndefined();
      });

      it('optionally accepts documentId', () => {
        const idx = Index.property('time', 'doc1' as DocumentId);

        expect(idx.documentId).toBe('doc1');
      });
    });

    describe('Index.block()', () => {
      it('creates a BlockIndex with the given block number', () => {
        const idx = Index.block(3);

        expect(idx).toBeInstanceOf(BlockIndex);
        expect(idx.kind).toBe(IndexKind.Block);
        expect(idx.blockIndex).toBe(3);
        expect(idx.documentId).toBeUndefined();
      });

      it('optionally accepts documentId', () => {
        const idx = Index.block(3, 'doc1' as DocumentId);

        expect(idx.documentId).toBe('doc1');
      });
    });

    describe('Index.tune()', () => {
      it('creates a TuneIndex with block, tune name, and tune key', () => {
        const idx = Index.tune(3, 'header' as BlockTuneName, 'level');

        expect(idx).toBeInstanceOf(TuneIndex);
        expect(idx.kind).toBe(IndexKind.Tune);
        expect(idx.blockIndex).toBe(3);
        expect(idx.tuneName).toBe('header');
        expect(idx.tuneKey).toBe('level');
      });

      it('optionally accepts documentId', () => {
        const idx = Index.tune(3, 'header' as BlockTuneName, 'level', 'doc1' as DocumentId);

        expect(idx.documentId).toBe('doc1');
      });
    });

    describe('Index.data()', () => {
      it('creates a DataIndex with block and data key', () => {
        const idx = Index.data(3, 'content' as DataKey);

        expect(idx).toBeInstanceOf(DataIndex);
        expect(idx.kind).toBe(IndexKind.Data);
        expect(idx.blockIndex).toBe(3);
        expect(idx.dataKey).toBe('content');
      });

      it('optionally accepts documentId', () => {
        const idx = Index.data(3, 'content' as DataKey, 'doc1' as DocumentId);

        expect(idx.documentId).toBe('doc1');
      });
    });

    describe('Index.text()', () => {
      it('creates a single-segment TextIndex', () => {
        const idx = Index.text([{ blockIndex: 3,
          dataKey: 'content' as DataKey,
          textRange: [0, 5] }]);

        expect(idx).toBeInstanceOf(TextIndex);
        expect(idx.kind).toBe(IndexKind.Text);
        expect(idx.blockIndex).toBe(3);
        expect(idx.dataKey).toBe('content');
        expect(idx.textRange).toEqual([0, 5]);
      });

      it('creates a composite TextIndex when given multiple segments', () => {
        const idx = Index.text([
          { blockIndex: 0,
            dataKey: 'key' as DataKey,
            textRange: [0, 3] },
          { blockIndex: 1,
            dataKey: 'key' as DataKey,
            textRange: [0, 5] },
        ]);

        expect(idx.isComposite).toBe(true);
      });

      it('throws when given an empty segment array', () => {
        expect(() => Index.text([])).toThrow();
      });
    });
  });

  describe('BlockIndex identity', () => {
    it('is instanceof BlockIndex', () => {
      expect(Index.block(0)).toBeInstanceOf(BlockIndex);
    });

    it('kind is IndexKind.Block', () => {
      expect(Index.block(0).kind).toBe(IndexKind.Block);
    });

    it('DataIndex kind is not Block', () => {
      expect(Index.data(0, 'key' as DataKey).kind).not.toBe(IndexKind.Block);
    });

    it('TuneIndex kind is not Block', () => {
      expect(Index.tune(0, 'tune' as BlockTuneName, 'key').kind).not.toBe(IndexKind.Block);
    });
  });

  describe('DataIndex identity', () => {
    it('is instanceof DataIndex', () => {
      expect(Index.data(0, 'key' as DataKey)).toBeInstanceOf(DataIndex);
    });

    it('kind is IndexKind.Data', () => {
      expect(Index.data(0, 'key' as DataKey).kind).toBe(IndexKind.Data);
    });

    it('BlockIndex kind is not Data', () => {
      expect(Index.block(0).kind).not.toBe(IndexKind.Data);
    });
  });

  describe('.isTextIndex', () => {
    it('is true for a single-segment TextIndex', () => {
      expect(Index.text([{ blockIndex: 0,
        dataKey: 'key' as DataKey,
        textRange: [0, 1] }]).isTextIndex).toBe(true);
    });

    it('is false for a composite TextIndex', () => {
      const composite = Index.text([
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [0, 1] },
        { blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 2] },
      ]);

      expect(composite.isTextIndex).toBe(false);
    });

    it('kind is not Text for DataIndex', () => {
      expect(Index.data(0, 'key' as DataKey).kind).not.toBe(IndexKind.Text);
    });

    it('kind is not Text for BlockIndex', () => {
      expect(Index.block(0).kind).not.toBe(IndexKind.Text);
    });
  });

  describe('.isComposite', () => {
    it('is true for a multi-segment TextIndex', () => {
      const composite = Index.text([
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [0, 1] },
        { blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 2] },
      ]);

      expect(composite.isComposite).toBe(true);
    });

    it('is false for a single-segment TextIndex', () => {
      expect(Index.text([{ blockIndex: 0,
        dataKey: 'key' as DataKey,
        textRange: [0, 1] }]).isComposite).toBe(false);
    });
  });

  describe('.getTextSegments()', () => {
    it('returns a single-element array for a text index', () => {
      const idx = Index.text([{ blockIndex: 3,
        dataKey: 'key' as DataKey,
        textRange: [0, 5] }]);
      const segs = idx.getTextSegments();

      expect(segs).toHaveLength(1);
      expect(segs[0].blockIndex).toBe(3);
      expect(segs[0].textRange).toEqual([0, 5]);
    });

    it('returns individual single-segment TextIndex instances for a composite', () => {
      const composite = Index.text([
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [0, 1] },
        { blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 2] },
      ]);
      const segs = composite.getTextSegments();

      expect(segs).toHaveLength(2);
      expect(segs[0].blockIndex).toBe(0);
      expect(segs[1].blockIndex).toBe(1);
      segs.forEach(s => expect(s.isTextIndex).toBe(true));
    });
  });

  describe('Index.fromCompositeSegments()', () => {
    it('builds a composite TextIndex from multiple single-segment text indices', () => {
      const a = Index.text([{ blockIndex: 0,
        dataKey: 'key' as DataKey,
        textRange: [0, 1] }]);
      const b = Index.text([{ blockIndex: 1,
        dataKey: 'key' as DataKey,
        textRange: [0, 2] }]);
      const composite = Index.fromCompositeSegments([a, b]);

      expect(composite.isComposite).toBe(true);
      expect(composite.getTextSegments()).toHaveLength(2);
    });

    it('returns a single-segment TextIndex when given one segment', () => {
      const a = Index.text([{ blockIndex: 0,
        dataKey: 'key' as DataKey,
        textRange: [0, 1] }]);
      const result = Index.fromCompositeSegments([a]);

      expect(result.isComposite).toBe(false);
      expect(result.isTextIndex).toBe(true);
    });

    it('throws when given an empty array', () => {
      expect(() => Index.fromCompositeSegments([])).toThrow();
    });

    it('throws when passed non-TextIndex instances', () => {
      expect(() => Index.fromCompositeSegments([Index.block(0), Index.block(1)])).toThrow();
    });
  });

  describe('.clone()', () => {
    it('produces a distinct but equal instance', () => {
      const idx = Index.data(3, 'key' as DataKey, 'doc1' as DocumentId);
      const cloned = idx.clone();

      expect(cloned).not.toBe(idx);
      expect(cloned.blockIndex).toBe(idx.blockIndex);
      expect(cloned.dataKey).toBe(idx.dataKey);
      expect(cloned.documentId).toBe(idx.documentId);
    });

    it('deep-copies segments of a composite TextIndex', () => {
      const composite = Index.text([
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [0, 1] },
        { blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 2] },
      ]);
      const cloned = composite.clone();

      expect(cloned.isComposite).toBe(true);
      expect(cloned.getTextSegments()[0]).not.toBe(composite.getTextSegments()[0]);
      expect(cloned.getTextSegments()[0].blockIndex).toBe(composite.getTextSegments()[0].blockIndex);
    });
  });

  describe('.withBlockIndex()', () => {
    it('returns a new index with the updated block number', () => {
      const idx = Index.block(3);
      const updated = idx.withBlockIndex(7);

      expect(updated.blockIndex).toBe(7);
      expect(idx.blockIndex).toBe(3);
    });

    it('updates blockIndex across all segments of a composite TextIndex', () => {
      const composite = Index.text([
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [0, 1] },
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [2, 3] },
      ]);
      const updated = composite.withBlockIndex(5);

      updated.getTextSegments().forEach(seg => expect(seg.blockIndex).toBe(5));
    });
  });

  describe('.withTextRange()', () => {
    it('returns a new TextIndex with the updated range', () => {
      const idx = Index.text([{ blockIndex: 3,
        dataKey: 'key' as DataKey,
        textRange: [0, 5] }]);
      const updated = idx.withTextRange([2, 8]);

      expect(updated.textRange).toEqual([2, 8]);
      expect(idx.textRange).toEqual([0, 5]);
    });

    it('throws when called on a composite TextIndex', () => {
      const composite = Index.text([
        { blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [0, 1] },
        { blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 2] },
      ]);

      expect(() => composite.withTextRange([0, 1])).toThrow();
    });
  });

  describe('.withDocumentId()', () => {
    it('attaches documentId while preserving other fields', () => {
      const idx = Index.block(3);
      const updated = idx.withDocumentId('doc1' as DocumentId);

      expect(updated.documentId).toBe('doc1');
      expect(updated.blockIndex).toBe(3);
      expect(idx.documentId).toBeUndefined();
    });
  });

  describe('.serialize() and Index.parse()', () => {
    it('round-trips a DocumentIndex', () => {
      const idx = Index.document('doc1' as DocumentId);
      const parsed = Index.parse(idx.serialize()) as DocumentIndex;

      expect(parsed.documentId).toBe('doc1');
    });

    it('round-trips a PropertyIndex without documentId', () => {
      const idx = Index.property('time');
      const parsed = Index.parse(idx.serialize()) as PropertyIndex;

      expect(parsed.propertyName).toBe('time');
      expect(parsed.documentId).toBeUndefined();
    });

    it('round-trips a PropertyIndex with documentId', () => {
      const idx = Index.property('time', 'doc1' as DocumentId);
      const parsed = Index.parse(idx.serialize()) as PropertyIndex;

      expect(parsed.propertyName).toBe('time');
      expect(parsed.documentId).toBe('doc1');
    });

    it('round-trips a BlockIndex', () => {
      const idx = Index.block(7, 'doc1' as DocumentId);
      const parsed = Index.parse(idx.serialize()) as BlockIndex;

      expect(parsed.blockIndex).toBe(7);
      expect(parsed.documentId).toBe('doc1');
    });

    it('round-trips a TuneIndex', () => {
      const idx = Index.tune(3, 'header' as BlockTuneName, 'level');
      const parsed = Index.parse(idx.serialize()) as TuneIndex;

      expect(parsed.blockIndex).toBe(3);
      expect(parsed.tuneName).toBe('header');
      expect(parsed.tuneKey).toBe('level');
    });

    it('round-trips a DataIndex', () => {
      const idx = Index.data(3, 'content' as DataKey);
      const parsed = Index.parse(idx.serialize()) as DataIndex;

      expect(parsed.blockIndex).toBe(3);
      expect(parsed.dataKey).toBe('content');
    });

    it('round-trips a single-segment TextIndex', () => {
      const idx = Index.text([{ blockIndex: 3,
        dataKey: 'content' as DataKey,
        textRange: [0, 5] }]);
      const parsed = Index.parse(idx.serialize()) as TextIndex;

      expect(parsed.blockIndex).toBe(3);
      expect(parsed.dataKey).toBe('content');
      expect(parsed.textRange).toEqual([0, 5]);
      expect(parsed.isTextIndex).toBe(true);
    });

    it('round-trips a composite TextIndex', () => {
      const composite = Index.fromCompositeSegments([
        Index.text([{ blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [1, 2] }]),
        Index.text([{ blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 5] }]),
      ]);
      const parsed = Index.parse(composite.serialize()) as TextIndex;

      expect(parsed.isComposite).toBe(true);
      const segs = parsed.getTextSegments();

      expect(segs).toHaveLength(2);
      expect(segs[0].blockIndex).toBe(0);
      expect(segs[1].blockIndex).toBe(1);
    });

    it('emits the expected wire object for BlockIndex', () => {
      expect(JSON.parse(Index.block(3, 'doc1' as DocumentId).serialize())).toEqual({ k: 'block',
        b: 3,
        id: 'doc1' });
    });

    it('emits the expected wire object for TuneIndex', () => {
      expect(JSON.parse(Index.tune(3, 'header' as BlockTuneName, 'level').serialize())).toEqual({ k: 'tune',
        b: 3,
        tune: 'header',
        key: 'level' });
    });

    it('emits the expected wire object for DataIndex', () => {
      expect(JSON.parse(Index.data(3, 'content' as DataKey).serialize())).toEqual({ k: 'data',
        b: 3,
        data: 'content' });
    });

    it('emits the expected wire object for single-segment TextIndex', () => {
      expect(JSON.parse(Index.text([{ blockIndex: 3,
        dataKey: 'key' as DataKey,
        textRange: [0, 5] }]).serialize())).toEqual({ k: 'text',
        b: 3,
        data: 'key',
        r: [0, 5] });
    });

    it('emits the expected wire object for composite TextIndex', () => {
      const composite = Index.fromCompositeSegments([
        Index.text([{ blockIndex: 0,
          dataKey: 'key' as DataKey,
          textRange: [1, 2] }]),
        Index.text([{ blockIndex: 1,
          dataKey: 'key' as DataKey,
          textRange: [0, 5] }]),
      ]);

      expect(JSON.parse(composite.serialize())).toEqual({
        k: 'composite',
        segs: [
          { b: 0,
            data: 'key',
            r: [1, 2] },
          { b: 1,
            data: 'key',
            r: [0, 5] },
        ],
      });
    });

    it('omits documentId from wire format when undefined', () => {
      expect(JSON.parse(Index.block(3).serialize())).not.toHaveProperty('id');
      expect(JSON.parse(Index.data(3, 'key' as DataKey).serialize())).not.toHaveProperty('id');
    });

    it('throws when parsing input that is not a JSON object with a k field', () => {
      expect(() => Index.parse('null')).toThrow();
      expect(() => Index.parse('"string"')).toThrow();
      expect(() => Index.parse('42')).toThrow();
      expect(() => Index.parse('{}')).toThrow('Invalid serialized index');
    });

    it('throws when parsing an unknown kind', () => {
      expect(() => Index.parse('{"k":"unknown"}')).toThrow('Unknown index kind');
    });
  });
});

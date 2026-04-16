import type { DocumentIndex } from '../../EventBus/index.js';
import type { DataKey } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune/index.js';
import { IndexBuilder } from '../index.js';
import { Index } from './index.js';

describe('Index', () => {
  it('should serialize index', () => {
    const index = new Index();

    index.documentId = 'documentId' as DocumentIndex;
    index.propertyName = 'propertyName';
    index.blockIndex = 1;
    index.tuneName = 'tuneName' as BlockTuneName;
    index.tuneKey = 'tuneKey';
    index.dataKey = 'dataKey' as DataKey;
    index.textRange = [
      1,
      2,
    ];

    expect(index.serialize())
      .toBe(`"doc@documentId:prop@propertyName:block@1:tune@tuneName:tuneKey@tuneKey:data@dataKey:[1,2]"`);
  });

  it('should filter out undefined values when serializing index', () => {
    const index = new Index();

    index.documentId = 'documentId' as DocumentIndex;
    index.propertyName = 'propertyName';
    index.blockIndex = 1;

    expect(index.serialize())
      .toBe(`"doc@documentId:prop@propertyName:block@1"`);
  });

  it('should parse index from string', () => {
    const serialized = `"doc@documentId:prop@propertyName:block@1:tune@tuneName:tuneKey@tuneKey:data@dataKey:[1,2]"`;

    const index = Index.parse(serialized);

    expect(index.documentId).toBe('documentId');
    expect(index.propertyName).toBe('propertyName');
    expect(index.blockIndex).toBe(1);
    expect(index.tuneName).toBe('tuneName');
    expect(index.tuneKey).toBe('tuneKey');
    expect(index.dataKey).toBe('dataKey');
    expect(index.textRange).toEqual([1, 2]);
  });

  it('should throw when parsed JSON root is not a legacy string and not a composite object', () => {
    expect(() => Index.parse('null')).toThrow('Invalid serialized index');
    expect(() => Index.parse('0')).toThrow('Invalid serialized index');
    expect(() => Index.parse('true')).toThrow('Invalid serialized index');
    expect(() => Index.parse('false')).toThrow('Invalid serialized index');
    expect(() => Index.parse('{}')).toThrow('Invalid serialized index');
  });

  it('should clone index', () => {
    const index = new Index();

    index.documentId = 'documentId' as DocumentIndex;
    index.propertyName = 'propertyName';
    index.blockIndex = 1;
    index.tuneName = 'tuneName' as BlockTuneName;
    index.tuneKey = 'tuneKey';
    index.dataKey = 'dataKey' as DataKey;
    index.textRange = [
      1,
      2,
    ];

    const cloned = index.clone();

    expect(cloned).not.toBe(index);
    expect(cloned).toEqual(index);
  });

  describe('.validate()', () => {
    it('should throw an error if index includes data key AND tune name', () => {
      const index = new Index();

      index.tuneName = 'tuneName' as BlockTuneName;
      index.tuneKey = 'tuneKey';
      index.dataKey = 'dataKey' as DataKey;

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes text range AND tune name', () => {
      const index = new Index();

      index.tuneName = 'tuneName' as BlockTuneName;
      index.tuneKey = 'tuneKey';
      index.textRange = [0, 0];

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes tune name but NOT tune key', () => {
      const index = new Index();

      index.tuneName = 'tuneName' as BlockTuneName;

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes property name AND block index', () => {
      const index = new Index();

      index.propertyName = 'propertyName';
      index.blockIndex = 1;

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes property name AND data key', () => {
      const index = new Index();

      index.propertyName = 'propertyName';
      index.dataKey = 'dataKey' as DataKey;

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes property name AND tune name', () => {
      const index = new Index();

      index.propertyName = 'propertyName';
      index.tuneName = 'tuneName' as BlockTuneName;

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes property name AND tune key', () => {
      const index = new Index();

      index.propertyName = 'propertyName';
      index.tuneKey = 'tuneKey';

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes property name AND text range', () => {
      const index = new Index();

      index.propertyName = 'propertyName';
      index.textRange = [0, 0];

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes block index AND text range but NOT data key', () => {
      const index = new Index();

      index.blockIndex = 1;
      index.textRange = [0, 0];

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes document id AND data key but NOT block index', () => {
      const index = new Index();

      index.documentId = 'documentId' as DocumentIndex;
      index.dataKey = 'dataKey' as DataKey;

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes document id AND tune name but NOT block index', () => {
      const index = new Index();

      index.documentId = 'documentId' as DocumentIndex;
      index.tuneName = 'tuneName' as BlockTuneName;
      index.tuneKey = 'tuneKey';

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes document id AND tune key but NOT block index', () => {
      const index = new Index();

      index.documentId = 'documentId' as DocumentIndex;
      index.tuneKey = 'tuneKey';

      expect(() => index.validate()).toThrow();
    });

    it('should throw an error if index includes document id AND text range but NOT block index', () => {
      const index = new Index();

      index.documentId = 'documentId' as DocumentIndex;
      index.textRange = [0, 0];

      expect(() => index.validate()).toThrow();
    });

    it('should return true if index is valid', () => {
      const index = new Index();

      index.documentId = 'documentId' as DocumentIndex;
      index.blockIndex = 1;
      index.dataKey = 'dataKey' as DataKey;
      index.textRange = [0, 0];

      expect(index.validate()).toBe(true);
    });
  });

  describe('.isBlockIndex', () => {
    it('should return true if index points to the block', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .build();

      expect(index.isBlockIndex).toBe(true);
    });

    it('should return false if index does not include block index', () => {
      const index = new Index();

      expect(index.isBlockIndex).toBe(false);
    });

    it('should return false if index points to the text range', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey('dataKey' as DataKey)
        .addTextRange([0, 0])
        .build();

      expect(index.isBlockIndex).toBe(false);
    });

    it('should return false if index points to the tune data', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addTuneName('tuneName' as BlockTuneName)
        .addTuneKey('tuneKey')
        .build();

      expect(index.isBlockIndex).toBe(false);
    });
  });

  describe('.isDataIndex', () => {
    const dataKey = 'key' as DataKey;

    it('should return true if index points to the data node', () => {
      const index = new IndexBuilder()
        .addBlockIndex(0)
        .addDataKey(dataKey)
        .build();

      expect(index.isDataIndex).toBe(true);
    });

    it('should return false if index does not data key', () => {
      const index = new Index();

      expect(index.isDataIndex).toBe(false);
    });

    it('should return false if index points to the text range', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey('dataKey' as DataKey)
        .addTextRange([0, 0])
        .build();

      expect(index.isDataIndex).toBe(false);
    });

    it('should return false if index points to the tune data', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addTuneName('tuneName' as BlockTuneName)
        .addTuneKey('tuneKey')
        .build();

      expect(index.isDataIndex).toBe(false);
    });
  });

  describe('.isTextIndex', () => {
    it('should return true if index points to the text', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey('dataKey' as DataKey)
        .addTextRange([0, 0])
        .build();

      expect(index.isTextIndex).toBe(true);
    });

    it('should return false if index does not include text range', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey('dataKey' as DataKey)
        .build();

      expect(index.isTextIndex).toBe(false);
    });

    it('should return false if index points to the tune data', () => {
      const index = new IndexBuilder().addBlockIndex(0)
        .addTuneName('tuneName' as BlockTuneName)
        .addTuneKey('tuneKey')
        .build();

      expect(index.isTextIndex).toBe(false);
    });
  });

  describe('composite index', () => {
    const compositeSecondSegmentEnd = 5;

    it('should serialize and parse composite', () => {
      const a = new IndexBuilder().addBlockIndex(0)
        .addDataKey('a' as DataKey)
        .addTextRange([1, 2])
        .build();
      const b = new IndexBuilder().addBlockIndex(1)
        .addDataKey('a' as DataKey)
        .addTextRange([0, compositeSecondSegmentEnd])
        .build();
      const composite = Index.fromCompositeSegments([a, b]);
      const round = Index.parse(composite.serialize());

      expect(round.compositeSegments).toHaveLength(2);
      expect(round.compositeSegments![0].blockIndex).toBe(0);
      expect(round.compositeSegments![1].blockIndex).toBe(1);
    });

    it('should return false for isTextIndex on composite', () => {
      const a = new IndexBuilder().addBlockIndex(0)
        .addDataKey('a' as DataKey)
        .addTextRange([1, 2])
        .build();
      const b = new IndexBuilder().addBlockIndex(1)
        .addDataKey('a' as DataKey)
        .addTextRange([0, compositeSecondSegmentEnd])
        .build();
      const composite = Index.fromCompositeSegments([a, b]);

      expect(composite.isTextIndex).toBe(false);
    });

    it('should return segments from getTextSegments', () => {
      const a = new IndexBuilder().addBlockIndex(0)
        .addDataKey('a' as DataKey)
        .addTextRange([1, 2])
        .build();
      const b = new IndexBuilder().addBlockIndex(1)
        .addDataKey('a' as DataKey)
        .addTextRange([0, compositeSecondSegmentEnd])
        .build();
      const composite = Index.fromCompositeSegments([a, b]);

      expect(composite.getTextSegments()).toHaveLength(2);
    });

    it('should throw if composite has less than two segments', () => {
      const a = new IndexBuilder().addBlockIndex(0)
        .addDataKey('a' as DataKey)
        .addTextRange([1, 2])
        .build();

      expect(() => Index.fromCompositeSegments([ a ])).toThrow();
    });

    it('should throw when parsing composite JSON with fewer than two string segments', () => {
      const a = new IndexBuilder().addBlockIndex(0)
        .addDataKey('a' as DataKey)
        .addTextRange([1, 2])
        .build();
      const payload = JSON.stringify({ composite: [ a.serialize() ] });

      expect(() => Index.parse(payload)).toThrow();
    });

    it('should throw when composite array contains a non-string segment', () => {
      const payload = JSON.stringify({ composite: [0, 1] });

      expect(() => Index.parse(payload)).toThrow('Invalid composite index');
    });

    it('should clone composite segments', () => {
      const a = new IndexBuilder().addBlockIndex(0)
        .addDataKey('a' as DataKey)
        .addTextRange([1, 2])
        .build();
      const b = new IndexBuilder().addBlockIndex(1)
        .addDataKey('a' as DataKey)
        .addTextRange([0, compositeSecondSegmentEnd])
        .build();
      const composite = Index.fromCompositeSegments([a, b]);
      const cloned = composite.clone();

      expect(cloned.compositeSegments).toEqual(composite.compositeSegments);
      expect(cloned.compositeSegments![0]).not.toBe(composite.compositeSegments![0]);
    });
  });
});

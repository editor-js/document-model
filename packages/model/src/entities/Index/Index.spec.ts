import type { DocumentIndex } from '../../EventBus/index.js';
import type { DataKey } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune/index.js';
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
});

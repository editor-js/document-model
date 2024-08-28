import type { DocumentIndex } from '../../EventBus/index.js';
import type { DataKey } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune/index.js';
import { IndexBuilder } from './IndexBuilder.js';

describe('IndexBuilder', () => {
  it('should add text range to the index', () => {
    const builder = new IndexBuilder();

    builder.addTextRange([0, 1]);

    expect(builder.build().textRange).toEqual([0, 1]);
  });

  it('should add data key to the index', () => {
    const builder = new IndexBuilder();

    builder.addDataKey('dataKey' as DataKey);

    expect(builder.build().dataKey).toEqual('dataKey');
  });

  it('should add tune key to the index', () => {
    const builder = new IndexBuilder();

    builder.addTuneKey('tuneKey');

    expect(builder.build().tuneKey).toEqual('tuneKey');
  });

  it('should add tune name to the index', () => {
    const builder = new IndexBuilder();

    builder.addTuneName('tuneName' as BlockTuneName);
    builder.addTuneKey('tuneKey');

    expect(builder.build().tuneName).toEqual('tuneName');
  });

  it('should add block index to the index', () => {
    const builder = new IndexBuilder();

    builder.addBlockIndex(1);

    expect(builder.build().blockIndex).toEqual(1);
  });

  it('should add property name to the index', () => {
    const builder = new IndexBuilder();

    builder.addPropertyName('propertyName');

    expect(builder.build().propertyName).toEqual('propertyName');
  });

  it('should add document id to the index', () => {
    const builder = new IndexBuilder();

    builder.addDocumentId('documentId' as DocumentIndex);

    expect(builder.build().documentId).toEqual('documentId');
  });

  it('should throw an error if index is invalid', () => {
    const builder = new IndexBuilder();

    builder.addBlockIndex(1).addTextRange([0, 1]);

    expect(() => builder.build().validate()).toThrow();
  });

  it('should clone the index with .from() method', () => {
    const builder = new IndexBuilder();

    const index = builder
      .addBlockIndex(1)
      .addDataKey('dataKey' as DataKey)
      .addTextRange([0, 1])
      .build();

    const cloned = builder.from(index).build();

    expect(cloned).toEqual(index);
  });

  it('should create an index from serialized string', () => {
    const builder = new IndexBuilder();

    const index = builder.from(`"block@1:data@dataKey:[0,1]"`).build();

    expect(index.blockIndex).toEqual(1);
    expect(index.dataKey).toEqual('dataKey');
    expect(index.textRange).toEqual([0, 1]);
  });
});

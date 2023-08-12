import { BlockNode } from './index';
import { createBlockNodeName, createDataKey } from './types';

import { BlockTune, BlockTuneSerialized, createBlockTuneName } from '../BlockTune';
import { TextNode } from '../TextNode';
import { ValueNode } from '../ValueNode';

import type { EditorDocument } from '../EditorDocument';
import type { BlockTuneConstructorParameters } from '../BlockTune/types';
import type { TextNodeConstructorParameters } from '../TextNode/types';
import type { ValueNodeConstructorParameters } from '../ValueNode';

describe('BlockNode', () => {
  describe('.serialized', () => {
    it('should return a name of a tool that created a BlockNode', () => {
      const blockNodeName = createBlockNodeName('paragraph');

      const blockNode = new BlockNode({
        name: blockNodeName,
        data: {},
        parent: {} as EditorDocument,
      });

      const serialized = blockNode.serialized;

      expect(serialized.name).toEqual(blockNodeName);
    });

    it('should call .serialized getter of all tunes associated with the BlockNode', () => {
      const blockTunesNames = [
        createBlockTuneName('align'),
        createBlockTuneName('font-size'),
        createBlockTuneName('font-weight'),
      ];

      const spy = jest
        .spyOn(BlockTune.prototype, 'serialized', 'get')
        .mockImplementation(() => ({} as BlockTuneSerialized));

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
        tunes: blockTunesNames.reduce((acc, name) => ({
          ...acc,
          [name]: new BlockTune({} as BlockTuneConstructorParameters),
        }), {}),
      });

      blockNode.serialized;

      expect(spy).toHaveBeenCalledTimes(blockTunesNames.length);
    });

    it('should call .serialized getter of all nodes associated with the BlockNode', () => {
      const textNodeSerializedSpy = jest
        .spyOn(TextNode.prototype, 'serialized', 'get')
        .mockImplementation(() => ({}));

      const valueNodeSerializedSpy = jest
        .spyOn(ValueNode.prototype, 'serialized', 'get')
        .mockImplementation(() => ({}));

      const countOfTextNodes = 3;
      const countOfValueNodes = 1;

      const textNodes = [ ...Array(countOfTextNodes).keys() ]
        .map((index) => new TextNode({ value: `${index}` } as TextNodeConstructorParameters));

      const valueNodes = [ ...Array(countOfValueNodes).keys() ]
        .reduce((acc, index) => ({
          ...acc,
          [createDataKey(`data-key-${index}c${index}d`)]: new ValueNode({} as ValueNodeConstructorParameters),
        }), {});

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {
          [createDataKey('data-key-1a2b')]: textNodes,
          ...valueNodes,
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(textNodeSerializedSpy).toHaveBeenCalledTimes(countOfTextNodes);
      expect(valueNodeSerializedSpy).toHaveBeenCalledTimes(countOfValueNodes);
    });
  });
});

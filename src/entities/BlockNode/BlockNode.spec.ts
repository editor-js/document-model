import { BlockNode } from './index';
import { createBlockNodeName, createDataKey } from './types';

import { BlockTune, createBlockTuneName } from '../BlockTune';
import { TextNode } from '../TextNode';
import { ValueNode } from '../ValueNode';

import type { EditorDocument } from '../EditorDocument';
import type { BlockTuneConstructorParameters } from '../BlockTune/types';
import type { TextNodeConstructorParameters } from '../TextNode';
import type { ValueNodeConstructorParameters } from '../ValueNode';

describe('BlockNode', () => {
  describe('.serialized', () => {
    beforeEach(() => {
      jest.mock('../BlockTune', () => ({
        BlockTune: jest.fn().mockImplementation(() => ({}) as BlockTune),
        serialized: jest.fn(),
      }));

      jest.mock('../TextNode', () => ({
        TextNode: jest.fn().mockImplementation(() => ({}) as TextNode),
        serialized: jest.fn(),
      }));

      jest.mock('../ValueNode', () => ({
        ValueNode: jest.fn().mockImplementation(() => ({}) as ValueNode),
        serialized: jest.fn(),
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

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

      const blockTunes = blockTunesNames.reduce((acc, name) => ({
        ...acc,
        [name]: new BlockTune({} as BlockTuneConstructorParameters),
      }), {});

      const spyArray = Object
        .values(blockTunes)
        .map((blockTune) => {
          return jest.spyOn(blockTune as BlockTune, 'serialized', 'get');
        });

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
        tunes: blockTunes,
      });

      blockNode.serialized;

      spyArray.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should call .serialized getter of all child ValueNodes associated with the BlockNode', () => {
      const countOfValueNodes = 2;

      const valueNodes = [ ...Array(countOfValueNodes).keys() ]
        .reduce((acc, index) => ({
          ...acc,
          [createDataKey(`data-key-${index}c${index}d`)]: new ValueNode({} as ValueNodeConstructorParameters),
        }), {});

      const spyArray = Object
        .values(valueNodes)
        .map((valueNode) => {
          return jest.spyOn(valueNode as ValueNode, 'serialized', 'get');
        });

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {
          ...valueNodes,
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      spyArray.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should call .serialized getter of all child TextNodes associated with the BlockNode', () => {
      const countOfTextNodes = 3;

      const textNodes = [ ...Array(countOfTextNodes).keys() ]
        .map(() => new TextNode({} as TextNodeConstructorParameters));

      const spyArray = textNodes
        .map((textNode) => {
          return jest.spyOn(textNode, 'serialized', 'get');
        });

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {
          [createDataKey('data-key-1a2b')]: textNodes,
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      spyArray.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
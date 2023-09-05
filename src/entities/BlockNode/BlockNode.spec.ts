import { BlockNode, createBlockNodeName, createDataKey } from './index';

import { BlockTune, BlockTuneName } from '../BlockTune';
import { ValueNode } from '../ValueNode';

import type { EditorDocument } from '../EditorDocument';
import type { BlockTuneConstructorParameters } from '../BlockTune/types';
import type { ValueNodeConstructorParameters } from '../ValueNode';
import { RootInlineNode } from '../inline-fragments';
import { describe } from '@jest/globals';

jest.mock('../BlockTune', () => ({
  BlockTune: jest.fn().mockImplementation(() => ({
    get serialized() {
      return {};
    },
    update() {
      return;
    },
  }) as unknown as BlockTune),
}));

jest.mock('../inline-fragments', () => ({
  RootInlineNode: jest.fn().mockImplementation(() => ({
    get serialized() {
      return {};
    },
  }) as RootInlineNode),
}));

jest.mock('../ValueNode', () => ({
  ValueNode: (class {
    /**
     * Mock method
     */
    public get serialized(): object {
      return {};
    }

    /**
     * Mock method
     */
    public update(): void {
      return;
    }
  }) as unknown as typeof ValueNode,
}));

describe('BlockNode', () => {
  describe('constructor', () => {
    let node: BlockNode;

    beforeEach(() => {
      node = new BlockNode({ name: createBlockNodeName('header') });
    });

    it('should have empty object as data by default', () => {
      expect(node.serialized.data).toEqual({});
    });

    it('should set null as parent by default', () => {
      expect(node.parent).toBeNull();
    });
  });

  describe('.serialized', () => {
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
        'align' as BlockTuneName,
        'font-size' as BlockTuneName,
        'font-weight' as BlockTuneName,
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

    it('should call .serialized getter of all child RootInlineNodes associated with the BlockNode', () => {
      const countOfTextNodes = 3;


      const textNodes = [ ...Array(countOfTextNodes).keys() ]
        .reduce((acc, index) => ({
          ...acc,
          [createDataKey(`data-key-${index}c${index}d`)]: new RootInlineNode(),
        }), {});

      const spyArray = Object.values(textNodes)
        .map((textNode) => {
          return jest.spyOn(textNode as RootInlineNode, 'serialized', 'get');
        });

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {
          ...textNodes,
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      spyArray.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('.updateTuneData()', () => {
    beforeEach(() => {
      jest.mock('../BlockTune', () => ({
        BlockTune: jest.fn().mockImplementation(() => ({}) as BlockTune),
        update: jest.fn(),
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call .update() method of the BlockTune', () => {
      const blockTuneName = 'align' as BlockTuneName;

      const blockTune = new BlockTune({} as BlockTuneConstructorParameters);

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
        tunes: {
          [blockTuneName]: blockTune,
        },
      });

      const dataKey = 'align';
      const dataValue = 'left';
      const data = {
        [dataKey]: dataValue,
      };

      const spy = jest.spyOn(blockTune, 'update');

      blockNode.updateTuneData(blockTuneName, data);

      expect(spy).toHaveBeenCalledWith(dataKey, dataValue);
    });
  });

  describe('.updateValue()', () => {
    beforeEach(() => {
      jest.mock('../ValueNode', () => ({
        ValueNode: jest.fn().mockImplementation(() => ({}) as ValueNode),
        update: jest.fn(),
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call .update() method of the ValueNode with the passed value', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const valueNode = new ValueNode({} as ValueNodeConstructorParameters);

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {
          [dataKey]: valueNode,
        },
        parent: {} as EditorDocument,
      });

      const spy = jest.spyOn(valueNode, 'update');

      blockNode.updateValue(dataKey, value);

      expect(spy).toHaveBeenCalledWith(value);
    });

    it('should throw an error if the ValueNode with the passed dataKey does not exist', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
      });

      expect(() => {
        blockNode.updateValue(dataKey, value);
      }).toThrowError(`BlockNode: data with key ${dataKey} does not exist`);
    });

    it('should throw an error if the ValueNode with the passed dataKey is not a ValueNode', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockNodeName('paragraph'),
        data: {
          [dataKey]: {} as RootInlineNode,
        },
        parent: {} as EditorDocument,
      });

      expect(() => {
        blockNode.updateValue(dataKey, value);
      }).toThrowError(`BlockNode: data with key ${dataKey} is not a ValueNode`);
    });
  });
});

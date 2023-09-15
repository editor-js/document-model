import { BlockNode, createBlockToolName, createDataKey } from './index';

import { BlockTune, BlockTuneName } from '../BlockTune';
import { ValueNode } from '../ValueNode';

import type { EditorDocument } from '../EditorDocument';
import type { BlockTuneConstructorParameters } from '../BlockTune/types';
import type { ValueNodeConstructorParameters } from '../ValueNode';
import { InlineToolData, InlineToolName, TextNode } from '../inline-fragments';

jest.mock('../BlockTune');

jest.mock('../inline-fragments/TextNode');

jest.mock('../ValueNode');

describe('BlockNode', () => {
  describe('constructor', () => {
    let node: BlockNode;

    beforeEach(() => {
      node = new BlockNode({ name: createBlockToolName('header') });
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
      const blockNodeName = createBlockToolName('paragraph');

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
        name: createBlockToolName('paragraph'),
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
        name: createBlockToolName('paragraph'),
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
          [createDataKey(`data-key-${index}c${index}d`)]: new TextNode(),
        }), {});

      const spyArray = Object.values(textNodes)
        .map((textNode) => {
          return jest.spyOn(textNode as TextNode, 'serialized', 'get');
        });

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
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
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call .update() method of the BlockTune', () => {
      const blockTuneName = 'align' as BlockTuneName;

      const blockTune = new BlockTune({} as BlockTuneConstructorParameters);

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
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
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call .update() method of the ValueNode with the passed value', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const valueNode = new ValueNode({} as ValueNodeConstructorParameters);

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
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
        name: createBlockToolName('paragraph'),
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
        name: createBlockToolName('paragraph'),
        data: {
          [dataKey]: {} as TextNode,
        },
        parent: {} as EditorDocument,
      });

      expect(() => {
        blockNode.updateValue(dataKey, value);
      }).toThrowError(`BlockNode: data with key ${dataKey} is not a ValueNode`);
    });
  });

  describe('.insertText()', () => {
    let node: BlockNode;
    const dataKey = createDataKey('text');
    let textNode: TextNode;
    const text = 'Some text';

    beforeEach(() => {
      textNode = new TextNode();

      node = new BlockNode({ name: createBlockToolName('header'),
        data: {
          [dataKey]: textNode,
        },
      });
    });

    it('should call .insertText() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'insertText');

      node.insertText(dataKey, text);

      expect(spy).toHaveBeenCalledWith(text, undefined);
    });

    it('should pass start index to the .insertText() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'insertText');
      const start = 5;

      node.insertText(dataKey, text, start);

      expect(spy).toHaveBeenCalledWith(text, start);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');

      expect(() => node.insertText(key, text)).toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.insertText(dataKey, text)).toThrow();
    });
  });

  describe('.removeText()', () => {
    let node: BlockNode;
    const dataKey = createDataKey('text');
    let textNode: TextNode;

    beforeEach(() => {
      textNode = new TextNode();

      node = new BlockNode({ name: createBlockToolName('header'),
        data: {
          [dataKey]: textNode,
        },
      });
    });

    it('should call .removeText() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'removeText');

      node.removeText(dataKey);

      expect(spy).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass start index to the .removeText() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'removeText');
      const start = 5;

      node.removeText(dataKey, start);

      expect(spy).toHaveBeenCalledWith(start, undefined);
    });

    it('should pass end index to the .removeText() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'removeText');
      const start = 5;
      const end = 10;

      node.removeText(dataKey, start, end);

      expect(spy).toHaveBeenCalledWith(start, end);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');

      expect(() => node.removeText(key)).toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.removeText(dataKey)).toThrow();
    });
  });

  describe('.format()', () => {
    let node: BlockNode;
    const dataKey = createDataKey('text');
    const tool = 'bold' as InlineToolName;
    const start = 5;
    const end = 10;
    let textNode: TextNode;

    beforeEach(() => {
      textNode = new TextNode();

      node = new BlockNode({ name: createBlockToolName('header'),
        data: {
          [dataKey]: textNode,
        },
      });
    });

    it('should call .format() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'format');

      node.format(dataKey, tool, start, end);

      expect(spy).toHaveBeenCalledWith(tool, start, end, undefined);
    });

    it('should pass data to the .format() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'format');
      const data = {} as InlineToolData;

      node.format(dataKey, tool, start, end, data);

      expect(spy).toHaveBeenCalledWith(tool, start, end, data);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');

      expect(() => node.format(key, tool, start, end)).toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.format(dataKey, tool, start, end)).toThrow();
    });
  });

  describe('.unformat()', () => {
    let node: BlockNode;
    const dataKey = createDataKey('text');
    const tool = 'bold' as InlineToolName;
    const start = 5;
    const end = 10;
    let textNode: TextNode;

    beforeEach(() => {
      textNode = new TextNode();

      node = new BlockNode({ name: createBlockToolName('header'),
        data: {
          [dataKey]: textNode,
        },
      });
    });

    it('should call .unformat() method of the TextNode', () => {
      const spy = jest.spyOn(textNode, 'unformat');

      node.unformat(dataKey, tool, start, end);

      expect(spy).toHaveBeenCalledWith(tool, start, end);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');

      expect(() => node.unformat(key, tool, start, end)).toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.unformat(dataKey, tool, start, end)).toThrow();
    });
  });
});

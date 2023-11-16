import { BlockNode, createBlockToolName, createDataKey } from './index.js';

import type { BlockTuneName, BlockTuneSerialized } from '../BlockTune';
import { BlockTune } from '../BlockTune/index.js';
import { ValueNode } from '../ValueNode/index.js';

import type { EditorDocument } from '../EditorDocument';
import type { ValueNodeConstructorParameters } from '../ValueNode';
import type { InlineFragment, InlineToolData, InlineToolName } from '../inline-fragments';
import { TextNode } from '../inline-fragments/index.js';
import type { BlockNodeData, BlockNodeDataSerialized } from './types';
import { BlockChildType } from './types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from './consts.js';
import { TextAddedEvent, TuneModifiedEvent, ValueModifiedEvent } from '../../utils/EventBus/events/index.js';
import { EventType } from '../../utils/EventBus/types/EventType.js';
import { createBlockTuneName } from '../BlockTune/index.js';

jest.mock('../BlockTune');

jest.mock('../inline-fragments/TextNode');

jest.mock('../ValueNode');

const createBlockNodeWithData = (data: BlockNodeDataSerialized, tunes: Record<string, BlockTuneSerialized> = {}): BlockNode => {
  return new BlockNode({
    name: createBlockToolName('header'),
    data,
    tunes,
  });
};

describe('BlockNode', () => {
  describe('constructor', () => {
    let node: BlockNode;

    beforeEach(() => {
      node = new BlockNode({ name: createBlockToolName('header') });
    });

    it('should have empty object as data by default', () => {
      expect(node.serialized.data)
        .toEqual({});
    });

    it('should set null as parent by default', () => {
      expect(node.parent)
        .toBeNull();
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

      expect(serialized.name)
        .toEqual(blockNodeName);
    });

    it('should call .serialized getter of all tunes associated with the BlockNode', () => {
      const blockTunesNames = [
        'align' as BlockTuneName,
        'font-size' as BlockTuneName,
        'font-weight' as BlockTuneName,
      ];

      const blockTunes = blockTunesNames.reduce((acc, name) => ({
        ...acc,
        [name]: {},
      }), {});

      const spy = jest.spyOn(BlockTune.prototype, 'serialized', 'get');

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
        tunes: blockTunes,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(blockTunesNames.length);
    });

    it('should call .serialized getter of all child ValueNodes associated with the BlockNode', () => {
      const numberOfValueNodes = 2;

      const valueNodes = [ ...Array(numberOfValueNodes)
        .keys() ]
        .reduce((acc, index) => ({
          ...acc,
          [createDataKey(`data-key-${index}c${index}d`)]: index,
        }), {});

      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          ...valueNodes,
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(numberOfValueNodes);
    });

    it('should call .serialized getter of all child TextNodes associated with the BlockNode', () => {
      const numberOfTextNodes = 3;

      const textNodes = [ ...Array(numberOfTextNodes)
        .keys() ]
        .reduce((acc, index) => ({
          ...acc,
          [createDataKey(`data-key-${index}c${index}d`)]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        }), {});

      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          ...textNodes,
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(numberOfTextNodes);
    });


    it('should call .serialized getter of ValueNodes in an array', () => {
      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          items: [ 'value' ],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of TextNode in an array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          items: [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of ValueNodes in a nested object', () => {
      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            nestedObject: { value: 'value' },
          },
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of TextNode in a nested object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            nestedObject: {
              text: {
                [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
                value: '',
                fragments: [],
              },
            },
          },
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of ValueNodes in an array inside an object', () => {
      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            array: [ 'value' ],
          },
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of TextNode in an array inside an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            array: [ {
              text: {
                [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
                value: '',
                fragments: [],
              },
            } ],
          },
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of ValueNodes in an object inside an array', () => {
      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [ { value: 'value' } ],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of TextNode in an object inside an array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [ {
            object: {
              text: {
                [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
                value: '',
                fragments: [],
              },
            },
          } ],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of ValueNodes in a nested array', () => {
      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [ [ 'value' ] ],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of TextNode in a nested array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [ [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ] ],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of object marked as value node', () => {
      const spy = jest.spyOn(ValueNode.prototype, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          value: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Value,
            property: '',
          },
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });
  });

  describe('.name', () => {
    it('should return a name of a tool that created a BlockNode', () => {
      const blockNodeName = createBlockToolName('paragraph');

      const blockNode = new BlockNode({
        name: blockNodeName,
        data: {},
        parent: {} as EditorDocument,
      });

      expect(blockNode.name)
        .toEqual(blockNodeName);
    });
  });

  describe('.tunes', () => {
    it('should return an object with tunes associated with the BlockNode', () => {
      const blockTunesNames = [
        'align' as BlockTuneName,
        'font-size' as BlockTuneName,
        'font-weight' as BlockTuneName,
      ];

      const blockTunes = blockTunesNames.reduce((acc, name) => ({
        ...acc,
        [name]: {},
      }), {});

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
        tunes: blockTunes,
      });

      const tunes = Object.entries(blockNode.tunes);

      tunes.forEach(([name, tune]) => {
        expect(name)
          .toEqual(createBlockTuneName(name));
        expect(tune)
          .toBeInstanceOf(BlockTune);
      });
    });
  });

  describe('.updateTuneData()', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call .update() method of the BlockTune', () => {
      const blockTuneName = 'align' as BlockTuneName;

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
        tunes: {
          [blockTuneName]: {},
        },
      });

      const dataKey = 'align';
      const dataValue = 'left';
      const data = {
        [dataKey]: dataValue,
      };

      const spy = jest.spyOn(BlockTune.prototype, 'update');

      blockNode.updateTuneData(blockTuneName, data);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, dataValue);
    });
  });

  describe('.updateValue()', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call .update() method of the ValueNode with the passed value', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          [dataKey]: 'value',
        },
        parent: {} as EditorDocument,
      });

      const spy = jest.spyOn(ValueNode.prototype, 'update');

      blockNode.updateValue(dataKey, value);

      expect(spy)
        .toHaveBeenCalledWith(value);
    });

    it('should call .update() method of ValueNode with passed keypath when node is inside an object', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            [dataKey]: 'value',
          },
        },
        parent: {} as EditorDocument,
      });

      const spy = jest.spyOn(ValueNode.prototype, 'update');

      blockNode.updateValue(createDataKey(`object.${dataKey}`), value);

      expect(spy)
        .toHaveBeenCalledWith(value);
    });

    it('should call .update() method of ValueNode when node is in an array', () => {
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [ 'value' ],
        },
        parent: {} as EditorDocument,
      });

      const spy = jest.spyOn(ValueNode.prototype, 'update');

      blockNode.updateValue(createDataKey(`array.0`), value);

      expect(spy)
        .toHaveBeenCalledWith(value);
    });

    it('should call .update() method of ValueNode when node is in an array in an object', () => {
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            array: [ 'value' ],
          },
        },
        parent: {} as EditorDocument,
      });

      const spy = jest.spyOn(ValueNode.prototype, 'update');

      blockNode.updateValue(createDataKey(`object.array.0`), value);

      expect(spy)
        .toHaveBeenCalledWith(value);
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
      })
        .toThrowError(`BlockNode: data with key ${dataKey} does not exist`);
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
      })
        .toThrowError(`BlockNode: data with key ${dataKey} is not a ValueNode`);
    });
  });

  describe('.insertText()', () => {
    const dataKey = createDataKey('text');
    const text = 'Some text';

    it('should call .insertText() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.insertText(dataKey, text);

      expect(spy)
        .toHaveBeenCalledWith(text, undefined);
    });

    it('should call .insertText() method of the TextNode in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');
      const node = createBlockNodeWithData({
        object: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        },
      });

      node.insertText(createDataKey(`object.${dataKey}`), text);

      expect(spy)
        .toHaveBeenCalledWith(text, undefined);
    });

    it('should call .insertText() method of the TextNode in an array in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');
      const node = createBlockNodeWithData({
        object: {
          array: [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ],
        },
      });

      node.insertText(createDataKey(`object.array.0`), text);

      expect(spy)
        .toHaveBeenCalledWith(text, undefined);
    });

    it('should call .insertText() method of the TextNode in an array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');
      const node = createBlockNodeWithData({
        array: [
          {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        ],
      });

      node.insertText(createDataKey(`array.0`), text);

      expect(spy)
        .toHaveBeenCalledWith(text, undefined);
    });

    it('should pass start index to the .insertText() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');
      const start = 5;
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.insertText(dataKey, text, start);

      expect(spy)
        .toHaveBeenCalledWith(text, start);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');
      const node = createBlockNodeWithData({});

      expect(() => node.insertText(key, text))
        .toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      const node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.insertText(dataKey, text))
        .toThrow();
    });
  });

  describe('.removeText()', () => {
    const dataKey = createDataKey('text');

    it('should call .removeText() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'removeText');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.removeText(dataKey);

      expect(spy)
        .toHaveBeenCalledWith(undefined, undefined);
    });

    it('should call .removeText() method of the TextNode in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'removeText');
      const node = createBlockNodeWithData({
        object: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        },
      });

      node.removeText(createDataKey(`object.${dataKey}`));

      expect(spy)
        .toHaveBeenCalledWith(undefined, undefined);
    });

    it('should call .removeText() method of the TextNode in an array in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'removeText');
      const node = createBlockNodeWithData({
        object: {
          array: [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ],
        },
      });

      node.removeText(createDataKey(`object.array.0`));

      expect(spy)
        .toHaveBeenCalledWith(undefined, undefined);
    });

    it('should call .removeText() method of the TextNode in an array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'removeText');
      const node = createBlockNodeWithData({
        array: [
          {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        ],
      });

      node.removeText(createDataKey(`array.0`));

      expect(spy)
        .toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass start index to the .removeText() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'removeText');
      const start = 5;
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.removeText(dataKey, start);

      expect(spy)
        .toHaveBeenCalledWith(start, undefined);
    });

    it('should pass end index to the .removeText() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'removeText');
      const start = 5;
      const end = 10;
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.removeText(dataKey, start, end);

      expect(spy)
        .toHaveBeenCalledWith(start, end);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      expect(() => node.removeText(key))
        .toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      const node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.removeText(dataKey))
        .toThrow();
    });
  });

  describe('.format()', () => {
    const dataKey = createDataKey('text');
    const tool = 'bold' as InlineToolName;
    const start = 5;
    const end = 10;

    it('should call .format() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.format(dataKey, tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end, undefined);
    });

    it('should call .format() method of the TextNode in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');
      const node = createBlockNodeWithData({
        object: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        },
      });

      node.format(createDataKey(`object.${dataKey}`), tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end, undefined);
    });

    it('should call .format() method of the TextNode in an array in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');
      const node = createBlockNodeWithData({
        object: {
          array: [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ],
        },
      });

      node.format(createDataKey(`object.array.0`), tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end, undefined);
    });

    it('should call .format() method of the TextNode in an array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');
      const node = createBlockNodeWithData({
        array: [
          {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        ],
      });

      node.format(createDataKey(`array.0`), tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end, undefined);
    });

    it('should pass data to the .format() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');
      const data = {} as InlineToolData;
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.format(dataKey, tool, start, end, data);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end, data);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      expect(() => node.format(key, tool, start, end))
        .toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      const node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.format(dataKey, tool, start, end))
        .toThrow();
    });
  });

  describe('.unformat()', () => {
    const dataKey = createDataKey('text');
    const tool = 'bold' as InlineToolName;
    const start = 5;
    const end = 10;

    it('should call .unformat() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'unformat');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.unformat(dataKey, tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end);
    });

    it('should call .unformat() method of the TextNode in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'unformat');
      const node = createBlockNodeWithData({
        object: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        },
      });

      node.unformat(createDataKey(`object.${dataKey}`), tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end);
    });

    it('should call .unformat() method of the TextNode in an array in an object', () => {
      const spy = jest.spyOn(TextNode.prototype, 'unformat');
      const node = createBlockNodeWithData({
        object: {
          array: [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ],
        },
      });

      node.unformat(createDataKey(`object.array.0`), tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end);
    });

    it('should call .unformat() method of the TextNode in an array', () => {
      const spy = jest.spyOn(TextNode.prototype, 'unformat');
      const node = createBlockNodeWithData({
        array: [
          {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: '',
            fragments: [],
          },
        ],
      });

      node.unformat(createDataKey('array.0'), tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(tool, start, end);
    });

    it('should throw an error if node does not exist', () => {
      const key = createDataKey('non-existing-key');
      const node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      expect(() => node.unformat(key, tool, start, end))
        .toThrow();
    });

    it('should throw an error if node is not a TextNode', () => {
      const node = new BlockNode({
        name: createBlockToolName('header'),
        data: {
          [dataKey]: new ValueNode({} as ValueNodeConstructorParameters),
        },
      });

      expect(() => node.unformat(dataKey, tool, start, end))
        .toThrow();
    });
  });

  describe('.getFragments()', () => {
    it('should call .getFragments() method of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'getFragments');
      const node = createBlockNodeWithData({
        text: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.getFragments(createDataKey('text'), 0, 0, 'bold' as InlineToolName);

      expect(spy)
        .toHaveBeenCalledWith(0, 0, 'bold' as InlineToolName);
    });

    it('should return all fragments for the passed range', () => {
      const boldFragmentStart = 0;
      const boldFragmentEnd = 5;
      const italicFragmentStart = 3;
      const italicFragmentEnd = 10;

      const testRangeStart = 2;
      const testRangeEnd = 7;

      const fragments: InlineFragment[] = [
        {
          tool: 'bold' as InlineToolName,
          range: [boldFragmentStart, boldFragmentEnd],
        },
        {
          tool: 'italic' as InlineToolName,
          range: [italicFragmentStart, italicFragmentEnd],
        },
      ];

      jest.spyOn(TextNode.prototype, 'getFragments')
        .mockImplementation(() => fragments);

      const node = createBlockNodeWithData({
        text: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: 'Test text for checking the fragments',
          fragments,
        },
      });

      const result = node.getFragments(createDataKey('text'), testRangeStart, testRangeEnd);

      expect(result)
        .toEqual(fragments);
    });
  });

  describe('working with TextNode events', () => {
    let node: BlockNode;
    let textNode: TextNode;
    const dataKey = createDataKey('text');
    const start = 0;
    const end = 5;
    const range: [number, number] = [start, end];

    beforeEach(() => {
      node = createBlockNodeWithData({
        [dataKey]: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      textNode = node.data[dataKey] as TextNode;
    });

    it('should re-emit events from the TextNode adding index in Block', () => {
      let event: TextAddedEvent | null = null;

      const handler = (e: Event): void => {
        event = e as TextAddedEvent;
      };

      node.addEventListener(EventType.Changed, handler);

      textNode.dispatchEvent(new TextAddedEvent([ range ], 'Hello'));

      expect(event).toBeInstanceOf(TextAddedEvent);
      expect(event)
        .toHaveProperty('detail', expect.objectContaining({
          index: [range, `data@${dataKey}`],
        }));
    });

    it('should not emit Changed event if TextNode dispatched event that is not a BaseDocumentEvent', () => {
      const handler = jest.fn();

      node.addEventListener(EventType.Changed, handler);

      textNode.dispatchEvent(new Event(EventType.Changed));

      expect(handler)
        .not
        .toHaveBeenCalled();
    });
  });

  describe('working with ValueNode events', () => {
    let node: BlockNode;
    let valueNode: ValueNode;
    const parentDataKey = createDataKey('parent');
    const dataKey = createDataKey('value');
    const value = 'value';
    const newValue = 'new-value';

    beforeEach(() => {
      node = createBlockNodeWithData({
        [parentDataKey]: {
          [dataKey]: value,
        },
      });

      valueNode = (node.data[parentDataKey] as BlockNodeData)[dataKey] as ValueNode;
    });

    it('should re-emit events from the ValueNode adding index in Block', () => {
      let event: ValueModifiedEvent | null = null;
      const handler = (e: Event): void => {
        event = e as ValueModifiedEvent;
      };

      node.addEventListener(EventType.Changed, handler);

      valueNode.dispatchEvent(
        new ValueModifiedEvent(
          [],
          {
            value: newValue,
            previous: value,
          }
        )
      );

      expect(event)
        .toBeInstanceOf(ValueModifiedEvent);
      expect(event)
        .toHaveProperty('detail', expect.objectContaining({
          index: [ `data@${parentDataKey}.${dataKey}` ],
        }));
    });

    it('should not emit Changed event if ValueNode dispatched event that is not a BaseDocumentEvent', () => {
      const handler = jest.fn();

      node.addEventListener(EventType.Changed, handler);

      valueNode.dispatchEvent(new Event(EventType.Changed));

      expect(handler)
        .not
        .toHaveBeenCalled();
    });
  });

  describe('working with BlockTune events', () => {
    let node: BlockNode;
    let tune: BlockTune;
    const tuneName = createBlockTuneName('tune');
    const key = 'key';
    const value = 'value';
    const newValue = 'new-value';

    beforeEach(() => {
      node = createBlockNodeWithData(
        {},
        {
          [tuneName]: { [key]: value },
        }
      );

      tune = node.tunes[tuneName] as BlockTune;
    });

    it('should re-emit event from the BlockTune adding index in Block', () => {
      let event: TuneModifiedEvent | null = null;
      const handler = (e: Event): void => {
        event = e as TuneModifiedEvent;
      };

      node.addEventListener(EventType.Changed, handler);

      tune.dispatchEvent(
        new TuneModifiedEvent(
          [ key ],
          {
            value: newValue,
            previous: value,
          }
        )
      );

      expect(event)
        .toBeInstanceOf(TuneModifiedEvent);
      expect(event)
        .toHaveProperty('detail', expect.objectContaining({
          index: [key, `tune@${tuneName}`],
        }));
    });

    it('should not emit Changed event if ValueNode dispatched event that is not a BaseDocumentEvent', () => {
      const handler = jest.fn();

      node.addEventListener(EventType.Changed, handler);

      tune.dispatchEvent(new Event(EventType.Changed));

      expect(handler)
        .not
        .toHaveBeenCalled();
    });
  });
});

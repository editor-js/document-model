import { EventAction } from '@editorjs/model-types';
import { Index } from '@editorjs/model-types';
import { PartialIndex } from '@editorjs/model-types';
import { createDataKey, createBlockId, createBlockToolName, createBlockTuneName } from '@editorjs/model-types';
import { BlockNode } from './index.js';
import { NonExistingKeyError } from './errors/NonExistingKeyError.js';

import type { BlockTuneName, BlockTuneSerialized } from '@editorjs/model-types';
import { BlockTune } from '../BlockTune/index.js';
import { ValueNode } from '../ValueNode/index.js';

import type { EditorDocument } from '../EditorDocument/index.js';
import type { ValueNodeConstructorParameters } from '../ValueNode/index.js';
import type { InlineToolData, InlineToolName } from '@editorjs/model-types';
import { BlockChildType } from '@editorjs/model-types';
import type { InlineFragment, TextNodeSerialized, BlockNodeDataSerialized } from '@editorjs/model-types';
import { TextNode } from '../inline-fragments/index.js';
import type { BlockNodeData } from './types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '@editorjs/model-types';
import { TextAddedEvent, TuneModifiedEvent, ValueModifiedEvent } from '@editorjs/model-types';
import { EventType } from '@editorjs/model-types';
import { get } from '@editorjs/model-types';
import { AlreadyExistingKeyError } from './errors/AlreadyExistingKeyError.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- needed to spy on conditional-typed getter with @jest/globals strict types
const ValueNodeProto = ValueNode.prototype as unknown as {
  serialized: unknown;
  value: unknown;
  update: () => void;
};

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
  describe('NonExistingKeyError', () => {
    it('should format message with key', () => {
      const key = createDataKey('k');

      expect(new NonExistingKeyError(key).message).toBe(`BlockNode: data with key "${key}" does not exist`);
    });
  });

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

  describe('.id', () => {
    it('should use the provided id', () => {
      const expectedId = createBlockId('my-custom-id');
      const node = new BlockNode({
        name: createBlockToolName('paragraph'),
        id: expectedId,
      });

      expect(node.id).toBe(expectedId);
    });

    it('should auto-generate an id when none is provided', () => {
      const node = new BlockNode({ name: createBlockToolName('paragraph') });

      expect(node.id).toBeDefined();
      expect(typeof node.id).toBe('string');
    });

    it('should generate different ids for different instances', () => {
      const node1 = new BlockNode({ name: createBlockToolName('paragraph') });
      const node2 = new BlockNode({ name: createBlockToolName('paragraph') });

      expect(node1.id).not.toBe(node2.id);
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

      const valueNodes = [...Array(numberOfValueNodes)
        .keys()]
        .reduce((acc, index) => ({
          ...acc,
          [createDataKey(`data-key-${index}c${index}d`)]: index,
        }), {});

      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');

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

      const textNodes = [...Array(numberOfTextNodes)
        .keys()]
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
      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          items: ['value'],
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
      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');
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
      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          object: {
            array: ['value'],
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
            array: [{
              text: {
                [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
                value: '',
                fragments: [],
              },
            }],
          },
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of ValueNodes in an object inside an array', () => {
      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [{ value: 'value' }],
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
          array: [{
            object: {
              text: {
                [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
                value: '',
                fragments: [],
              },
            },
          }],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of ValueNodes in a nested array', () => {
      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          array: [['value']],
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
          array: [[
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: '',
              fragments: [],
            },
          ]],
        },
        parent: {} as EditorDocument,
      });

      blockNode.serialized;

      expect(spy)
        .toHaveBeenCalledTimes(1);
    });

    it('should call .serialized getter of object marked as value node', () => {
      const spy = jest.spyOn(ValueNodeProto, 'serialized', 'get');
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

  describe('.createDataNode()', () => {
    it('should create value data node', () => {
      const blockNodeName = createBlockToolName('paragraph');

      const blockNode = new BlockNode({
        name: blockNodeName,
        data: {},
        parent: {} as EditorDocument,
      });

      const key = createDataKey('url');
      const value = 'https://editorjs.io';

      blockNode.createDataNode(key, value);

      expect(blockNode.data[key]).toBeInstanceOf(ValueNode);
    });

    it('should create text data node', () => {
      const blockNodeName = createBlockToolName('paragraph');

      const blockNode = new BlockNode({
        name: blockNodeName,
        data: {},
        parent: {} as EditorDocument,
      });

      const key = createDataKey('text');
      const value = {
        $t: 't',
        value: 'text',
      };

      blockNode.createDataNode(key, value);

      expect(blockNode.data[key]).toBeInstanceOf(TextNode);
    });

    it('should emit DataNodeAddedEvent', async () => {
      const blockNodeName = createBlockToolName('paragraph');

      const blockNode = new BlockNode({
        name: blockNodeName,
        data: {},
        parent: {} as EditorDocument,
      });

      const listener = jest.fn();

      blockNode.addEventListener(EventType.Changed, listener);

      const key = createDataKey('text');
      const value = {
        $t: 't',
        value: 'text',
      };

      blockNode.createDataNode(key, value);

      // createDataNode dispatches the event inside a queueMicrotask, flush
      // microtasks before asserting that the listener was called.
      await Promise.resolve();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        detail: {
          action: EventAction.Added,
          index: expect.objectContaining({ dataKey: key }),
          data: value,
        },
      }));
    });

    it('should throw an error if key already exists', () => {
      const key = createDataKey('url');
      const value = 'https://editorjs.io';
      const blockNode = createBlockNodeWithData({ [key]: value });

      const currentNode = blockNode.data[key];

      expect(() => {
        blockNode.createDataNode(key, 'another value');
      }).toThrow(AlreadyExistingKeyError);
    });

    it('should create value node at a nested path within an object', () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('meta.url');
      const value = 'https://editorjs.io';

      blockNode.createDataNode(key, value);

      expect(get(blockNode.data, 'meta.url')).toBeInstanceOf(ValueNode);
    });

    it('should create text node at a nested path within an object', () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('meta.title');
      const value = { [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        value: 'hello',
        fragments: [] };

      blockNode.createDataNode(key, value);

      expect(get(blockNode.data, 'meta.title')).toBeInstanceOf(TextNode);
    });

    it('should create value node at an array index path', () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('items.0');
      const value = 'first item';

      blockNode.createDataNode(key, value);

      expect(get(blockNode.data, 'items.0')).toBeInstanceOf(ValueNode);
    });

    it('should create value node in a nested object inside an array', () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('items.0.content');
      const value = 'content text';

      blockNode.createDataNode(key, value);

      expect(get(blockNode.data, 'items.0.content')).toBeInstanceOf(ValueNode);
    });

    it('should create text node in a nested object inside an array', () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('items.0.content');
      const value = {
        value: 'text',
        fragments: [],
        $t: 't',
      };

      blockNode.createDataNode(key, value);

      expect(get(blockNode.data, 'items.0.content')).toBeInstanceOf(TextNode);
    });

    it('should throw an error if a nested key already exists', () => {
      const blockNode = createBlockNodeWithData({ meta: { url: 'editorjs.io' } });
      const key = createDataKey('meta.url');
      const existingNode = get(blockNode.data, 'meta.url');

      expect(() => blockNode.createDataNode(key, 'another value'))
        .toThrow(AlreadyExistingKeyError);

      expect(get(blockNode.data, 'meta.url')).toStrictEqual(existingNode);
    });

    it('should emit DataNodeAddedEvent with nested dataKey', async () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('meta.url');
      const value = 'https://editorjs.io';
      const listener = jest.fn();

      blockNode.addEventListener(EventType.Changed, listener);

      blockNode.createDataNode(key, value);

      await Promise.resolve();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        detail: expect.objectContaining({
          action: EventAction.Added,
          index: expect.objectContaining({ dataKey: key }),
        }),
      }));
    });

    it('should splice a new node into an existing array at the given index', () => {
      const blockNode = createBlockNodeWithData({
        items: [
          { [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'first',
            fragments: [] },
          { [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'third',
            fragments: [] },
        ],
      });

      blockNode.createDataNode(createDataKey('items.1'), {
        [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        value: 'second',
        fragments: [],
      });

      const items = (blockNode.data as Record<string, unknown[]>)['items'];
      const expectedLength = 3;

      expect(items).toHaveLength(expectedLength);
      expect(items[1]).toBeInstanceOf(TextNode);
    });

    it('should shift existing nodes right when splicing into an array', () => {
      const blockNode = createBlockNodeWithData({
        items: [
          { [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'second',
            fragments: [] },
        ],
      });

      const originalNode = (blockNode.data as Record<string, unknown[]>)['items'][0];

      blockNode.createDataNode(createDataKey('items.0'), {
        [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        value: 'first',
        fragments: [],
      });

      const items = (blockNode.data as Record<string, unknown[]>)['items'];

      expect(items).toHaveLength(2);
      expect(items[1]).toStrictEqual(originalNode);
    });
  });

  describe('.getDataNode()', () => {
    it('should return undefined if the key does not exist', () => {
      const blockNode = createBlockNodeWithData({});
      const key = createDataKey('nonexistent');

      const result = blockNode.getDataNode(key);

      expect(result).toBeUndefined();
    });

    it('should return undefined if the nested key does not exist', () => {
      const blockNode = createBlockNodeWithData({});
      const result = blockNode.getDataNode(createDataKey('meta.nonexistent'));

      expect(result).toBeUndefined();
    });

    it('should return undefined if the array index does not exist', () => {
      const blockNode = createBlockNodeWithData({});
      const result = blockNode.getDataNode(createDataKey('meta.0'));

      expect(result).toBeUndefined();
    });

    it('should return serialized ValueNode for a value key', () => {
      const key = createDataKey('url');
      const value = 'https://editorjs.io';
      const blockNode = createBlockNodeWithData({ [key]: value });

      jest.spyOn(ValueNodeProto, 'serialized', 'get').mockReturnValueOnce(value);

      const result = blockNode.getDataNode(key);

      expect(result).toBe(value);
    });

    it('should return serialized TextNode for a text key', () => {
      const key = createDataKey('text');
      const value = {
        $t: 't',
        value: 'some text',
      };
      const blockNode = createBlockNodeWithData({ [key]: value });

      const serialized = { $t: 't' as const,
        value: 'some text',
        fragments: [] } as unknown as TextNodeSerialized;

      jest.spyOn(TextNode.prototype, 'serialized', 'get').mockReturnValueOnce(serialized);

      const result = blockNode.getDataNode(key);

      expect(result).toBe(serialized);
    });

    it('should throw InvalidNodeTypeError if the key holds a nested object (not a leaf node)', () => {
      const blockNode = createBlockNodeWithData({
        nested: {
          value: 'some-value',
        },
      });
      const key = createDataKey('nested');

      expect(() => blockNode.getDataNode(key))
        .toThrow(`BlockNode: data with key "${key}" is not a text or a value`);
    });
  });

  describe('.removeDataNode()', () => {
    it('should remove data from the block', () => {
      const key = createDataKey('url');
      const blockNode = createBlockNodeWithData({ [key]: 'editorjs.io' });

      blockNode.removeDataNode(key);

      expect(blockNode.data[key]).toBeUndefined();
    });

    it('should emit DataNodeRemovedEvent', () => {
      const key = createDataKey('url');
      const value = 'https://editorjs.io';
      const blockNode = createBlockNodeWithData({ [key]: value });
      const listener = jest.fn();

      jest.spyOn(ValueNodeProto, 'serialized', 'get').mockReturnValueOnce(value);

      blockNode.addEventListener(EventType.Changed, listener);

      blockNode.removeDataNode(key);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        detail: {
          action: EventAction.Removed,
          index: expect.objectContaining({ dataKey: key }),
          data: value,
        },
      }));
    });

    it('should not emit DataNodeRemovedEvent if key doesnt exist', () => {
      const key = createDataKey('url');
      const blockNode = createBlockNodeWithData({});
      const listener = jest.fn();

      blockNode.addEventListener(EventType.Changed, listener);

      blockNode.removeDataNode(key);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove data at a nested object path', () => {
      const blockNode = createBlockNodeWithData({ meta: { url: 'editorjs.io' } });

      blockNode.removeDataNode(createDataKey('meta.url'));

      expect(get(blockNode.data, 'meta.url')).toBeUndefined();
    });

    it('should not remove sibling properties when removing a nested key', () => {
      const blockNode = createBlockNodeWithData({ meta: { url: 'editorjs.io',
        title: 'Editor.js' } });

      blockNode.removeDataNode(createDataKey('meta.url'));

      expect(get(blockNode.data, 'meta.title')).toBeDefined();
    });

    it('should remove a node at an array index path', () => {
      const blockNode = createBlockNodeWithData({ items: ['first', 'second'] });

      blockNode.removeDataNode(createDataKey('items.0'));

      // After splice, 'second' shifts to index 0
      expect((blockNode.data as Record<string, unknown[]>)['items']).toHaveLength(1);
    });

    it('should emit DataNodeRemovedEvent with a nested dataKey', () => {
      const blockNode = createBlockNodeWithData({ meta: { url: 'editorjs.io' } });
      const key = createDataKey('meta.url');
      const listener = jest.fn();

      jest.spyOn(ValueNodeProto, 'serialized', 'get').mockReturnValueOnce('editorjs.io');

      blockNode.addEventListener(EventType.Changed, listener);

      blockNode.removeDataNode(key);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        detail: expect.objectContaining({
          action: EventAction.Removed,
          index: expect.objectContaining({ dataKey: key }),
        }),
      }));
    });

    it('should not emit DataNodeRemovedEvent if nested key doesnt exist', () => {
      const blockNode = createBlockNodeWithData({ meta: {} });
      const listener = jest.fn();

      blockNode.addEventListener(EventType.Changed, listener);

      blockNode.removeDataNode(createDataKey('meta.nonexistent'));

      expect(listener).not.toHaveBeenCalled();
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
          array: ['value'],
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
            array: ['value'],
          },
        },
        parent: {} as EditorDocument,
      });

      const spy = jest.spyOn(ValueNode.prototype, 'update');

      blockNode.updateValue(createDataKey(`object.array.0`), value);

      expect(spy)
        .toHaveBeenCalledWith(value);
    });

    it('should create new ValueNode if the ValueNode with the passed dataKey does not exist', () => {
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
      });

      blockNode.updateValue(dataKey, value);

      expect(blockNode.data[dataKey]).toBeInstanceOf(ValueNode);
    });

    it('should create new ValueNode at a nested path if the node does not exist', () => {
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
      });

      blockNode.updateValue(createDataKey('meta.url'), 'https://editorjs.io');

      expect(get(blockNode.data, 'meta.url')).toBeInstanceOf(ValueNode);
    });

    it('should create new ValueNode inside an array if the node does not exist', () => {
      const blockNode = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {},
        parent: {} as EditorDocument,
      });

      blockNode.updateValue(createDataKey('items.0'), 'first item');

      expect(get(blockNode.data, 'items.0')).toBeInstanceOf(ValueNode);
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
        .toThrow(`BlockNode: data with key "${dataKey}" is not a ValueNode`);
    });
  });

  describe('.getText()', () => {
    it('should call .serialized getter of the TextNode', () => {
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get');
      const node = createBlockNodeWithData({
        text: {
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
          value: '',
          fragments: [],
        },
      });

      node.getText(createDataKey('text'));

      expect(spy)
        .toHaveBeenCalled();
    });

    it('should throw an error if data key is invalid', () => {
      const node = createBlockNodeWithData({});
      const key = createDataKey('invalid-key');

      expect(() => node.getText(key))
        .toThrow(`BlockNode: data with key "${key}" does not exist`);
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

    it('should create new TextNode if data key does not exist', () => {
      const key = createDataKey('non-existing-key');
      const node = createBlockNodeWithData({});

      node.insertText(key, text);

      expect(node.data[key]).toBeInstanceOf(TextNode);
    });

    it('should create new TextNode at a nested path if the node does not exist', () => {
      const node = createBlockNodeWithData({});

      node.insertText(createDataKey('meta.title'), text);

      expect(get(node.data, 'meta.title')).toBeInstanceOf(TextNode);
    });

    it('should create new TextNode inside an array if the node does not exist', () => {
      const node = createBlockNodeWithData({});

      node.insertText(createDataKey('items.0'), text);

      expect(get(node.data, 'items.0')).toBeInstanceOf(TextNode);
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
        .toThrow(`BlockNode: data with key "${key}" does not exist`);
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
        .toThrow(`BlockNode: data with key "${key}" does not exist`);
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
        .toThrow(`BlockNode: data with key "${key}" does not exist`);
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
    const range: [ number, number ] = [start, end];

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

      textNode.dispatchEvent(new TextAddedEvent(new PartialIndex({ textRange: range }), 'Hello', 'user'));

      expect(event).toBeInstanceOf(TextAddedEvent);
      expect(event)
        .toHaveProperty('detail.index', expect.objectContaining({
          textRange: range,
          dataKey: dataKey,
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
          Index.data(0, dataKey),
          {
            value: newValue,
            previous: value,
          },
          'user'
        )
      );

      expect(event)
        .toBeInstanceOf(ValueModifiedEvent);
      expect(event)
        .toHaveProperty('detail.index', expect.objectContaining({
          dataKey: `${parentDataKey}.${dataKey}`,
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

      tune = node.tunes[tuneName];
    });

    it('should re-emit event from the BlockTune adding index in Block', () => {
      let event: TuneModifiedEvent | null = null;
      const handler = (e: Event): void => {
        event = e as TuneModifiedEvent;
      };

      node.addEventListener(EventType.Changed, handler);

      tune.dispatchEvent(
        new TuneModifiedEvent(
          new PartialIndex({ tuneKey: key }),
          {
            value: newValue,
            previous: value,
          },
          'user'
        )
      );

      expect(event)
        .toBeInstanceOf(TuneModifiedEvent);
      expect(event)
        .toHaveProperty('detail.index', expect.objectContaining({
          tuneKey: key,
          tuneName: tuneName,
        }));
      expect(event)
        .toHaveProperty('detail.userId', 'user');
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

  describe('.getTextContent()', () => {
    it('should return an empty object when block has no text inputs', () => {
      const node = new BlockNode({ name: createBlockToolName('paragraph') });

      expect(node.getTextContent()).toEqual({});
    });

    it('should call .serialized getter of each TextNode and include results keyed by data key', () => {
      const mockSerializedValue: TextNodeSerialized = {
        [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        value: 'hello',
        fragments: [],
      };
      const spy = jest.spyOn(TextNode.prototype, 'serialized', 'get').mockReturnValue(mockSerializedValue);

      const node = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          text: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'hello',
            fragments: [],
          },
        },
        parent: {} as EditorDocument,
      });

      const result = node.getTextContent();

      expect(spy).toHaveBeenCalled();
      expect(result).toHaveProperty('text');
    });

    it('should collect text inputs from nested array data', () => {
      const mockSerializedValue: TextNodeSerialized = {
        [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        value: 'item',
        fragments: [],
      };

      jest.spyOn(TextNode.prototype, 'serialized', 'get').mockReturnValue(mockSerializedValue);

      const node = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          items: [
            {
              [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
              value: 'item',
              fragments: [],
            },
          ],
        },
        parent: {} as EditorDocument,
      });

      const result = node.getTextContent();

      // The key should contain an array index like 'items.0'
      const keys = Object.keys(result);

      expect(keys.some(k => k.startsWith('items'))).toBe(true);
    });

    it('should not include ValueNode entries', () => {
      const node = new BlockNode({
        name: createBlockToolName('paragraph'),
        data: {
          level: 2,
        },
        parent: {} as EditorDocument,
      });

      const result = node.getTextContent();

      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});

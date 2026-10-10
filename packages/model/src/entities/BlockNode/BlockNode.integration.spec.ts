import { BlockChildType, createInlineToolName, createDataKey, createPluginDataName, EventType, PluginDataModifiedEvent } from '@editorjs/model-types';
import type { InlineFragment } from '@editorjs/model-types';
import { BlockNode } from './index.js';
import { NODE_TYPE_HIDDEN_PROP } from '@editorjs/model-types';
import { ValueNode } from '../ValueNode/index.js';

/**
 * Plugin names that collide with Object.prototype members, kept in constants so the
 * literals don't trip the naming-convention lint rules
 */
const PROTO_NAME = '__proto__';
const TO_STRING_NAME = 'toString';

describe('BlockNode integration tests', () => {
  it('should create ValueNode by primitive value', () => {
    const value = 'value';
    const newValue = 'updated value';
    const node = new BlockNode({
      name: 'blockNode',
      data: {
        value,
      },
    });

    node.updateValue(createDataKey('value'), newValue);

    expect(node.serialized.data)
      .toEqual({
        value: newValue,
      });
  });

  it('should create ValueNode by object marked as value and update its value', () => {
    const value = {
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Value,
      value: 'value',
    };
    const newValue = {
      value: 'updated value',
    };
    const node = new BlockNode({
      name: 'blockNode',
      data: {
        value,
      },
    });

    node.updateValue(createDataKey('value'), newValue);

    expect(node.serialized.data)
      .toEqual({
        value: {
          ...newValue,
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Value,
        },
      });
  });

  it('should create TextNode by passed text node data and insert new text into it', () => {
    const text = {
      value: 'Editor.js is a block-styled editor',
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
    };
    const addedText = ' for rich media web content';
    const node = new BlockNode({
      name: 'blockNode',
      data: {
        text,
      },
    });

    node.insertText(createDataKey('text'), addedText);

    expect(node.serialized.data).toEqual({
      text: {
        value: `${text.value}${addedText}`,
        fragments: [],
        [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
      },
    });
  });

  it('should create relevant nodes from the array and update their values', () => {
    const value = 'value';
    const updatedValue = 'updated value';
    const text = {
      value: 'Editor.js is a block-styled editor',
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
    };
    const addedText = ' for rich media web content';
    const node = new BlockNode({
      name: 'blockNode',
      data: {
        array: [value, text],
      },
    });

    node.updateValue(createDataKey('array.0'), updatedValue);
    node.insertText(createDataKey('array.1'), addedText);

    expect(node.serialized.data).toEqual({
      array: [
        updatedValue,
        {
          value: `${text.value}${addedText}`,
          fragments: [],
          [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        },
      ],
    });
  });

  describe('.getFragments()', () => {
    it('should return empty array if there is no fragments in the passed range', () => {
      const testRangeStart = 0;
      const testRangeEnd = 5;
      const dataKey = createDataKey('1a2b');

      const node = new BlockNode({
        name: 'blockNode',
        data: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'value',
          },
        },
      });

      const fragments = node.getFragments(
        dataKey,
        testRangeStart,
        testRangeEnd,
        createInlineToolName('inlineTool')
      );

      expect(fragments).toEqual([]);
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
          tool: createInlineToolName('bold'),
          range: [boldFragmentStart, boldFragmentEnd],
        },
        {
          tool: createInlineToolName('italic'),
          range: [italicFragmentStart, italicFragmentEnd],
        },
      ];

      const dataKey = createDataKey('1a2b');

      const node = new BlockNode({
        name: 'blockNode',
        data: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'Test text for checking the fragments',
            fragments,
          },
        },
      });

      const result = node.getFragments(dataKey, testRangeStart, testRangeEnd);

      expect(result)
        .toEqual(fragments);
    });

    it('should return fragments for the passed range and tool', () => {
      const boldFragmentStart = 0;
      const boldFragmentEnd = 5;
      const italicFragmentStart = 3;
      const italicFragmentEnd = 10;

      const testRangeStart = 2;
      const testRangeEnd = 7;

      const fragments: InlineFragment[] = [
        {
          tool: createInlineToolName('bold'),
          range: [boldFragmentStart, boldFragmentEnd],
        },
        {
          tool: createInlineToolName('italic'),
          range: [italicFragmentStart, italicFragmentEnd],
        },
      ];

      const dataKey = createDataKey('1a2b');

      const node = new BlockNode({
        name: 'blockNode',
        data: {
          [dataKey]: {
            [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
            value: 'Test text for checking the fragments',
            fragments,
          },
        },
      });

      const result = node.getFragments(
        dataKey,
        testRangeStart,
        testRangeEnd,
        createInlineToolName('italic')
      );

      expect(result)
        .toEqual([fragments[1]]);
    });
  });

  describe('.data', () => {
    it('should return the data associated with this block node', () => {
      // Arrange
      const initData = {
        key: 'value',
      };
      const blockNode = new BlockNode({
        name: 'blockNode',
        data: initData,
      });

      // Act
      const data = blockNode.data;

      // Assert
      expect(data).toHaveProperty('key');

      const valueNode = (data as { key: ValueNode }).key;

      expect(valueNode).toBeInstanceOf(ValueNode);
      expect(valueNode.serialized)
        .toEqual(initData.key);
    });
  });

  describe('.updatePluginData() creating entries', () => {
    it('should create the entry when the block has no data for that plugin', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });

      blockNode.updatePluginData(createPluginDataName('anchors'), { id: 'intro' });

      expect(blockNode.serialized.plugins)
        .toEqual({ anchors: { id: 'intro' } });
    });

    it('should emit an event with undefined previous value for the first write', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });
      let event: PluginDataModifiedEvent | null = null;

      blockNode.addEventListener(EventType.Changed, (e: Event): void => {
        event = e as PluginDataModifiedEvent;
      });

      blockNode.updatePluginData(createPluginDataName('anchors'), { id: 'intro' });

      expect(event)
        .toBeInstanceOf(PluginDataModifiedEvent);
      expect(event)
        .toHaveProperty('detail.data', {
          value: 'intro',
          previous: undefined,
        });
    });

    it('should emit one event per changed key', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });
      const handler = jest.fn();

      blockNode.addEventListener(EventType.Changed, handler);

      blockNode.updatePluginData(createPluginDataName('anchors'), { id: 'intro',
        visible: true });

      expect(handler)
        .toHaveBeenCalledTimes(2);
    });

    it('should keep other keys when one key is updated', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });
      const pluginName = createPluginDataName('anchors');

      blockNode.updatePluginData(pluginName, { id: 'intro',
        visible: true });
      blockNode.updatePluginData(pluginName, { visible: false });

      expect(blockNode.serialized.plugins)
        .toEqual({ anchors: { id: 'intro',
          visible: false } });
    });

    it('should drop an entry from serialization once its last key is removed', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });
      const pluginName = createPluginDataName('anchors');

      blockNode.updatePluginData(pluginName, { id: 'intro' });
      blockNode.updatePluginData(pluginName, { id: undefined });

      expect(blockNode.serialized.plugins)
        .toEqual({});
    });

    it('should store data for a plugin named like an object prototype member', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });

      blockNode.updatePluginData(createPluginDataName(PROTO_NAME), { id: 'intro' });
      blockNode.updatePluginData(createPluginDataName(TO_STRING_NAME), { id: 'other' });

      expect(blockNode.serialized.plugins)
        .toEqual({ [PROTO_NAME]: { id: 'intro' },
          [TO_STRING_NAME]: { id: 'other' } });
      expect(Object.prototype)
        .not.toHaveProperty('id');
    });

    it('should round-trip a plugin named like an object prototype member through initialization', () => {
      const blockNode = new BlockNode({ name: 'blockNode',
        plugins: { [PROTO_NAME]: { id: 'intro' } } });

      expect(blockNode.serialized.plugins)
        .toEqual({ [PROTO_NAME]: { id: 'intro' } });
    });

    it('should throw when the plugin data name is empty', () => {
      const blockNode = new BlockNode({ name: 'blockNode' });

      expect(() => blockNode.updatePluginData(createPluginDataName(''), { id: 'intro' }))
        .toThrow('plugin data name must not be empty');
    });
  });
});

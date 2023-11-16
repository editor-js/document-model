import { BlockNode, createDataKey } from './index.js';
import { BlockChildType } from './types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from './consts.js';
import type { InlineFragment } from '../inline-fragments/index.js';
import { createInlineToolName } from '../inline-fragments/index.js';
import { ValueNode } from '../ValueNode/index.js';

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
        .toEqual([ fragments[1] ]);
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

      const valueNode = (data as {key: ValueNode}).key;

      expect(valueNode).toBeInstanceOf(ValueNode);
      expect(valueNode.serialized)
        .toEqual(initData.key);
    });
  });
});

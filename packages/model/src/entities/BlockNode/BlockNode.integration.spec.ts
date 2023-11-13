import { BlockNode, createDataKey } from './index.js';
import { BlockChildType } from './types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from './consts.js';

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
});

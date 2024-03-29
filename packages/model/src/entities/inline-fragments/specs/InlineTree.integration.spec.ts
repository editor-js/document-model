/* eslint-disable @typescript-eslint/no-magic-numbers */
import type {
  TextNodeSerialized
} from '../index';
import {
  TextInlineNode,
  TextNode,
  createInlineToolData,
  createInlineToolName
} from '../index.js';
import { BlockChildType } from '../../BlockNode/types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '../../BlockNode/consts.js';

describe('Inline fragments tree integration', () => {
  describe('text insertion', () => {
    it('should insert text into the empty tree', () => {
      const tree = new TextNode();
      const text = 'Editor.js is a block-styled editor';

      tree.insertText(text);

      expect(tree.getText())
        .toBe(text);
    });

    it('should insert text at the end of the non-empty tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });

      const tree = new TextNode({ children: [ child ] });
      const text = ' Editor outputs clean data in JSON';

      tree.insertText(text);

      expect(tree.getText())
        .toBe(initialText + text);
    });

    it('should insert text at the beginning of the non-empty tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });

      const tree = new TextNode({ children: [ child ] });
      const text = 'Editor outputs clean data in JSON ';

      tree.insertText(text, 0);

      expect(tree.getText())
        .toBe(text + initialText);
    });

    it('should insert text at the middle of the non-empty tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const index = 10;
      const child = new TextInlineNode({ value: initialText });

      const tree = new TextNode({ children: [ child ] });
      const text = ' Editor outputs clean data in JSON ';

      tree.insertText(text, index);

      expect(tree.getText())
        .toBe(initialText.slice(0, index) + text + initialText.slice(index));
    });
  });

  describe('text removal', () => {
    it('should return removed text', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });

      const removedText = tree.removeText();

      expect(removedText)
        .toBe(initialText);
    });

    it('should remove all text from the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });

      tree.removeText();

      expect(tree.length)
        .toBe(0);
    });

    it('should remove text from the beginning of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 10;

      tree.removeText(0, index);

      expect(tree.getText())
        .toBe(initialText.slice(index));
    });

    it('should remove text from the middle of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 10;
      const length = 5;

      tree.removeText(index, index + length);

      expect(tree.getText())
        .toBe(initialText.slice(0, index) + initialText.slice(index + length));
    });

    it('should remove text from passed index to the end of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 10;

      tree.removeText(index);

      expect(tree.getText())
        .toBe(initialText.slice(0, index));
    });

    it('should throw an error if index is out of range', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 100;

      expect(() => tree.removeText(index))
        .toThrowError();
    });
  });

  describe('text formatting', () => {
    const inlineTool = createInlineToolName('bold');

    it('should format text', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 0;

      tree.format(inlineTool, index, tree.length);

      expect(tree.getFragments())
        .toStrictEqual([
          {
            tool: inlineTool,
            range: [
              index,
              index + tree.length,
            ],
          },
        ]);
    });

    it('should save formatting data', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 0;
      const data = createInlineToolData({ bold: true });

      tree.format(inlineTool, index, tree.length, data);

      expect(tree.getFragments())
        .toStrictEqual([
          {
            tool: inlineTool,
            range: [
              index,
              index + tree.length,
            ],
            data,
          },
        ]);
    });

    it('should format text in the middle of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({ children: [ child ] });
      const index = 10;
      const length = 5;

      tree.format(inlineTool, index, index + length);

      expect(tree.getFragments()).toStrictEqual([
        {
          tool: inlineTool,
          range: [
            index,
            index + length,
          ],
        },
      ]);
    });

    it('should support nested formatting for the same tool', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({
        children: [ child ],
      });
      const index = 10;
      const length = 5;
      const offset = 1;

      tree.format(inlineTool, index, index + length);
      tree.format(inlineTool, index + offset, index + length - offset);

      expect(tree.getFragments()).toStrictEqual([
        {
          tool: inlineTool,
          range: [
            index,
            index + length,
          ],
        },
      ]);
    });

    it('should support nested formatting for different tools', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({
        children: [ child ],
      });
      const italicInlineTool = createInlineToolName('italic');

      const index = 10;
      const length = 5;
      const offset = 1;

      tree.format(inlineTool, index, index + length);
      tree.format(italicInlineTool, index + offset, index + length - offset);

      expect(tree.getFragments()).toStrictEqual([
        {
          tool: inlineTool,
          range: [
            index,
            index + length,
          ],
        },
        {
          tool: italicInlineTool,
          range: [
            index + offset,
            index + length - offset,
          ],
        },
      ]);
    });

    it('should support overlapping formatting for the same tool', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({
        children: [ child ],
      });

      const index = 10;
      const length = 5;
      const offset = 3;

      tree.format(inlineTool, index, index + length);
      tree.format(inlineTool, index + offset, index + length + offset);

      expect(tree.getFragments()).toStrictEqual([
        {
          tool: inlineTool,
          range: [
            index,
            index + length + offset,
          ],
        },
      ]);
    });

    it('should support overlapping formatting for different tools', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextInlineNode({ value: initialText });
      const tree = new TextNode({
        children: [ child ],
      });
      const italicInlineTool = createInlineToolName('italic');

      const index = 10;
      const length = 5;
      const offset = 3;

      tree.format(inlineTool, index, index + length);
      tree.format(italicInlineTool, index + offset, index + length + offset);

      expect(tree.getFragments()).toStrictEqual([
        {
          tool: inlineTool,
          range: [
            index,
            index + length,
          ],
        },
        {
          tool: italicInlineTool,
          range: [
            index + offset,
            index + length + offset,
          ],
        },
      ]);
    });
  });

  /**
   * This test-case is trying to reproduce the real user behaviour
   *
   * 1. User types "Editor.js is a block-styled editor."
   * 2. User types " It's written in Vanilla JavaScript and released under MIT license."
   * 3. User types " Designed to be extendable and pluggable with a simple API."
   * 4. User types " It returns clean data output in JSON." as a third sentence
   * 5. User selects "block-styled" and applies bold formatting
   * 6. User selects "clean" and applies italic formatting
   * 7. User selects "extendable and pluggable" and applies italic formatting
   * 8. User "extandable" and applies bold formatting
   * 9. User selects "pluggable" and applies bold formatting
   * 10. User removes " It's written in Vanilla JavaScript and released under MIT license."
   * 11. User removes " data"
   * 12. User removes bold formatting from "pluggable"
   *
   * Result string should be:
   * Editor.js is a <bold>block-styled</bold> editor. It returns <italic>clean<italic> output in JSON. Designed to be <italic><bold>extendable</bold> and pluggable</italic> with a simple API.
   *
   */
  it('should pass "real behaviour" test', () => {
    const tree = new TextNode();

    const firstFragment = 'Editor.js is a block-styled editor.';
    const secondFragment = ' It returns clean data output in JSON.';
    const thirdFragment = ' Designed to be extendable and pluggable with a simple API.';
    const fourthFragment = ' It\'s written in Vanilla JavaScript and released under MIT license.';

    const fullText = firstFragment + fourthFragment + secondFragment + thirdFragment;

    tree.insertText(firstFragment);
    tree.insertText(fourthFragment);
    tree.insertText(thirdFragment);
    tree.insertText(secondFragment, firstFragment.length + fourthFragment.length);

    const blockStyled = [fullText.indexOf('block-styled'), fullText.indexOf('block-styled') + 'block-styled'.length] as const;
    const clean = [fullText.indexOf('clean'), fullText.indexOf('clean') + 'clean'.length] as const;
    const data = [fullText.indexOf('data') - 1, fullText.indexOf('data') + 'data'.length] as const;
    const cleanData = [clean[0], data[1]] as const;
    const extendable = [fullText.indexOf('extendable'), fullText.indexOf('extendable') + 'extendable'.length] as const;
    const pluggable = [fullText.indexOf('pluggable'), fullText.indexOf('pluggable') + 'pluggable'.length] as const;
    const extendablePluggable = [extendable[0], pluggable[1]] as const;

    const boldTool = createInlineToolName('bold');
    const italicTool = createInlineToolName('italic');

    const removedChars = fourthFragment.length + (data[1] - data[0]);

    tree.format(boldTool, ...blockStyled);
    tree.format(italicTool, ...cleanData);
    tree.format(italicTool, ...extendablePluggable);
    tree.format(boldTool, ...extendable);
    tree.format(boldTool, ...pluggable);

    tree.removeText(firstFragment.length, firstFragment.length + fourthFragment.length);
    tree.removeText(data[0] - fourthFragment.length, data[1] - fourthFragment.length);

    tree.unformat(boldTool, ...(pluggable.map((value) => value - removedChars) as [number, number]));

    expect(tree.serialized).toStrictEqual({
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
      value: firstFragment + secondFragment.replace(' data', '') + thirdFragment,
      fragments: [
        {
          tool: boldTool,
          range: blockStyled,
        },
        {
          tool: italicTool,
          range: clean.map((value) => value - fourthFragment.length),
        },
        {
          tool: italicTool,
          range: extendablePluggable.map((value) => value - removedChars),
        },
        {
          tool: boldTool,
          range: extendable.map((value) => value - removedChars),
        },
      ],
    });
  });

  it('should initialize tree with initial text and fragments', () => {
    const data = {
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
      value: 'Editor.js is a block-styled editor. It returns clean output in JSON. Designed to be extendable and pluggable with a simple API.',
      fragments: [
        {
          tool: 'bold',
          range: [
            15,
            27,
          ],
        },
        {
          tool: 'italic',
          range: [
            47,
            52,
          ],
        },
        {
          tool: 'italic',
          range: [
            84,
            108,
          ],
        },
        {
          tool: 'bold',
          range: [
            84,
            94,
          ],
        },
      ],
    } as TextNodeSerialized;

    const tree = new TextNode({
      value: data.value,
      fragments: data.fragments,
    });

    expect(tree.serialized).toEqual(data);
  });
});

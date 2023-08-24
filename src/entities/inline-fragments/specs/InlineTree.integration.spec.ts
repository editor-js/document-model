import { RootInlineNode } from '../RootInlineNode';
import { TextNode } from '../TextNode';
import { createInlineToolName } from '../FormattingNode';

describe('Inline fragments tree integration', () => {
  describe('text insertion', () => {
    it('should insert text into the empty tree', () => {
      const tree = new RootInlineNode();
      const text = 'Editor.js is a block-styled editor';

      tree.insertText(text);

      expect(tree.getText())
        .toBe(text);
    });

    it('should insert text at the end of the non-empty tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });

      const tree = new RootInlineNode({ children: [ child ] });
      const text = ' Editor outputs clean data in JSON';

      tree.insertText(text);

      expect(tree.getText())
        .toBe(initialText + text);
    });

    it('should insert text at the beginning of the non-empty tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });

      const tree = new RootInlineNode({ children: [ child ] });
      const text = 'Editor outputs clean data in JSON ';

      tree.insertText(text, 0);

      expect(tree.getText())
        .toBe(text + initialText);
    });

    it('should insert text at the middle of the non-empty tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const index = 10;
      const child = new TextNode({ value: initialText });

      const tree = new RootInlineNode({ children: [ child ] });
      const text = ' Editor outputs clean data in JSON ';

      tree.insertText(text, index);

      expect(tree.getText())
        .toBe(initialText.slice(0, index) + text + initialText.slice(index));
    });
  });

  describe('text removal', () => {
    it('should return removed text', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });

      const removedText = tree.removeText();

      expect(removedText)
        .toBe(initialText);
    });

    it('should remove all text from the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });

      tree.removeText();

      expect(tree.length)
        .toBe(0);
    });

    it('should remove text from the beginning of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });
      const index = 10;

      tree.removeText(0, index);

      expect(tree.getText())
        .toBe(initialText.slice(index));
    });

    it('should remove text from the middle of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });
      const index = 10;
      const length = 5;

      tree.removeText(index, index + length);

      expect(tree.getText())
        .toBe(initialText.slice(0, index) + initialText.slice(index + length));
    });

    it('should remove text from the end of the tree', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });
      const index = 10;

      tree.removeText(index);

      expect(tree.getText())
        .toBe(initialText.slice(0, index));
    });

    it('should throw an error if index is out of range', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });
      const index = 100;

      expect(() => tree.removeText(index))
        .toThrowError();
    });
  });

  describe('text formatting', () => {
    const inlineTool = createInlineToolName('bold');

    it('should format text', () => {
      const initialText = 'Editor.js is a block-styled editor.';
      const child = new TextNode({ value: initialText });
      const tree = new RootInlineNode({ children: [ child ] });
      const index = 10;
      const length = 5;

      tree.format(inlineTool, index, index + length);

      expect(tree.getFragments())
        .toStrictEqual([ {
          tool: inlineTool,
          range: [
            index,
            index + length,
          ],
        } ]);
    });
  });
});

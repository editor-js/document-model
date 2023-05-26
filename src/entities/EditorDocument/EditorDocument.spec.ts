import { EditorDocument } from './index';
import { BlockNode, BlockNodeName, createBlockNodeName } from '../BlockNode';

const createBlock = ({ name, parent }: { name?: BlockNodeName, parent: EditorDocument }): BlockNode => {
  return new BlockNode({
    name: name || createBlockNodeName('block'),
    parent,
    children: {},
  });
};

describe('EditorDocument', () => {
  let document: EditorDocument;
  let blocks: BlockNode[];

  beforeEach(() => {
    document = new EditorDocument({
      children: [],
      properties: {
        readOnly: false,
      },
    });

    const countOfBlocks = 3;

    blocks = [];

    for (let i = 0; i < countOfBlocks; i++) {
      const block = createBlock({
        parent: document,
      });

      document.addBlock(block);
      blocks.push(block);
    }
  });

  describe('.length', () => {
    it('should return the number of blocks in the document', () => {
      // Arrange
      const expected = 3;
      const document1 = new EditorDocument({
        children: [],
        properties: {
          readOnly: false,
        },
      });

      for (let i = 0; i < expected; i++) {
        const block = createBlock({
          parent: document1,
        });

        document1.addBlock(block);
      }

      // Act
      const actual = document1.length;

      // Assert
      expect(actual).toBe(expected);
    });
  });

  describe('.addBlock()', () => {
    it('should add the block to the end of the document if index is not provided', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      document.addBlock(block);

      // Assert
      const lastBlock = document.getBlock(document.length - 1);

      expect(lastBlock).toBe(block);
    });

    it('should add the block to the beginning of the document if index is 0', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      document.addBlock(block, 0);

      // Assert
      expect(document.getBlock(0)).toBe(block);
    });

    it('should add the block to the specified index', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      document.addBlock(block, 1);

      // Assert
      expect(document.getBlock(1)).toBe(block);
    });

    it('should add the block to the end of the document', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      document.addBlock(block, document.length);

      // Assert
      const lastBlock = document.getBlock(document.length - 1);

      expect(lastBlock).toBe(block);
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      const action = (): void => document.addBlock(block, document.length + 1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      const action = (): void => document.addBlock(block, -1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.removeBlock()', () => {
    it('should remove the block from the beginning of the document', () => {
      // Arrange
      const block = document.getBlock(0);

      // Act
      document.removeBlock(0);

      // Assert
      expect(document.getBlock(0)).not.toBe(block);
    });

    it('should remove the block from the specified index', () => {
      // Arrange
      const block = document.getBlock(1);

      // Act
      document.removeBlock(1);

      // Assert
      expect(document.getBlock(1)).not.toBe(block);
    });

    it('should remove the block from the end of the document', () => {
      // Arrange
      const documentLengthBeforeRemove = document.length;

      // Act
      document.removeBlock(document.length - 1);

      // Assert
      expect(document.length).toBe(documentLengthBeforeRemove - 1);
    });

    it('should throw an error if index is greater then document length', () => {
      // Act
      const action = (): void => document.removeBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is less then 0', () => {
      // Act
      const action = (): void => document.removeBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.getBlock()', () => {
    it('should return the block from the specific index', () => {
      // Arrange
      const index = 1;

      // Act
      const block = document.getBlock(index);

      // Assert
      expect(block).toBe(blocks[index]);
    });

    it('should throw an error if index is greater then document length', () => {
      // Act
      const action = (): BlockNode => document.getBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is less then 0', () => {
      // Act
      const action = (): BlockNode => document.getBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });
});

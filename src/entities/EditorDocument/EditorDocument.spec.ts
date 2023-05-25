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

  beforeEach(() => {
    document = new EditorDocument({
      children: [],
      properties: {
        readOnly: false,
      },
    });

    const block1 = createBlock({
      name: createBlockNodeName('block1'),
      parent: document,
    });
    const block2 = createBlock({
      name: createBlockNodeName('block2'),
      parent: document,
    });
    const block3 = createBlock({
      name: createBlockNodeName('block3'),
      parent: document,
    });

    document.addBlock(block1);
    document.addBlock(block2);
    document.addBlock(block3);
  });

  describe('length', () => {
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

  describe('addBlock', () => {
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
        name: createBlockNodeName('block'),
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
        name: createBlockNodeName('block'),
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

    it('should throw an error if index is greater then block nodes length', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      const action = (): void | never => document.addBlock(block, document.length + 1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const block = createBlock({
        parent: document,
      });

      // Act
      const action = (): void | never => document.addBlock(block, -1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('removeBlock', () => {
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

    it('should throw an error if index is greater then block nodes length', () => {
      // Act
      const action = (): void | never => document.removeBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is less then 0', () => {
      // Act
      const action = (): void | never => document.removeBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('getBlock', () => {
    it('should return the block from the specific index', () => {
      // Arrange
      const index = 1;

      // Act
      const block = document.getBlock(index);

      // Assert
      expect(block).toBe(document.getBlock(index));
    });

    it('should throw an error if index is greater then block nodes length', () => {
      // Act
      const action = (): BlockNode | never => document.getBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is less then 0', () => {
      // Act
      const action = (): BlockNode | never => document.getBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });
});

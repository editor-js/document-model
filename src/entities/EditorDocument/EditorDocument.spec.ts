import { EditorDocument } from './index';
import { BlockNode, BlockNodeName, createBlockNodeName } from '../BlockNode';

const createDocument = (): EditorDocument => {
  return new EditorDocument({
    children: [],
    properties: {
      readOnly: false,
    },
  });
};

const createBlock = ({ name, parent }: { name?: BlockNodeName, parent: EditorDocument }): BlockNode => {
  return new BlockNode({
    name: name || createBlockNodeName('block'),
    parent,
    children: {},
  });
};

describe('EditorDocument', () => {
  describe('addBlock', () => {
    describe('when index is not provided', () => {
      let document: EditorDocument;
      let blocksInDocument = 0;

      beforeEach(() => {
        document = createDocument();

        const block1 = createBlock({
          name: createBlockNodeName('block1'),
          parent: document,
        });
        const block2 = createBlock({
          name: createBlockNodeName('block2'),
          parent: document,
        });

        document.addBlock(block1);
        document.addBlock(block2);
        blocksInDocument = 2;
      });

      it('should add the block to the end of the document', () => {
        // Arrange
        const block = createBlock({
          parent: document,
        });

        // Act
        document.addBlock(block);

        // Assert
        expect(document.getBlock(blocksInDocument)).toBe(block);
      });
    });

    describe('when index is 0', () => {
      let document: EditorDocument;

      beforeEach(() => {
        document = createDocument();

        const block1 = createBlock({
          name: createBlockNodeName('block1'),
          parent: document,
        });
        const block2 = createBlock({
          name: createBlockNodeName('block2'),
          parent: document,
        });

        document.addBlock(block1);
        document.addBlock(block2);
      });

      it('should add the block to the beginning of the document', () => {
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
    });

    describe('when index is between 0 and the length of the document', () => {
      let document: EditorDocument;

      beforeEach(() => {
        document = createDocument();

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
    });

    describe('when index is equal to the length of the document', () => {
      let document: EditorDocument;
      let blocksInDocument = 0;

      beforeEach(() => {
        document = createDocument();

        const block1 = createBlock({
          name: createBlockNodeName('block1'),
          parent: document,
        });
        const block2 = createBlock({
          name: createBlockNodeName('block2'),
          parent: document,
        });

        document.addBlock(block1);
        document.addBlock(block2);
        blocksInDocument = 2;
      });

      it('should add the block to the end of the document', () => {
        // Arrange
        const block = createBlock({
          parent: document,
        });

        // Act
        document.addBlock(block, blocksInDocument);

        // Assert
        expect(document.getBlock(blocksInDocument)).toBe(block);
      });
    });

    describe('when index is out of bounce of the document block nodes', () => {
      let document: EditorDocument;
      let blocksInDocument = 0;

      beforeEach(() => {
        document = createDocument();

        const block1 = createBlock({
          name: createBlockNodeName('block1'),
          parent: document,
        });
        const block2 = createBlock({
          name: createBlockNodeName('block2'),
          parent: document,
        });

        document.addBlock(block1);
        document.addBlock(block2);
        blocksInDocument = 2;
      });

      it('should throw an error if index is greater then block nodes length', () => {
        // Arrange
        const block = createBlock({
          parent: document,
        });

        // Act
        const action = (): void | never => document.addBlock(block, blocksInDocument + 1);

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
  });
});

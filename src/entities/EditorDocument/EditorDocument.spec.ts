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

  describe('removeBlock', () => {
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
      const block3 = createBlock({
        name: createBlockNodeName('block3'),
        parent: document,
      });

      document.addBlock(block1);
      document.addBlock(block2);
      document.addBlock(block3);

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      blocksInDocument = 3;
    });

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
      // Act
      document.removeBlock(blocksInDocument - 1);

      // Assert
      expect(() => document.getBlock(blocksInDocument - 1)).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then block nodes length', () => {
      // Act
      const action = (): void | never => document.removeBlock(blocksInDocument);

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
      const block3 = createBlock({
        name: createBlockNodeName('block3'),
        parent: document,
      });

      document.addBlock(block1);
      document.addBlock(block2);
      document.addBlock(block3);

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      blocksInDocument = 3;
    });

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
      const action = (): BlockNode | never => document.getBlock(blocksInDocument);

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

import { EditorDocument } from './index';
import { BlockNode, createDataKey } from '../BlockNode';
import { createBlockNodeMock } from '../../utils/mocks/createBlockNodeMock';
import { createEditorDocumentMock } from '../../utils/mocks/createEditorDocumentMock';
import { BlockNodeConstructorParameters } from '../BlockNode/types';

/**
 * Creates an EditorDocument object with some blocks for tests.
 */
function createEditorDocumentMockWithSomeBlocks(): EditorDocument {
  const document = createEditorDocumentMock();

  const countOfBlocks = 3;

  for (let i = 0; i < countOfBlocks; i++) {
    const block = createBlockNodeMock({
      parent: document,
    });

    document.addBlock(block);
  }

  return document;
}

describe('EditorDocument', () => {
  describe('.length', () => {
    it('should return the number of blocks in the document', () => {
      // Arrange
      const blocksCount = 3;
      const document = new EditorDocument({
        children: [],
        properties: {
          readOnly: false,
        },
      });

      for (let i = 0; i < blocksCount; i++) {
        const block = createBlockNodeMock({
          parent: document,
        });

        document.addBlock(block);
      }

      // Act
      const actual = document.length;

      // Assert
      expect(actual).toBe(blocksCount);
    });
  });

  describe('.addBlock()', () => {
    it('should add the block to the end of the document if index is not provided', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = createBlockNodeMock({
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
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = createBlockNodeMock({
        parent: document,
      });

      // Act
      document.addBlock(block, 0);

      // Assert
      expect(document.getBlock(0)).toBe(block);
    });

    it('should add the block to the specified index in the middle of the document', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = createBlockNodeMock({
        parent: document,
      });

      // Act
      document.addBlock(block, 1);

      // Assert
      expect(document.getBlock(1)).toBe(block);
    });

    it('should add the block to the end of the document if the index after the last element is passed', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = createBlockNodeMock({
        parent: document,
      });

      // Act
      document.addBlock(block, document.length);

      // Assert
      const lastBlock = document.getBlock(document.length - 1);

      expect(lastBlock).toBe(block);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = createBlockNodeMock({
        parent: document,
      });

      // Act
      const action = (): void => document.addBlock(block, -1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = createBlockNodeMock({
        parent: document,
      });

      // Act
      const action = (): void => document.addBlock(block, document.length + 1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.removeBlock()', () => {
    it('should remove the block from the beginning of the document if index 0 is passed', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = document.getBlock(0);

      // Act
      document.removeBlock(0);

      // Assert
      expect(document.getBlock(0)).not.toBe(block);
    });

    it('should remove the block from the specified index in the middle of the document', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const block = document.getBlock(1);

      // Act
      document.removeBlock(1);

      // Assert
      expect(document.getBlock(1)).not.toBe(block);
    });

    it('should remove the block from the end of the document if the last index is passed', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();
      const documentLengthBeforeRemove = document.length;

      // Act
      document.removeBlock(document.length - 1);

      // Assert
      expect(document.length).toBe(documentLengthBeforeRemove - 1);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();

      // Act
      const action = (): void => document.removeBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();

      // Act
      const action = (): void => document.removeBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.getBlock()', () => {
    it('should return the block from the specific index', () => {
      // Arrange
      const document = createEditorDocumentMock();
      const countOfBlocks = 3;
      const blocks: BlockNode[] = [];

      for (let i = 0; i < countOfBlocks; i++) {
        const block = createBlockNodeMock({
          parent: document,
        });

        document.addBlock(block);
        blocks.push(block);
      }
      const index = 1;

      // Act
      const block = document.getBlock(index);

      // Assert
      expect(block).toBe(blocks[index]);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();

      // Act
      const action = (): BlockNode => document.getBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentMockWithSomeBlocks();

      // Act
      const action = (): BlockNode => document.getBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.properties', () => {
    it('should return the properties of the document', () => {
      const properties = {
        'readOnly' : true,
      };

      const document = new EditorDocument({
        children: [],
        properties: {
          ...properties,
        },
      });

      expect(document.properties).toEqual(properties);
    });
  });

  describe('.getProperty()', () => {
    it('should return the property by name', () => {
      const propertyName = 'readOnly';
      const expectedValue = true;
      const document = new EditorDocument({
        children: [],
        properties: {
          [propertyName]: expectedValue,
        },
      });

      const actualValue = document.getProperty<boolean>(propertyName);

      expect(actualValue).toBe(expectedValue);
    });

    it('should return undefined if the property does not exist', () => {
      const propertyName = 'readOnly';
      const document = new EditorDocument({
        children: [],
        properties: {},
      });

      const actualValue = document.getProperty<boolean>(propertyName);

      expect(actualValue).toBeUndefined();
    });
  });

  describe('.setProperty()', () => {
    it('should update the property with the specified name', () => {
      const propertyName = 'readOnly';
      const expectedValue = true;
      const document = new EditorDocument({
        children: [],
        properties: {
          [propertyName]: false,
        },
      });

      document.setProperty(propertyName, expectedValue);

      expect(document.properties[propertyName]).toBe(expectedValue);
    });

    it('should add the property if it does not exist', () => {
      const propertyName = 'readOnly';
      const expectedValue = true;
      const document = new EditorDocument({
        children: [],
        properties: {},
      });

      document.setProperty(propertyName, expectedValue);

      expect(document.properties[propertyName]).toBe(expectedValue);
    });
  });

  describe('.updateValue()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call .updateValue() method of the BlockNode at the specific index', () => {
      const blockNodes = [
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
      ];

      blockNodes.forEach((blockNode) => {
        jest
          .spyOn(blockNode, 'updateValue')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {});
      });

      const document = new EditorDocument({
        children: blockNodes,
      });
      const blockIndexToUpdate = 1;
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      document.updateValue(blockIndexToUpdate, dataKey, value);

      expect(document.getBlock(blockIndexToUpdate).updateValue).toHaveBeenCalledWith(dataKey, value);
    });

    it('should not call .updateValue() method of other BlockNodes', () => {
      const blockNodes = [
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
      ];

      blockNodes.forEach((blockNode) => {
        jest
          .spyOn(blockNode, 'updateValue')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {});
      });

      const document = new EditorDocument({
        children: blockNodes,
      });
      const blockIndexToUpdate = 1;
      const dataKey = createDataKey('data-key-1a2b');
      const value = 'Some value';

      document.updateValue(blockIndexToUpdate, dataKey, value);

      blockNodes.forEach((blockNode, index) => {
        if (index === blockIndexToUpdate) {
          return;
        }

        expect(blockNode.updateValue).not.toHaveBeenCalled();
      });
    });

    it('should throw an error if the index is out of bounds', () => {
      const document = new EditorDocument({
        children: [],
      });
      const blockIndexOutOfBound = document.length + 1;
      const dataKey = createDataKey('data-key-1a2b');
      const expectedValue = 'new value';

      const action = (): void => document.updateValue(blockIndexOutOfBound, dataKey, expectedValue);

      expect(action).toThrowError('Index out of bounds');
    });
  });
});

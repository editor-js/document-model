import { EditorDocument } from './index';
import { BlockNode, BlockNodeName, DataKey } from '../BlockNode';
import { BlockNodeConstructorParameters } from '../BlockNode/types';
import type { BlockTuneName } from '../BlockTune';
import { InlineToolData, InlineToolName } from '../inline-fragments';

jest.mock('../BlockNode');

/**
 * Creates an EditorDocument object with some blocks for tests.
 */
function createEditorDocumentWithSomeBlocks(): EditorDocument {
  const countOfBlocks = 3;
  const blocks = new Array(countOfBlocks).fill(undefined)
    .map(() => new BlockNode({
      name: 'header' as BlockNodeName,
    }));

  return new EditorDocument({
    children: blocks,
  });
}

describe('EditorDocument', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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
        const block = new BlockNode({
          name: 'header' as BlockNodeName,
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
      const document = createEditorDocumentWithSomeBlocks();
      const block = new BlockNode({
        name: 'header' as BlockNodeName,
      });

      // Act
      document.addBlock(block);

      // Assert
      const lastBlock = document.getBlock(document.length - 1);

      expect(lastBlock).toBe(block);
    });

    it('should add the block to the beginning of the document if index is 0', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = new BlockNode({
        name: 'header' as BlockNodeName,
      });

      // Act
      document.addBlock(block, 0);

      // Assert
      expect(document.getBlock(0)).toBe(block);
    });

    it('should add the block to the specified index in the middle of the document', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = new BlockNode({
        name: 'header' as BlockNodeName,
      });

      // Act
      document.addBlock(block, 1);

      // Assert
      expect(document.getBlock(1)).toBe(block);
    });

    it('should add the block to the end of the document if the index after the last element is passed', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = new BlockNode({
        name: 'header' as BlockNodeName,
      });

      // Act
      document.addBlock(block, document.length);

      // Assert
      const lastBlock = document.getBlock(document.length - 1);

      expect(lastBlock).toBe(block);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = new BlockNode({
        name: 'header' as BlockNodeName,
      });

      // Act
      const action = (): void => document.addBlock(block, -1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = new BlockNode({
        name: 'header' as BlockNodeName,
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
      const document = createEditorDocumentWithSomeBlocks();
      const block = document.getBlock(0);

      // Act
      document.removeBlock(0);

      // Assert
      expect(document.getBlock(0)).not.toBe(block);
    });

    it('should remove the block from the specified index in the middle of the document', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = document.getBlock(1);

      // Act
      document.removeBlock(1);

      // Assert
      expect(document.getBlock(1)).not.toBe(block);
    });

    it('should remove the block from the end of the document if the last index is passed', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const documentLengthBeforeRemove = document.length;

      // Act
      document.removeBlock(document.length - 1);

      // Assert
      expect(document.length).toBe(documentLengthBeforeRemove - 1);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): void => document.removeBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): void => document.removeBlock(document.length);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.getBlock()', () => {
    it('should return the block from the specific index', () => {
      // Arrange
      const document = new EditorDocument();
      const countOfBlocks = 3;
      const blocks: BlockNode[] = [];

      for (let i = 0; i < countOfBlocks; i++) {
        const block = new BlockNode({
          name: 'header' as BlockNodeName,
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
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): BlockNode => document.getBlock(-1);

      // Assert
      expect(action).toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

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
      const dataKey = 'data-key-1a2b' as DataKey;
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
      const dataKey = 'data-key-1a2b' as DataKey;
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
      const document = new EditorDocument();
      const blockIndexOutOfBound = document.length + 1;
      const dataKey = 'data-key-1a2b' as DataKey;
      const expectedValue = 'new value';

      const action = (): void => document.updateValue(blockIndexOutOfBound, dataKey, expectedValue);

      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.updateTuneData()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call .updateTuneData() method of the BlockNode at the specific index', () => {
      const blockNodes = [
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
      ];

      blockNodes.forEach((blockNode) => {
        jest
          .spyOn(blockNode, 'updateTuneData')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {});
      });

      const document = new EditorDocument({
        children: blockNodes,
      });
      const blockIndexToUpdate = 1;
      const tuneName = 'blockFormatting' as BlockTuneName;
      const updateData = {
        'align': 'right',
      };

      document.updateTuneData(blockIndexToUpdate, tuneName, updateData);

      expect(document.getBlock(blockIndexToUpdate).updateTuneData).toHaveBeenCalledWith(tuneName, updateData);
    });

    it('should not call .updateTuneData() method of other BlockNodes', () => {
      const blockNodes = [
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
        new BlockNode({} as BlockNodeConstructorParameters),
      ];

      blockNodes.forEach((blockNode) => {
        jest
          .spyOn(blockNode, 'updateTuneData')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {});
      });

      const document = new EditorDocument({
        children: blockNodes,
      });
      const blockIndexToUpdate = 1;
      const tuneName = 'blockFormatting' as BlockTuneName;
      const updateData = {
        'align': 'right',
      };

      document.updateTuneData(blockIndexToUpdate, tuneName, updateData);

      blockNodes.forEach((blockNode, index) => {
        if (index === blockIndexToUpdate) {
          return;
        }

        expect(blockNode.updateTuneData).not.toHaveBeenCalled();
      });
    });

    it('should throw an error if the index is out of bounds', () => {
      const document = new EditorDocument();
      const blockIndexOutOfBound = document.length + 1;
      const tuneName = 'blockFormatting' as BlockTuneName;
      const updateData = {
        'align': 'right',
      };

      const action = (): void => document.updateTuneData(blockIndexOutOfBound, tuneName, updateData);

      expect(action).toThrowError('Index out of bounds');
    });
  });

  describe('.insertText()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const text = 'Some text';
    const blockIndex = 0;
    let block: BlockNode;

    beforeEach(() => {
      block = new BlockNode({} as BlockNodeConstructorParameters);
      document = new EditorDocument({
        children: [ block ],
      });
    });

    it('should call .insertText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'insertText');

      document.insertText(blockIndex, dataKey, text);

      expect(spy).toHaveBeenCalledWith(dataKey, text, undefined);
    });

    it('should pass start index to the .insertText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'insertText');
      const start = 5;

      document.insertText(blockIndex, dataKey, text, start);

      expect(spy).toHaveBeenCalledWith(dataKey, text, start);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.insertText(document.length + 1, dataKey, text)).toThrowError('Index out of bounds');
    });
  });

  describe('.removeText()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;
    let block: BlockNode;

    beforeEach(() => {
      block = new BlockNode({} as BlockNodeConstructorParameters);
      document = new EditorDocument({
        children: [ block ],
      });
    });

    it('should call .removeText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'removeText');

      document.removeText(blockIndex, dataKey);

      expect(spy).toHaveBeenCalledWith(dataKey, undefined, undefined);
    });

    it('should pass start index to the .removeText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'removeText');
      const start = 5;

      document.removeText(blockIndex, dataKey, start);

      expect(spy).toHaveBeenCalledWith(dataKey, start, undefined);
    });

    it('should pass end index to the .removeText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'removeText');
      const start = 5;
      const end = 10;

      document.removeText(blockIndex, dataKey, start, end);

      expect(spy).toHaveBeenCalledWith(dataKey, start, end);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.removeText(document.length + 1, dataKey)).toThrowError('Index out of bounds');
    });
  });

  describe('.format()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;
    const tool = 'bold' as InlineToolName;
    const start = 5;
    const end = 10;
    let block: BlockNode;

    beforeEach(() => {
      block = new BlockNode({} as BlockNodeConstructorParameters);
      document = new EditorDocument({
        children: [ block ],
      });
    });

    it('should call .format() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'format');

      document.format(blockIndex, dataKey, tool, start, end);

      expect(spy).toHaveBeenCalledWith(dataKey, tool, start, end, undefined);
    });

    it('should pass data to the .format() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'format');
      const data = {} as InlineToolData;

      document.format(blockIndex, dataKey, tool, start, end, data);

      expect(spy).toHaveBeenCalledWith(dataKey, tool, start, end, data);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.format(document.length + 1, dataKey, tool, start, end)).toThrowError('Index out of bounds');
    });
  });

  describe('.unformat()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;
    const tool = 'bold' as InlineToolName;
    const start = 5;
    const end = 10;
    let block: BlockNode;

    beforeEach(() => {
      block = new BlockNode({} as BlockNodeConstructorParameters);
      document = new EditorDocument({
        children: [ block ],
      });
    });

    it('should call .unformat() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'unformat');

      document.unformat(blockIndex, dataKey, tool, start, end);

      expect(spy).toHaveBeenCalledWith(dataKey, tool, start, end);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.unformat(document.length + 1, dataKey, tool, start, end)).toThrowError('Index out of bounds');
    });
  });
});

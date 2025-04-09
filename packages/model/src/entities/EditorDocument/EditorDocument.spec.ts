import { IndexBuilder } from '../Index/IndexBuilder.js';
import { EditorDocument } from './index.js';
import type { BlockToolName, DataKey } from '../BlockNode';
import { BlockNode } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune';
import type { InlineToolData, InlineToolName } from '../inline-fragments';
import { EventType } from '../../EventBus/types/EventType.js';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent,
  TuneModifiedEvent
} from '../../EventBus/events/index.js';
import { EventAction } from '../../EventBus/types/EventAction.js';
import { jest } from '@jest/globals';

jest.mock('../BlockNode');

/**
 * Creates an EditorDocument object with some blocks for tests.
 */
function createEditorDocumentWithSomeBlocks(): EditorDocument {
  const countOfBlocks = 3;

  const doc = new EditorDocument({
    identifier: 'document',
    properties: {
      readOnly: false,
    },
  });

  const blocks = new Array(countOfBlocks).fill(undefined)
    .map(() => ({
      name: 'header' as BlockToolName,
      data: {
        text: {
          $t: 't',
          value: 'some long text',
        },
      },
    }));

  doc.initialize(blocks);

  return doc;
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
        identifier: 'document',
        properties: {
          readOnly: false,
        },
      });

      for (let i = 0; i < blocksCount; i++) {
        const blockData = {
          name: 'header' as BlockToolName,
        };

        document.addBlock(blockData);
      }

      // Act
      const actual = document.length;

      // Assert
      expect(actual)
        .toBe(blocksCount);
    });
  });

  describe('.children', () => {
    it('should return an array of the blocks of the document', () => {
      // Arrange
      const blocksCount = 3;
      const document = new EditorDocument({
        identifier: 'document',
        properties: {
          readOnly: false,
        },
      });

      for (let i = 0; i < blocksCount; i++) {
        const blockData = {
          name: 'header' as BlockToolName,
        };

        document.addBlock(blockData);
      }

      // Act
      const actual = document.children;

      // Assert
      expect(actual)
        .toHaveLength(blocksCount);

      actual.forEach((block) => {
        expect(block)
          .toBeInstanceOf(BlockNode);
      });
    });
  });

  describe('.addBlock()', () => {
    it('should add the block to the end of the document if index is not provided', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const lastBlockBeforeTest = document.getBlock(document.length - 1);
      const blockData = {
        name: 'header-last' as BlockToolName,
      };

      document.addBlock(blockData);

      const lastBlock = document.getBlock(document.length - 1);
      const blockBeforeAdded = document.getBlock(document.length - 2);

      expect(lastBlockBeforeTest)
        .not
        .toBe(lastBlock);
      expect(blockBeforeAdded)
        .toBe(lastBlockBeforeTest);
    });

    it('should add the block to the beginning of the document if index is 0', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const firstBlockBeforeTest = document.getBlock(0);
      const blockData = {
        name: 'header-0' as BlockToolName,
      };

      document.addBlock(blockData, 0);

      const firstBlock = document.getBlock(0);
      const blockAfterAdded = document.getBlock(1);

      expect(firstBlockBeforeTest)
        .not
        .toBe(firstBlock);
      expect(blockAfterAdded)
        .toBe(firstBlockBeforeTest);
    });

    it('should add the block to the specified index in the middle of the document', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;
      const blockBeforeTest = document.getBlock(index);
      const blockData = {
        name: 'header-1a2b' as BlockToolName,
      };

      document.addBlock(blockData, index);

      const addedBlock = document.getBlock(index);
      const blockAfterAdded = document.getBlock(index + 1);

      expect(blockBeforeTest)
        .not
        .toBe(addedBlock);
      expect(blockBeforeTest)
        .toBe(blockAfterAdded);
    });

    it('should add the block to the end of the document if the index after the last element is passed', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const lastBlockBeforeTest = document.getBlock(document.length - 1);
      const blockData = {
        name: 'header-last' as BlockToolName,
      };

      document.addBlock(blockData, document.length);

      const lastBlock = document.getBlock(document.length - 1);
      const blockBeforeAdded = document.getBlock(document.length - 2);

      expect(lastBlockBeforeTest)
        .not
        .toBe(lastBlock);
      expect(blockBeforeAdded)
        .toBe(lastBlockBeforeTest);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const blockData = {
        name: 'header' as BlockToolName,
      };

      // Act
      const action = (): void => document.addBlock(blockData, -1);

      // Assert
      expect(action)
        .toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const blockData = {
        name: 'header' as BlockToolName,
      };

      // Act
      const action = (): void => document.addBlock(blockData, document.length + 1);

      // Assert
      expect(action)
        .toThrowError('Index out of bounds');
    });

    it('should emit BlockAddedEvent with block node data in details and block index', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;
      const blockData = {
        name: 'header-1a2b' as BlockToolName,
        data: {
          level: 1,
        },
      };


      let event: BlockAddedEvent | null = null;

      /**
       * As BlockNode class is mocked here, we need to implement the serialized getter (it returns undefined in the mock)
       */
      jest.spyOn(BlockNode.prototype, 'serialized', 'get').mockImplementation(() => blockData);

      document.addEventListener(EventType.Changed, e => event = e as BlockAddedEvent);

      document.addBlock(blockData, index);

      expect(event).toBeInstanceOf(BlockAddedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Added,
        index: expect.objectContaining({ blockIndex: index }),
        data: blockData,
      }));
    });
  });

  describe('.moveBlock()', () => {
    it('should move block from passed index to passed index', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const block = document.getBlock(0);

      document.moveBlock(0, 1);

      expect(document.getBlock(1))
        .toBe(block);
    });

    it('should not change the block before moved block if moving to the end of the document', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const blockBeforeMoved = document.getBlock(0);

      document.moveBlock(1, document.length);

      expect(document.getBlock(0))
        .toBe(blockBeforeMoved);
    });

    it('should not change the block after moved block if moving to the beginning of the document', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const blockAfterMoved = document.getBlock(2);

      document.moveBlock(1, 0);

      expect(document.getBlock(2))
        .toBe(blockAfterMoved);
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
      expect(document.getBlock(0))
        .not
        .toBe(block);
    });

    it('should remove the block from the specified index in the middle of the document', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const block = document.getBlock(1);

      // Act
      document.removeBlock(1);

      // Assert
      expect(document.getBlock(1))
        .not
        .toBe(block);
    });

    it('should remove the block from the end of the document if the last index is passed', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();
      const documentLengthBeforeRemove = document.length;

      // Act
      document.removeBlock(document.length - 1);

      // Assert
      expect(document.length)
        .toBe(documentLengthBeforeRemove - 1);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): void => document.removeBlock(-1);

      // Assert
      expect(action)
        .toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): void => document.removeBlock(document.length);

      // Assert
      expect(action)
        .toThrowError('Index out of bounds');
    });

    it('should emit BlockRemovedEvent with block node data in details and block index', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;

      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          level: 1,
        },
      };

      jest.spyOn(BlockNode.prototype, 'serialized', 'get').mockImplementation(() => blockData);

      let event: BlockRemovedEvent | null = null;

      document.addEventListener(EventType.Changed, e => event = e as BlockRemovedEvent);
      document.removeBlock(index);

      expect(event).toBeInstanceOf(BlockRemovedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Removed,
        index: expect.objectContaining({ blockIndex: index }),
        data: blockData,
      }));
    });
  });

  describe('.getBlock()', () => {
    it('should return the block from the specific index', () => {
      const countOfBlocks = 5;
      const blocksData = [];
      const document = new EditorDocument({
        identifier: 'document',
      });

      for (let i = 0; i < countOfBlocks; i++) {
        const blockData = {
          name: (`header-${i}`) as BlockToolName,
        };

        document.addBlock(blockData);

        blocksData.push(blockData);
      }

      const index = 1;

      const block = document.getBlock(index);

      expect(block)
        .toBeInstanceOf(BlockNode);
    });

    it('should throw an error if index is less then 0', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): BlockNode => document.getBlock(-1);

      // Assert
      expect(action)
        .toThrowError('Index out of bounds');
    });

    it('should throw an error if index is greater then document length', () => {
      // Arrange
      const document = createEditorDocumentWithSomeBlocks();

      // Act
      const action = (): BlockNode => document.getBlock(document.length);

      // Assert
      expect(action)
        .toThrowError('Index out of bounds');
    });
  });

  describe('.properties', () => {
    it('should return the properties of the document', () => {
      const properties = {
        'readOnly': true,
      };

      const document = new EditorDocument({
        identifier: 'document',
        properties: {
          ...properties,
        },
      });

      expect(document.properties)
        .toEqual(properties);
    });
  });

  describe('.getProperty()', () => {
    it('should return the property by name', () => {
      const propertyName = 'readOnly';
      const expectedValue = true;
      const document = new EditorDocument({
        identifier: 'document',
        properties: {
          [propertyName]: expectedValue,
        },
      });

      const actualValue = document.getProperty<boolean>(propertyName);

      expect(actualValue)
        .toBe(expectedValue);
    });

    it('should return undefined if the property does not exist', () => {
      const propertyName = 'readOnly';
      const document = new EditorDocument({
        identifier: 'document',
        properties: {},
      });

      const actualValue = document.getProperty<boolean>(propertyName);

      expect(actualValue)
        .toBeUndefined();
    });
  });

  describe('.setProperty()', () => {
    it('should update the property with the specified name', () => {
      const propertyName = 'readOnly';
      const expectedValue = true;
      const document = new EditorDocument({
        identifier: 'document',
        properties: {
          [propertyName]: false,
        },
      });

      document.setProperty(propertyName, expectedValue);

      expect(document.properties[propertyName])
        .toBe(expectedValue);
    });

    it('should add the property if it does not exist', () => {
      const propertyName = 'readOnly';
      const expectedValue = true;
      const document = new EditorDocument({
        identifier: 'document',
        properties: {},
      });

      document.setProperty(propertyName, expectedValue);

      expect(document.properties[propertyName])
        .toBe(expectedValue);
    });

    it('should emit PropertyModifiedEvent with new and previous values in event data and property name in index', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const propertyName = 'readOnly';
      const value = true;
      const previous = document.getProperty(propertyName);

      let event: PropertyModifiedEvent | null = null;

      document.addEventListener(EventType.Changed, e => event = e as PropertyModifiedEvent);
      document.setProperty(propertyName, value);

      expect(event).toBeInstanceOf(PropertyModifiedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: expect.objectContaining({ propertyName: propertyName }),
        data: {
          value,
          previous,
        },
      }));
    });
  });

  describe('.updateValue()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call .updateValue() method of the BlockNode at the specific index', () => {
      const blocksData = [
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
      ];
      const document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize(blocksData);

      blocksData.forEach((_, i) => {
        const blockNode = document.getBlock(i);

        jest
          .spyOn(blockNode, 'updateValue')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {
          });
      });

      const blockIndexToUpdate = 1;
      const dataKey = 'data-key-1a2b' as DataKey;
      const value = 'Some value';

      document.updateValue(blockIndexToUpdate, dataKey, value);

      expect(document.getBlock(blockIndexToUpdate).updateValue)
        .toHaveBeenCalledWith(dataKey, value);
    });

    it('should not call .updateValue() method of other BlockNodes', () => {
      const blocksData = [
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
      ];
      const document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize(blocksData);

      const blockNodes = blocksData.map((_, i) => {
        const blockNode = document.getBlock(i);

        jest
          .spyOn(blockNode, 'updateValue')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {
          });

        return blockNode;
      });

      const blockIndexToUpdate = 1;
      const dataKey = 'data-key-1a2b' as DataKey;
      const value = 'Some value';

      document.updateValue(blockIndexToUpdate, dataKey, value);

      blockNodes.forEach((blockNode, index) => {
        if (index === blockIndexToUpdate) {
          return;
        }

        expect(blockNode.updateValue)
          .not
          .toHaveBeenCalled();
      });
    });

    it('should throw an error if the index is out of bounds', () => {
      const document = new EditorDocument({
        identifier: 'document',
      });
      const blockIndexOutOfBound = document.length + 1;
      const dataKey = 'data-key-1a2b' as DataKey;
      const expectedValue = 'new value';

      const action = (): void => document.updateValue(blockIndexOutOfBound, dataKey, expectedValue);

      expect(action)
        .toThrowError('Index out of bounds');
    });
  });

  describe('.updateTuneData()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call .updateTuneData() method of the BlockNode at the specific index', () => {
      const blocksData = [
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
      ];
      const document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize(blocksData);

      blocksData.forEach((_, i) => {
        const blockNode = document.getBlock(i);

        jest
          .spyOn(blockNode, 'updateTuneData')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {
          });
      });

      const blockIndexToUpdate = 1;
      const tuneName = 'blockFormatting' as BlockTuneName;
      const updateData = {
        'align': 'right',
      };

      document.updateTuneData(blockIndexToUpdate, tuneName, updateData);

      expect(document.getBlock(blockIndexToUpdate).updateTuneData)
        .toHaveBeenCalledWith(tuneName, updateData);
    });

    it('should not call .updateTuneData() method of other BlockNodes', () => {
      const blocksData = [
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
        {
          name: 'header' as BlockToolName,
          data: {},
        },
      ];
      const document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize(blocksData);

      const blockNodes = blocksData.map((_, i) => {
        const blockNode = document.getBlock(i);

        jest
          .spyOn(blockNode, 'updateTuneData')
          // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock of the method
          .mockImplementation(() => {
          });

        return blockNode;
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

        expect(blockNode.updateTuneData)
          .not
          .toHaveBeenCalled();
      });
    });

    it('should throw an error if the index is out of bounds', () => {
      const document = new EditorDocument({
        identifier: 'document',
      });
      const blockIndexOutOfBound = document.length + 1;
      const tuneName = 'blockFormatting' as BlockTuneName;
      const updateData = {
        'align': 'right',
      };

      const action = (): void => document.updateTuneData(blockIndexOutOfBound, tuneName, updateData);

      expect(action)
        .toThrowError('Index out of bounds');
    });
  });

  describe('.getText()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const text = 'Some text';
    let block: BlockNode;

    beforeEach(() => {
      const blockData = {
        name: 'text' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: text,
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);

      block = document.getBlock(0);
    });

    it('should call .getText() method of the BlockNode if index and data key are correct', () => {
      const spy = jest.spyOn(block, 'getText');

      document.getText(0, dataKey);

      expect(spy)
        .toHaveBeenCalledWith(dataKey);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.getText(document.length + 1, dataKey))
        .toThrow('Index out of bounds');
    });
  });

  describe('.insertText()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const text = 'Some text';
    const blockIndex = 0;
    let block: BlockNode;

    beforeEach(() => {
      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: text,
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);

      block = document.getBlock(0);
    });

    it('should call .insertText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'insertText');

      document.insertText(blockIndex, dataKey, text);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, text, undefined);
    });

    it('should pass start index to the .insertText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'insertText');
      const start = 5;

      document.insertText(blockIndex, dataKey, text, start);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, text, start);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.insertText(document.length + 1, dataKey, text))
        .toThrowError('Index out of bounds');
    });
  });

  describe('.insertData()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const text = 'Some text';
    const blockIndex = 0;
    let block: BlockNode;

    beforeEach(() => {
      const blockData = {
        name: 'header' as BlockToolName,
        data: {},
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);

      block = document.getBlock(0);
    });

    it('should call .insertText() method if text index provided', () => {
      const spy = jest.spyOn(document, 'insertText');
      const index = new IndexBuilder().addBlockIndex(blockIndex)
        .addDataKey(dataKey)
        .addTextRange([0, 0])
        .build();

      document.insertData(index, text);

      expect(spy)
        .toHaveBeenCalledWith(blockIndex, dataKey, text, 0);
    });

    it('should call .addBlock() if block index is provided', () => {
      const spy = jest.spyOn(document, 'addBlock');
      const index = new IndexBuilder()
        .addBlockIndex(blockIndex)
        .build();


      document.insertData(index, [ block.serialized ]);

      expect(spy)
        .toHaveBeenCalledWith(block.serialized, blockIndex);
    });
  });

  describe('.removeData()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;

    beforeEach(() => {
      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: 'Some text',
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);
    });

    it('should call .removeText() method if text index provided', () => {
      const spy = jest.spyOn(document, 'removeText');
      const rangeEnd = 5;
      const index = new IndexBuilder()
        .addBlockIndex(blockIndex)
        .addDataKey(dataKey)
        .addTextRange([0, rangeEnd])
        .build();

      document.removeData(index, 'hello');

      expect(spy)
        .toHaveBeenCalledWith(blockIndex, dataKey, 0, rangeEnd);
    });

    it('should call .removeBlock() if block index is provided', () => {
      const spy = jest.spyOn(document, 'removeBlock');
      const index = new IndexBuilder()
        .addBlockIndex(blockIndex)
        .build();

      const blockData = {
        name: 'paragraph',
        data: { text: 'editor.js' },
      };

      document.removeData(index, [
        blockData,
      ]);

      expect(spy)
        .toHaveBeenCalledWith(blockIndex);
    });
  });

  describe('.modifyData()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;

    beforeEach(() => {
      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: 'Some text',
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);
    });

    it('should call .format() method if text index and modified value provided', () => {
      const spy = jest.spyOn(document, 'format');
      const rangeEnd = 5;
      const index = new IndexBuilder()
        .addBlockIndex(blockIndex)
        .addDataKey(dataKey)
        .addTextRange([0, rangeEnd])
        .build();

      document.modifyData(index, {
        value: {
          tool: 'bold',
        },
        previous: null,
      });

      expect(spy)
        .toHaveBeenCalledWith(blockIndex, dataKey, 'bold', 0, rangeEnd);
    });

    it('should call .unformat() method if text index and previous modified value provided', () => {
      const spy = jest.spyOn(document, 'unformat');
      const rangeEnd = 5;
      const index = new IndexBuilder()
        .addBlockIndex(blockIndex)
        .addDataKey(dataKey)
        .addTextRange([0, rangeEnd])
        .build();

      document.modifyData(index, {
        previous: {
          tool: 'bold',
        },
        value: null,
      });

      expect(spy)
        .toHaveBeenCalledWith(blockIndex, dataKey, 'bold', 0, rangeEnd);
    });
  });

  describe('.removeText()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;
    let block: BlockNode;

    beforeEach(() => {
      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: 'some long text',
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);

      block = document.getBlock(0);
    });

    it('should call .removeText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'removeText');

      document.removeText(blockIndex, dataKey);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, undefined, undefined);
    });

    it('should pass start index to the .removeText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'removeText');
      const start = 5;

      document.removeText(blockIndex, dataKey, start);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, start, undefined);
    });

    it('should pass end index to the .removeText() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'removeText');
      const start = 5;
      const end = 10;

      document.removeText(blockIndex, dataKey, start, end);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, start, end);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.removeText(document.length + 1, dataKey))
        .toThrowError('Index out of bounds');
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
      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: 'some long text',
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);

      block = document.getBlock(0);
    });

    it('should call .format() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'format');

      document.format(blockIndex, dataKey, tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, tool, start, end, undefined);
    });

    it('should pass data to the .format() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'format');
      const data = {} as InlineToolData;

      document.format(blockIndex, dataKey, tool, start, end, data);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, tool, start, end, data);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.format(document.length + 1, dataKey, tool, start, end))
        .toThrowError('Index out of bounds');
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
      const blockData = {
        name: 'header' as BlockToolName,
        data: {
          [dataKey]: {
            $t: 't',
            value: 'some long text',
          },
        },
      };

      document = new EditorDocument({
        identifier: 'document',
      });

      document.initialize([ blockData ]);

      block = document.getBlock(0);
    });

    it('should call .unformat() method of the BlockNode', () => {
      const spy = jest.spyOn(block, 'unformat');

      document.unformat(blockIndex, dataKey, tool, start, end);

      expect(spy)
        .toHaveBeenCalledWith(dataKey, tool, start, end);
    });

    it('should throw an error if index is out of bounds', () => {
      expect(() => document.unformat(document.length + 1, dataKey, tool, start, end))
        .toThrowError('Index out of bounds');
    });
  });

  describe('.serialized', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it('should call .serialized property of the BlockNodes', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const spy = jest.spyOn(BlockNode.prototype, 'serialized', 'get');

      document.serialized;

      expect(spy)
        .toBeCalledTimes(document.length);
    });


    it('should return document properties', () => {
      const properties = {
        readOnly: true,
      };
      const document = new EditorDocument({
        identifier: 'document',
        properties,
      });

      expect(document.serialized)
        .toHaveProperty('properties', properties);
    });
  });

  describe('working with BlockNode events', () => {
    let document: EditorDocument;
    let blockNode: BlockNode;
    const index = 0;

    beforeEach(() => {
      document = createEditorDocumentWithSomeBlocks();

      blockNode = document.getBlock(index);
    });

    it('should re-emit events from the BlockNode', () => {
      const handler = jest.fn();

      document.addEventListener(EventType.Changed, handler);

      const builder = new IndexBuilder();

      builder.addTuneKey('value').addTuneName('tune' as BlockTuneName);

      blockNode.dispatchEvent(
        new TuneModifiedEvent(
          builder.build(),
          {
            value: 'value',
            previous: 'previous',
          }
        )
      );

      expect(handler)
        .toHaveBeenCalledWith(expect.any(TuneModifiedEvent));
    });

    it('should re-emit events from the BlockNode with updated index', () => {
      let event: TuneModifiedEvent | null = null;
      const handler = (e: Event): void => {
        event = e as TuneModifiedEvent;
      };

      document.addEventListener(EventType.Changed, handler);

      const builder = new IndexBuilder();

      builder.addTuneKey('value').addTuneName('tune' as BlockTuneName);

      blockNode.dispatchEvent(
        new TuneModifiedEvent(
          builder.build(),
          {
            value: 'value',
            previous: 'previous',
          }
        )
      );

      expect(event)
        .toHaveProperty('detail.index', expect.objectContaining({
          tuneKey: 'value',
          tuneName: 'tune',
          blockIndex: index,
        }));
    });

    it('should not emit Change event if ValueNode dispatched an event that is not a BaseDocumentEvent', () => {
      const handler = jest.fn();

      document.addEventListener(EventType.Changed, handler);

      blockNode.dispatchEvent(new Event(EventType.Changed));

      expect(handler)
        .not
        .toHaveBeenCalled();
    });
  });

  describe('.getFragments()', () => {
    it('should call BlockNode method with passed parameters', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const blockIndex = 1;
      const dataKey = 'text' as DataKey;
      const start = 5;
      const end = 10;
      const tool = 'bold' as InlineToolName;
      const spy = jest.spyOn(document.getBlock(blockIndex), 'getFragments');

      document.getFragments(blockIndex, dataKey, start, end, tool);

      expect(spy).toHaveBeenCalledWith(dataKey, start, end, tool);
    });
  });
});

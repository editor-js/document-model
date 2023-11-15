import { EditorDocument } from './index.js';
import type { BlockToolName, DataKey } from '../BlockNode';
import { BlockNode } from '../BlockNode/index.js';
import type { BlockTuneName } from '../BlockTune';
import type { InlineToolData, InlineToolName } from '../inline-fragments';
import { EventType } from '../../utils/EventBus/types/EventType.js';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent,
  TuneModifiedEvent
} from '../../utils/EventBus/events/index.js';
import { EventAction } from '../../utils/EventBus/types/EventAction.js';

jest.mock('../BlockNode');

/**
 * Creates an EditorDocument object with some blocks for tests.
 */
function createEditorDocumentWithSomeBlocks(): EditorDocument {
  const countOfBlocks = 3;

  return new EditorDocument({
    properties: {
      readOnly: false,
    },
    blocks:
      new Array(countOfBlocks).fill(undefined)
        .map(() => ({
          name: 'header' as BlockToolName,
          data: {},
        })),
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

    it('should emit BlockAddedEvent', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;
      const blockData = {
        name: 'header-1a2b' as BlockToolName,
      };

      const handler = jest.fn();

      document.addEventListener(EventType.Changed, handler);

      document.addBlock(blockData, index);

      expect(handler).toBeCalledWith(expect.any(BlockAddedEvent));
    });

    it('should emit BlockAddedEvent with correct details', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;
      const blockData = {
        name: 'header-1a2b' as BlockToolName,
        data: {
          level: 1,
        },
      };


      let event: BlockAddedEvent | null = null;

      jest.spyOn(BlockNode.prototype, 'serialized', 'get').mockImplementation(() => blockData);

      document.addEventListener(EventType.Changed, e => event = e as BlockAddedEvent);

      document.addBlock(blockData, index);

      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Added,
        index: [ index ],
        data: blockData,
      }));
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

    it('should emit BlockRemovedEvent', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;

      const handler = jest.fn();

      document.addEventListener(EventType.Changed, handler);

      document.removeBlock(index);

      expect(handler).toBeCalledWith(expect.any(BlockRemovedEvent));
    });

    it('should emit BlockRemovedEvent with correct details', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const index = 1;

      const blockData  = {
        name: 'header' as BlockToolName,
        data: {
          level: 1,
        },
      };

      jest.spyOn(BlockNode.prototype, 'serialized', 'get').mockImplementation(() => blockData);

      let event: BlockRemovedEvent | null = null;

      document.addEventListener(EventType.Changed, e => event = e as BlockRemovedEvent);
      document.removeBlock(index);

      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Removed,
        index: [ index ],
        data: blockData,
      }));
    });
  });

  describe('.getBlock()', () => {
    it('should return the block from the specific index', () => {
      const countOfBlocks = 5;
      const blocksData = [];
      const document = new EditorDocument();

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
        properties: {},
      });

      document.setProperty(propertyName, expectedValue);

      expect(document.properties[propertyName])
        .toBe(expectedValue);
    });

    it('should emit PropertyModifiedEvent', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const propertyName = 'readOnly';
      const value = true;

      const handler = jest.fn();

      document.addEventListener(EventType.Changed, handler);

      document.setProperty(propertyName, value);

      expect(handler).toBeCalledWith(expect.any(PropertyModifiedEvent));
    });

    it('should emit PropertyModifiedEvent with correct details', () => {
      const document = createEditorDocumentWithSomeBlocks();
      const propertyName = 'readOnly';
      const value = true;
      const previous = document.getProperty(propertyName);

      let event: PropertyModifiedEvent | null = null;

      document.addEventListener(EventType.Changed, e => event = e as PropertyModifiedEvent);
      document.setProperty(propertyName, value);

      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: [propertyName, 'property'],
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
        blocks: blocksData,
      });

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
        blocks: blocksData,
      });

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
      const document = new EditorDocument();
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
        blocks: blocksData,
      });

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
        blocks: blocksData,
      });

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
      const document = new EditorDocument();
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

  describe('.insertText()', () => {
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
        blocks: [ blockData ],
      });

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

  describe('.removeText()', () => {
    let document: EditorDocument;
    const dataKey = 'text' as DataKey;
    const blockIndex = 0;
    let block: BlockNode;

    beforeEach(() => {
      const blockData = {
        name: 'header' as BlockToolName,
        data: {},
      };

      document = new EditorDocument({
        blocks: [ blockData ],
      });

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
        data: {},
      };

      document = new EditorDocument({
        blocks: [ blockData ],
      });

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
        data: {},
      };

      document = new EditorDocument({
        blocks: [ blockData ],
      });

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
    it('should call .serialized property of the BlockNodes', () => {
      const spy = jest.spyOn(BlockNode.prototype, 'serialized', 'get');
      const document = createEditorDocumentWithSomeBlocks();

      document.serialized;

      expect(spy)
        .toBeCalledTimes(document.length);
    });


    it('should return document properties', () => {
      const properties = {
        readOnly: true,
      };
      const document = new EditorDocument({
        properties,
      });

      expect(document.serialized)
        .toHaveProperty('properties', properties);
    });
  });

  describe('BlockNode events', () => {
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

      blockNode.dispatchEvent(
        new TuneModifiedEvent(
          ['value', `tune@${'tune' as BlockTuneName}`],
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

      blockNode.dispatchEvent(
        new TuneModifiedEvent(
          ['value', `tune@${'tune' as BlockTuneName}`],
          {
            value: 'value',
            previous: 'previous',
          }
        )
      );

      expect(event)
        .toHaveProperty('detail', expect.objectContaining({
          index: ['value', `tune@${'tune' as BlockTuneName}`, index],
        }));
    });

    it('should not re-emit an error if ValueNode emits not a BaseDocumentEvent', () => {
      const handler = jest.fn();

      document.addEventListener(EventType.Changed, handler);

      blockNode.dispatchEvent(new Event(EventType.Changed));

      expect(handler)
        .not
        .toHaveBeenCalled();
    });
  });
});

import { createValueNodeMock } from '../../utils/mocks/createValueNodeMock';
import { BlockNode, createBlockNodeName } from '../BlockNode';
import { createBlockNodeMock } from '../../utils/mocks/createBlockNodeMock';
import { EditorDocument } from '../EditorDocument';
import { createValueNodeName } from './types';

describe('ValueNode', () => {
  describe('.update()', () => {
    it('should update existing data field associated with this value node', () => {
      // Arrange
      const valueNode = createValueNodeMock({
        name: createValueNodeName('longitude'),
        value: 23.123,
        parent: ({} as BlockNode),
      });
      const updatedLongitude = 23.456;

      // Act
      valueNode.update(updatedLongitude);

      // Assert
      expect(valueNode.serialized.value).toBe(updatedLongitude);
    });
  });

  describe('.serialized', () => {
    it('should return the serialized data associated with this value node', () => {
      // Arrange
      const data = {
        name: 'longitude',
        value: 23.123,
      };
      const valueNode = createValueNodeMock({
        name: createValueNodeName(data.name),
        value: data.value,
        parent: ({} as BlockNode),
      });

      // Act
      const result = valueNode.serialized;

      // Assert
      expect(result).toStrictEqual(data);
    });
  });

  describe('.parent', () => {
    it('should return the parent BlockNode of this value node', () => {
      // Arrange
      const parent = createBlockNodeMock({
        name: createBlockNodeName('image'),
        parent: ({} as EditorDocument),
      });
      const valueNode = createValueNodeMock({
        value: 'https://example.com/image.png',
        parent,
      });

      // Act
      const result = valueNode.parent;

      // Assert
      expect(result).toBe(parent);
    });
  });
});

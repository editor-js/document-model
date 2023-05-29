import { createValueNodeMock } from '../../utils/mocks/createValueNodeMock';
import { BlockNode, createBlockNodeName } from '../BlockNode';
import { createBlockNodeMock } from '../../utils/mocks/createBlockNodeMock';
import { EditorDocument } from '../EditorDocument';

describe('ValueNode', () => {
  describe('.update()', () => {
    it('should add new data field associated with this value node', () => {
      // Arrange
      const valueNode = createValueNodeMock({
        data: {},
        parent: ({} as BlockNode),
      });
      const longitude = 23.123;

      // Act
      valueNode.update('longitude', longitude);

      // Assert
      expect(valueNode.serialized).toEqual({
        longitude,
      });
    });

    it('should update existing data field associated with this value node by key', () => {
      // Arrange
      const valueNode = createValueNodeMock({
        data: {
          longitude: 23.123,
        },
        parent: ({} as BlockNode),
      });
      const updatedLongitude = 23.456;

      // Act
      valueNode.update('longitude', updatedLongitude);

      // Assert
      expect(valueNode.serialized).toEqual({
        longitude: updatedLongitude,
      });
    });
  });

  describe('.serialized', () => {
    it('should return the serialized data associated with this value node', () => {
      // Arrange
      const data = {
        longitude: 23.123,
      };
      const valueNode = createValueNodeMock({
        data,
        parent: ({} as BlockNode),
      });

      // Act
      const result = valueNode.serialized;

      // Assert
      expect(result).toBe(data);
    });
  });

  describe('.parent', () => {
    it('should return the parent BlockNode of this value node', () => {
      // Arrange
      const parent = createBlockNodeMock({
        name: createBlockNodeName('map'),
        parent: ({} as EditorDocument),
      });
      const valueNode = createValueNodeMock({
        data: {},
        parent,
      });

      // Act
      const result = valueNode.parent;

      // Assert
      expect(result).toBe(parent);
    });
  });
});

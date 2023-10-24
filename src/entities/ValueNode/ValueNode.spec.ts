import { ValueNode } from './index';
import { BlockChildType } from '../BlockNode/types';
import { NODE_TYPE_HIDDEN_PROP } from '../BlockNode/consts';

describe('ValueNode', () => {
  describe('.update()', () => {
    it('should update existing data associated with this value node', () => {
      // Arrange
      const longitudeValueNode = new ValueNode({
        value: 23.123,
      });
      const updatedLongitude = 23.456;

      // Act
      longitudeValueNode.update(updatedLongitude);

      // Assert
      expect(longitudeValueNode.serialized).toBe(updatedLongitude);
    });
  });

  describe('.serialized', () => {
    it('should return the serialized data associated with this value node', () => {
      // Arrange
      const longitude = 23.123;
      const longitudeValueNode = new ValueNode({
        value: longitude,
      });

      // Act
      const serializedLongitude = longitudeValueNode.serialized;

      // Assert
      expect(serializedLongitude).toStrictEqual(longitude);
    });

    it('should mark serialized value as value node by using custom hidden property $t  if object returned', () => {
      const value = { align: 'left' };
      const longitudeValueNode = new ValueNode({
        value,
      });

      const serializedValue = longitudeValueNode.serialized;

      expect(serializedValue).toHaveProperty(NODE_TYPE_HIDDEN_PROP, BlockChildType.Value);
    });
  });
});

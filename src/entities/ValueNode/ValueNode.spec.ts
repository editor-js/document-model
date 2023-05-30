import { createValueNodeMock } from '../../utils/mocks/createValueNodeMock';

describe('ValueNode', () => {
  describe('.update()', () => {
    it('should update existing data associated with this value node', () => {
      // Arrange
      const longitudeValueNode = createValueNodeMock({
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
      const longitudeValueNode = createValueNodeMock({
        value: longitude,
      });

      // Act
      const serializedLongitude = longitudeValueNode.serialized;

      // Assert
      expect(serializedLongitude).toStrictEqual(longitude);
    });
  });
});

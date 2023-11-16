import { ValueNode } from './index.js';
import { BlockChildType } from '../BlockNode/types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '../BlockNode/consts.js';
import { EventType } from '../../utils/EventBus/types/EventType.js';
import { ValueModifiedEvent } from '../../utils/EventBus/events/index.js';
import { EventAction } from '../../utils/EventBus/types/EventAction.js';

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

    it('should emit ValueModifiedEvent', () => {
      const value = 23.123;
      const longitudeValueNode = new ValueNode({
        value,
      });
      const updatedLongitude = 23.456;

      const handler = jest.fn();

      longitudeValueNode.addEventListener(EventType.Changed, handler);

      longitudeValueNode.update(updatedLongitude);

      expect(handler).toBeCalledWith(expect.any(ValueModifiedEvent));
    });

    it('should emit ValueModifiedEvent with correct details', () => {
      const value = 23.123;
      const longitudeValueNode = new ValueNode({
        value,
      });
      const updatedLongitude = 23.456;
      let event: ValueModifiedEvent | null = null;

      longitudeValueNode.addEventListener(EventType.Changed, e => event = e as ValueModifiedEvent);

      longitudeValueNode.update(updatedLongitude);

      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: [],
        data: {
          value: updatedLongitude,
          previous: value,
        },
      }));
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

  describe('.value', () => {
    it('should return the value associated with this value node', () => {
      // Arrange
      const longitude = 23.123;
      const longitudeValueNode = new ValueNode({
        value: longitude,
      });

      // Act
      const serializedLongitude = longitudeValueNode.value;

      // Assert
      expect(serializedLongitude).toStrictEqual(longitude);
    });
  });
});

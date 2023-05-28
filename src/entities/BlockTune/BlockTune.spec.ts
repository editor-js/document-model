import { createBlockTuneName } from './index';
import { createBlockTuneMock } from '../../utils/mocks/createBlockTuneMock';

describe('BlockTune', () => {
  describe('.update()', () => {
    it('should add field to data object by key if it doesn\'t exist', () => {
      // Arrange
      const blockTune = createBlockTuneMock({
        data: {},
      });

      // Act
      blockTune.update('align', 'left');

      // Assert
      expect(blockTune.serialized.data).toEqual({
        align: 'left',
      });
    });

    it('should update field in data object by key', () => {
      // Arrange
      const blockTune = createBlockTuneMock({
        data: {
          align: 'center',
        },
      });

      // Act
      blockTune.update('align', 'right');

      // Assert
      expect(blockTune.serialized.data).toEqual({
        align: 'right',
      });
    });
  });

  describe('.serialized', () => {
    it('should return serialized version of the BlockTune', () => {
      // Arrange
      const expected = {
        name: createBlockTuneName('styling'),
        data: {
          background: 'transparent',
        },
      };

      // Act
      const actual = createBlockTuneMock({
        name: expected.name,
        data: expected.data,
      }).serialized;

      // Assert
      expect(actual).toEqual(expected);
    });
  });
});

import { BlockTune, createBlockTuneName } from './index';
import { describe } from '@jest/globals';

describe('BlockTune', () => {
  const tuneName = createBlockTuneName('alignment');

  describe('constructor', () => {
    it('should have empty object as default data value', () => {
      const blockTune = new BlockTune({ name: tuneName });

      expect(blockTune.serialized.data).toEqual({});
    });
  });

  describe('.update()', () => {
    it('should add field to data object by key if it doesn\'t exist', () => {
      // Arrange
      const blockTune = new BlockTune({
        name: tuneName,
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
      const blockTune = new BlockTune({
        name: tuneName,
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
      const tune = new BlockTune({
        name: tuneName,
        data: {
          background: 'transparent',
        },
      });

      // Act
      const tuneSerialized = tune.serialized;

      // Assert
      expect(tuneSerialized).toEqual(
        {
          name: tuneName,
          data: {
            background: 'transparent',
          },
        }
      );
    });
  });
});

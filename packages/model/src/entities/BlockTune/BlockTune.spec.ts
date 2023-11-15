import { BlockTune, createBlockTuneName } from './index.js';
import { EventType } from '../../utils/EventBus/types/EventType.js';
import { TuneModifiedEvent } from '../../utils/EventBus/events/index.js';
import { EventAction } from '../../utils/EventBus/types/EventAction.js';

describe('BlockTune', () => {
  const tuneName = createBlockTuneName('alignment');

  describe('constructor', () => {
    it('should have empty object as default data value', () => {
      const blockTune = new BlockTune({ name: tuneName });

      expect(blockTune.serialized)
        .toEqual({});
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
      expect(blockTune.serialized)
        .toEqual({
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
      expect(blockTune.serialized)
        .toEqual({
          align: 'right',
        });
    });

    it('should emit TuneModifiedEvent with the new and previous values in details and tune name in index', () => {
      const name = 'align';
      const value = 'center';
      const blockTune = new BlockTune({
        name: tuneName,
        data: {
          [name]: value,
        },
      });
      const updatedValue = 'right';

      let event: TuneModifiedEvent | null = null;

      blockTune.addEventListener(EventType.Changed, e => event = e as TuneModifiedEvent);

      blockTune.update(name, updatedValue);

      expect(event).toBeInstanceOf(TuneModifiedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: [ name ],
        data: {
          value: updatedValue,
          previous: value,
        },
      }));
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
      expect(tuneSerialized)
        .toEqual(
          {
            background: 'transparent',
          }
        );
    });
  });
});

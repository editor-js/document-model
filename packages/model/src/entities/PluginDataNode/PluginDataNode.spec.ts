import { PluginDataNode } from './index.js';
import { createPluginDataName, EventType } from '@editorjs/model-types';
import { PluginDataModifiedEvent } from '@editorjs/model-types';
import { EventAction } from '@editorjs/model-types';

describe('PluginDataNode', () => {
  const pluginName = createPluginDataName('alignment');

  describe('constructor', () => {
    it('should have empty object as default data value', () => {
      const pluginData = new PluginDataNode({ name: pluginName });

      expect(pluginData.serialized)
        .toEqual({});
    });
  });

  describe('.update()', () => {
    it('should add field to data object by key if it doesn\'t exist', () => {
      // Arrange
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: {},
      });

      // Act
      pluginData.update('align', 'left');

      // Assert
      expect(pluginData.serialized)
        .toEqual({
          align: 'left',
        });
    });

    it('should update field in data object by key', () => {
      // Arrange
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: {
          align: 'center',
        },
      });

      // Act
      pluginData.update('align', 'right');

      // Assert
      expect(pluginData.serialized)
        .toEqual({
          align: 'right',
        });
    });

    it('should emit PluginDataModifiedEvent with the new and previous values in details and plugin key in index', () => {
      const name = 'align';
      const value = 'center';
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: {
          [name]: value,
        },
      });
      const updatedValue = 'right';

      let event: PluginDataModifiedEvent | null = null;

      pluginData.addEventListener(EventType.Changed, e => event = e as PluginDataModifiedEvent);

      pluginData.update(name, updatedValue);

      expect(event).toBeInstanceOf(PluginDataModifiedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: expect.objectContaining({ pluginKey: name }),
        data: {
          value: updatedValue,
          previous: value,
        },
      }));
    });

    it('should remove the key when the value is undefined', () => {
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: {
          align: 'left',
          visible: true,
        },
      });

      pluginData.update('align', undefined);

      expect(pluginData.serialized).toEqual({ visible: true });
    });

    it('should emit the previous value when a key is removed', () => {
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: { align: 'left' },
      });

      let event: PluginDataModifiedEvent | null = null;

      pluginData.addEventListener(EventType.Changed, e => event = e as PluginDataModifiedEvent);

      pluginData.update('align', undefined);

      expect(event).toHaveProperty('detail', expect.objectContaining({
        data: {
          value: undefined,
          previous: 'left',
        },
      }));
    });
  });

  describe('.isEmpty', () => {
    it('should be true when the node holds no keys', () => {
      expect(new PluginDataNode({ name: pluginName }).isEmpty).toBe(true);
    });

    it('should be false when the node holds a key', () => {
      expect(new PluginDataNode({ name: pluginName,
        data: { align: 'left' } }).isEmpty).toBe(false);
    });

    it('should become true again once every key is removed', () => {
      const pluginData = new PluginDataNode({ name: pluginName,
        data: { align: 'left' } });

      pluginData.update('align', undefined);

      expect(pluginData.isEmpty).toBe(true);
    });
  });

  describe('.serialized', () => {
    it('should return serialized version of the plugin data', () => {
      // Arrange
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: {
          background: 'transparent',
        },
      });

      // Act
      const pluginDataSerialized = pluginData.serialized;

      // Assert
      expect(pluginDataSerialized)
        .toEqual(
          {
            background: 'transparent',
          }
        );
    });
  });
});

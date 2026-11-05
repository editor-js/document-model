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

  describe('a write that changes nothing', () => {
    /**
     * Every dispatch here becomes an OT operation and an undo step. Plugins re-apply their
     * current state routinely -- on every menu open, for an item deriving `isActive` from it --
     * so a write that stores what is already stored must stay silent.
     */
    it('should not emit when the key already holds that value', () => {
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: { align: 'left' },
      });
      const listener = jest.fn();

      pluginData.addEventListener(EventType.Changed, listener);

      pluginData.update('align', 'left');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not emit when removing a key that is not there', () => {
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: { align: 'left' },
      });
      const listener = jest.fn();

      pluginData.addEventListener(EventType.Changed, listener);

      pluginData.update('visible', undefined);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should still emit when the value actually differs', () => {
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: { align: 'left' },
      });
      const listener = jest.fn();

      pluginData.addEventListener(EventType.Changed, listener);

      pluginData.update('align', 'right');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should still emit when a key is written for the first time with an undefined-free value', () => {
      const pluginData = new PluginDataNode({ name: pluginName });
      const listener = jest.fn();

      pluginData.addEventListener(EventType.Changed, listener);

      pluginData.update('align', 'left');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should leave the stored data untouched', () => {
      const pluginData = new PluginDataNode({
        name: pluginName,
        data: { align: 'left' },
      });

      pluginData.update('align', 'left');
      pluginData.update('visible', undefined);

      expect(pluginData.serialized).toEqual({ align: 'left' });
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

  describe('keys that collide with Object.prototype', () => {
    it('should keep a __proto__ key as data', () => {
      const pluginData = new PluginDataNode({ name: pluginName });

      /**
       * Parsed rather than written as a literal: an object literal's `__proto__` is the
       * prototype setter, while JSON.parse creates an own property -- and a document loaded
       * from storage arrives the second way
       */
      const loaded = JSON.parse('{"__proto__": "evil", "ok": 1}') as Record<string, unknown>;

      Object.entries(loaded).forEach(([key, value]) => pluginData.update(key, value));

      // A computed key, for the same reason: `{ '__proto__': x }` is still the setter.
      expect(pluginData.serialized).toEqual({
        ['__proto__']: 'evil',
        ok: 1,
      });
    });

    it('should treat a key named toString as absent before it is written', () => {
      const pluginData = new PluginDataNode({ name: pluginName });
      const events: PluginDataModifiedEvent[] = [];

      pluginData.addEventListener(EventType.Changed, (event) => {
        events.push(event as PluginDataModifiedEvent);
      });

      pluginData.update('toString', 'x');

      // Read off the prototype, the previous value would be a function -- onto the undo stack.
      expect(events).toHaveLength(1);
      expect(events[0].detail.data.previous).toBeUndefined();
    });

    it('should not report inherited data for a key it was never given', () => {
      const pluginData = new PluginDataNode({ name: pluginName,
        data: { id: 'one' } });

      expect(pluginData.serialized.toString).toBeUndefined();
    });
  });

  describe('values the caller still holds a reference to', () => {
    it('should store a copy rather than the object it was given', () => {
      const pluginData = new PluginDataNode({ name: pluginName });
      const settings = { align: 'left' };

      pluginData.update('settings', settings);
      settings.align = 'center';

      /**
       * Sharing the object lets an edit to it change the Model with no write at all, so the document moves while
       * nothing is recorded and no collaborator is told
       */
      expect(pluginData.serialized).toEqual({ settings: { align: 'left' } });
    });

    it('should store a copy of nested values too', () => {
      const pluginData = new PluginDataNode({ name: pluginName });
      const settings = { nested: { depth: 1 },
        items: [{ id: 'one' }] };

      pluginData.update('settings', settings);
      settings.nested.depth = 2;
      settings.items[0].id = 'two';

      expect(pluginData.serialized).toEqual({ settings: { nested: { depth: 1 },
        items: [{ id: 'one' }] } });
    });

    it('should emit when a value is mutated and written back', () => {
      const pluginData = new PluginDataNode({ name: pluginName });
      const settings = { align: 'left' };

      pluginData.update('settings', settings);

      const events: PluginDataModifiedEvent[] = [];

      pluginData.addEventListener(EventType.Changed, (event) => {
        events.push(event as PluginDataModifiedEvent);
      });

      settings.align = 'center';
      pluginData.update('settings', settings);

      /**
       * The write-back is the only announcement a read-modify-write makes, and over a shared object identity finds
       * it unchanged: no operation for collaborators, no step to undo, and two documents quietly diverged
       */
      expect(events).toHaveLength(1);
      expect(events[0]?.detail.data).toEqual({ value: { align: 'center' },
        previous: { align: 'left' } });
      expect(pluginData.serialized).toEqual({ settings: { align: 'center' } });
    });

    it('should not emit when an equal object is written again', () => {
      const pluginData = new PluginDataNode({ name: pluginName,
        data: { settings: { align: 'left',
          nested: { depth: 1 } } } });
      const events: PluginDataModifiedEvent[] = [];

      pluginData.addEventListener(EventType.Changed, (event) => {
        events.push(event as PluginDataModifiedEvent);
      });

      /**
       * A different object holding the same state. Plugins re-apply their current state routinely, and once stored
       * values are copies an identity check would never match one
       */
      pluginData.update('settings', { align: 'left',
        nested: { depth: 1 } });

      expect(events).toHaveLength(0);
    });

    it('should keep the recorded change out of reach of a later edit', () => {
      const pluginData = new PluginDataNode({ name: pluginName });
      const settings = { align: 'left' };
      const events: PluginDataModifiedEvent[] = [];

      pluginData.addEventListener(EventType.Changed, (event) => {
        events.push(event as PluginDataModifiedEvent);
      });

      pluginData.update('settings', settings);
      settings.align = 'center';

      /**
       * The payload becomes an operation and an undo step, both of which outlive the call
       */
      expect(events[0]?.detail.data.value).toEqual({ align: 'left' });
    });

    it('should copy the data it is constructed with', () => {
      const data = { settings: { align: 'left' } };
      const pluginData = new PluginDataNode({ name: pluginName,
        data });

      data.settings.align = 'center';

      expect(pluginData.serialized).toEqual({ settings: { align: 'left' } });
    });
  });

  describe('.serialized', () => {
    it('should hand back a copy rather than the record it keeps', () => {
      const pluginData = new PluginDataNode({ name: pluginName,
        data: { id: 'one',
          nested: { depth: 1 } } });

      const snapshot = pluginData.serialized as Record<string, unknown>;

      snapshot.id = 'two';
      (snapshot.nested as Record<string, unknown>).depth = 2;

      /**
       * Handing out the live record makes read-modify-write silent data loss: the write-back
       * finds the value already changed and the no-op guard emits nothing
       */
      expect(pluginData.serialized).toEqual({ id: 'one',
        nested: { depth: 1 } });
    });

    it('should still emit when a value read from it is written back changed', () => {
      const pluginData = new PluginDataNode({ name: pluginName,
        data: { id: 'one' } });
      const events: PluginDataModifiedEvent[] = [];

      pluginData.addEventListener(EventType.Changed, (event) => {
        events.push(event as PluginDataModifiedEvent);
      });

      const snapshot = pluginData.serialized as Record<string, unknown>;

      snapshot.id = 'two';
      pluginData.update('id', snapshot.id);

      expect(events).toHaveLength(1);
      expect(pluginData.serialized).toEqual({ id: 'two' });
    });

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

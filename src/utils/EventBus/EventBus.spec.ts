import { EventBus } from './EventBus';

describe('EventBus', () => {
  describe('.emit()', () => {
    it('should call an event listener', () => {
      const eventBus = new EventBus();
      const listener = jest.fn();

      eventBus.on('test', listener);
      eventBus.emit('test');

      expect(listener).toHaveBeenCalled();
    });

    it('should call an event listener with arguments', () => {
      const eventBus = new EventBus();
      const listener = jest.fn();
      const args = [1, 'two', true];

      eventBus.on('test', listener);
      eventBus.emit('test', ...args);

      expect(listener).toHaveBeenCalledWith(...args);
    });
  });

  describe('.on()', () => {
    it('should register an event listener that will be called few times', () => {
      const eventBus = new EventBus();
      const listener = jest.fn();
      const times = 3;

      eventBus.on('test', listener);

      for (let i = 0; i < times; i++) {
        eventBus.emit('test');
      }

      expect(listener).toHaveBeenCalledTimes(times);
    });
  });

  describe('.once()', () => {
    it('should register an event listener that will be called once', () => {
      const eventBus = new EventBus();
      const listener = jest.fn();

      eventBus.once('test', listener);

      eventBus.emit('test');
      eventBus.emit('test');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('.off()', () => {
    it('should remove an event listener', () => {
      const eventBus = new EventBus();
      const listener = jest.fn();

      eventBus.on('test', listener);
      eventBus.off('test', listener);

      eventBus.emit('test');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove only the one-time event listener', () => {
      const eventBus = new EventBus();
      const listener = jest.fn();

      eventBus.on('test', listener);
      eventBus.once('test', listener);
      eventBus.off('test', listener, undefined, true);

      eventBus.emit('test');

      /**
       * The listener should be called once because the first event listener added with .on()
       */
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

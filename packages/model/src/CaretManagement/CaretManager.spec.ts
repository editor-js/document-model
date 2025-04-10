import { Index } from '../entities/index.js';
import {
  CaretManagerCaretAddedEvent,
  CaretManagerCaretRemovedEvent,
  CaretManagerCaretUpdatedEvent,
  EventType
} from '../EventBus/index.js';
import { Caret } from './Caret/index.js';
import { CaretManager } from './CaretManager.js';
import { jest } from '@jest/globals';

describe('CaretManager', () => {
  it('should create new caret', () => {
    const manager = new CaretManager();

    const caret = manager.createCaret('userId');

    expect(manager.getCaret(caret.userId)).toBe(caret);
  });

  it('should create new caret with passed index', () => {
    const manager = new CaretManager();
    const index = new Index();

    const caret = manager.createCaret('userId', index);

    expect(caret.index).toBe(index);
  });

  it('should dispatch caret added event on caret creation', () => {
    const manager = new CaretManager();
    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    const index = new Index();
    const caret = manager.createCaret('userId', index);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretManagerCaretAddedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        userId: caret.userId,
        index: index.serialize(),
      },
    }));
  });

  it('should update caret', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret('userId');

    const index = new Index();

    caret.update(index);

    expect(manager.getCaret(caret.userId)?.index).toBe(index);
  });

  it('should dispatch caret updated event on caret update', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret('userId');
    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    const index = new Index();

    caret.update(index);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretManagerCaretUpdatedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        userId: caret.userId,
        index: index.serialize(),
      },
    }));
  });

  it('should remove caret', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret('userId');

    manager.removeCaret(caret);

    expect(manager.getCaret(caret.userId)).toBeUndefined();
  });

  it('should dispatch caret removed event on caret removal', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret('userId');
    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    manager.removeCaret(caret);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretManagerCaretRemovedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        userId: caret.userId,
        index: null,
      },
    }));
  });

  it('should not dispatch caret removed event if caret is not in the registry', () => {
    const manager = new CaretManager();
    const caret = new Caret('userId');

    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    manager.removeCaret(caret);

    expect(handler).not.toHaveBeenCalled();
  });
});

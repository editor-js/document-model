import { Index } from '../entities/index.js';
import {
  CaretManagerCaretAddedEvent,
  CaretManagerCaretRemovedEvent,
  CaretManagerCaretUpdatedEvent,
  EventType
} from '../EventBus/index.js';
import { Caret } from './Caret/index.js';
import { CaretManager } from './CaretManager.js';

describe('CaretManager', () => {
  it('should create new caret', () => {
    const manager = new CaretManager();

    const caret = manager.createCaret();

    expect(manager.getCaret(caret.id)).toBe(caret);
  });

  it('should create new caret with passed index', () => {
    const manager = new CaretManager();
    const index = new Index();

    const caret = manager.createCaret(index);

    expect(caret.index).toBe(index);
  });

  it('should dispatch caret added event on caret creation', () => {
    const manager = new CaretManager();
    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    const index = new Index();
    const caret = manager.createCaret(index);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretManagerCaretAddedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        id: caret.id,
        index: index.serialize(),
      },
    }));
  });

  it('should update caret', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret();

    const index = new Index();

    caret.update(index);

    expect(manager.getCaret(caret.id)?.index).toBe(index);
  });

  it('should dispatch caret updated event on caret update', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret();
    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    const index = new Index();

    caret.update(index);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretManagerCaretUpdatedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        id: caret.id,
        index: index.serialize(),
      },
    }));
  });

  it('should remove caret', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret();

    manager.removeCaret(caret);

    expect(manager.getCaret(caret.id)).toBeUndefined();
  });

  it('should dispatch caret removed event on caret removal', () => {
    const manager = new CaretManager();
    const caret = manager.createCaret();
    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    manager.removeCaret(caret);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretManagerCaretRemovedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        id: caret.id,
      },
    }));
  });

  it('should not dispatch caret removed event if caret is not in the registry', () => {
    const manager = new CaretManager();
    const caret = new Caret();

    const handler = jest.fn();

    manager.addEventListener(EventType.CaretManagerUpdated, handler);

    manager.removeCaret(caret);

    expect(handler).not.toHaveBeenCalled();
  });
});

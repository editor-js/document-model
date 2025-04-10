import { Index } from '../../entities/index.js';
import { Caret } from './Caret.js';
import { CaretEvent, CaretUpdatedEvent } from './types.js';
import { jest } from '@jest/globals';

describe('Caret', () => {
  it ('should initialize with null index', () => {
    const caret = new Caret('user');

    expect(caret.index).toBeNull();
  });

  it('should initialize with passed index', () => {
    const index = new Index();
    const caret = new Caret('user', index);

    expect(caret.index).toBe(index);
  });

  it('should update index', () => {
    const caret = new Caret('user');
    const index = new Index();

    caret.update(index);

    expect(caret.index).toBe(index);
  });

  it('should dispatch updated event on index update', () => {
    const caret = new Caret('user');
    const index = new Index();

    const handler = jest.fn();

    caret.addEventListener(CaretEvent.Updated, handler);

    caret.update(index);

    expect(handler).toHaveBeenCalledWith(expect.any(CaretUpdatedEvent));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: caret,
    }));
  });

  it('should serialize to JSON', () => {
    const index = new Index();
    const caret = new Caret('user', index);

    expect(caret.toJSON()).toEqual({
      userId: caret.userId,
      index: index.serialize(),
    });
  });
});

import { Index } from '../../entities/index.js';
import { Caret } from './Caret.js';
import { CaretEvent, CaretUpdatedEvent } from './types.js';

describe('Caret', () => {
  it ('should initialize with null index', () => {
    const caret = new Caret();

    expect(caret.index).toBeNull();
  });

  it('should initialize with passed index', () => {
    const index = new Index();
    const caret = new Caret(index);

    expect(caret.index).toBe(index);
  });

  it('should generate random id', () => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const randomValue = 0.5;

    jest.spyOn(Math, 'random').mockReturnValueOnce(randomValue);

    const caret = new Caret();

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(caret.id).toBe(randomValue * 1e10);
  });

  it('should update index', () => {
    const caret = new Caret();
    const index = new Index();

    caret.update(index);

    expect(caret.index).toBe(index);
  });

  it('should dispatch updated event on index update', () => {
    const caret = new Caret();
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
    const caret = new Caret(index);

    expect(caret.toJSON()).toEqual({
      id: caret.id,
      index: index.serialize(),
    });
  });
});

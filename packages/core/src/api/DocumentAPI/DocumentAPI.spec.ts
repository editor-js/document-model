/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, jest } from '@jest/globals';
import type { CoreConfigValidated, EventBus } from '@editorjs/sdk';

jest.unstable_mockModule('@editorjs/sdk', () => ({
  UndoCoreEvent: class UndoCoreEvent {
    public name = 'undo';
  },
  RedoCoreEvent: class RedoCoreEvent {
    public name = 'redo';
  },
  EventBus: jest.fn(),
  EventType: {
    Changed: 'update',
  },
}));

jest.unstable_mockModule('@editorjs/model', () => {
  const EditorJSModel = jest.fn(() => ({
    serialized: { blocks: [] },
  }));

  return {
    EditorJSModel,
  };
});

const { EditorJSModel } = await import('@editorjs/model');
const { DocumentAPI } = await import('./DocumentAPI.js');

describe('DocumentAPI', () => {
  // @ts-expect-error - mock object, don't need to pass any arguments
  const model = new EditorJSModel();

  const dispatchEvent = jest.fn();

  const documentAPI = new DocumentAPI(
    model,
    {} as unknown as CoreConfigValidated,
    { dispatchEvent } as unknown as EventBus
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('.data', () => {
    it('should return serialized model', () => {
      const mockedSerializedModel = {
        blocks: [
          {
            name: 'a',
          },
          {
            name: 'b',
          },
          {
            name: 'c',
          },
        ],
      };

      // @ts-expect-error - need to assign read only property to mock it
      model.serialized = mockedSerializedModel;

      const data = documentAPI.data;

      expect(data).toEqual(mockedSerializedModel);
    });
  });

  describe('.undo()', () => {
    it('should dispatch an undo core event', () => {
      documentAPI.undo();

      expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'undo' }));
    });
  });

  describe('.redo()', () => {
    it('should dispatch an redo core event', () => {
      documentAPI.redo();

      expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'redo' }));
    });
  });

  describe('.onUpdate()', () => {
    /**
     * EventTarget stands in for the model, so listeners are really added and removed
     * @param target - stand-in for the model
     */
    const createAPI = (target: EventTarget): InstanceType<typeof DocumentAPI> => new DocumentAPI(
      target as unknown as InstanceType<typeof EditorJSModel>,
      {} as unknown as CoreConfigValidated,
      { dispatchEvent } as unknown as EventBus
    );

    it('should call the callback on model update', () => {
      const target = new EventTarget();
      const callback = jest.fn();

      createAPI(target).onUpdate(callback);
      target.dispatchEvent(new Event('update'));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should stop calling the callback after the returned function is called', () => {
      const target = new EventTarget();
      const callback = jest.fn();

      const unsubscribe = createAPI(target).onUpdate(callback);

      unsubscribe();
      target.dispatchEvent(new Event('update'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should subscribe through an abort signal', () => {
      const target = new EventTarget();
      const addEventListener = jest.spyOn(target, 'addEventListener');

      createAPI(target).onUpdate(jest.fn());

      expect(addEventListener).toHaveBeenCalledWith('update', expect.any(Function), { signal: expect.any(AbortSignal) });
    });
  });
});

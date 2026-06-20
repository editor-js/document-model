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
});

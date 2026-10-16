/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';

// Mock dependencies before importing the module under test
jest.unstable_mockModule('@editorjs/sdk', () => ({
  createInlineToolName: jest.fn((name: string) => `inline:${name}`),
  EventType: {
    CaretManagerUpdated: 'update',
  },
}));

jest.unstable_mockModule('../components/SelectionManager', () => ({
  SelectionManager: jest.fn(() => ({
    applyInlineTool: jest.fn(),
  })),
}));

jest.unstable_mockModule('@editorjs/model', () => ({
  EditorJSModel: jest.fn(),
  Caret: class {},
}));

const { SelectionAPI } = await import('./SelectionAPI.js');
const { SelectionManager } = await import('../components/SelectionManager');
const { EditorJSModel } = await import('@editorjs/model');
const { createInlineToolName } = await import('@editorjs/sdk');

describe('SelectionAPI', () => {
  // @ts-expect-error - mock object
  const selectionManager = new SelectionManager();

  describe('.applyInlineTool()', () => {
    it('should convert toolName and delegate to SelectionManager', () => {
      const api = new SelectionAPI(
        selectionManager as unknown as InstanceType<typeof SelectionManager>,
        new EditorJSModel('userId', { identifier: 'docId' }),
        {} as unknown as CoreConfigValidated
      );

      api.applyInlineTool({
        tool: 'bold',
        data: { level: 1 },
      });

      expect(createInlineToolName).toHaveBeenCalledWith('bold');
      expect(selectionManager.applyInlineTool).toHaveBeenCalledWith({
        toolName: 'inline:bold',
        data: { level: 1 },
      });
    });
  });

  describe('.onCaretUpdate()', () => {
    /**
     * EventTarget stands in for the model, so listeners are really added and removed
     * @param target - stand-in for the model
     */
    const createAPI = (target: EventTarget): InstanceType<typeof SelectionAPI> => new SelectionAPI(
      selectionManager as unknown as InstanceType<typeof SelectionManager>,
      target as unknown as InstanceType<typeof EditorJSModel>,
      {} as unknown as CoreConfigValidated
    );

    it('should call the callback on caret update', () => {
      const target = new EventTarget();
      const callback = jest.fn();

      createAPI(target).onCaretUpdate(callback);
      target.dispatchEvent(new Event('update'));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should stop calling the callback after the returned function is called', () => {
      const target = new EventTarget();
      const callback = jest.fn();

      const unsubscribe = createAPI(target).onCaretUpdate(callback);

      unsubscribe();
      target.dispatchEvent(new Event('update'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should subscribe through an abort signal', () => {
      const target = new EventTarget();
      const addEventListener = jest.spyOn(target, 'addEventListener');

      createAPI(target).onCaretUpdate(jest.fn());

      expect(addEventListener).toHaveBeenCalledWith('update', expect.any(Function), { signal: expect.any(AbortSignal) });
    });
  });
});

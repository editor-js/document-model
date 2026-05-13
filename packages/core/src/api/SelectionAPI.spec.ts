/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';

// Mock dependencies before importing the module under test
jest.unstable_mockModule('../components/SelectionManager', () => ({
  SelectionManager: jest.fn(() => ({
    applyInlineToolForCurrentSelection: jest.fn(),
  })),
}));

jest.unstable_mockModule('@editorjs/model', () => ({
  EditorJSModel: jest.fn(),
  createInlineToolName: jest.fn((name: string) => `inline:${name}`),
  EventType: {
    CaretManagerUpdated: 'update',
  },
}));

const { SelectionAPI } = await import('./SelectionAPI.js');
const { SelectionManager } = await import('../components/SelectionManager');
const { EditorJSModel, createInlineToolName } = await import('@editorjs/model');

describe('SelectionAPI', () => {
  // @ts-expect-error - mock object
  const selectionManager = new SelectionManager();

  describe('.applyInlineToolForCurrentSelection()', () => {
    it('should convert toolName and delegate to SelectionManager', () => {
      const api = new SelectionAPI(
        selectionManager as unknown as InstanceType<typeof SelectionManager>,
        new EditorJSModel('userId', { identifier: 'docId' }),
        {} as unknown as CoreConfigValidated
      );

      api.applyInlineToolForCurrentSelection('bold', { level: 1 });

      expect(createInlineToolName).toHaveBeenCalledWith('bold');
      expect(selectionManager.applyInlineToolForCurrentSelection).toHaveBeenCalledWith('inline:bold', { level: 1 });
    });
  });
});

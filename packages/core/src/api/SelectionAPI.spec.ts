/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';

// Mock dependencies before importing the module under test
jest.unstable_mockModule('../components/SelectionManager', () => ({
  SelectionManager: jest.fn(() => ({
    applyInlineToolForCurrentSelection: jest.fn(),
  })),
}));

jest.unstable_mockModule('@editorjs/model', () => ({
  createInlineToolName: jest.fn((name: string) => `inline:${name}`),
}));

const { SelectionAPI } = await import('./SelectionAPI.js');
const { SelectionManager } = await import('../components/SelectionManager');
const { createInlineToolName } = await import('@editorjs/model');

describe('SelectionAPI', () => {
  // @ts-expect-error - mock object
  const selectionManager = new SelectionManager();

  describe('.applyInlineToolForCurrentSelection()', () => {
    it('should convert toolName and delegate to SelectionManager', () => {
      const api = new SelectionAPI(selectionManager as never as InstanceType<typeof SelectionManager>);

      api.applyInlineToolForCurrentSelection('bold', { level: 1 } as never);

      expect(createInlineToolName).toHaveBeenCalledWith('bold');
      expect(selectionManager.applyInlineToolForCurrentSelection).toHaveBeenCalledWith('inline:bold', { level: 1 });
    });
  });
});

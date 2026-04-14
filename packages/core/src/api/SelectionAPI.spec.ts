/* eslint-disable jsdoc/require-jsdoc, @stylistic/comma-dangle */

import { jest } from '@jest/globals';

// Mock dependencies before importing the module under test
await jest.unstable_mockModule('../components/SelectionManager', () => ({
  SelectionManager: jest.fn(() => ({
    applyInlineToolForCurrentSelection: jest.fn(),
  })),
}));

await jest.unstable_mockModule('@editorjs/model', () => ({
  createInlineToolName: jest.fn((name: string) => `inline:${name}`),
}));

const { SelectionAPI } = await import('./SelectionAPI.js');
const { SelectionManager } = await import('../components/SelectionManager');
const { createInlineToolName } = await import('@editorjs/model');

describe('SelectionAPI', () => {
  // @ts-ignore - mock object
  const selectionManager = new SelectionManager();

  it('applyInlineToolForCurrentSelection should convert toolName and delegate to SelectionManager', () => {
    const api = new SelectionAPI(selectionManager as never as InstanceType<typeof SelectionManager>);

    api.applyInlineToolForCurrentSelection('bold', { level: 1 } as never);

    expect(createInlineToolName).toHaveBeenCalledWith('bold');
    expect(selectionManager.applyInlineToolForCurrentSelection).toHaveBeenCalledWith('inline:bold', { level: 1 });
  });
});

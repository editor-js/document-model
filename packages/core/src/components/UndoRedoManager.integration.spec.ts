import { describe, it, expect, beforeEach } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';
import { EventBus, createPluginDataName } from '@editorjs/sdk';
import { EditorJSModel } from '@editorjs/model';
import { UndoRedoManager } from './UndoRedoManager.js';

const USER_ID = 'undo-user';
const DOCUMENT_ID = 'undo-doc';
const PLUGIN = createPluginDataName('anchors');

/**
 * Reads the plugin's serialized data for the first block, or undefined when it stores none
 * @param model - model to read from
 */
function pluginData(model: InstanceType<typeof EditorJSModel>): Record<string, unknown> | undefined {
  return model.serialized.blocks[0].plugins?.[PLUGIN];
}

describe('UndoRedoManager integration with plugin data (real model)', () => {
  let model: InstanceType<typeof EditorJSModel>;
  let manager: InstanceType<typeof UndoRedoManager>;

  beforeEach(() => {
    model = new EditorJSModel(USER_ID, { identifier: DOCUMENT_ID });

    model.initializeDocument({
      blocks: [
        {
          name: 'paragraph',
          data: {},
        },
      ],
    });

    manager = new UndoRedoManager(
      model,
      new EventBus(),
      { userId: USER_ID } as CoreConfigValidated
    );
  });

  it('should undo the first write by removing the entry, and redo by restoring it', () => {
    model.updatePluginData(USER_ID, 0, PLUGIN, { id: 'intro' });

    expect(pluginData(model)).toEqual({ id: 'intro' });

    manager.undo();

    expect(pluginData(model)).toBeUndefined();

    manager.redo();

    expect(pluginData(model)).toEqual({ id: 'intro' });
  });

  it('should undo an update back to the previous value', () => {
    model.updatePluginData(USER_ID, 0, PLUGIN, { visible: true });
    model.updatePluginData(USER_ID, 0, PLUGIN, { visible: false });

    expect(pluginData(model)).toEqual({ visible: false });

    manager.undo();

    expect(pluginData(model)).toEqual({ visible: true });
  });

  it('should record nothing for a write that stores what is already stored', () => {
    model.updatePluginData(USER_ID, 0, PLUGIN, { id: 'intro' });
    model.updatePluginData(USER_ID, 0, PLUGIN, { visible: true });

    /**
     * A provider re-applying the state it just read, which is what happens every time a menu
     * item derives `isActive` from plugin data and the user activates it twice
     */
    model.updatePluginData(USER_ID, 0, PLUGIN, { visible: true });

    manager.undo();

    expect(pluginData(model)).toEqual({ id: 'intro' });
  });

  it('should leave other keys of the same plugin untouched when undoing one key', () => {
    model.updatePluginData(USER_ID, 0, PLUGIN, { id: 'intro' });
    model.updatePluginData(USER_ID, 0, PLUGIN, { visible: true });

    manager.undo();

    expect(pluginData(model)).toEqual({ id: 'intro' });
  });
});

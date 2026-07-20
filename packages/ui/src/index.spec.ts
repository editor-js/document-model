/* eslint-disable jsdoc/require-jsdoc */
import { afterEach, describe, expect, it } from '@jest/globals';
import type { CoreConfigValidated, EditorjsPluginParams } from '@editorjs/sdk';
import { EventBus } from '@editorjs/sdk';
import { EditorjsUI } from './index.js';

interface EditorjsUITestContext {
  ui: EditorjsUI;
  eventBus: EventBus;
  holder: HTMLElement;
}

function createEditorjsUI(): EditorjsUITestContext {
  const eventBus = new EventBus();
  const holder = document.createElement('div');

  document.body.appendChild(holder);

  const ui = new EditorjsUI({
    eventBus,
    config: {
      holder,
    } as unknown as CoreConfigValidated,
  } as unknown as EditorjsPluginParams);

  return {
    ui,
    eventBus,
    holder,
  };
}

describe('EditorjsUI', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('should append the editor wrapper to the holder when constructed', () => {
      const { holder } = createEditorjsUI();

      expect(holder.children).toHaveLength(1);
    });
  });

  describe('.destroy()', () => {
    it('should remove the editor wrapper from the holder when destroy is called', () => {
      const { ui, holder } = createEditorjsUI();

      ui.destroy();

      expect(holder.children).toHaveLength(0);
    });
  });
});

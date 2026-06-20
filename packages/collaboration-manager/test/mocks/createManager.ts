import type { EditorDocumentSerialized, ModelEvents, Index } from '@editorjs/sdk';
import { EventBus, EventType } from '@editorjs/sdk';
import type { CoreConfigValidated, DocumentAPI, EditorAPI, InsertRemoveDataParams, ModifyDataParams, BlocksAPI } from '@editorjs/sdk';
import { CollaborationManager } from '../../src/CollaborationManager.js';

interface EditorModel {
  serialized: EditorDocumentSerialized;
  addEventListener(type: string, callback: (event: ModelEvents) => void): void;
  removeEventListener(type: string, callback: (event: ModelEvents) => void): void;
  insertData(userId: string | number | undefined, index: Index, data: unknown): void;
  removeData(userId: string | number | undefined, index: Index, data: unknown): void;
  modifyData(userId: string | number | undefined, index: Index, data: unknown): void;
}

/**
 * Creates a mock DocumentAPI backed by a real EditorJSModel instance
 * @param model - the EditorJS model to back the mock API with
 */
function createMockDocumentAPI(model: EditorModel): DocumentAPI {
  return {
    get data(): EditorDocumentSerialized {
      return model.serialized;
    },
    onUpdate(callback: (event: ModelEvents) => void): () => void {
      model.addEventListener(EventType.Changed, callback);

      return () => model.removeEventListener(EventType.Changed, callback);
    },
    insertData({ userId, index, data }: InsertRemoveDataParams): void {
      model.insertData(userId, index, data);
    },
    removeData({ userId, index, data }: InsertRemoveDataParams): void {
      model.removeData(userId, index, data);
    },
    modifyData({ userId, index, data }: ModifyDataParams): void {
      model.modifyData(userId, index, data);
    },
  } as DocumentAPI;
}

/**
 * Creates a CollaborationManager instance backed by a real model for testing
 * @param config - editor configuration
 * @param model - the EditorJS model instance
 * @returns an object containing the manager and the eventBus used
 */
export function createManager(config: CoreConfigValidated, model: EditorModel): {
  manager: CollaborationManager;
  eventBus: EventBus;
} {
  const eventBus = new EventBus();

  const api: EditorAPI = {
    document: createMockDocumentAPI(model),
    blocks: {
      render: () => undefined,
    } as unknown as BlocksAPI,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selection: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text: {} as any,
  };

  const manager = new CollaborationManager({
    config,
    api,
    eventBus,
  });

  return {
    manager,
    eventBus,
  };
}

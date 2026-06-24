import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import type { ModelEvents } from '@editorjs/model';
import { BlockTuneAdapter } from '@editorjs/sdk';
import type { EditorAPI } from '@editorjs/sdk';
import { TOKENS } from '../tokens.js';

/**
 * DOM-specific implementation of BlockTuneAdapter.
 * Resolves the EditorAPI from the IoC container and delegates all
 * model-update handling to the base class.
 */
@injectable()
export class DOMBlockTuneAdapter extends BlockTuneAdapter {
  /**
   * @param api - Editor's API (injected)
   */
  constructor(@inject(TOKENS.EditorAPI) api: EditorAPI) {
    super(api);
  }

  /**
   * Hook for DOM-specific reactions to model updates.
   * Currently a no-op; DOM-specific handling can be added here if needed.
   * @param _event - model event
   */
  protected handleModelUpdate(_event: ModelEvents): void {
    // DOM-specific handling can be added here
  }
}

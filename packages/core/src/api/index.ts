import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { EditorAPI as EditorApiInterface } from '@editorjs/sdk';
import { BlocksAPI } from './BlocksAPI.js';
import { SelectionAPI } from './SelectionAPI.js';

/**
 * Class gathers all Editor's APIs
 */
@injectable()
export class EditorAPI implements EditorApiInterface {
  /**
   * Blocks API instance to work with blocks
   */
  @inject(BlocksAPI)
  public blocks!: BlocksAPI;

  /**
   * Selection API instance to work with selection and inline formatting
   */
  @inject(SelectionAPI)
  public selection!: SelectionAPI;
}

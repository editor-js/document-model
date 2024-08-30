import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlocksAPI } from './BlocksAPI.js';
import { SelectionAPI } from './SelectionAPI.js';

/**
 * Class gathers all Editor's APIs
 */
@Service()
export class EditorAPI {
  /**
   * Blocks API instance to work with blocks
   */
  @Inject()
  public blocks!: BlocksAPI;

  /**
   * Selection API instance to work with selection and inline formatting
   */
  @Inject()
  public selection!: SelectionAPI;
}

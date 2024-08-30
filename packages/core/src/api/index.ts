import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlocksAPI } from './BlocksAPI.js';
import { SelectionAPI } from './SelectionAPI.js';

/**
 * Class gathers all Editor's APIs
 */
@Service()
export class EditorAPI {
  @Inject()
  public blocks!: BlocksAPI;

  @Inject()
  public selection!: SelectionAPI;
}

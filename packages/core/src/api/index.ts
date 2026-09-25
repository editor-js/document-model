import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { EditorAPI as EditorApiInterface } from '@editorjs/sdk';
import { BlocksAPI } from './BlocksAPI.js';
import { SelectionAPI } from './SelectionAPI.js';
import { DocumentAPI } from './DocumentAPI/index.js';
import { TextAPI } from './TextAPI.js';
import { PluginRegistry } from '../components/PluginRegistry.js';
import type { PluginsAPI } from '@editorjs/sdk';

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

  /**
   * Document API instance to work with document
   */
  @inject(DocumentAPI)
  public document!: DocumentAPI;

  /**
   * Text API instance to work with the text content of the document
   */
  @inject(TextAPI)
  public text!: TextAPI;

  /**
   * Registry holding the public APIs exposed by the registered plugins
   */
  @inject(PluginRegistry)
  private readonly pluginRegistry!: PluginRegistry;

  /**
   * Public APIs exposed by the registered plugins, keyed by plugin `name`.
   *
   * Exposed as a getter so the registry is resolved on access: plugins receive this API in their
   * constructor, before the plugins registered after them exist.
   */
  public get plugins(): PluginsAPI {
    return this.pluginRegistry.api;
  }
}

import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlocksManager } from '../components/BlockManager';
import { BlockToolData, ToolConfig } from '@editorjs/editorjs';
import { CoreConfigValidated } from '../entities';

@Service()
export class BlocksAPI {
  #blocksManager: BlocksManager;
  #config: CoreConfigValidated;

  constructor(
    blocksManager: BlocksManager,
     @Inject('EditorConfig') config: CoreConfigValidated
  ) {
    this.#blocksManager = blocksManager;
    this.#config = config;
  }

  public insert(
    type: string = this.#config.defaultBlock,
    data: BlockToolData = {},
    /**
     * Not used but left for compatibility
     */
    _config: ToolConfig = {},
    index?: number,
    needToFocus?: boolean,
    replace?: boolean,
    id?: string
  ): void {
    this.#blocksManager.insert({
      type,
      data,
      index,
      replace,
    });
  }
}

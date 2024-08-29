import { BlockAddedEvent, BlockRemovedEvent, EditorJSModel, EventType, ModelEvents } from '@editorjs/model';
import 'reflect-metadata';
import { Service } from 'typedi';
import { EditorUI } from './ui/InlineToolbar/Editor/index.js';
import { BlockToolAdapter, CaretAdapter } from '@editorjs/dom-adapters';
import ToolsManager from './tools/ToolsManager.js';
import { BlockAPI } from '@editorjs/editorjs';

@Service()
export class BlockManager {
  #model: EditorJSModel;
  #editorUI: EditorUI;
  #caretAdapter: CaretAdapter;
  #toolsManager: ToolsManager;

  constructor(
    model: EditorJSModel,
    editorUI: EditorUI,
    caretAdapter: CaretAdapter,
    toolsManager: ToolsManager
  ) {
    this.#model = model;
    this.#editorUI = editorUI;
    this.#caretAdapter = caretAdapter;
    this.#toolsManager = toolsManager;

    this.#model.addEventListener(EventType.Changed, event => this.#handleModelUpdate(event));
  }

  #handleModelUpdate(event: ModelEvents): void {
    switch (true) {
      case event instanceof BlockAddedEvent:
        this.#handleBlockAddedEvent(event);
        break;
      case event instanceof BlockRemovedEvent:
        this.#handleBlockRemovedEvent(event);
        break;
      default:
    }
  }

  async #handleBlockAddedEvent(event: BlockAddedEvent) {
    const { index, data } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    const blockToolAdapter = new BlockToolAdapter(this.#model, this.#caretAdapter, index.blockIndex);

    const tool = this.#toolsManager.blockTools.get(event.detail.data.name);

    if (!tool) {
      throw new Error(`Block Tool ${event.detail.data.name} not found`);
    }

    const block = tool.create({
      adapter: blockToolAdapter,
      data: data,
      block: {} as BlockAPI,
      readOnly: false,
    });

    this.#editorUI.addBlock(await block.render(), index.blockIndex);
  }

  #handleBlockRemovedEvent(event: BlockRemovedEvent) {
    const { index } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    this.#editorUI.removeBlock(index.blockIndex);
  }
}

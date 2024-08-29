import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { CoreConfigValidated } from '../../../entities';

@Service()
export class EditorUI {
  #holder: HTMLElement;
  #blocks: HTMLElement[] = [];

  constructor(@Inject('EditorConfig') config: CoreConfigValidated) {
    this.#holder = config.holder;
  }

  public render(): void {
    // will add UI to holder element
  }

  public addBlock(blockElement: HTMLElement, index: number): void {
    this.#validateIndex(index);

    if (index < this.#blocks.length) {
      this.#blocks[index].insertAdjacentElement('beforebegin', blockElement);
      this.#blocks.splice(index, 0, blockElement);
    } else {
      this.#holder.appendChild(blockElement);
      this.#blocks.push(blockElement);
    }
  }

  public removeBlock(index: number): void {
    this.#validateIndex(index);

    this.#blocks[index].remove();
    this.#blocks.splice(index, 1);
  }

  #validateIndex(index: number): void {
    if (index < 0 || index > this.#blocks.length) {
      throw new Error('Index out of bounds');
    }
  }
}

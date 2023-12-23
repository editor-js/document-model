import type { DataKey, EditorJSModel } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import { InputType } from './types/InputType.js';
import type { ModelEvents } from '@editorjs/model/dist/utils/EventBus/types/EventMap.js';
import {
  TextAddedEvent,
  TextRemovedEvent,
  ValueModifiedEvent
} from '@editorjs/model/dist/utils/EventBus/events/index.js';
import { EventAction } from '@editorjs/model/dist/utils/EventBus/types/EventAction.js';
import type { Index } from '@editorjs/model/dist/utils/EventBus/types/indexing.js';

enum NativeInput {
  Textarea = 'TEXTAREA',
  Input = 'INPUT',
}

/**
 * BlockToolAdapter is using inside Block tools to connect browser DOM elements to the model
 * It can handle beforeinput events and update model data
 * It can handle model's change events and update DOM
 */
export class BlockToolAdapter {
  /**
   * Model instance
   */
  #model: EditorJSModel;

  /**
   * Index of the block that this adapter is connected to
   */
  #blockIndex: number;

  /**
   * Set of hashes that represents changes that were made by this adapter
   * It uses to prevent infinite loops when user updates text or value and model updates DOM and DOM updates model
   */
  #hashedChangesSet: Set<string>;

  /**
   *
   * @param model
   * @param blockIndex
   */
  constructor(model: EditorJSModel, blockIndex: number) {
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#hashedChangesSet = new Set();
  }

  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   *
   * @param key
   * @param input
   */
  public attachInput(key: DataKey, input: HTMLElement): void {
    const inputTag = input.tagName as NativeInput;

    if (![NativeInput.Textarea, NativeInput.Input].includes(inputTag) && !input.isContentEditable) {
      throw new Error('BlockToolAdapter: input should be either INPUT, TEXTAREA or contenteditable element');
    }

    input.addEventListener('beforeinput', (event) => {
      const inputType = event.inputType as InputType;
      const targetRanges = event.getTargetRanges();

      switch (inputType) {
        case InputType.InsertReplacementText: {
          const range = targetRanges[0];

          const start = this.#getAbsoluteRangeIndex(input, range.startContainer, range.startOffset);
          const end = this.#getAbsoluteRangeIndex(input, range.endContainer, range.endOffset);

          const hashedRemoveChange = this.#hashChange(key, start, end);

          this.#saveHashedChange(hashedRemoveChange);

          this.#model.removeText(this.#blockIndex, key, start, end);

          const data = event.dataTransfer!.getData('text/plain');

          const hashedInsertChange = this.#hashChange(key, start, end, data);

          this.#saveHashedChange(hashedInsertChange);

          this.#model.insertText(this.#blockIndex, key, data, start);

          break;
        }
        case InputType.InsertText:
        case InputType.InsertCompositionText: {
          const range = targetRanges[0];

          const start = this.#getAbsoluteRangeIndex(input, range.startContainer, range.startOffset);
          const end = this.#getAbsoluteRangeIndex(input, range.endContainer, range.endOffset);

          /**
           * If start and end aren't equal, it means that user selected some text and replaced it with new one
           */
          if (start !== end) {
            const hashedRemoveChange = this.#hashChange(key, start, end);

            this.#saveHashedChange(hashedRemoveChange);

            this.#model.removeText(this.#blockIndex, key, start, end);
          }

          const data = event.data as string;

          const hashedInsertChange = this.#hashChange(key, start, start + data.length, data);

          this.#saveHashedChange(hashedInsertChange);

          this.#model.insertText(this.#blockIndex, key, data, start);
          break;
        }

        case InputType.DeleteContent:
        case InputType.DeleteContentBackward:
        case InputType.DeleteContentForward:
        case InputType.DeleteByCut:
        case InputType.DeleteByDrag:
        case InputType.DeleteHardLineBackward:
        case InputType.DeleteHardLineForward:
        case InputType.DeleteSoftLineBackward:
        case InputType.DeleteSoftLineForward:
        case InputType.DeleteWordBackward:
        case InputType.DeleteWordForward: {
          const rangeToDelete = targetRanges[0];

          const start = this.#getAbsoluteRangeIndex(input, rangeToDelete.startContainer, rangeToDelete.startOffset);
          const end = this.#getAbsoluteRangeIndex(input, rangeToDelete.endContainer, rangeToDelete.endOffset);

          const hashedRemoveChange = this.#hashChange(key, start, end);

          this.#saveHashedChange(hashedRemoveChange);

          this.#model.removeText(this.#blockIndex, key, start, end);

          break;
        }

        default:
          event.preventDefault();
      }
    });

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => {
      if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
        return;
      }

      const index = event.detail.index;

      const blockIndex = index[index.length - 1];

      if (blockIndex !== this.#blockIndex) {
        return;
      }

      const dataIndex = index[index.length - 2];

      if (dataIndex !== `data@${key}`) {
        return;
      }

      const rangeIndex = index[index.length - 3];

      if (!Array.isArray(rangeIndex)) {
        return;
      }

      const action = event.detail.action;

      switch (action) {
        case EventAction.Added: {
          const hashedChange = this.#createHashedChangeFromIndex(index, event.detail.data);

          if (this.#hasHashedChangeInHashSet(hashedChange)) {
            this.#removeHashedChange(hashedChange);

            return;
          }

          const start = rangeIndex[0];
          const text = event.detail.data as string;
          const textNode = document.createTextNode(text);

          const [startNode, startOffset] = this.#getRelativeRangeIndex(input, start);

          const range = new Range();

          range.setStart(startNode, startOffset);
          range.insertNode(textNode);

          break;
        }
        case EventAction.Removed: {
          const hashedChange = this.#createHashedChangeFromIndex(index);

          if (this.#hasHashedChangeInHashSet(hashedChange)) {
            this.#removeHashedChange(hashedChange);

            return;
          }

          const start = rangeIndex[0];
          const end = rangeIndex[1];

          const [startNode, startOffset] = this.#getRelativeRangeIndex(input, start);
          const [endNode, endOffset] = this.#getRelativeRangeIndex(input, end);

          const range = new Range();

          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);

          range.deleteContents();

          break;
        }
      }
    });
  }

  /**
   *
   * @param key
   * @param onUpdate
   */
  public attachValue<T = unknown>(key: DataKey, onUpdate: (value?: T) => void): (value: T) => void {
    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => {
      if (!(event instanceof ValueModifiedEvent)) {
        return;
      }

      const index = event.detail.index;

      const blockIndex = index[index.length - 1];

      if (blockIndex !== this.#blockIndex) {
        return;
      }

      const dataIndex = index[index.length - 2];

      if (dataIndex !== `data@${key}`) {
        return;
      }

      const updatedValue = event.detail.data.value as T;

      /**
       * If updated value is equal to the value that was set by this adapter, it means that
       * this event was triggered by this adapter, and we don't need to update DOM
       */
      const hashedChange = this.#createHashedChangeFromIndex(index, updatedValue);

      if (this.#hasHashedChangeInHashSet(hashedChange)) {
        this.#removeHashedChange(hashedChange);

        return;
      }

      onUpdate(updatedValue);
    });

    return (value: T) => {
      const hashedChange = this.#hashChange(key, undefined, undefined, value);

      this.#saveHashedChange(hashedChange);

      this.#model.updateValue(this.#blockIndex, key, value);
    };
  }

  /**
   * HTML element might contain nested elements for formatting
   * This method calculates absolute index of the range inside the root element
   *
   * @param parent - root element
   * @param initialNode - node to calculate index from
   * @param initialOffset - offset to calculate index from
   */
  #getAbsoluteRangeIndex(parent: Node, initialNode: Node, initialOffset: number): number {
    let node = initialNode;
    let offset = initialOffset;

    if (!parent.contains(node)) {
      throw new Error('BlockToolAdapter: range is not contained in the parent node');
    }

    while (node !== parent) {
      const childNodes = Array.from(node.parentNode!.childNodes);
      const index = childNodes.indexOf(node as ChildNode);

      offset = childNodes.slice(0, index)
        .reduce((acc, child) => acc + child.textContent!.length, offset);

      node = node.parentNode!;
    }

    return offset;
  }

  /**
   *
   * @param root
   * @param initialOffset
   */
  #getRelativeRangeIndex(root: Node, initialOffset: number): [Text, number] {
    let offset = initialOffset;

    const childNodes = Array.from(root.childNodes);

    let i = 0;

    let childNode = childNodes[i];

    while (i < childNodes.length) {
      if (offset <= childNode.textContent!.length) {
        if (!(childNode instanceof Text)) {
          return this.#getRelativeRangeIndex(childNode, offset);
        }

        return [childNode, offset];
      }

      offset -= childNode.textContent!.length;
      i++;
      childNode = childNodes[i];
    }

    return [childNode as Text, offset];
  }

  /**
   *
   * @param key
   * @param start
   * @param end
   * @param value
   */
  #hashChange<T>(key: DataKey, start?: number, end?: number, value?: T): string {
    return ((start !== undefined && end !== undefined) && `${start},${end},`) +
        `data@${key},${this.#blockIndex}` +
        ((value !== undefined) && `+${value}`);
  }

  /**
   *
   * @param hashedChange
   */
  #saveHashedChange(hashedChange: string): void {
    this.#hashedChangesSet.add(hashedChange);
  }

  /**
   *
   * @param hashedChange
   */
  #hasHashedChangeInHashSet(hashedChange: string): boolean {
    return this.#hashedChangesSet.has(hashedChange);
  }

  /**
   *
   * @param hashedChange
   */
  #removeHashedChange(hashedChange: string): void {
    this.#hashedChangesSet.delete(hashedChange);
  }

  /**
   *
   * @param index
   * @param value
   */
  #createHashedChangeFromIndex<T>(index: Index, value?: T): string {
    return index.toString() +
        ((value !== undefined) && `+${value}`);
  }
}

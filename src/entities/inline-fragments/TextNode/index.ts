import { InlineFragment, ParentInlineNode, ParentInlineNodeConstructorOptions, TextNodeSerialized } from '../index';
import { BlockChildType } from '../../BlockNode/types';

interface TextNodeConstructorOptions extends ParentInlineNodeConstructorOptions {
  value?: string;
  fragments?: InlineFragment[];
}

/**
 * TextNode class represents a root node in a tree-like structure to have a single access point to the tree
 */
export class TextNode extends ParentInlineNode {
  /**
   * TextNode constructor
   *
   * @param options - TextNode constructor options
   */
  // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
  constructor(options: TextNodeConstructorOptions = {}) {
    const { value = '', fragments = [], ...rest } = options;

    super(rest);

    this.#initialize(value, fragments);
  }

  /**
   * Returns serialized TextNode
   */
  public get serialized(): TextNodeSerialized {
    return Object.assign({ $t: BlockChildType.Text as const }, super.serialized);
  }

  /**
   * Private method to initialize the TextNode with passed initial data
   *
   * @param value - initial text value to insert
   * @param fragments - initial inline fragments to apply
   * @private
   */
  #initialize(value: string, fragments: InlineFragment[]): void {
    if (!value) {
      return;
    }

    this.insertText(value);

    fragments.forEach((fragment) => {
      this.format(fragment.tool, ...fragment.range, fragment.data);
    });
  }
}

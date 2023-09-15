import { InlineFragment, ParentInlineNode, ParentInlineNodeConstructorOptions } from '../index';

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
  constructor(options: TextNodeConstructorOptions = {}) {
    const { value = '', fragments = [], ...rest } = options;

    super(rest);

    this.#initialize(value, fragments);
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

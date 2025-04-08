import type { InlineFragment, InlineToolName, ParentInlineNodeConstructorOptions, TextNodeSerialized } from '../index';
import { ParentInlineNode } from '../index.js';
import { BlockChildType } from '../../BlockNode/types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '../../BlockNode/consts.js';

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
    return Object.assign({ [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text as const }, super.serialized);
  }

  /**
   * Overridden method to get fragments of the TextNode
   * Returns all fragments if no tool is specified
   *
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   * @param [includeEdges] - whether to include edges of the range
   * @param [tool] - name of the Inline Tool
   */
  public getFragments(start?: number, end?: number, includeEdges?: boolean, tool?: InlineToolName): InlineFragment[] {
    // console.trace('getFragments');
    let fragments = super.getFragments(start, end, includeEdges);

    if (tool) {
      fragments = fragments.filter((fragment) => fragment.tool === tool);
    }

    return fragments;
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

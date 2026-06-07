import type {
  EditorAPI,
  InlineTool,
  InlineToolConstructor,
  InlineToolConstructorOptions,
  InlineToolFormatData,
  ToolFormattingOptions,
  MenuConfig
} from '@editorjs/sdk';
import { ToolType, PopoverItemType } from '@editorjs/sdk';
/**
 * @todo Export these types from SDK so Tool doesn't need to add model as a dependency.
 */
import type { InlineFragment, TextRange } from '@editorjs/model';
import { FormattingAction, IntersectType } from '@editorjs/model';
import { make } from '@editorjs/dom';
import { IconLink, IconUnlink } from '@codexteam/icons';

/**
 * @todo Type tools data through InlineTool interface generic
 */
interface LinkData {
  /**
   * Link href
   */
  href: string;
}

/**
 * Link Tool
 *
 * Inline Toolbar Tool
 *
 * Makes selected text linked
 */
export class LinkInlineTool implements InlineTool {
  /**
   * Specifies Tool as Inline Toolbar Tool
   * @returns {ToolType.Inline}
   */
  public static type = ToolType.Inline as const;

  /**
   * Tool name used to identify the tool across the editor.
   */
  public static name = 'link';

  /**
   * Default options (merged with second argument of `use(LinkInlineTool, options)`).
   */
  public static readonly options = {
    /**
     * Tool title shown in the inline toolbar
     */
    title: 'Link',
  };

  /**
   * Type of behaviour of the tool if new selection range intersect with existing fragment
   * If two fragment intersect, existing fragment should be replaced with new one
   */
  public intersectType: IntersectType = IntersectType.Replace;

  /**
   * EditorJS API instance
   */
  #api: EditorAPI;

  /**
   * Tool constructor function
   * @param param0 - inline tool parameters
   * @param param0.api - EditorJS api
   */
  constructor({ api }: InlineToolConstructorOptions) {
    this.#api = api;
  }

  /**
   * Returns inline toolbar configuration for the tool
   * @param range - selected range
   * @param fragments - fragments of the tool in the selected range
   */
  public getToolbarConfig(range: TextRange, fragments: InlineFragment[]): MenuConfig {
    const isActive = this.isActive(range, fragments);
    const data = isActive ? fragments[0].data! : {} as LinkData;

    const linkInput = make('input', 'ejs-inline-toolbar__input', {
      placeholder: 'Add a link',
      enterKeyHint: 'done',
      value: data.href ?? '',
    }) as HTMLInputElement;

    return {
      icon: isActive ? IconUnlink : IconLink,
      onActivate: () => {
        if (!isActive) {
          return;
        }

        const caretIndex = this.#api.selection.caretIndex;

        this.#api.selection.applyInlineTool({
          tool: LinkInlineTool.name,
          data: {},
          caretIndex: caretIndex!,
          action: FormattingAction.Unformat,
        });
      },
      children: {
        isFlippable: false,
        items: [{
          type: PopoverItemType.Html,
          element: linkInput,
        }],
        isOpen: isActive,
        onOpen: (close: (parent?: boolean) => void): void => {
          const caretIndex = this.#api.selection.caretIndex;

          linkInput.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.stopImmediatePropagation();

              close(true);

              this.#api.selection.applyInlineTool({
                tool: LinkInlineTool.name,
                data: { href: linkInput.value },
                caretIndex: caretIndex!,
                /** @todo Replace link instead of applying the formatting again. Needs to be implemented in the model */
                action: isActive ? FormattingAction.None : FormattingAction.Format,
                keepSelection: false,
              });
            }
          });

          if (!isActive) {
            queueMicrotask(() => {
              linkInput.focus();
            });
          }
        },
      },
    };
  }

  /**
   * Renders wrapper for tool without actual content
   * @param data - inline tool data formed in toolbar
   * @returns Created html element
   */
  public createWrapper(data: InlineToolFormatData): HTMLElement {
    const linkElement = make('a') as HTMLLinkElement;

    if (typeof data.href === 'string') {
      linkElement.href = data.href;
    }

    return linkElement;
  }

  /**
   * Returns formatting action and range for it to be applied
   * @param range - range of current text selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  public getFormattingOptions(range: TextRange, fragments: InlineFragment[]): ToolFormattingOptions {
    return {
      action: this.isActive(range, fragments) ? FormattingAction.Unformat : FormattingAction.Format,
      range,
    };
  };

  /**
   * Returns state of the bold inline tool
   * @param range - range of current selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   * @returns true if tool is active, false otherwise
   */
  public isActive(range: TextRange, fragments: InlineFragment[]): boolean {
    let isActive = false;

    fragments.forEach((fragment) => {
      /**
       * Check if current index is inside of model fragment
       */
      if (range[0] >= fragment.range[0] && range[1] <= fragment.range[1]) {
        isActive = true;

        /**
         * No need to check other fragments if state already chaned
         */
        return;
      }
    });

    return isActive;
  }
}

LinkInlineTool satisfies InlineToolConstructor;

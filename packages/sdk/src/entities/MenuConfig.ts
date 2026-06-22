/**
 * @todo think on how to remove ui-kit dependency here
 */
import type { PopoverItemChildren, PopoverItemDefaultBaseParams, PopoverItemHtmlParams, PopoverItemSeparatorParams, WithChildren } from '@editorjs/ui-kit';
import { PopoverItemType } from '@editorjs/ui-kit';

/**
 * @todo maybe reexport under "MenuItemType"
 */
export { PopoverItemType };

/**
 * Menu configuration format.
 * Is used for defining Block Tunes Menu items via Block Tool's renderSettings(), Block Tune's render() and Inline Tool's render().
 */
export type MenuConfig = MenuConfigItem | MenuConfigItem[];

/**
 * Common parameters for all kinds of default Menu Config items: with or without confirmation
 * Only icon is required
 */
type MenuConfigDefaultBaseParams = Partial<PopoverItemDefaultBaseParams>;

/**
 * Menu Config item parameters with confirmation
 */
type MenuConfigItemDefaultWithConfirmationParams = Omit<MenuConfigDefaultBaseParams, 'onActivate'> & {
  /**
   * Items with confirmation should not have onActivate handler
   */
  onActivate?: never;

  /**
   * Menu Config item parameters that should be applied on item activation.
   * May be used to ask user for confirmation before executing item activation handler.
   */
  confirmation: MenuConfigDefaultBaseParams;
};

type MenuConfigItemWithChildren = MenuConfigDefaultBaseParams & {
  /**
   * Popover item children configuration
   */
  children: PopoverItemChildren;
};

/**
 * Default, non-separator and non-html Menu Config items type
 */
type MenuConfigItemDefaultParams = MenuConfigDefaultBaseParams
  | MenuConfigItemWithChildren
  | MenuConfigItemDefaultWithConfirmationParams;

/**
 * Single Menu Config item
 */
type MenuConfigItem = MenuConfigItemDefaultParams
  | PopoverItemSeparatorParams
  | PopoverItemHtmlParams
  | WithChildren<PopoverItemHtmlParams>;

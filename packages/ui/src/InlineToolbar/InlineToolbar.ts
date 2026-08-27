import { make } from '@editorjs/dom';
import { InlineToolbarRenderedUIEvent } from './InlineToolbarRenderedUIEvent.js';
import type {
  CoreConfigValidated,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  EventBus,
  InlineToolFacade,
  SelectionChangedCoreEvent
} from '@editorjs/sdk';
import {
  CoreEventType,
  InlineToolOptionKey,
  UiComponentType
} from '@editorjs/sdk';
import type { InlineFragment, TextIndex, TextRange } from '@editorjs/sdk';
import Style from './InlineToolbar.module.pcss';
import type { PopoverItemDefaultBaseParams, PopoverItemParams } from '@editorjs/ui-kit';
import { PopoverEvent, PopoverInline, PopoverItemType } from '@editorjs/ui-kit';
import { beautifyShortcut, capitalize } from '@editorjs/helpers';
import { messages } from '../messages.js';

/**
 * Delay before filling the live region in, so that its content is treated as a change
 * and hence announced even when the same message repeats
 */
const ANNOUNCEMENT_DELAY = 50;

/**
 * Number of inline toolbars constructed so far, used to keep their popover ids apart
 */
let inlineToolbarCount = 0;

/**
 * Builds the id put on the popover element so that the editable holding focus can claim it via
 * aria-owns (see #setActiveDescendant).
 *
 * Per instance rather than a single constant: several editors can share a page, `aria-owns`
 * resolves by document-wide id lookup, and a duplicate id would hand the second editor's blocks
 * holder the *first* editor's popover — pointing assistive tech at controls that operate on a
 * different document. Stable for the lifetime of the toolbar, since the popover element it names
 * is rebuilt on every selection change while the reference to it has to keep resolving
 * @returns an id unique to one inline toolbar instance
 */
function nextPopoverElementId(): string {
  inlineToolbarCount += 1;

  return `ejs-inline-toolbar-popover-${inlineToolbarCount}`;
}

/**
 * Inline Toolbar UI module
 * - renders the inline toolbar with available inline tools
 * - listens to the selection change core event
 * - handles the inline tools actions via EditorAPI
 */
export class InlineToolbarUI implements EditorjsPlugin {
  /**
   * Plugin type
   */
  public static readonly type = UiComponentType.InlineToolbar;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * HTML nodes of the inline toolbar
   */
  #nodes: Record<string, HTMLElement> = {};

  /**
   * EditorAPI instance to apply inline tools
   */
  #api: EditorAPI;

  /**
   * Editor's Config
   */
  #config: CoreConfigValidated;

  /**
   * Popover instance for inline tool buttons
   */
  #popover: PopoverInline | null = null;

  /**
   * Root element of the current popover. Held separately from #nodes, which is for the parts
   * built once in #render — this one is replaced on every rebuild and absent while hidden
   */
  #popoverElement: HTMLElement | null = null;

  /**
   * Id this toolbar's popover element carries, so that aria-owns can name it across rebuilds
   */
  #popoverElementId = nextPopoverElementId();

  /**
   * Handle of the not-yet-written live region announcement, so that dismissing the toolbar
   * within the delay can cancel it instead of announcing a toolbar that is already gone
   */
  #announcementTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Element currently pointed at the highlighted popover item via aria-activedescendant.
   * Kept so that the attribute can be removed from the very element it was set on, even if
   * the focus has moved on since then
   */
  #activeDescendantHost: HTMLElement | null = null;

  /**
   * Whether the toolbar is currently shown. The popover itself is destroyed and recreated on
   * every selection change (see #renderPopover), so its own visibility state can't be used to
   * tell a genuine hidden-to-shown transition apart from a reselection while already open
   */
  #isVisible = false;

  /**
   * Number of popover renders started so far, used to tell a render that is still the current
   * one from a render that has been superseded while it was awaiting, see #renderPopover
   */
  #renderGeneration = 0;

  /**
   * Subscription to the core's selection changes.
   *
   * Held as a field rather than passed inline, so that `destroy()` has something to unsubscribe:
   * an inline arrow cannot be handed back to `removeEventListener`, which would leave the
   * toolbar reacting to selection changes for as long as the event bus outlives it
   * @todo Handle a rejected build instead of discarding it. `#renderPopover` awaits a
   * `getToolbarConfig` per tool, so a throwing tool rejects the whole chain — and `void` drops
   * it, leaving the user without formatting controls and nothing logged. The render generation
   * added for the interleaving case makes this more visible rather than less: an older build
   * that would once have completed and put *something* up now bails on the generation check,
   * so a failing newest build is the whole outcome. Deciding between hiding the toolbar,
   * retrying, and rendering the tools that did resolve is a call about tool-failure semantics
   * across the editor, not one to make here
   * @param event - SelectionChangedCoreEvent dispatched by the core
   */
  #onSelectionChanged = (event: SelectionChangedCoreEvent): void => {
    void this.#handleSelectionChange(event);
  };

  /**
   * InlineToolbarUI class constructor
   * @param params - Plugin parameters
   */
  constructor({
    api,
    eventBus,
    config,
  }: EditorjsPluginParams) {
    this.#eventBus = eventBus;
    this.#api = api;
    this.#config = config;

    this.#render();

    this.#eventBus.addEventListener(`core:${CoreEventType.SelectionChanged}`, this.#onSelectionChanged);
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    /**
     * Unsubscribed first, so that a selection change arriving mid-teardown cannot put a new
     * popover up in the holder that is about to be detached
     */
    this.#eventBus.removeEventListener(`core:${CoreEventType.SelectionChanged}`, this.#onSelectionChanged);

    /**
     * Removing the holder detaches the popover with it but leaves the document-level listeners
     * and the pending announcement alive, so tear the toolbar down properly first
     */
    this.#hide();
    this.#nodes.holder.remove();
  }

  /**
   * Handles the selection change core event
   * @param event - SelectionChangedCoreEvent event
   */
  async #handleSelectionChange(event: SelectionChangedCoreEvent): Promise<void> {
    const { availableInlineTools, index, fragments } = event.detail;
    const selection = window.getSelection();
    const segments = (index as TextIndex | undefined)?.getTextSegments() ?? [];
    /**
     * For composite selection the first segment can be collapsed (e.g. range starts at end of block 1);
     * `isActive` should use a non-collapsed local range, not `segments[0]` unconditionally.
     */
    const firstNonCollapsedSegment = segments.find(
      (segment: TextIndex) =>
        segment.textRange !== undefined
        && segment.textRange[0] !== segment.textRange[1]
    );

    if (
      !index
      || segments.length === 0
      || firstNonCollapsedSegment === undefined
      /**
       * Index could contain textRange for native inputs,
       * so we need to check if there are ranges in the document selection
       */
      || !selection
      || !selection.rangeCount
    ) {
      /**
       * A control inside the toolbar taking real DOM focus (e.g. VoiceOver activating a button,
       * unlike a plain mouse click which Safari doesn't focus by default) collapses the native
       * text selection as a side effect. That is not the user dismissing the toolbar - it is
       * the toolbar being actively used - so it must not be torn down out from under whatever
       * is currently focused inside it (e.g. the link tool's URL input)
       */
      if (document.activeElement instanceof Node && this.#nodes.holder.contains(document.activeElement)) {
        return;
      }

      this.#hide();

      return;
    }

    const textRange = firstNonCollapsedSegment.textRange;

    if (textRange === undefined) {
      this.#hide();

      return;
    }

    const isCurrent = await this.#renderPopover(availableInlineTools, textRange, fragments);

    /**
     * A superseded render built nothing, so there is nothing to position or show — and doing
     * either would move and re-announce the toolbar the render that overtook it put up
     */
    if (!isCurrent) {
      return;
    }

    this.#move();
    this.#show();
  }

  /**
   * Renders the Inline Toolbar UI HTML nodes
   */
  #render(): void {
    this.#nodes.holder = make('div', Style['inline-toolbar']);

    /**
     * The toolbar appears next to a text selection without moving focus or DOM position, so
     * nothing tells a screen reader user it's there or that Tab now leads somewhere new. This
     * region announces its appearance without disturbing where the user actually is.
     */
    this.#nodes.liveRegion = make('div', Style['visually-hidden']);
    this.#nodes.liveRegion.setAttribute('role', 'status');
    this.#nodes.liveRegion.setAttribute('aria-live', 'polite');

    /**
     * ui-kit's own popover also carries a role="status" live region (for search results /
     * confirmation announcements), so plain role-based lookup can't tell the two apart in tests
     */
    this.#nodes.liveRegion.setAttribute('data-testid', 'inline-toolbar-announcer');
    this.#nodes.holder.appendChild(this.#nodes.liveRegion);

    this.#eventBus.dispatchEvent(new InlineToolbarRenderedUIEvent({ toolbar: this.#nodes.holder }));
  }

  /**
   * Announces a message to screen readers via the toolbar's own live region.
   * The region is cleared first, otherwise repeating the same text is not announced
   * @param message - text to announce
   */
  #announce(message: string): void {
    const region = this.#nodes.liveRegion;

    this.#cancelPendingAnnouncement();

    region.textContent = '';

    this.#announcementTimeout = setTimeout(() => {
      this.#announcementTimeout = null;
      region.textContent = message;
    }, ANNOUNCEMENT_DELAY);
  }

  /**
   * Drops an announcement that has been scheduled but not written yet.
   * Without this, a toolbar dismissed inside the delay still announces itself as available
   */
  #cancelPendingAnnouncement(): void {
    if (this.#announcementTimeout === null) {
      return;
    }

    clearTimeout(this.#announcementTimeout);
    this.#announcementTimeout = null;
  }

  /**
   * Creates a new InlinePopover instance and adds it to the Editor UI
   * @param availableInlineTools - inline tools to render in the toolbar
   * @param textRange - selected text range
   * @param fragments - inline tool fragments for the selected text range
   * @returns false when a later render started while this one was awaiting, so the caller
   * knows this call built nothing and must not act on it
   */
  async #renderPopover(
    availableInlineTools: InlineToolFacade[],
    textRange: TextRange,
    fragments: InlineFragment[]
  ): Promise<boolean> {
    /**
     * Claimed before the first await, so that ordering is decided by when a render *started*
     * rather than by when its tools happened to resolve. Every tool contributes an awaited
     * `getToolbarConfig`, so two selection changes in flight at once can resolve in either
     * order — and without this the slower one wins whether or not it is the older one, putting
     * up a toolbar whose `isActive`/`onActivate` closures captured a `textRange` the user has
     * already moved off
     */
    this.#renderGeneration += 1;

    const generation = this.#renderGeneration;

    const popoverItems = Array.from(availableInlineTools).map(async (tool, i) => {
      const toolFragments = fragments.filter((fragment: InlineFragment) => fragment.tool === tool.name);
      const shortcut = tool.options.shortcut;
      const instance = tool.create();
      const toolbarConfig = await instance.getToolbarConfig(textRange, toolFragments);

      const shortcutBeautified = shortcut !== undefined ? beautifyShortcut(shortcut) : undefined;
      const toolTitle = capitalize(tool.options[InlineToolOptionKey.Title] ?? tool.name);

      const popoverItemParams: PopoverItemDefaultBaseParams = {
        name: tool.name,
        onActivate: () => this.#onToolClick(tool),
        isActive: () => instance.isActive(
          textRange,
          toolFragments
        ),
        hint: {
          title: toolTitle,
          description: shortcutBeautified,
        },
      };

      return [toolbarConfig]
        .flat()
        .map((item): PopoverItemParams[] => {
          switch (item.type) {
            case PopoverItemType.Html:
              return [{
                ...popoverItemParams,
                ...item,
              }];
            case PopoverItemType.Separator:
              return [{
                type: PopoverItemType.Separator,
              }];

            case PopoverItemType.Default:
            default:
              const items: PopoverItemParams[] = [
                {
                  ...popoverItemParams,
                  ...item,
                  type: PopoverItemType.Default,
                },
              ];

              if ('children' in item && i !== 0) {
                items.unshift({
                  type: PopoverItemType.Separator,
                });
              }

              if ('children' in item && i < availableInlineTools.length - 1) {
                items.push({
                  type: PopoverItemType.Separator,
                });
              }

              return items;
          }
        })
        .flat();
    });

    const items = (await Promise.all(popoverItems)).flat();

    /**
     * Anything that started a render of its own while this one was awaiting has taken over:
     * a newer selection change, or a #hide() that dropped the toolbar entirely. Bailing out
     * before the teardown below is what keeps this call from disposing of a popover it did
     * not build, and from replacing it with one built for a selection that is already gone
     */
    if (generation !== this.#renderGeneration) {
      return false;
    }

    /**
     * Torn down here rather than on entry, after the last `await` and immediately before the
     * replacement is built. Two selection changes in a row can both be partway through this
     * method, and tearing down on entry means the second one runs its teardown *before* the
     * first one has built anything — so the first one's popover is then overwritten with no
     * teardown at all, leaking its document-level listeners. Doing it here makes each call
     * dispose of whatever is actually current, whichever order they interleave in.
     *
     * It also means the outgoing toolbar stays up across the rebuild instead of blinking out
     * for the duration of the await
     */
    this.#destroyPopover();

    this.#popover = new PopoverInline({
      items,
      scopeElement: this.#config.holder,
      closeOnOutsideClick: false,

      /**
       * Names the toolbar the popover renders its items into,
       * so it is distinguishable from the block actions toolbar
       */
      messages: {
        label: messages.inlineToolbar,
      },
    });

    /**
     * The inline popover never takes real focus — moving it to a button would drop the text
     * selection the inline tools operate on. Which item is currently highlighted is therefore
     * only conveyable via aria-activedescendant on the element that does hold the focus,
     * that is the block being edited
     */
    this.#popover.on(PopoverEvent.ActiveDescendantChanged, (itemId: string | null) => {
      this.#setActiveDescendant(itemId);
    });

    /**
     * Only the popover is swapped, never the whole holder: a live region has to be present in
     * the accessibility tree *before* its text changes for a screen reader to announce it.
     * Re-inserting the region on every render (as replaceChildren did) resets it each time,
     * and the announcement right after was silently dropped.
     *
     * Exactly one popover is in the holder at any point — the teardown above detached the
     * previous one — so its items cannot surface in the accessibility tree twice
     */
    this.#popoverElement = this.#popover.getElement();

    /** Named so that the focused editable can claim it via aria-owns, see #setActiveDescendant */
    this.#popoverElement.id = this.#popoverElementId;

    this.#nodes.holder.appendChild(this.#popoverElement);

    return true;
  }

  /**
   * Tears the current popover down, if there is one, and forgets it.
   *
   * Forgetting it is the point: `destroy()` detaches the element and drops the popover's
   * document-level listeners, but leaves the instance itself perfectly callable, so a reference
   * kept past this point reads as a live popover and gets torn down a second time on the next
   * rebuild - re-running item cleanup and re-emitting PopoverEvent.Closed to anything listening
   */
  #destroyPopover(): void {
    /** Unconditional, so that no reference to a gone popover can outlive it by any route */
    this.#setActiveDescendant(null);

    if (this.#popover === null) {
      return;
    }

    /** destroy() hides the popover on its way out, so hiding it here first would be a no-op */
    this.#popover.destroy();
    this.#popover = null;
    this.#popoverElement = null;
  }

  /**
   * Shows the Inline Toolbar
   */
  #show(): void {
    const wasVisible = this.#isVisible;

    this.#popover?.show();
    this.#isVisible = true;

    if (!wasVisible) {
      this.#announce(messages.inlineToolbarAvailable);
    }
  }

  /**
   * Hides the Inline Toolbar
   */
  #hide(): void {
    /**
     * Counts as a render for the purpose of the generation check, so that a rebuild still
     * awaiting its tools does not resolve after this and put the toolbar back up for a
     * selection the user has already dropped
     */
    this.#renderGeneration += 1;

    this.#cancelPendingAnnouncement();
    this.#destroyPopover();
    this.#isVisible = false;
  }

  /**
   * Points the element holding the focus at the popover item highlighted by keyboard
   * navigation, or clears the pointer when nothing is highlighted anymore
   * @param itemId - id of the highlighted item's element, null when nothing is highlighted
   */
  #setActiveDescendant(itemId: string | null): void {
    const host = itemId === null ? null : this.#activeDescendantTarget();

    /**
     * Released before the new one is adopted, and unconditionally when there is no new one.
     * Skipping this would leave the attributes on an element that no longer holds focus,
     * still claiming a popover it has nothing to do with - a stale reference that outlives
     * every route the popover teardown covers
     */
    if (this.#activeDescendantHost !== null && this.#activeDescendantHost !== host) {
      this.#activeDescendantHost.removeAttribute('aria-activedescendant');
      this.#activeDescendantHost.removeAttribute('aria-owns');
    }

    this.#activeDescendantHost = host;

    if (host === null || itemId === null) {
      return;
    }

    /**
     * aria-activedescendant is only resolved when the element it names is a descendant of the
     * element holding focus, or is claimed by it via aria-owns. The toolbar is rendered as a
     * sibling of the blocks holder (EditorjsUI appends both to the editor wrapper), and the
     * holder is what keeps focus, so on DOM structure alone the reference points outside the
     * focused subtree and assistive tech drops it. aria-owns re-parents the popover onto the
     * holder in the accessibility tree only, leaving the DOM — and hence the text selection
     * the inline tools operate on — untouched.
     *
     * Set together with the reference and removed together with it, so the two can never
     * disagree about which element owns the popover
     */
    host.setAttribute('aria-owns', this.#popoverElementId);
    host.setAttribute('aria-activedescendant', itemId);
  }

  /**
   * The element the highlighted item can be announced through, or null when there isn't one.
   *
   * Normally the block being edited: focus stays in the text while the popover is navigated,
   * so that is what holds it. Three cases have no usable target, and all have to yield null
   * rather than fall back to whatever was last used - writing to a stale host points a
   * previously focused element at a popover that is no longer anything to do with it:
   *
   * - Focus somewhere that isn't an element at all. Defensive; `document.activeElement` is
   *   null between documents and need not be an `HTMLElement` in general.
   * - Focus *inside the toolbar itself*, which happens once a user Tabs into it. There is
   *   nothing to announce indirectly then - the focused button is the active item, and
   *   aria-activedescendant is only consulted on the focused element anyway. Claiming the
   *   popover from a control inside it would also make the element own its own ancestor.
   * - Focus *outside this editor*. Reachable today on a page with two editors: on chromium the
   *   inline toolbar is not scoped per instance, so selecting text in the second editor raises
   *   the first one's, which would then claim its own popover from the second editor's holder -
   *   telling assistive technology that controls operating on one document belong to another.
   *   Bounding the host to this editor doesn't fix that scoping bug, but it turns a confidently
   *   wrong claim into no claim, which is the safer of the two for a screen reader user
   * @returns the element to carry the reference, or null when none qualifies
   */
  #activeDescendantTarget(): HTMLElement | null {
    const focused = document.activeElement;

    if (!(focused instanceof HTMLElement) || this.#nodes.holder.contains(focused)) {
      return null;
    }

    /** The editor this toolbar belongs to, which is also the popover's scope element */
    if (!this.#config.holder.contains(focused)) {
      return null;
    }

    return focused;
  }

  /**
   * Moves the Inline Toolbar to the current selection
   * @todo Think on how it should work for cross-block selection
   */
  #move(): void {
    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    const rect = range.getBoundingClientRect();

    // Use offsetParent (the positioned ancestor) instead of holder to ensure accurate positioning
    // when the toolbar is appended to a different container
    const offsetParent = this.#nodes.holder.offsetParent as HTMLElement;
    const offsetParentRect = offsetParent?.getBoundingClientRect() ?? { x: 0,
      y: 0,
      top: 0 };

    const newPosition = {
      x: rect.x - offsetParentRect.x,
      y: rect.y + rect.height - offsetParentRect.top,
    } as const;

    /**
     * @todo add right overflow handling
     */

    this.#nodes.holder.style.top = `${newPosition.y}px`;
    this.#nodes.holder.style.left = `${newPosition.x}px`;
  }

  /**
   * Applies the inline tool to the current selection
   * @param tool - tool to apply
   */
  #onToolClick(tool: InlineToolFacade): void {
    this.#api.selection.applyInlineTool({ tool: tool.name });
  }
}

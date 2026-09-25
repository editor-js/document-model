## Context

The UI is a set of plugins (`EditorjsUI` shell, `BlocksUI`, `ToolbarUI`, `ToolboxUI`, `InlineToolbarUI`) that wire themselves together through `ui:*` events. None of them has a static `name` or a `publicApi`, so no other plugin can extend them, and `ToolbarUI` has only a plus button.

PR #157 adds a settings button and a `BlockTunesUI` popover fed by a core `BlockTunesManager` and tune facades. The review argues the menu should be a UI plugin API instead, so any plugin can act as a "tune". This change delivers exactly that one surface — a plugin can put an item in the block settings menu. Changing how a block looks is the other half of v2 tune behavior and is deferred to its own change.

**Baseline assumption.** This change is implemented on top of `test/editorjs-e2e-and-aria-openspec`, which lands before this PR opens. That branch brings three things this change depends on: `packages/ui/src/messages.ts` (the naming seam for accessible names), the ARIA/keyboard behavior of `ToolbarUI` (toolbar role, roving tabindex over the action buttons, `aria-haspopup`/`aria-expanded`, focus-before-open), and the Playwright harness under `packages/editorjs/e2e/` with its `include-e2e` CI input. It also moves `@editorjs/ui-kit` to `^2.0.0`, which is what gives popovers menu roles, accessible names and internal focus management. If that branch has not landed when implementation starts, stop and re-plan rather than building a toolbar control that violates its invariants.

Constraints:
- `@editorjs/ui-kit` popover items already support `confirmation`, `isDisabled`, `isActive` and `closeOnActivate` in the pinned 1.1.5, so no upstream change is needed for behavior. Accessibility of the menu comes from ui-kit 2.x via the baseline branch.
- `ToolbarUI` knows the hovered block's index (from `ui:blocks:block-selected`), and `api.blocks.getIdByIndex` turns that into a block id, so no new core event or payload field is needed.

## Goals / Non-Goals

**Goals:**
- A block settings menu that any plugin can add items to through `api.plugins['block-settings']`.
- Built-in Move up / Move down / Delete (with confirmation) as an ordinary plugin.

**Non-Goals:**
- Changing how a block *looks* from a plugin, in any form: no element accessors on `BlocksUI`, no `blockId` on `BlockAddedCoreEvent`, no decoration mechanism. Deferred to its own change; see "Deferred: per-block appearance and attachments".
- Per-block data storage: that is `plugin-block-data`. This change doesn't depend on it.
- Removing the SDK tune kind: that is `remove-block-tunes`.
- Settings items contributed by Block Tools (v2 `renderSettings`). Decided as a follow-up change, not an open question: see D4.
- Keyboard shortcuts for settings items.

## Decisions

### D1. Block settings is its own UI plugin with a provider registry
The new `BlockSettingsUI` (`static name = 'block-settings'`) has this `publicApi`:
```ts
interface BlockSettingsAPI {
  register(provider: BlockSettingsProvider, options?: { order?: number }): () => void; // returns unregister
  close(): void;
}
type BlockSettingsProvider = (ctx: { blockId: BlockId; blockIndex: number; tool: string })
  => MenuConfig | Promise<MenuConfig> | undefined;
```
- On open, every provider is called for the target block. Results are concatenated in ascending `order` (ties are broken by registration order, default `0`) with a separator between providers, then rendered in a ui-kit popover.
- Activation, confirmation, disabled and active state are all expressed in the returned `MenuConfig`. This answers the question on PR #157: the item declares `onActivate` in its config, the same as `InlineTool#getToolbarConfig`, rather than the core calling an instance method.
- Returning `undefined` or an empty array contributes nothing. This is how a plugin opts out for specific tools, replacing `BlockTool#tunes`.
- Providers are called on every open, so items reflect current state without cache invalidation.
- *Why a separate plugin rather than a `ToolbarUI` API:* the popover has its own lifecycle and events (open, opened, closed), mirroring `ToolboxUI`. `ToolbarUI` owns only the button and positioning.
- *Alternative:* plugins push static item lists at registration. Rejected, because items depend on the block and its state.

Wiring follows the Toolbox pattern:
1. `ToolbarUI`'s settings button dispatches `ui:block-settings:open` with the hovered block index.
2. `BlockSettingsUI` renders the popover and announces it via `ui:block-settings:rendered`, and `ToolbarUI` mounts it in its actions area.
3. `ToolbarUI` doesn't reposition while settings are open.

`BlockSettingsUI` resolves the target block's id with `api.blocks.getIdByIndex(index)` from the index the toolbar reports, so this change needs no new event or payload field from `core`.

The provider context carries both `blockId` and `blockIndex`, but only `blockId` is durable: a menu can stay open while a collaborator inserts or removes blocks above the target, or while an undo does. Item handlers therefore resolve the position from `blockId` at activation time. This is how the tunes in PR #157 behave (`getIndexById` inside `activate()`), and it is worth keeping.

### D2. Built-in actions are a plugin package in `packages/plugins/`
`@editorjs/block-actions-plugin` (`static name = 'block-actions'`) registers one provider with `order: 1000` so it sits last. Each handler starts from `api.blocks.getIndexById(ctx.blockId)` and bails out when the block is gone:
- **Move up:** `isDisabled` when the block is first at build time, then `api.blocks.move({ fromIndex: i, toIndex: i - 1 })` with `i` resolved at activation.
- **Move down:** the same, against the last index.
- **Delete:** a `confirmation` item that calls `api.blocks.delete({ block: ctx.blockId })`.

The disabled state is necessarily a snapshot from when the menu was built; the *action* is not. A stale `isDisabled` at worst greys out an item, while a stale index would move the wrong block.

It depends only on `@editorjs/sdk`, looks up `api.plugins['block-settings']` lazily at `core:ready`, and is a no-op without it. The bundle registers it. Headless `Core` users opt in.

### D3. What to port from PR #157
**Port:**
- The toolbar settings button and styles.
- The `BlockTunes*UIEvent` classes, renamed to `BlockSettings{Open,Opened,Closed,Rendered}UIEvent`.
- The popover wiring in `BlockTunesUI` → `BlockSettingsUI`.
- The behavior and tests of the internal delete, move-up and move-down tunes → `block-actions-plugin`.

Details worth keeping from those files: `PopoverDesktop` configured with `scopeElement: config.holder`, `searchable: false` and `{ [PopoverItemType.Default]: { wrapperTag: 'button' } }`; dispatching the closed event from `PopoverEvent.Closed`; handing the popover element to `ToolbarUI` through a rendered event; and `display: flex; align-items: center` on the toolbar's `__actions` so two buttons sit side by side. PR #157 also fixes a real bug on `main` — `new ToolboxOpenUIEvent('ui:toolbox:open')` passes a string where a payload object belongs ([Toolbar.ts:151](packages/ui/src/Toolbar/Toolbar.ts:151)) — and that fix comes along with the port.

**Don't port:** `BlockTunesManager` (it instantiates every tune on each block hover), rebuilding popover items on hover rather than on open, `BlockTuneAdapter`, `TuneDataChanged`, the `BlockTuneFacade` changes, moving `BlockSelectedUIEvent` into `sdk`, and the core `tunes/internal` directory. The delete tune there also has no confirmation step, which this change requires.

**Attribution:** the ported code is Betty Steger's work from PR #157. Commits that bring it over carry `Co-authored-by: Betty Steger <244475+bettysteger@users.noreply.github.com>`.

### D4. Block Tool settings items are a separate, later change
A block tool contributing its own settings items (v2 `renderSettings`) is deferred, and the shape it will take is fixed now so this change doesn't foreclose it: a tool declares something like `getSettingsConfig(ctx)` returning the same `MenuConfig`, and a thin core-side provider registered by `BlockSettingsUI` collects it from the tool facade for the target block.
- *Why not now:* the UI has no route to tool instances, so it needs either a core component that owns "settings items of the current block's tool" or a `ToolsManager` accessor on the API. That is its own design, and none of it changes the provider contract.
- *Why the provider shape is enough:* tool-contributed items are just another provider, with an `order` between plugin items and `block-actions`. No change to `register` or to `MenuConfig` is needed when it lands.

### D5. The settings button meets the toolbar's existing accessibility contract
The settings button is the second control in an already-accessible toolbar, so it adopts that contract rather than inventing one:
- An accessible name from a new `messages.ts` entry, not a hardcoded string.
- `aria-haspopup="menu"` plus `aria-expanded` kept in sync with `ui:block-settings:opened`/`closed`, mirroring the plus button and the toolbox.
- `focus()` on the button before opening the popover, because WebKit does not focus a clicked button and the popover restores focus to whatever was focused when it opened. Without this, closing with Escape drops focus on `<body>` — a bug already found once for the toolbox.
- Both controls appended **before** the roving-tabindex initialization, which runs once over the children present at that moment. A button appended afterwards keeps its default `tabindex="0"`, giving the toolbar two tab stops and breaking the "exactly one tab stop" requirement.
- The popover itself carries an accessible name, the way the toolbox is named through `messages`, and items removed from it leave the accessibility tree.

### D6. The block settings API types live in `@editorjs/ui`
`BlockSettingsAPI` and `BlockSettingsProvider` are exported from `@editorjs/ui`, which also augments `EditorjsPluginApiMap` under `'block-settings'`. `@editorjs/sdk` stays unaware of individual plugins; it owns only the augmentable map and `MenuConfig`, which the provider signature reuses.
- Consequence: `block-actions-plugin` needs `@editorjs/ui` in its compilation for `api.plugins['block-settings']` to typecheck. It takes `@editorjs/ui` as a **devDependency** and imports from it with `import type` only, so there is no runtime coupling and no cycle.
- This is the pattern `plugin-public-api` already describes ("a consumer whose compilation includes that package's types"), and the architecture rule it must respect forbids depending on `@editorjs/model`/`@editorjs/core`, not on a sibling UI package.
- *Alternative:* move the types into `sdk`. Rejected: `sdk` would then carry knowledge of a specific plugin's API.

### D7. `BlockSettingsUI` declares a new `UiComponentType` member
`EditorjsPluginConstructor` requires a `static type: EntityType`, and `EntityType` is a union of the three enums, so the value has to come from one of them. This change adds `UiComponentType.BlockSettings`. That enum is a list of reserved *UI component* names — not plugin knowledge — and `Toolbar`'s own comment already says the toolbar area "Includes Toolbox and Block Settings". Runtime routing is unaffected: `Core#use` sends anything that is not a tool or adapter through its `default` branch to `PluginType.Plugin`, and `UiComponentType` is read nowhere.
- *Alternative:* reuse `UiComponentType.Toolbar`. Rejected because `Toolbox` has its own member despite also living in the toolbar, so reuse would be inconsistent.

## Risks / Trade-offs

- **[`api.plugins['block-settings']` may be absent in a headless setup]** → consumers must tolerate it. `block-actions-plugin` guards for it, and the spec requires the no-op.
- **[Losing per-tool tune allow-listing from v2 config]** → providers receive `tool` and decide for themselves. Integrator-level include/exclude can follow via `tool-plugin-options`.
- **[`packages/ui` has no test setup today]** → add Jest with jsdom to the package as part of this change. No package in the monorepo uses jsdom yet, so this is new infrastructure: an explicit `jest-environment-jsdom` dependency, a `moduleNameMapper` for `*.pcss`, `transformIgnorePatterns` covering `@codexteam/*`, the `jest.unstable_mockModule` + dynamic-import convention the other packages use, an ESLint override allowing `@jest/globals` in specs, and `dts()` pointed at `tsconfig.build.json` so declarations stop at source.
- **[Adding CI for `packages/ui` in the same PR]** → there is no `ui.yml` workflow today. `base-coverage` runs `test:coverage` against the base ref for any package whose `package.json` exists there, and `packages/ui` has no such script on the base, so the new workflow must handle that first run.
- **[The `ui` delta will be written against a spec the baseline branch rewrites]** → `Floating toolbar` gains ARIA scenarios on that branch. The delta in this change must be refreshed from the merged spec text before archiving, or the fold will silently revert those scenarios.
- **[Name collision]** → the baseline branch labels the toolbar container "Block actions" for screen readers, while this change introduces a package called `block-actions`. Worth renaming one of them, or at least not being surprised that a screen reader announces "Block actions toolbar" for a menu whose items come from several plugins.

## Deferred: per-block appearance and attachments

Letting a plugin change how a block looks is its own change. The investigation so far, so it doesn't have to be redone:

Two concerns that read as one but aren't:
- **Appearance** — classes and `data-` attributes on the block wrapper. `BlocksUI` already gives every block a wrapper that is `position: relative`, with `.block__contents` centered at `max-width`, so both gutters are free. Adding no DOM means no editing hazard and no conflict between plugins: `classList` is additive.
- **Attachments** — real elements a plugin adds per block (a comment icon and count, a collaborator's avatar, an anchor link icon, a footnote body, an AI-suggestion badge, a read-only overlay). Every case found so far wants a *sibling of contents*, in a gutter or stacked after it. None needs to wrap the contents node, because styling needs collapse into a wrapper class plus a descendant CSS rule, and collapsible/multi-column layouts group several blocks, which is a blocks-holder concern either way.

Why wrapping the contents node should not be offered at all: reparenting it while the caret is inside destroys the DOM selection, and the restore path (`CaretAdapter#updateIndex`, `#restoreDomSelectionFromCompositeIndex`) is internal to `dom-adapters`. Two plugins wrapping the same block also strand each other's elements on unwrap. Forbidding it makes the conflict structurally impossible instead of a convention.

Where attachments should live is the open decision, since the blocks holder is `contentEditable: true`:
- **A separate non-editable layer** beside the holder, with one host per block that `BlocksUI` keeps aligned to the block's geometry (ResizeObserver plus add/remove/move). Literally outside the editable region; costs geometry synchronization.
- **An island inside the wrapper**, marked `contenteditable="false"` and `user-select: none`. No positioning work, but it still sits in the editable subtree.

Mitigating facts for either option: `beforeinput` is always `preventDefault`ed and edits are applied through the Model, so the browser never mutates block DOM, and `clipboard-plugin` builds clipboard data from the Model rather than the DOM. So user editing cannot delete or copy plugin DOM. The residual risks are caret traversal over the element and screen readers reading it in the text flow, which argues for `aria-hidden` by default.

## Migration Plan

This change is additive. It can land before or after `plugin-block-data`, and should land before `remove-block-tunes`. Rollback is reverting the PR.

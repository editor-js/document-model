## Why

A v2 Block Tune did two things in the UI: it added an entry to the block's settings menu, and optionally it changed how the block looks. In v3 neither needs a dedicated entity. Plugins can already expose and consume public APIs (`api.plugins`, see `plugin-public-api`), so a UI plugin can expose the settings menu as an API and any plugin (a "tune") can add items to it. "Tune" then becomes a UI term only.

This change covers the settings menu only. Changing a block's appearance from a plugin — classes on the block wrapper, and per-block DOM kept out of the editable region — is a separate change, because the two are different concerns with different hazards (see the deferred section in `design.md`).

This is the second of three changes that replace the Block Tune entity with plugins (see the review on [PR #157](https://github.com/editor-js/document-model/pull/157)):
1. `plugin-block-data`: the data layer.
2. **`block-settings-ui`** (this change): the UI surfaces.
3. `remove-block-tunes`: deleting the old entity.

This change doesn't depend on `plugin-block-data`: the built-in block actions need no per-block data. Plugins that do store data combine the two.

It **does** assume `test/editorjs-e2e-and-aria-openspec` has merged, since it builds on that branch's `messages.ts`, toolbar ARIA/keyboard behavior, Playwright harness and `@editorjs/ui-kit` 2.x.

## What Changes

- **Block settings plugin.** The new `BlockSettingsUI` (`name: 'block-settings'`) renders a per-block settings popover. Its `publicApi` lets any plugin register a settings provider: a function called with the target block's context each time the menu opens, returning a `MenuConfig` with `onActivate`/`confirmation` declared inside it (the same model as `InlineTool#getToolbarConfig`).
- **Toolbar settings button.** `ToolbarUI` renders a settings button next to the plus button, opens block settings for the hovered block, mounts the popover, and doesn't reposition while settings are open.
- **Built-in block actions as a plugin.** The new package `@editorjs/block-actions-plugin` (`name: 'block-actions'`) provides Move up, Move down, and Delete with a confirmation state (as in v2) through the block-settings API and `BlocksAPI.move`/`delete`.
- **Bundle.** `@editorjs/editorjs` registers `BlockSettingsUI` and `BlockActionsPlugin` by default.
- **Types.** `@editorjs/ui` exports the settings API types and augments `EditorjsPluginApiMap`; `sdk` gains only a `UiComponentType.BlockSettings` member for the new plugin's static `type`.
- **Accessibility.** The settings button takes an accessible name from `messages.ts`, reports `aria-haspopup`/`aria-expanded`, is focused before the popover opens, and participates in the toolbar's roving tabindex; the popover itself is named.
- **Test infrastructure.** `packages/ui` gets a Jest (jsdom) setup and a CI workflow, since it has neither today.

## Capabilities

### New Capabilities

- `block-settings`: the per-block settings popover and the plugin-facing registration API for its items.
  - *Intended Purpose (paste into the folded spec, since archive writes a `TBD` placeholder):* "The block settings menu (the \"tunes\" menu in v2) is a UI surface that any plugin can add items to; it is not tied to a special entity type. This capability owns the `BlockSettingsUI` plugin, the toolbar button that opens it for the hovered block, and the `publicApi` through which plugins register settings providers that return `MenuConfig` items for a given block. The toolbar and block rendering it builds on live in [[ui]], the `MenuConfig` contract in [[sdk]], and cross-plugin access in [[plugin-public-api]]."
- `block-actions-plugin`: the built-in Move up / Move down / Delete settings, implemented as a plugin.
  - *Intended Purpose:* "`@editorjs/block-actions-plugin` supplies the default block settings entries — moving a block up or down and deleting it after confirmation — by registering a provider with [[block-settings]] and calling `BlocksAPI.move`/`delete` from [[core]]. It is the reference example of a \"tune\" built as a plain plugin, and is registered by the [[editorjs-bundle]]."

### Modified Capabilities

- `ui`: `ToolbarUI` renders an accessible settings button, keeps it in the toolbar's roving tabindex, and mounts the block settings popover.
- `editorjs-bundle`: the default composition includes `BlockSettingsUI` and `BlockActionsPlugin`.

## Impact

- **Packages:** `ui`, `editorjs`, the new `packages/plugins/block-actions-plugin`, and one enum member in `sdk`. `core` is untouched: the target block's id comes from `api.blocks.getIdByIndex`.
- **CI:** new workflows for `packages/ui` and the new plugin package; `include-e2e` enabled for the bundle.
- **Not breaking:** everything here is new API surface.
- **From PR #157:** its toolbar settings button, styles, popover wiring and `BlockTunes*UIEvent` classes are ported (renamed to `BlockSettings*`), along with the behavior and tests of its internal delete/move-up/move-down tunes. Its `BlockTunesManager` and `BlockTuneAdapter` are not ported.
- **Docs to update:** `docs/plugins.md` (the block settings API and block-actions as the reference "tune"), and `docs/events.md` (the `ui:block-settings:*` events).

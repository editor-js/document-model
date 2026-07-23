## Why

Plugins registered through `core.use()` are currently write-only participants: they subscribe to the `EventBus` and act on the editor, but nothing they build can be called back — not by the integrator who created the editor, and not by another plugin. At the same time the only way a tool can feed data to a plugin is the untyped `[key: string]: unknown` escape hatch on tool options (`ShortcutsPlugin` reads `tool.options['shortcut']` with no contract, no validation, and no ownership). Both gaps block the plugin ecosystem we want: a plugin cannot ship a callable surface, and a tool cannot declare "here is my configuration for that plugin" in a way either side can type-check.

## What Changes

- **New `api.plugins` namespace on `EditorAPI`.** A plugin may expose a public API object; it becomes reachable as `api.plugins.<name>` for consumers (via the editor instance) and for other plugins (via the `api` they already receive).
- **Plugin identity becomes explicit.** `EditorjsPluginConstructor` gains a static `name` string. It keys the registry at runtime and the type maps at compile time.
- **Type safety via declaration merging.** `@editorjs/sdk` declares two empty, augmentable interfaces — `EditorjsPluginApiMap` and `ToolPluginOptionsMap`. A plugin package augments them under its own `name`; every consumer that imports the plugin's types gets full inference with no casts and no imports at the call site.
- **New namespaced `plugins` key in tool options.** Tools declare plugin-directed configuration as `static options = { plugins: { shortcuts: { ... } } }`, typed as `Partial<ToolPluginOptionsMap>` and merged with `use(Tool, options)` overrides under the same precedence rules as the rest of `options`.
- **Tool facades expose the slice.** `BaseToolFacade` gains an accessor returning a single plugin's merged options slice, so a plugin reads only what is addressed to it.
- **`ShortcutsPlugin` migrates onto both mechanisms** as the proving case: it declares `name = 'shortcuts'`, reads `plugins.shortcuts` instead of the flat `options['shortcut']`, and exposes a public API for registering/unregistering shortcuts at runtime. Built-in tools (`bold`, `italic`, `inline-link`) move their `shortcut` declarations into the namespaced key.
- **`BlocksUI` delegates native `keydown` as a `KeydownUIEvent`.** The event type existed in the SDK and `ShortcutsPlugin` listened for it, but nothing ever dispatched it — so no keyboard shortcut has ever reached a plugin in the running app. `BlocksUI` now dispatches it before its own key handling and skips that handling when a plugin claimed the key via `preventDefault()`.
- **BREAKING**: the flat `options.shortcut` key is no longer read by `ShortcutsPlugin`. Tools declaring shortcuts must move them under `options.plugins.shortcuts`.
- **BREAKING**: `EditorjsPluginConstructor` requires a static `name`. Existing plugin classes must add one.

## Capabilities

### New Capabilities
- `plugin-public-api`: how a plugin declares a public API, how the registry keys it by `name`, how `api.plugins` exposes it to integrators and to other plugins, and how the `EditorjsPluginApiMap` augmentation makes access type-safe.
- `tool-plugin-options`: how a tool declares plugin-directed configuration under `options.plugins.<name>`, how it merges with `use()` overrides, how the `ToolPluginOptionsMap` augmentation types it, and how a plugin reads its own slice from a tool facade.

### Modified Capabilities
- `sdk`: the plugin contract requirement changes — `EditorjsPluginConstructor` gains the static `name`, `EditorjsPlugin` gains the optional public-API declaration, `EditorAPI` gains the `plugins` namespace, and `BaseToolOptions` gains the `plugins` key.
- `ui`: the blocks-holder requirement changes — `BlocksUI` delegates `keydown` as a `KeydownUIEvent` and yields to plugins that claim a key before applying its own undo/redo handling.
- `core`: the keyboard-shortcuts requirement changes — `ShortcutsPlugin` sources shortcuts from `options.plugins.shortcuts` rather than `options.shortcut`, and exposes a runtime registration API. `Core` additionally builds and owns the plugin registry that backs `api.plugins`.

## Impact

- **Code**: `packages/sdk/src/entities/EditorjsPlugin.ts`, `BaseTool.ts`, `packages/sdk/src/api/EditorAPI.ts` (new `PluginsAPI.ts`), `packages/sdk/src/tools/facades/BaseToolFacade.ts`; `packages/core/src/index.ts` (plugin instantiation + registry), `packages/core/src/api/` (new `PluginsAPI`), `packages/core/src/plugins/ShortcutsPlugin.ts`; `packages/tools/{bold,italic,inline-link}`; `packages/plugins/clipboard-plugin` and `packages/dom-adapters` gain a `name`; `packages/ui/src/Blocks/Blocks.ts` gains the `KeydownUIEvent` dispatch.
- **APIs**: additive for `EditorAPI`; breaking for plugin constructors (static `name`) and for tools declaring a flat `shortcut`.
- **Ordering**: plugin instantiation currently happens before tools are prepared, and plugins receive the `EditorAPI` in their constructor — the registry must therefore be populated lazily enough that a plugin constructed first can still reach a plugin constructed later. Addressed in design.md.
- **Docs**: `docs/plugins.md` (Registration, EditorAPI, Lifecycle sections) is superseded in part and must be updated; `docs/diagrams/plugin-lifecycle-flow.mmd` gains the registry step.
- **Dependencies**: none added.

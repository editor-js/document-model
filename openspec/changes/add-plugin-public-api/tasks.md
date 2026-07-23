## 1. SDK contracts

- [x] 1.1 Add `EditorjsPluginApiMap` and `ToolPluginOptionsMap` empty augmentable interfaces plus the `PluginId`, `PluginsAPI` and `ToolPluginOptions` helper types in `packages/sdk/src/entities/EditorjsPlugin.ts` (or a new `PluginRegistry.ts`), and export them from `entities/index.ts`
- [x] 1.2 Add a type-level test file asserting that an augmented map yields inference (`api.plugins.x` typed, unknown key errors, `Partial` makes entries optional) — use `@ts-expect-error` for the negative cases
- [x] 1.3 Extend `EditorjsPlugin` with the optional `publicApi` member keyed off `Id`, and `EditorjsPluginConstructor` with the static `name: Id`, per design decision 3
- [x] 1.4 Add type-level tests for the `Function.name` shadow: a plugin declaring `static readonly name = 'x'` infers the literal, while one omitting the declaration widens `Id` to `string` and makes a declared `publicApi` a compile error
- [x] 1.5 Add `PluginsAPI` to `packages/sdk/src/api/` and the `plugins` member to the `EditorAPI` interface; export from `api/index.ts`
- [x] 1.6 Add the optional `plugins?: ToolPluginOptions` key to `BaseToolOptions` in `packages/sdk/src/entities/BaseTool.ts`
- [x] 1.7 Write failing specs in `packages/sdk/src/tools/facades/BaseToolFacade.spec.ts` for per-id merging (use() wins for a shared id, disjoint ids preserved, slice replaced not deep-merged, `undefined` when absent)
- [x] 1.8 Implement `BaseToolFacade.pluginOptions(id)` and update the `options` getter to merge `plugins` per id so both agree
- [x] 1.9 Give `EditorJSAdapterPlugin`'s constructor contract a `name` as well, so adapters satisfy the same interface

## 2. Core plugin registry

- [x] 2.1 Write failing specs for `PluginRegistry`: registers a public API under its id, returns `undefined` for unknown ids, throws on duplicate id, `unregister` removes the entry, and the exposed record is the same object across reads
- [x] 2.2 Implement `packages/core/src/components/PluginRegistry.ts` holding the shared mutable record, per design decision 4
- [x] 2.3 Bind `PluginRegistry` in the IoC container and add a `plugins` getter to `packages/core/src/api/index.ts` (`EditorAPI`) delegating to it
- [x] 2.4 Write a failing integration spec: two plugins registered in either order, the first can read the second's public API after `core:ready`, and reading during construction yields `undefined`
- [x] 2.5 Instantiate the registry before plugin initialization in `Core`, and register each plugin's `publicApi` in `#initializePlugin()` right after construction
- [x] 2.6 Narrow the `use()` plugin overload to `EditorjsPluginConstructor<Id>` so a `name` that drifts from the augmented map key fails to compile
- [x] 2.7 Add `static readonly name` to `ClipboardPlugin`, `DOMAdapters`, `CollaborationManager` and any other in-repo plugin, and fix resulting type errors

## 3. ShortcutsPlugin migration

- [x] 3.1 Write failing specs for the shortcuts public API: `register` makes a keypress invoke the handler, `unregister` stops it, and re-registering the same shortcut replaces the previous handler
- [x] 3.2 Write a failing spec asserting a tool declaring `options.plugins.shortcuts.shortcut` triggers its inline tool on keypress, and that a tool declaring only the legacy flat `options.shortcut` does not
- [x] 3.3 Define `ShortcutsToolOptions` / `ShortcutsPluginApi` and augment both SDK maps under the `shortcuts` id from `packages/core/src/plugins/ShortcutsPlugin.ts`
- [x] 3.4 Add `name`, expose `publicApi`, and route tool-declared shortcuts through the same internal table as API-registered ones
- [x] 3.5 Replace the `tool.options['shortcut']` read with `facade.pluginOptions('shortcuts')` and drop the untyped access
- [x] 3.6 Clear registry state and unregister the plugin in `destroy()`

## 4. Built-in tools

- [x] 4.1 Move `shortcut` under `plugins: { shortcuts: { shortcut: … } }` in `packages/tools/bold`, `packages/tools/italic`, and `packages/tools/inline-link`
- [x] 4.2 Update each tool's specs to the new option shape
- [x] 4.3 Verify shortcuts still work end to end in `packages/playground` — required adding the missing keydown producer first (group 6)

## 6. Keydown producer

- [x] 6.1 Dispatch `KeydownUIEvent` from the `BlocksUI` keydown listener in `packages/ui/src/Blocks/Blocks.ts` — the event had no producer, so no shortcut ever reached `ShortcutsPlugin`
- [x] 6.2 Skip `BlocksUI`'s own undo/redo handling when a plugin claimed the key via `preventDefault()`
- [x] 6.3 Verify in the playground that CMD+B and CMD+I apply formatting through the new tool-options path, and confirm against a stashed baseline that undo behaviour is unchanged

## 7. TypeScript caveats documentation

- [x] 7.1 Prototype a `use()`-site guard rejecting unknown plugin ids; verified it catches a real tool's bogus key but false-positives on valid config when the calling package lacks the augmentation — reverted, rationale recorded in `docs/plugins.md`
- [x] 7.2 Document the augmentation-visibility rules for `api.plugins`: the three type-only import forms, the package-entry-point requirement, and the global-map vs per-instance-registry caveat
- [x] 7.3 Document why a tool's `static options.plugins` is unchecked, where the check does fire (`use()` second argument), and the opt-in `satisfies` + type-dependency recipe
- [x] 7.4 Correct the `tool-plugin-options` spec scenarios to state where the compile-time check actually fires

## 5. Docs and validation

- [x] 5.1 Update `docs/plugins.md`: `name`, `api.plugins`, the `plugins` options key, the "after `core:ready`" cross-plugin contract, and the global-type-map caveat
- [x] 5.2 Update `docs/diagrams/plugin-lifecycle-flow.mmd` with the registry population step
- [x] 5.3 Add a migration note for the two breaking changes (flat `shortcut` key, required `name`)
- [x] 5.4 Run `yarn lint` and `yarn test` across affected workspaces and fix fallout

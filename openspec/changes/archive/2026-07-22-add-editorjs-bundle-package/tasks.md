## 1. PR 1 — Alias the v2 dependency

- [x] 1.1 In `core`, `sdk`, `ui`, `tools/paragraph` `package.json`, replace `"@editorjs/editorjs": "^2.30.x"` with `"editorjs-v2": "npm:@editorjs/editorjs@^2.30.x"` (keep sdk's `^2.30.8`, others `^2.30.5`)
- [x] 1.2 Find-replace all `from '@editorjs/editorjs'` import specifiers to `from 'editorjs-v2'` in `core/src`, `sdk/src`, `ui/src`, `tools/paragraph/src`
- [x] 1.3 Run `yarn install`, then build + typecheck the four packages; confirm zero remaining `@editorjs/editorjs` import specifiers in their `src`

## 2. Make Core headless

- [x] 2.1 Remove the eight default `use()` calls and their imports from `Core`'s constructor in `packages/core/src/index.ts`
- [x] 2.2 Remove `@editorjs/bold`, `@editorjs/italic`, `@editorjs/inline-link`, `@editorjs/paragraph`, `@editorjs/clipboard-plugin`, `@editorjs/collaboration-manager`, `@editorjs/dom-adapters` from `core/package.json` dependencies
- [x] 2.3 Keep `packages/core/src/plugins/ShortcutsPlugin.ts` in core (no longer auto-registered; relocation handled by a separate change)
- [x] 2.4 In `initialize()`, add a synchronous precondition check that throws a clear error when no `PluginType.Adapter` is bound, before any module is resolved
- [x] 2.5 In `initialize()`, add a synchronous precondition check that throws a clear error naming the missing tool when no registered block tool matches `config.defaultBlock`
- [x] 2.6 Change the boot `catch` in `initialize()` to re-throw instead of `console.error`
- [x] 2.7 Update/adjust core tests affected by headless behavior (e.g. tests that assumed default tools or an auto-bound adapter); confirm `yarn test` passes in core (161/161 pass, no changes needed)

## 3. Create the `@editorjs/editorjs` bundle package

- [x] 3.1 Scaffold `packages/editorjs` with `package.json` (name `@editorjs/editorjs`, `type: module`, `main`/`types` mirroring core), `tsconfig` files, and lint config matching sibling packages
- [x] 3.2 Add dependencies: `@editorjs/core`, `@editorjs/dom-adapters`, `@editorjs/collaboration-manager`, `@editorjs/paragraph`, `@editorjs/bold`, `@editorjs/italic`, `@editorjs/inline-link`, `@editorjs/clipboard-plugin`, `@editorjs/ui`
- [x] 3.3 (Dropped) `ShortcutsPlugin` stays in core; not added to the bundle — deferred to a separate change
- [x] 3.4 Implement default export `class EditorJS`: news up `Core`, `use()`s infra (DOMAdapters, CollaborationManager), default tools (paragraph, bold, italic, link), default plugins (clipboard), and UI (EditorjsUI, BlocksUI, InlineToolbarUI, ToolbarUI, ToolboxUI)
- [x] 3.5 Implement override-by-name merge: build a name→constructor map seeded with the default tools, apply `config.tools` on top (user wins), and register the merged set
- [x] 3.6 Auto-initialize in the constructor: call `core.initialize()` and expose the resulting promise as `get isReady()`
- [x] 3.7 (Per open question) decide and, if chosen, re-export `Core` and default tool constructors from the package entry — re-exported `Core` + default tool constructors

## 4. Switch playground + verify

- [x] 4.1 Update `packages/playground/src/App.vue` to construct `new EditorJS(config)` from `@editorjs/editorjs` instead of wiring `Core` + UI by hand
- [x] 4.2 Update `playground/package.json`: add `@editorjs/editorjs`; prune deps that are now transitive via the bundle
- [x] 4.3 Run the full workspace build + typecheck + lint
- [x] 4.4 Run the playground and verify end-to-end: editor renders (3 paragraphs), typing updates the model, inline toolbar renders. (Pre-existing, unrelated `collaboration-manager` "Unknown event type DataNodeAddedEvent" console noise remains — out of scope. Keyboard-shortcut wiring into the bundle is deferred to the separate ShortcutsPlugin change.)
- [x] 4.5 Add a bundle test asserting a `config.tools` entry named `paragraph` overrides (does not duplicate) the default, and that `isReady` rejects on init failure

## 5. Finalize

- [x] 5.1 Run `openspec validate add-editorjs-bundle-package` and fix any issues
- [x] 5.2 Update memory pointer / plan note to reflect implementation status

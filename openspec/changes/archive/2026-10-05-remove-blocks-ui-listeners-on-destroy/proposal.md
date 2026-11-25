## Why

`BlocksUI` attaches `beforeinput`, `keydown` and `copy` listeners to the blocks holder but `destroy()` never removes them and never detaches the holder (issue #170). If a holder is reused or a second editor instance is created, the old listeners keep dispatching `BeforeInputUIEvent`/`KeydownUIEvent`/`CopyUIEvent` and keep handling undo/redo alongside the new ones. `EditorjsUI.destroy()` is also a no-op, so the editor wrapper stays on the page.

## What Changes

- `BlocksUI` registers its blocks holder listeners against a single `AbortController` and aborts it in `destroy()`, then detaches the blocks holder.
- `EditorjsUI.destroy()` removes the editor wrapper.
- `@editorjs/ui` gets a Jest setup (same layout as the plugin packages) with a `Blocks.spec.ts` covering the destroy behavior.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `ui`: the "Blocks holder rendering and input capture" requirement gains a scenario for tearing the blocks holder down on `destroy()`.

## Impact

- `packages/ui/src/Blocks/Blocks.ts`, `packages/ui/src/index.ts`
- `packages/ui/package.json`, `packages/ui/jest.config.ts`, `packages/ui/vite.config.ts` (declarations are built from `tsconfig.build.json` so spec files are not emitted to `dist`)
- `docs/plugins.md` already notes that plugin instances may implement `destroy()`; nothing there is superseded.

## Review follow-up: remaining UI listeners

The follow-up extends the same teardown concern across `BlocksUI`, `EditorjsUI`, `ToolbarUI`, `ToolboxUI`, and `InlineToolbarUI`. Each instance owns an abort signal for its subscriptions and native handlers. Toolbox and inline-toolbar teardown dispose their popovers, and asynchronous inline-tool configuration is checked again after awaiting it so a destroyed toolbar cannot recreate UI.

`src/lifecycle.spec.ts` verifies active behavior, repeated destruction, replacement instances, unrelated bus consumers, and pending inline configuration with real DOM/EventBus implementations. UI-kit popovers are substituted at the ownership boundary; this does not claim their internal window/document listeners are fixed. No direct `window.addEventListener` registration exists in the current UI package. `docs/plugins.md` continues to describe individual plugin destruction; no global Core teardown API is introduced.

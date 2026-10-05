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

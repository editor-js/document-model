## Why

There is no way to tear an editor down. Neither `Core` nor `EditorJS` has a `destroy()`, so an integrator who unmounts an editor (SPA route change, React/Vue component unmount, several editors on one page) leaks the editor DOM, a document-wide `selectionchange` listener, the collaboration WebSocket, timers, and every tool and plugin instance. Several plugins already implement `destroy()` and the `core` and `sdk` specs already describe it being called on teardown ("Registry is cleared on teardown", "Destroying a plugin"), but nothing calls it. This change makes those requirements true.

## What Changes

- Add `destroy(): void` to `Core`. It is synchronous, safe to call more than once, and safe to call while `initialize()` is still pending, in which case the pending `initialize()` rejects with an `AbortError`. After it returns, `use()` and `initialize()` throw.
- `Core` keeps the plugin instances it creates. `destroy()` calls `destroy()` on each of them in reverse construction order and removes each one's entry from the plugin registry. A plugin whose `destroy()` throws is logged and doesn't stop the rest of the teardown.
- `Core` tears down its own services: `UndoRedoManager` (already has `destroy()`), `BlockRenderer` and `SelectionManager` (new), each removing its model and EventBus listeners.
- `BlockRenderer` keeps the block tool instance for each rendered block. When a block is removed, and when the editor is destroyed, it calls the tool's `destroy()` and destroys the block's adapter. Teardown does not touch the model, so no removal operations reach undo history or collaboration.
- Add an optional `destroy()` to the `InlineTool` contract in `@editorjs/sdk`. `BlockTool` already inherits an optional `destroy()` from the v2 type; the SDK spec now names both. The editor calls `destroy()` once on each tool instance it creates, when it stops using that instance.
- Add `destroy()` to the adapter plugin. `DOMAdapters.destroy()` destroys the remaining block adapters, stops `CaretAdapter` watching selection changes and caret updates, and stops `FormattingAdapter` listening to tool and model events (destroying its inline tool instances). The shared `selectionchange` watcher removes its `document` listener once its last subscriber is gone.
- UI plugins other than `BlocksUI` remove their EventBus listeners in `destroy()`, and `EditorjsUI.destroy()` removes the editor wrapper from the holder. The holder element itself belongs to the integrator and stays in place. `BlocksUI` teardown is covered by #174 (fixes #170), so this change has no `BlocksUI` implementation.
- Listeners are released through `AbortController` across the repo. Each component owns one controller, passes its `signal` to every listener it registers, and calls `abort()` on teardown. When an SDK base class registers listeners (`BlockToolAdapter`), the base class owns the controller, gives subclasses a protected `signal`, and aborts it in its own `destroy()`. Subclasses don't override `destroy()` to remove listeners.
- The `EditorAPI` subscription methods keep their signatures. Internally `onUpdate` and `onCaretUpdate` subscribe through their own controller and return `() => controller.abort()`. Components tie that function to their own controller's `abort` event.
- Add `destroy()` to the `EditorJS` bundle, which delegates to `Core.destroy()`. Because `CollaborationManager.destroy()` already closes the `OTClient` socket, the bundle closes its collaboration connection too.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture`: adds the repo-wide rule that listeners are released through `AbortController`, owned by the SDK base class where one exists.
- `core`: adds an editor teardown requirement to `Core` (idempotency, ordering, mid-initialization destroy, post-destroy guards) and adds per-block tool destruction to the block rendering lifecycle.
- `sdk`: `BlockToolAdapter` owns its controller and exposes `signal` to subclasses, the tool contracts gain an optional `destroy()` on block and inline tools, and the adapter plugin contract gains a teardown that covers adapters not destroyed yet.
- `dom-adapters`: `DOMAdapters` releases the caret, selection, and formatting subscriptions and the block adapters on destroy, and the shared selection watcher detaches from `document` when it has no subscribers left.
- `ui`: shell assembly gains teardown: the wrapper is removed and UI plugins unsubscribe from the EventBus.
- `editorjs-bundle`: `EditorJS` exposes `destroy()`.

## Impact

- **Code**: `packages/core/src/index.ts`, `packages/core/src/components/{BlockRenderer,SelectionManager}.ts`, `packages/sdk/src/entities/{InlineTool,EditorjsAdapterPlugin,BlockToolAdapter}.ts`, `packages/core/src/api/{DocumentAPI/DocumentAPI,SelectionAPI}.ts`, `packages/core/src/components/UndoRedoManager.ts`, `packages/model/src/EditorJSModel.ts` (`addEventListener` overloads gain `options`), `packages/plugins/{clipboard-plugin,shortcuts-plugin}`, `packages/collaboration-manager/src/CollaborationManager.ts`, `packages/dom-adapters/src/{index.ts,CaretAdapter,FormattingAdapter,utils/useSelectionChange.ts}`, `packages/ui/src/**` (each plugin's `destroy()`), `packages/editorjs/src/index.ts`.
- **Public API**: adds `Core#destroy()`, `EditorJS#destroy()`, optional `InlineTool#destroy()`, and `EditorJSAdapterPlugin#destroy()`. Nothing breaks: the tool hooks are optional, and `DOMAdapters` is the only adapter implementation in the repo.
- **Docs**: `docs/plugins.md` ("Lifecycle boundary") says "`Core` currently does not expose a global `destroy()` lifecycle hook". This change replaces that sentence. `docs/README.md` ("Lifecycle") gains a teardown step.
- **Related work**: #174 (BlocksUI holder listeners), card "Clean up" on the DocumentModel board.

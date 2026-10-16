## Context

`Core.initialize()` builds the editor in this order: adapter binding → `SelectionManager`, `BlocksManager`, `BlockRenderer` → plugins (in `use()` order) → tools → `UndoRedoManager` → `model.initializeDocument()` → `core:ready`. `#initializePlugin` creates each plugin instance and then drops the reference, keeping only its `publicApi`. That is why no teardown path exists today.

Resources that outlive an editor if nobody releases them:

| Owner | Resource | Today |
|---|---|---|
| `EditorjsUI` | wrapper `div` appended to the integrator's holder | covered by #174, out of scope here |
| `BlocksUI` | blocks holder DOM listeners (`beforeinput`, `keydown`, `copy`), block wrappers | covered by #174, out of scope here |
| `ToolbarUI` / `ToolboxUI` / `InlineToolbarUI` | EventBus listeners, popovers | covered by #174, out of scope here; `InlineToolbarUI`'s inline tool instances are handled here after #174 lands (D7) |
| `CaretAdapter` | subscription to the singleton `useSelectionChange` watcher (`document` `selectionchange`) and `api.selection.onCaretUpdate` | `@todo Unsubscribe on adapter destruction` |
| `FormattingAdapter` | `core:ToolLoaded` and `api.document.onUpdate` listeners, inline tool instances | never released |
| `DOMAdapters` | `DOMBlockToolAdapter` per block (model and `ui:beforeinput` listeners) | released only on block removal |
| `BlockRenderer` | model listener, block tool instances | instances aren't tracked (`@todo clear block tool adapter memory`) |
| `SelectionManager` | model `CaretManagerUpdated` listener | never released |
| `UndoRedoManager` | model and EventBus listeners, debounce timer | `destroy()` exists, never called |
| `CollaborationManager` | `OTClient` WebSocket, debounce timer, EventBus/model listeners | `destroy()` exists, never called |
| `ClipboardPlugin`, `ShortcutsPlugin` | EventBus listeners | `destroy()` exists, never called |

The model and the EventBus belong to one `Core` instance. Once nothing outside holds a reference to them, the garbage collector reclaims them along with their listeners. The real leaks are therefore things reachable from outside the editor: `document` and holder listeners, DOM nodes under the integrator's holder, sockets, and timers. We still unsubscribe model and EventBus listeners explicitly, so a destroyed editor stops reacting to anything. That matters when an integrator keeps a reference to `api` or the model, and when an async render settles after teardown.

## Goals / Non-Goals

**Goals:**
- `Core#destroy()` / `EditorJS#destroy()` leave nothing behind that can be reached from outside the editor: no DOM, no `document`/holder listeners, no open socket, no pending timer.
- Every editor-owned component stops reacting to events after teardown.
- Tools get a hook (`destroy()`) to release their own resources.
- Several editors on one page can be created and destroyed independently.

**Non-Goals:**
- Re-initializing a destroyed instance. Integrators construct a new one.
- Async teardown, such as waiting for the socket to finish closing or flushing pending collaboration ops. See Open Questions.
- Detecting listeners that third-party plugins or tools forget to remove. Each plugin and tool is responsible for its own subscriptions.
- Block Tunes teardown. Tunes aren't instantiated per block yet (see the tunes-as-plugins work).

## Decisions

### D1. `destroy()` is synchronous
Every existing `destroy()` in the repo is synchronous, and `EditorjsPlugin.destroy?(): void` is already the contract. `OTClient.close()` is fire-and-forget: it closes the socket once its open promise resolves. A synchronous `destroy()` also fits unmount hooks in UI frameworks, which can't await anything.
*Alternative*: `destroy(): Promise<void>` that awaits socket close. Rejected for now because it would change the plugin contract and isn't needed to stop leaks.

### D2. Core keeps plugin instances and tears down in reverse construction order
`#initializePlugin` pushes each instance onto a `#pluginInstances` array, paired with its `name`. `destroy()` walks the array backwards, calls `destroy?.()` inside a try/catch with `console.error`, and calls `PluginRegistry.unregister(name)`. Reverse order means a plugin that depends on another one's `publicApi` or DOM, like `EditorjsUI` hosting the elements other UI plugins render, is torn down after its dependents.

### D3. Teardown order inside `Core.destroy()`
1. Set `#destroyed = true`, so `use()` and `initialize()` throw from now on. Plugin instances and services are cleared as they're destroyed, so a second `destroy()` finds nothing left and is a no-op.
2. Plugins, in reverse order (D2). UI disappears first, collaboration closes its socket and stops sending ops, and keyboard and clipboard plugins detach.
3. `UndoRedoManager.destroy()`, then `SelectionManager.destroy()`.
4. `BlockRenderer.destroy()`: for each tracked block, call the tool instance's `destroy?.()`, then `adapter.destroyBlockToolAdapter(id)`. Remove the model listener. No `BlockRemovedCoreEvent` is dispatched, because the UI is already gone.
5. `adapter.destroy()` (D5).

`destroy()` never resolves a service from the container, because that could construct it. `initialize()` stores each service it resolves (`SelectionManager`, `BlockRenderer`, `UndoRedoManager`, the adapter) in a `#services` record, and teardown only destroys what that record holds. Each step runs through a helper that logs a throwing step and continues.

The model is never mutated. If `destroy()` cleared blocks through the model, `CollaborationManager` would broadcast the removals to other clients and `UndoRedoManager` would record them.

### D4. Destroy during a pending `initialize()`
`initialize()` awaits `#initializeTools()`, which awaits each tool's `prepare()`. After that `await`, `initialize()` checks `#destroyed` and stops before tools are constructed, the document is initialized, or `core:ready` is dispatched. `destroy()` tears down whatever stage was reached.

`initialize()` then **rejects** with a `DOMException` named `AbortError`, following the platform convention (`fetch` rejects the same way when its signal aborts). Code awaiting readiness (loading data, focusing, subscribing) must not run against a destroyed editor, and resolving would let it run. Callers that unmount during boot ignore the error by name: `if (error.name === 'AbortError') return`. This matters in practice: React StrictMode mounts, unmounts and remounts every component in development, so every React integration hits this path.

`EditorJS` creates its ready promise in the constructor, so an `AbortError` would be reported as an unhandled rejection whenever nobody awaits `isReady`. The bundle attaches a handler to its own ready promise that ignores `AbortError` and logs any other error with `console.error`. Neither is reported as an unhandled rejection, a real initialization failure isn't lost when nobody awaits `isReady`, and anyone awaiting `isReady` sees the rejection either way.

*Alternative*: rethrow non-abort errors from the handler so Node reports them as unhandled. Rejected because the rethrown copy is a separate promise: a caller who awaits and handles `isReady` would still get an unhandled rejection reported, and Jest or Node with `--unhandled-rejections=throw` would crash on it. The cost of logging is one extra `console.error` for callers who also handle the error themselves.

*Alternative*: resolve on interruption. Rejected because `isReady` resolving would no longer mean the editor is usable, and the caller couldn't tell "ready" from "cancelled".

### D5. Adapter plugin gets a required `destroy()`
`EditorJSAdapterPlugin` narrows `destroy?()` to `destroy()`. Core can't release the rendering layer without it, and `DOMAdapters` is the only implementation. `DOMAdapters.destroy()`:
- destroys each remaining entry in `#adapters` through the existing `destroyBlockToolAdapter` path
- calls `CaretAdapter.destroy()`, which aborts its controller. That controller's `abort` event is tied to `off(holder)` on the selection watcher and to the `api.selection.onCaretUpdate` unsubscribe function
- calls `FormattingAdapter.destroy()`, which aborts its controller (covering the `core:ToolLoaded` and `onUpdate` listeners) and calls `destroy?.()` on each attached inline tool

Singletons are fetched from its private container, where they already exist, so nothing new gets constructed.

### D6. Reference-count the `selectionchange` watcher
`useSelectionChange` is a module-level singleton shared by every editor on the page, so its `destroy()` would break the other editors. Instead, `off()` removes the `document` listener when the subscriber map becomes empty, and `on()` adds it back when it adds the first subscriber. This lets "no `document` listener left after every editor is destroyed" pass, and it is safe when several editors run at once.

### D7. Tool instance lifetime rule
Add `destroy?(): void` to `InlineTool`. `BlockTool` already gets it from the v2 type, and we spell it out in the SDK spec. The rule is that every instance the editor creates gets `destroy()` called once, when the editor stops using it:
- `BlockRenderer`: the per-block instance, on block removal or teardown.
- `FormattingAdapter`: the long-lived inline instance, on teardown.
- `InlineToolbarUI`: instances created when building the toolbar, when the toolbar is rebuilt or destroyed.
- `SelectionManager.applyInlineTool` and `ToolsManager` validation create throwaway instances. They call `destroy?.()` right after use, in a `finally`.

*Alternative*: call `destroy()` only on long-lived instances. Rejected because tool authors would then have to know which instances are which, while a uniform rule works without that knowledge.

### D8. Listeners are released through `AbortController` across the repo
Every first-party component that registers listeners owns one `AbortController`. It passes the controller's `signal` to every registration and calls `abort()` in its teardown. This covers:
- `EventTarget` registrations: the EventBus, the model, DOM nodes, `document`.
- Subscriptions that return an unsubscribe function: `api.document.onUpdate`, `api.selection.onCaretUpdate`, and the `selectionchange` watcher (which gets `off(holder)` wrapped in a closure). The component registers that function as an `abort` listener on its own signal (a signal aborts only once, so no `{ once: true }` is needed), as in `signal.addEventListener('abort', api.document.onUpdate(cb))`, so nothing is stored in a field.

No component keeps handler fields or unsubscribe functions just so it can remove them later. `UndoRedoManager`, `ClipboardPlugin`, `ShortcutsPlugin`, `CollaborationManager`, and `DOMBlockToolAdapter` move to this pattern. Non-listener resources (timers, the socket, DOM nodes, popovers, tool instances) are still released explicitly in `destroy()`.

Needed plumbing:
- `EditorJSModel`'s typed `addEventListener` overloads take an `options?: AddEventListenerOptions` argument and forward it.
- Core's `DocumentAPI.onUpdate` and `SelectionAPI.onCaretUpdate` create a controller per subscription, pass its signal to `model.addEventListener`, and return `() => controller.abort()`. Their public signatures don't change.

*Alternative*: add an optional `{ signal }` argument to `onUpdate`/`onCaretUpdate`. Rejected because it makes the public API bigger for something one line at the call site already handles.

*Alternative*: store handlers and remove them by hand, the way `UndoRedoManager` does today. Rejected because a forgotten removal leaks without any warning, and the UI alone would need about 15 handler fields.

### D8a. SDK base classes own the controller
When the SDK provides a base class that registers listeners, the teardown belongs to the base class, not to its subclasses. Today `BlockToolAdapter` is the only such class. It creates the controller, ties the `onUpdate` unsubscribe function to the controller's `abort` event, exposes `protected readonly signal: AbortSignal`, and aborts it in `destroy()`. `DOMBlockToolAdapter` passes `this.signal` to its `ui:beforeinput` registration and drops its `destroy()` override and its `#beforeInputListener` field. A subclass overrides `destroy()` only to release resources that aren't listeners, and it still calls `super.destroy()`.

Plugins and tools are interfaces, not base classes, so they own their own controllers. *Alternative*: Core passes each plugin a `signal` in `EditorjsPluginParams` and aborts it after the plugin's `destroy()`. Rejected because it adds to the plugin API.

### D9. The `EditorJS` bundle delegates
`EditorJS#destroy()` calls `this.#core.destroy()`. It owns nothing else.

## Risks / Trade-offs

- [A plugin's `destroy()` throws partway through] → Each plugin call is wrapped in its own try/catch and logged, and teardown continues. The editor may still be left partly torn down, which beats aborting and leaking everything.
- [An async `render()` settles after teardown and dispatches `BlockAddedCoreEvent` into a dead EventBus] → `BlockRenderer` checks a `#destroyed` flag after the `await`, then destroys the late instance and its adapter instead of dispatching.
- [Ops not yet sent in `CollaborationManager`'s debounced batch are lost on destroy] → This already happens when a tab closes. Flushing would need async teardown (Non-Goal) and is listed in Open Questions.
- [The adapter contract narrows `destroy?()` to `destroy()`, which is a type-level break for third-party adapters] → No third-party adapters exist yet, and the package is pre-1.0.
- [#174 overlaps with UI teardown] → #174 covers every UI plugin's teardown, so this change has no UI plugin implementation. The only UI code here is `InlineToolbarUI` destroying its inline tool instances, which is done after #174 lands because #174 rewrites that file. Both changes edit the same `docs/plugins.md` lifecycle line, so whichever lands second merges that one line.

## Migration Plan

Additive for integrators: call `editor.destroy()` on unmount. No data migration and nothing to roll back beyond reverting the PR.

## Open Questions

- Should `destroy()` become async later, to flush the pending collaboration batch and await socket close? If so, `EditorjsPlugin.destroy` would need to return `void | Promise<void>`.
- Should the API expose a `core:destroyed` event for third-party code that subscribed through `api` without being a plugin? It isn't needed for the built-ins.

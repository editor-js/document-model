# How the Editor Works

This folder documents how the editor is wired end to end, with short pages that keep one concern each.

Read by goal:
- System boundaries: [Architecture](architecture.md)
- Document structures and mutation API: [Data Model](model.md)
- Typing, caret, formatting pipeline: [Input Handling](input-handling.md)
- Registration and lifecycle contracts: [Plugins & Tools](plugins.md)
- OT, batching, undo/redo: [Collaboration](collaboration.md)
- Which event bus to listen to: [Events](events.md)

---

## Mental model in 90 seconds

Five core parts:
1. `Core` owns startup and dependency wiring.
2. `EditorJSModel` is the source of truth for document state.
3. DOM adapters map model changes to concrete DOM inputs.
4. Tools/plugins add behavior through stable interfaces.
5. `CollaborationManager` translates model changes into OT operations.

Two event transports (never mixed):
- Model events on `EditorJSModel`
- Core/UI events on the `EventBus` held by the IoC container

---

## Lifecycle (from `new Core()` to live editor)

1. `new Core(config)` binds IoC services and built-ins.
2. `core.use(...)` registers UI components/plugins by `plugin.type`.
3. `core.initialize()` initializes the adapter plugin (`DOMAdapters` or a custom replacement) first.
4. UI plugins are instantiated (`EditorjsPlugin` instances, e.g. `EditorjsUI`).
5. Tools are prepared and announced with `ToolLoadedCoreEvent`.
6. Initial document is inserted into `EditorJSModel`; `BlockRenderer` reacts to each `BlockAddedEvent` to create a `BlockToolAdapter`, render the tool, and emit `BlockAddedCoreEvent`.
7. Collaboration manager connects (if server config is provided).

---

## One keystroke, full path

1. Browser fires `beforeinput` inside the `contenteditable` blocks holder.
2. `BlocksUI` (the `@editorjs/ui` blocks component) intercepts it, wraps it in `BeforeInputUIEvent`, and dispatches it on the global `EventBus`.
3. `DOMBlockToolAdapter` listens on the `EventBus` for `BeforeInputUIEvent` and calls `model.insertText(...)`.
4. Model mutates and emits `TextAddedEvent`.
5. `DOMBlockToolAdapter` updates the affected DOM range.
6. `CollaborationManager` converts the event to an `Operation`, adds it to the current `BatchedOperation`, and resets the debounce timer.
7. Browser `selectionchange` fires; `CaretAdapter` builds an `Index` and updates the model caret.
8. `SelectionManager` emits `SelectionChangedCoreEvent`; `CaretAdapter` restores DOM selection from the model index if needed.

The system stays decoupled because each step communicates through interfaces and events, not direct cross-component calls.

---

## Canonical terms

- `EditorjsPlugin`: general UI/behavior plugin registered via `core.use()` with `PluginType.Plugin`.
- `UiComponentType`: reserved string keys for UI component slots (`shell`, `blocks`, `inline-toolbar`, `toolbox`, `toolbar`). These name components in the UI layer but are **not** used as arguments to `core.use()` — plugins are registered by `PluginType` or `ToolType` values.
- `BlockTool` / `InlineTool` / `BlockTune`: tool contracts provided via config and prepared during `initialize()`.
- `Index`: serializable location in the document tree, independent of DOM nodes. Fields: `documentId`, `blockIndex`, `dataKey`, `textRange`, `tuneName`, `tuneKey`, `propertyName`. A `compositeSegments` array holds multiple per-input text indices for cross-block selections. Built with `IndexBuilder`; serialized to a compact string for caret storage and OT operations.
- `DataKey`: branded string identifying a data slot inside a `BlockNode` (e.g. `"text"`, `"caption"`). Created via `createDataKey()`.
- `BatchedOperation`: groups rapid single-character inserts or deletes on the same data key into one logical edit for undo/redo. Lives in `@editorjs/collaboration-manager`.
- `InputsRegistry`: shared map of `(blockIndex, dataKey) → HTMLElement` maintained by `DOMAdapters`. Both `DOMBlockToolAdapter` and `CaretAdapter` read from it.
- `BlockRenderer`: internal `@editorjs/core` component that subscribes to `BlockAddedEvent`/`BlockRemovedEvent` and creates/tears down `BlockToolAdapter` instances. Not to be confused with `BlocksManager` which handles the programmatic insert/delete/move API.
- `CaretManager`: owns one `Caret` per collaborating user. Dispatches `CaretManagerCaretUpdatedEvent` on `EditorJSModel` when any caret changes.

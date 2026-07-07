# Architecture Overview

The editor is split into nine packages in a layered dependency direction.

| Package | Role |
|---|---|
| `@editorjs/model-types` | Shared low-level types, nominal brands, and base event classes (`Index`, `BaseDocumentEvent`, the model event classes, `EventBus`). No runtime dependencies of its own. |
| `@editorjs/sdk` | Shared contracts — interfaces, base event classes, `EventBus` |
| `@editorjs/model` | In-memory document model (`EditorJSModel`) |
| `@editorjs/dom-adapters` | Binds model nodes to DOM inputs; default adapter implementation |
| `@editorjs/collaboration-manager` | Operational transformation, batching, undo/redo, OT WebSocket client |
| `@editorjs/core` | Orchestrator — IoC container, plugin/tool lifecycle, `EditorAPI`; core services including local undo/redo via `UndoRedoManager` |
| `@editorjs/ui` | Default UI shell — `EditorjsUI`, `BlocksUI`, `Toolbar`, `InlineToolbar`, `Toolbox` |
| `@editorjs/ot-server` | Standalone WebSocket OT server — `OTServer`, `DocumentManager` |
| `playground` | Vite dev sandbox; not published |

## Dependency rules

- `model-types` is the foundation layer: it has no dependency on `model` or `sdk`, and **only `model` and `sdk` may depend on it directly**. Every other package (`dom-adapters`, `collaboration-manager`, `ui`, and tools/plugins in general) that needs `Index`, event classes, or other model-types primitives should get them re-exported through `@editorjs/sdk` instead of depending on `@editorjs/model-types` directly. This exists so `model` and `sdk` can share the same `Index`/event/nominal-type definitions without `sdk` depending on the full `model` engine (and vice versa) — see `packages/model-types/src/index.ts` for the exact re-exported surface.
- `sdk` is the contract layer all other packages depend on.
- `model` is the engine implementation that backs `EditorJSModel`. It is consumed directly by `core` (the orchestrator) and `ot-server` (server-side document state), but **tools and plugins should never import `@editorjs/model` directly** — they should depend on `@editorjs/sdk`'s contracts (`BlockTool`, `InlineTool`, `Index`, event types, etc.) instead. `sdk` re-exports everything from `model` that a tool/plugin author legitimately needs, so `model` itself isn't part of the stable, tool-facing API surface and is free to change its internals.
- `core` wires runtime dependencies; it should be the only orchestrator.
- `model` does not depend on DOM concerns.
- `dom-adapters` and `collaboration-manager` observe/apply model changes through public APIs and events, and depend only on `sdk` (not `model` or `model-types`).
- `ui` depends on `sdk`; it is registered as an `EditorjsPlugin` via `core.use()`.
- `ot-server` depends on `collaboration-manager` (for `Operation` / message types), `model`, and `sdk`; it runs server-side only.

## Runtime ownership

`Core` is the entry point and owner of service wiring. Most services are wired in the constructor; `core.use(...)` registers UI plugins and tools; `initialize()` prepares tools, initializes the model, and starts collaboration.

### `@editorjs/ui` role

`BlocksUI` owns the `contenteditable` blocks holder. It intercepts browser `beforeinput` events, normalises them into `BeforeInputUIEvent`, and dispatches them on the global `EventBus`. It also listens for `BlockAddedCoreEvent` / `BlockRemovedCoreEvent` to insert/remove rendered block elements in the DOM.

### `@editorjs/ot-server` role

`OTServer` is a standalone Node.js WebSocket server. It maintains one `DocumentManager` per `documentId`. On each incoming `Operation` message it transforms the operation against any conflicting operations (ops with a higher or equal revision number), bumps the revision, applies the result to its own `EditorJSModel` copy, and broadcasts the transformed operation to all connected clients for that document.

Direct cross-layer coupling should be avoided: use interfaces/events from `sdk` and mutation APIs from `EditorJSModel`.

→ [`diagrams/architecture-overview.mmd`](diagrams/architecture-overview.mmd)

_Package boundaries and integration contracts. Keep this as the high-level map; see other docs for per-subsystem flow details._

# Event System

The editor exposes two public event transports.

| Transport | Dispatched on | Event types |
|---|---|---|
| `EditorJSModel` `EventType.Changed` | `EditorJSModel` instance | `BlockAddedEvent`, `BlockRemovedEvent`, `TextAddedEvent`, `TextRemovedEvent`, `TextFormattedEvent`, `TextUnformattedEvent`, `ValueModifiedEvent`, `TuneModifiedEvent`, `DataNodeAddedEvent`, `DataNodeRemovedEvent`, `PropertyModifiedEvent` |
| `EditorJSModel` `EventType.CaretManagerUpdated` | `EditorJSModel` instance | `CaretManagerCaretUpdatedEvent`, `CaretManagerCaretAddedEvent`, `CaretManagerCaretRemovedEvent` |
| Core `EventBus` (per editor instance) | `EventBus` held in the IoC container | `BlockAddedCoreEvent`, `BlockRemovedCoreEvent`, `ToolLoadedCoreEvent`, `SelectionChangedCoreEvent`, `UndoCoreEvent`, `RedoCoreEvent`, `BeforeInputUIEvent` |

## Model events (`@editorjs/model`)

All document mutation events extend `BaseDocumentEvent`:
- `detail.index` — location of the change
- `detail.action` — action type
- `detail.data` — changed value
- `detail.userId` — who made the change

### Full model event reference

| Event | `detail.data` type | When |
|---|---|---|
| `BlockAddedEvent` | `BlockNodeSerialized` | A block was inserted |
| `BlockRemovedEvent` | `BlockNodeSerialized` | A block was removed |
| `TextAddedEvent` | `string` | Characters inserted into a `TextNode` |
| `TextRemovedEvent` | `string` | Characters deleted from a `TextNode` |
| `TextFormattedEvent` | `{ tool, data }` | An inline tool was applied to a text range |
| `TextUnformattedEvent` | `{ tool, data }` | An inline tool was removed from a text range |
| `ValueModifiedEvent` | `{ value, previous }` | A `ValueNode`'s value was changed |
| `TuneModifiedEvent` | `{ value, previous }` | A `BlockTune`'s data was updated |
| `DataNodeAddedEvent` | `BlockNodeDataSerializedValue` | A data node (text or value) was created on a block |
| `DataNodeRemovedEvent` | `BlockNodeDataSerializedValue` | A data node was removed from a block |
| `PropertyModifiedEvent` | `{ value, previous }` | A top-level document property was set |

Use model events for synchronization, collaboration, and persistence logic.

## Core / UI events (`@editorjs/sdk`)

Dispatched on the IoC-managed `EventBus` (one instance per editor) with prefixed type strings (`core:*`, `ui:*`). Higher-level signals for plugins and tools.

| Event | Type string | `detail` shape | Who dispatches |
|---|---|---|---|
| `BlockAddedCoreEvent` | `core:block:added` | `{ tool, data, index, ui: HTMLElement }` | `BlockRenderer` |
| `BlockRemovedCoreEvent` | `core:block:removed` | `{ tool, index }` | `BlockRenderer` |
| `ToolLoadedCoreEvent` | `core:tool:loaded` | `{ tool: ToolFacadeClass }` | `ToolsManager` |
| `SelectionChangedCoreEvent` | `core:selection:changed` | `{ index, availableInlineTools, fragments }` | `SelectionManager` |
| `UndoCoreEvent` | `core:undo` | — | `DocumentAPI.undo()` or `BlocksUI` (Cmd/Ctrl+Z) |
| `RedoCoreEvent` | `core:redo` | — | `DocumentAPI.redo()` or `BlocksUI` (Cmd/Ctrl+Shift+Z) |
| `BeforeInputUIEvent` | `ui:before-input` | `{ data, inputType, targetRanges, isCrossInputSelection, isComposing }` | `BlocksUI` |

`BlockAddedCoreEvent` carries the rendered `HTMLElement` in `detail.ui`, while the model-level `BlockAddedEvent` carries serialised data — they are complementary.

Use core/UI events for UI workflows and extension coordination.

## Adapter internals

`BlockToolAdapter` and `CaretAdapter` maintain per-block/per-input state. `BlockToolAdapter` dispatches `KeyAddedEvent`, `KeyRemovedEvent`, and `ValueNodeChangedEvent` on its own internal event bus — these are consumed by block tools, not by the rest of the system.

## Quick choice

- Need document truth? Listen on `EditorJSModel`.
- Need app-level UI signal? Listen on global `EventBus`.
- Need per-block behavior? Implement it in the tool/adapter path and rely on model/core events for cross-component signaling.


→ [`diagrams/events-catalog.mmd`](diagrams/events-catalog.mmd)

_Event classes grouped by package and transport. Model events are dispatched on `EditorJSModel`; SDK core/UI events are dispatched on the global `EventBus`._

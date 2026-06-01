# Plugins & Tools

## Registration

`core.use(...)` registers UI components/plugins by static `type` (values from `ToolType` for tools, `PluginType.Adapter` for adapters, and `PluginType.Plugin` for general plugins).

Tools are registered via `core.use(ToolConstructor, options)` during setup. The `tools` config field provides tool settings/options that `ToolsManager` applies during `initialize()`.

| Type | Interface / Source | Purpose |
|---|---|---|
| UI Plugin | `EditorjsPlugin` | UI component/behavior registered via `core.use(...)` |
| Block Tool | `BlockTool` (from config `tools`) | Block rendering and block-specific behavior |
| Inline Tool | `InlineTool` (from config `tools`) | Selection formatting actions |
| Block Tune | `BlockTune` (from config `tools`) | Per-block tune behavior |

## Initialization sequence

Canonical startup order:

1. Initialize the adapter (`DOMAdapters` / `PluginType.Adapter`).
2. Instantiate registered UI plugins.
3. Prepare tools and emit `ToolLoadedCoreEvent` for each available tool.
4. Resolve `SelectionManager`, `BlocksManager`, and `BlockRenderer`. `BlockRenderer` subscribes to model block events and creates `BlockToolAdapter` instances per block when a `BlockAddedEvent` fires.
5. Initialize model with configured blocks (triggers `BlockAddedEvent` for each block).
6. Connect collaboration manager.

## Lifecycle boundary

- Plugins receive dependencies via constructor params (`config`, `api`, `eventBus`).
- Plugin instances may implement `destroy()`, but `Core` currently does not expose a global `destroy()` lifecycle hook.

## EditorAPI

Every plugin and tool receives an `api` object of type `EditorAPI` in its constructor. It is composed of three namespaces:

### `api.blocks`

Programmatic block management — delegates to `BlocksManager`.

| Method | Description |
|---|---|
| `insert(type?, data?, index?, id?, focus?, replace?)` | Insert a block of the given tool type |
| `insertMany(blocks, index?)` | Insert multiple serialised blocks |
| `delete(index?)` | Remove a block (defaults to caret block) |
| `move(toIndex, fromIndex?)` | Move a block to a new position |
| `render(document)` | Re-initialize the document from serialised data |
| `clear()` | Remove all blocks |
| `getBlocksCount()` | Return the total number of blocks |

### `api.selection`

Inline tool application — delegates to `SelectionManager`.

| Method | Description |
|---|---|
| `applyInlineToolForCurrentSelection(toolName, data?)` | Apply or toggle an inline tool on the current caret selection |

### `api.document`

Document access and mutations — delegates to `DocumentAPI`.

| Method | Description |
|---|---|
| `data` | Returns `EditorDocumentSerialized` — the current serialised document state |
| `insertData(params)` | Insert data at the specified index |
| `removeData(params)` | Remove data at the specified index |
| `modifyData(params)` | Modify data at the specified index |
| `undo()` | Undo the last change in the document (dispatches `UndoCoreEvent`) |
| `redo()` | Redo the last undone change (dispatches `RedoCoreEvent`) |


→ [`diagrams/plugin-lifecycle-flow.mmd`](diagrams/plugin-lifecycle-flow.mmd)

_`new Core` wires services; `use()` registers UI plugins; `initialize()` prepares tools, initializes document, and starts collaboration._

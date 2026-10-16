# Core

## Purpose

`@editorjs/core` is the Editor.js orchestrator: an IoC-based composition root (`Core` class) that wires up the document model, tool/plugin lifecycle, and the `EditorAPI` surface consumed by tools, plugins, and adapters. It owns block rendering, selection/caret tracking, and local undo/redo, and requires exactly one registered adapter plugin to bind to the DOM layer.
## Requirements
### Requirement: Core composition root
The system SHALL provide a `Core` class owning two IoC containers (one for singleton services, one for registered tools/plugins), exposing `use()` to register tools/plugins/adapters and `initialize()` to boot the editor. The constructor SHALL NOT register any default tools, plugins, adapters, or UI; `Core` is a headless engine that is non-functional until the caller registers, at minimum, a rendering adapter and the block tool named by `defaultBlock`.

#### Scenario: Initialization order
- **GIVEN** tools, plugins, and an adapter have been registered via `use()`
- **WHEN** `initialize()` is called
- **THEN** `SelectionManager`, `BlocksManager`, and `BlockRenderer` are resolved from the IoC container, plugins are initialized, tools are initialized, `UndoRedoManager` is resolved (after plugins/tools so it observes `defaultPrevented` set by them on undo/redo events), the model's document is initialized, and finally a `CoreEventType.Ready` event is dispatched

#### Scenario: Exactly one adapter is required
- **GIVEN** one or more `PluginType.Adapter` plugins are registered via `use()`
- **WHEN** the adapter binding is resolved
- **THEN** the last registered adapter wins (via `rebind`) and is lazily resolved into `BlockRenderer` under `TOKENS.Adapter`

#### Scenario: No adapter registered fails loudly
- **GIVEN** no `PluginType.Adapter` plugin has been registered via `use()`
- **WHEN** `initialize()` is called
- **THEN** it throws synchronously with a message stating that a rendering adapter must be registered, before any module is resolved

#### Scenario: Missing default block tool fails loudly
- **GIVEN** the configured `defaultBlock` name has no matching registered block tool
- **WHEN** `initialize()` is called
- **THEN** it throws synchronously with a message naming the missing default block tool

#### Scenario: Initialization failure is surfaced
- **GIVEN** an error is thrown while `initialize()` boots the editor
- **WHEN** that error propagates out of the boot sequence
- **THEN** `initialize()` re-throws it to the caller rather than swallowing it with `console.error`

Implemented in `src/index.ts`, validated by its co-located `.spec.ts`.

### Requirement: Tool registration and validation
The system SHALL validate configured tools via `ToolsManager`, calling each tool's static `prepare()`, and sorting tools into `available`/`unavailable` collections exposed as `blockTools`/`inlineTools`/`blockTunes`.

#### Scenario: Rejecting a malformed tool
- **GIVEN** a configured tool is neither a constructor function nor an object with a `class` property
- **WHEN** `ToolsManager` validates the configuration
- **THEN** it throws an error naming the offending tool and describing the required shape

Implemented in `src/tools/ToolsManager.ts`, `src/tools/ToolsFactory.ts`, validated by co-located `.spec.ts` files.

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` aggregating `BlocksAPI` (insert/insertMany/delete/move/render/clear/getBlocksCount), `SelectionAPI` (applyInlineTool, selectedBlocks), `DocumentAPI` (serialized data, onUpdate, insertData/removeData/modifyData, undo/redo), and `TextAPI` (insert/remove/format/unformat/getFragments/get) to tools, plugins, and adapters.

#### Scenario: Deleting with no block selected
- **GIVEN** no block is currently selected/no caret is set
- **WHEN** `BlocksAPI.delete()` or `move()` is called without an explicit index
- **THEN** it throws an error ("No block selected to delete" / "No block selected to move")

#### Scenario: Splitting or converting with an unknown tool
- **GIVEN** a `splitBlock`/`convertBlock` call references a `dataKey` that doesn't exist, or a source/target tool that isn't registered
- **WHEN** the operation is attempted
- **THEN** it throws an error identifying the missing key or tool

Implemented in `src/api/index.ts`, `src/api/BlocksAPI.ts`, `src/api/SelectionAPI.ts`, `src/api/DocumentAPI/DocumentAPI.ts`, `src/api/TextAPI.ts`, `src/components/BlockManager.ts`, validated by co-located `.spec.ts`/`.integration.spec.ts` files.

### Requirement: Block rendering lifecycle
The system SHALL provide `BlockRenderer`, which listens for model `BlockAddedEvent`/`BlockRemovedEvent`, creates a `BlockToolAdapter` per block, instantiates and renders the corresponding tool, and dispatches `BlockAddedCoreEvent`/`BlockRemovedCoreEvent`. `BlockRenderer` SHALL keep the tool instance of each rendered block, keyed by block id, and SHALL call that instance's optional `destroy()` exactly once, either when the block is removed or when the editor is destroyed.

#### Scenario: Malformed or unknown block events
- **GIVEN** a block event with an undefined index, or referencing a tool name that isn't registered
- **WHEN** `BlockRenderer` processes the event
- **THEN** it throws `[BlockRenderer] Block index should be defined...` or `[BlockRenderer] Block Tool <name> not found` respectively

#### Scenario: Tool render failure is logged, not thrown
- **GIVEN** a tool's `render()` method returns a rejected promise
- **WHEN** `BlockRenderer` renders that block
- **THEN** the rejection is logged rather than propagated as an uncaught error

#### Scenario: Removing a block destroys its tool instance
- **GIVEN** a rendered block whose tool instance implements `destroy()`
- **WHEN** the model emits `BlockRemovedEvent` for that block
- **THEN** the tool instance's `destroy()` is called, the block's adapter is destroyed, and `BlockRemovedCoreEvent` is dispatched

#### Scenario: Destroying the renderer releases every remaining block
- **GIVEN** several rendered blocks
- **WHEN** `BlockRenderer.destroy()` is called
- **THEN** each remaining tool instance's `destroy()` is called, each remaining block's adapter is destroyed, no `BlockRemovedCoreEvent` is dispatched, and the renderer stops listening to model events

#### Scenario: A block that finishes rendering after teardown
- **GIVEN** a block tool's `render()` is still pending when `BlockRenderer.destroy()` is called
- **WHEN** `render()` settles
- **THEN** no `BlockAddedCoreEvent` is dispatched for it, and the tool instance and its adapter are still destroyed

Implemented in `src/components/BlockRenderer.ts`, validated by its co-located `.spec.ts`.

### Requirement: Selection and inline formatting
The system SHALL provide `SelectionManager`, which tracks caret/selection state and applies inline tools to the current selection via `applyInlineTool()`.

#### Scenario: Applying an inline tool with invalid state
- **GIVEN** the caret is unset/null, the requested tool isn't found, or a selection segment lacks `textRange`/`blockIndex`/`dataKey`
- **WHEN** `applyInlineTool()` is called
- **THEN** it throws an error identifying the missing state

#### Scenario: Formatting dispatch
- **GIVEN** a valid selection and a registered inline tool
- **WHEN** `applyInlineTool()` is called
- **THEN** it calls `model.format` or `model.unformat` depending on the tool's `getFormattingOptions` result

#### Scenario: Resolving selected blocks
- **GIVEN** the current selection index is a block index, or a composite index whose segments carry block indexes
- **WHEN** `selectedBlocks()` is called
- **THEN** it returns the serialized blocks for each distinct, in-range block index referenced by the selection (deduplicated for composite selections), or an empty array when there is no current selection or no index resolves to an in-range block

Implemented in `src/components/SelectionManager.ts`, validated by its co-located `.spec.ts`.

### Requirement: Local undo/redo
The system SHALL provide `UndoRedoManager`, which batches consecutive model events (debounced) into a single undo step, inverts `Added`/`Removed`/`Modified` events on `undo()`, and responds to cancellable `core:undo`/`core:redo` events.

#### Scenario: In-progress batch flushed before undo
- **GIVEN** an undo step is mid-batch when `undo()` is triggered
- **WHEN** the undo is processed
- **THEN** the in-progress batch is flushed first, and the manager ignores model events it triggers itself while replaying the undo

#### Scenario: Cancellable undo/redo events
- **GIVEN** a listener calls `preventDefault()` (or equivalent cancellation) on a `core:undo`/`core:redo` event
- **WHEN** the event is dispatched
- **THEN** the default undo/redo behavior is suppressed

Implemented in `src/components/UndoRedoManager.ts`, validated by its co-located `.spec.ts`.

### Requirement: Plugin registry
`Core` SHALL maintain a registry mapping each registered plugin's `name` to its public API, populate it as plugins are instantiated, and back the `api.plugins` namespace with it.

#### Scenario: Registry is populated during initialization
- **GIVEN** plugins are registered via `core.use()`
- **WHEN** `initialize()` instantiates them
- **THEN** each plugin exposing a `publicApi` has it registered under its `name`

#### Scenario: Registration order does not matter
- **GIVEN** plugin A is constructed before plugin B, and A reads `api.plugins.<B's id>` after initialization completes
- **WHEN** A performs that read
- **THEN** B's public API is available, because `api.plugins` resolves entries at access time rather than capturing a snapshot at construction time

#### Scenario: Reading a plugin API before it is constructed
- **GIVEN** plugin A reads `api.plugins.<B's id>` inside its own constructor, before B has been constructed
- **WHEN** that read happens
- **THEN** `undefined` is returned, and the documented contract is that cross-plugin API use belongs after the editor's ready event

#### Scenario: Conflicting plugin ids are rejected
- **WHEN** two registered plugins declare the same `name`
- **THEN** initialization fails with an error naming the conflicting id

#### Scenario: Registry is cleared on teardown
- **GIVEN** plugins have been registered and the editor is torn down
- **WHEN** each plugin's `destroy()` runs
- **THEN** its registry entry is removed so no stale public API remains reachable

### Requirement: Editor teardown
`Core` SHALL expose a synchronous `destroy()` that releases everything the editor created: plugin instances, the adapter plugin, block and inline tool instances, block adapters, and every model, EventBus, DOM, timer, and network subscription that editor-owned code registered. Teardown SHALL NOT mutate the document model, so no removal events reach undo history, collaboration, or `onModelUpdate`. The holder element passed in the configuration belongs to the integrator and SHALL be left in the DOM.

#### Scenario: Plugins are destroyed in reverse construction order
- **GIVEN** plugins A, B, and C were constructed in that order during `initialize()`
- **WHEN** `destroy()` is called
- **THEN** `destroy()` is called on C, then B, then A, and plugins that don't implement `destroy()` are skipped

#### Scenario: Plugin registry entries are removed
- **GIVEN** a plugin registered a `publicApi` under its `name`
- **WHEN** `destroy()` is called
- **THEN** that name is no longer present on `api.plugins`

#### Scenario: A failing plugin does not abort teardown
- **GIVEN** one plugin's `destroy()` throws
- **WHEN** `destroy()` is called
- **THEN** the error is logged with `console.error`, and every other plugin, the core services, the rendered blocks, and the adapter plugin are still torn down

#### Scenario: Core services stop listening
- **GIVEN** an initialized editor
- **WHEN** `destroy()` is called
- **THEN** `UndoRedoManager`, `BlockRenderer`, and `SelectionManager` remove their model and EventBus listeners, so model changes or `core:undo`/`core:redo` events dispatched afterwards have no effect on them

#### Scenario: Rendered blocks are released without touching the model
- **GIVEN** an initialized editor with rendered blocks
- **WHEN** `destroy()` is called
- **THEN** each rendered block tool's `destroy()` is called, each block's adapter is destroyed, the adapter plugin's `destroy()` is called, and the model emits no events

#### Scenario: Destroying twice is a no-op
- **GIVEN** `destroy()` has already been called
- **WHEN** `destroy()` is called again
- **THEN** it returns without calling any plugin, tool, or adapter `destroy()` a second time

#### Scenario: Destroying before initialization
- **GIVEN** `use()` has been called but `initialize()` has not
- **WHEN** `destroy()` is called
- **THEN** it completes without error and no plugin or tool is constructed

#### Scenario: Destroying while initialization is pending
- **GIVEN** `initialize()` has been called and its promise has not settled
- **WHEN** `destroy()` is called
- **THEN** whatever was constructed so far is torn down, the pending `initialize()` rejects with a `DOMException` named `AbortError` without initializing the document or dispatching `CoreEventType.Ready`, and any tool or plugin it would have constructed afterwards is not constructed

#### Scenario: Using a destroyed editor
- **GIVEN** `destroy()` has been called
- **WHEN** `use()` or `initialize()` is called
- **THEN** it throws an error stating that the editor has been destroyed


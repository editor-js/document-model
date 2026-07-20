# Core

## Purpose

`@editorjs/core` is the Editor.js orchestrator: an IoC-based composition root (`Core` class) that wires up the document model, tool/plugin lifecycle, and the `EditorAPI` surface consumed by tools, plugins, and adapters. It owns block rendering, selection/caret tracking, and local undo/redo, and requires exactly one registered adapter plugin to bind to the DOM layer.

## Requirements

### Requirement: Core composition root
The system SHALL provide a `Core` class owning two IoC containers (one for singleton services, one for registered tools/plugins), exposing `use()` to register tools/plugins/adapters and `initialize()` to boot the editor.

#### Scenario: Initialization order
- **GIVEN** tools, plugins, and an adapter have been registered via `use()`
- **WHEN** `initialize()` is called
- **THEN** `SelectionManager`, `BlocksManager`, `BlockRenderer`, and `UndoRedoManager` are resolved from the IoC container, plugins are initialized, tools are initialized, the model's document is initialized, and finally a `CoreEventType.Ready` event is dispatched

#### Scenario: Exactly one adapter is required
- **GIVEN** one or more `PluginType.Adapter` plugins are registered via `use()`
- **WHEN** the adapter binding is resolved
- **THEN** the last registered adapter wins (via `rebind`) and is lazily resolved into `BlockRenderer` under `TOKENS.Adapter`

Implemented in `src/index.ts`, `src/tokens.ts`.

### Requirement: Tool registration and validation
The system SHALL validate configured tools via `ToolsManager`, calling each tool's static `prepare()`, and sorting tools into `available`/`unavailable` collections exposed as `blockTools`/`inlineTools`/`blockTunes`.

#### Scenario: Rejecting a malformed tool
- **GIVEN** a configured tool is neither a constructor function nor an object with a `class` property
- **WHEN** `ToolsManager` validates the configuration
- **THEN** it throws an error naming the offending tool and describing the required shape

Implemented in `src/tools/ToolsManager.ts`, `src/tools/ToolsFactory.ts`, validated by co-located `.spec.ts` files.

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` aggregating `BlocksAPI` (insert/insertMany/delete/move/render/clear/getBlocksCount), `SelectionAPI` (applyInlineTool), `DocumentAPI` (serialized data, onUpdate, insertData/removeData/modifyData, undo/redo), and `TextAPI` (insert/remove/format/unformat/getFragments/get) to tools, plugins, and adapters.

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
The system SHALL provide `BlockRenderer`, which listens for model `BlockAddedEvent`/`BlockRemovedEvent`, creates a `BlockToolAdapter` per block, instantiates and renders the corresponding tool, and dispatches `BlockAddedCoreEvent`/`BlockRemovedCoreEvent`.

#### Scenario: Malformed or unknown block events
- **GIVEN** a block event with an undefined index, or referencing a tool name that isn't registered
- **WHEN** `BlockRenderer` processes the event
- **THEN** it throws `[BlockRenderer] Block index should be defined...` or `[BlockRenderer] Block Tool <name> not found` respectively

#### Scenario: Tool render failure is logged, not thrown
- **GIVEN** a tool's `render()` method returns a rejected promise
- **WHEN** `BlockRenderer` renders that block
- **THEN** the rejection is logged rather than propagated as an uncaught error

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

### Requirement: Keyboard shortcuts plugin
The system SHALL provide a `ShortcutsPlugin` (an `EditorjsPlugin`) that maps keyboard shortcuts declared in a tool's `options.shortcut` to inline-tool application through the `EditorAPI`.

#### Scenario: Triggering an inline tool via shortcut
- **GIVEN** an inline tool is registered with `options.shortcut` set to a key combination (e.g. `CMD+B`)
- **WHEN** that key combination is pressed while the editor has focus
- **THEN** `ShortcutsPlugin` applies the corresponding inline tool to the current selection via the `EditorAPI`

Implemented in `src/plugins/ShortcutsPlugin.ts`.

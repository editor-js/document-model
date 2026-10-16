## ADDED Requirements

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

## MODIFIED Requirements

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

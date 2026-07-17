# Architecture

## Purpose

Cross-cutting structural invariants that span multiple packages and aren't owned by any single capability spec: the dependency direction between packages, the event-channel naming convention used across the `EventBus`, the single-adapter contract `core` enforces, and which undo/redo implementation takes precedence when collaboration is enabled. These constrain how packages may depend on and communicate with each other; package-specific behavior lives in the respective capability specs ([[model-types]], [[sdk]], [[model]], [[dom-adapters]], [[collaboration-manager]], [[core]], [[ui]], [[ot-server]], [[tools]]).

## Requirements

### Requirement: Tools and plugins depend on the SDK, not on model or core
Tool and plugin packages SHALL depend on `@editorjs/sdk` (and, where DOM binding is needed, `@editorjs/dom-adapters`) for their contracts, and SHALL NOT declare a direct dependency on `@editorjs/model` or `@editorjs/core`.

#### Scenario: Built-in tool package dependencies
- **GIVEN** the `package.json` of a built-in tool (`@editorjs/paragraph`, `@editorjs/bold`, `@editorjs/italic`, `@editorjs/inline-link`)
- **WHEN** its `dependencies` are inspected
- **THEN** it lists `@editorjs/sdk` (and optionally `@editorjs/dom-adapters`) but never `@editorjs/model` or `@editorjs/core`

#### Scenario: model-types is internal to model and sdk
- **GIVEN** `@editorjs/model-types` is a dependency-free, internal-only package
- **WHEN** any package other than `@editorjs/model` or `@editorjs/sdk` needs its types
- **THEN** it SHALL obtain them indirectly through `@editorjs/sdk`'s re-exports rather than depending on `@editorjs/model-types` directly

Confirmed via `packages/tools/{paragraph,bold,italic,inline-link}/package.json` and `packages/sdk/package.json`.

### Requirement: EventBus channel naming convention
Every event dispatched on an `EventBus` SHALL be namespaced by its origin as a `<channel>:<name>` string, using one of the fixed channel prefixes `core:` (orchestrator-level events), `ui:` (UI-shell events), or `adapter:` (DOM-adapter events). Event classes SHALL apply the prefix in their base class rather than each concrete event repeating it.

#### Scenario: Core events are auto-prefixed
- **GIVEN** a concrete event class extends `CoreEventBase` with a bare name such as `block:added`
- **WHEN** the event is constructed
- **THEN** it dispatches as `core:block:added`, since `CoreEventBase`'s constructor prepends `core:` to the given name

#### Scenario: UI events are auto-prefixed
- **GIVEN** a concrete event class extends `UIEventBase` with a bare name such as `toolbar:rendered`
- **WHEN** the event is constructed
- **THEN** it dispatches as `ui:toolbar:rendered`, since `UIEventBase`'s constructor prepends `ui:` to the given name

#### Scenario: Adapter events use a flat channel
- **GIVEN** the `AdapterEventType.Updated` enum value
- **WHEN** an adapter event is dispatched
- **THEN** its type is the literal `adapter:updated`, since adapter events are not built on a shared prefixing base class

Implemented in `packages/sdk/src/entities/EventBus/events/core/CoreEventBase.ts`, `.../ui/UIEventBase.ts`, `.../core/CoreEventType.ts`, `.../adapter/AdapterEventType.ts`.

### Requirement: Exactly one adapter plugin is bound
`Core` SHALL require exactly one `PluginType.Adapter` plugin bound in its plugin container at initialization time. Registering a second adapter via `use()` SHALL replace the previously bound one rather than error or bind both.

#### Scenario: Registering a second adapter replaces the first
- **GIVEN** an adapter plugin has already been registered via `core.use(SomeAdapter)`
- **WHEN** `core.use(AnotherAdapter)` is called with another `PluginType.Adapter` plugin
- **THEN** the container rebinds `PluginType.Adapter` to the new adapter, so only the most recently registered adapter is active when `#initializeAdapter()` runs

#### Scenario: Default adapter is DOMAdapters
- **GIVEN** a `Core` instance is constructed without an explicit adapter registration
- **WHEN** the constructor runs
- **THEN** it calls `this.use(DOMAdapters)`, so `@editorjs/dom-adapters` is bound as the default adapter

Implemented in `packages/core/src/index.ts` (`use()`, `#initializeAdapter()`), `packages/core/src/tokens.ts` (`TOKENS.Adapter`).

### Requirement: Collaboration's undo/redo preempts core's local undo/redo
When `@editorjs/collaboration-manager` is registered, it SHALL intercept `core:undo`/`core:redo` events and call `preventDefault()` on them before `core`'s own `UndoRedoManager` acts, substituting its own OT-aware undo/redo (which accounts for remote operations) for `core`'s local-only undo/redo. This is an intentional override, not a duplicated/competing implementation.

#### Scenario: Collaboration manager suppresses core's default undo
- **GIVEN** both `core`'s `UndoRedoManager` and `CollaborationManager` are listening for `core:undo`
- **WHEN** a `core:undo` event is dispatched (e.g. via Cmd/Ctrl+Z)
- **THEN** `CollaborationManager`'s listener calls `e.preventDefault()` and performs its own OT-aware `undo()`, so `core`'s local `UndoRedoManager` does not also apply an undo for the same event

#### Scenario: Redo follows the same override
- **GIVEN** the same dual-listener setup
- **WHEN** a `core:redo` event is dispatched
- **THEN** `CollaborationManager` calls `e.preventDefault()` and performs its own `redo()` instead of `core`'s default

#### Scenario: Without collaboration-manager, core's undo/redo is authoritative
- **GIVEN** `@editorjs/collaboration-manager` is not registered
- **WHEN** a `core:undo`/`core:redo` event is dispatched
- **THEN** no listener calls `preventDefault()`, so `core`'s own `UndoRedoManager` performs the undo/redo

Implemented in `packages/collaboration-manager/src/CollaborationManager.ts` (constructor's `onUndo`/`onRedo` handlers), `packages/core/src/components/UndoRedoManager.ts`.

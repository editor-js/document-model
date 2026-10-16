## ADDED Requirements

### Requirement: Tool instance teardown hook
The `BlockTool` and `InlineTool` instance contracts SHALL each declare an optional `destroy(): void`. The editor SHALL call `destroy()` exactly once on every tool instance it creates, when it stops using that instance: for long-lived instances, when the owning block is removed, the owning component is rebuilt, or the editor is destroyed; for instances created for a single operation, right after that operation completes. A tool that doesn't implement `destroy()` SHALL keep working unchanged.

#### Scenario: Inline tool declares destroy
- **GIVEN** an inline tool class implements `destroy()`
- **WHEN** it is type-checked against `InlineToolConstructor`
- **THEN** it compiles, and an inline tool without `destroy()` also compiles

#### Scenario: Block tool declares destroy
- **GIVEN** a block tool class implements `destroy()`
- **WHEN** it is type-checked against `BlockToolConstructor`
- **THEN** it compiles, and a block tool without `destroy()` also compiles

## MODIFIED Requirements

### Requirement: BlockToolAdapter bridges model events to per-block DOM state
The system SHALL provide an abstract `BlockToolAdapter` (extending `EventTarget`) that subscribes to `api.document.onUpdate`, translates model-level `DataNodeAddedEvent`/`DataNodeRemovedEvent`/`ValueModifiedEvent` into adapter-level `KeyAddedEvent`/`KeyRemovedEvent`/`ValueNodeChangedEvent` dispatched on itself, and exposes `registerTextInputKey`, `registerValueKey`, `removeKey`, and `destroy()`. `BlockToolAdapter` SHALL own an `AbortController`, tie its `api.document.onUpdate` unsubscribe function to that controller's `abort` event, expose its `signal` to subclasses as a protected member, and abort it in `destroy()`.

#### Scenario: Cleaning up an adapter
- **GIVEN** a `BlockToolAdapter` instance is subscribed to model updates
- **WHEN** `destroy()` is called
- **THEN** its controller aborts, so its model listener is removed and no further translated events are dispatched

#### Scenario: Subclass listeners are removed by the base class
- **GIVEN** a `BlockToolAdapter` subclass registered a listener with the inherited `signal`
- **WHEN** `destroy()` is called on the subclass instance
- **THEN** that listener is removed too, even though the subclass doesn't override `destroy()`

Implemented in `src/entities/BlockToolAdapter.ts`.

### Requirement: Plugin contracts
The system SHALL define `EditorjsPlugin`/`EditorjsPluginConstructor` (generic UI-plugin contract with optional `destroy()`, an optional `publicApi` member, a static `type`, and a static `name`) and `EditorJSAdapterPlugin`/`EditorjsAdapterPluginConstructor` (singleton adapter plugin contract with `createBlockToolAdapter`/`destroyBlockToolAdapter` and a required `destroy()` that releases every block adapter not destroyed yet, along with the adapter's own subscriptions).

#### Scenario: Destroying a plugin
- **GIVEN** a registered `EditorjsPlugin` implements an optional `destroy()` method
- **WHEN** the editor tears down
- **THEN** `destroy()` is called on the plugin instance to release its resources

#### Scenario: Destroying the adapter plugin
- **GIVEN** an adapter plugin with block adapters created through `createBlockToolAdapter`
- **WHEN** the editor tears down
- **THEN** the adapter plugin's `destroy()` is called after every rendered block has been released, and it destroys any block adapter still alive

#### Scenario: Plugin declares an id and a public API
- **GIVEN** a plugin class declares a static `name` and an instance `publicApi` member
- **WHEN** its type is checked against `EditorjsPluginConstructor`
- **THEN** the `name` literal and the `publicApi` type are both inferred, and a mismatch with the plugin's `EditorjsPluginApiMap` augmentation is a compile error

Implemented in `src/entities/EditorjsPlugin.ts`, `src/entities/EditorjsAdapterPlugin.ts`, `src/entities/EntityType.ts`.

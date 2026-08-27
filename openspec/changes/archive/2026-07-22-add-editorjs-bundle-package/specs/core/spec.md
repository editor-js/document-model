## MODIFIED Requirements

### Requirement: Core composition root
The system SHALL provide a `Core` class owning two IoC containers (one for singleton services, one for registered tools/plugins), exposing `use()` to register tools/plugins/adapters and `initialize()` to boot the editor. The constructor SHALL NOT register any default tools, plugins, adapters, or UI; `Core` is a headless engine that is non-functional until the caller registers, at minimum, a rendering adapter and the block tool named by `defaultBlock`.

#### Scenario: Initialization order
- **GIVEN** tools, plugins, and an adapter have been registered via `use()`
- **WHEN** `initialize()` is called
- **THEN** `SelectionManager`, `BlocksManager`, `BlockRenderer`, and `UndoRedoManager` are resolved from the IoC container, plugins are initialized, tools are initialized, the model's document is initialized, and finally a `CoreEventType.Ready` event is dispatched

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

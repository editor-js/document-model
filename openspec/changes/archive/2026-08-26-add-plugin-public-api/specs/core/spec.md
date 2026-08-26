## ADDED Requirements

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

## ADDED Requirements

### Requirement: Plugin identity
Every plugin constructor SHALL declare a static `name` string that uniquely identifies the plugin within an editor instance. The `name` SHALL be the key used both by the runtime registry and by the compile-time type maps.

#### Scenario: Plugin declares its identity
- **WHEN** a class implementing `EditorjsPlugin` is registered via `core.use(MyPlugin)`
- **THEN** its static `name` is used as the registry key for that plugin instance

#### Scenario: Duplicate plugin id
- **WHEN** two plugins declaring the same `name` are registered on one editor instance
- **THEN** registration throws an error naming the conflicting `name`, rather than silently overwriting the first plugin

#### Scenario: Plugin without a public API
- **WHEN** a registered plugin declares a `name` but exposes no public API
- **THEN** the plugin is still instantiated normally and `api.plugins[name]` resolves to `undefined`

#### Scenario: Plugin omits its name declaration
- **GIVEN** a plugin class that does not declare a static `name` and exposes a public API
- **WHEN** it is passed to `core.use()`
- **THEN** compilation fails, because the inherited `Function.name` is a plain `string` and does not narrow to a key of `EditorjsPluginApiMap`

#### Scenario: Empty plugin name
- **WHEN** a plugin whose `name` resolves to an empty string is registered
- **THEN** registration throws rather than creating an unaddressable registry entry

### Requirement: Plugin public API declaration
A plugin SHALL be able to expose a public API object by declaring a `publicApi` member on its instance. The core SHALL read that member after the plugin is constructed and register it under the plugin's `name`.

#### Scenario: Plugin exposes a public API
- **GIVEN** a plugin instance declares a `publicApi` object with callable members
- **WHEN** the editor finishes instantiating plugins
- **THEN** that exact object is retrievable from the plugin registry under the plugin's `name`

#### Scenario: Public API is not re-created per consumer
- **WHEN** two different consumers read `api.plugins.<name>`
- **THEN** both receive the same object instance, so state held by the plugin API is shared

### Requirement: Plugins namespace on EditorAPI
The system SHALL expose the registry of plugin public APIs as `api.plugins` on the `EditorAPI` object handed to tools, plugins, and adapters, and on the API surface available to the editor's integrator.

#### Scenario: Consumer calls a plugin API
- **GIVEN** a plugin with `name` `shortcuts` exposes a public API
- **WHEN** the integrator reads `api.plugins.shortcuts` from the editor instance
- **THEN** the plugin's public API object is returned and its methods act on the live plugin instance

#### Scenario: Plugin calls another plugin's API
- **GIVEN** plugin A and plugin B are both registered, and B exposes a public API
- **WHEN** plugin A reads `api.plugins.<B's name>` from the `EditorAPI` it received in its constructor
- **THEN** B's public API is returned regardless of the order in which A and B were registered or constructed

#### Scenario: Unregistered plugin
- **WHEN** a consumer reads `api.plugins.<name>` for a plugin that was never registered
- **THEN** `undefined` is returned rather than throwing

### Requirement: Type-safe plugin API access
The `@editorjs/sdk` package SHALL declare an empty, augmentable `EditorjsPluginApiMap` interface keyed by `name`. `api.plugins` SHALL be typed as `Partial<EditorjsPluginApiMap>` so that a plugin package augmenting the map gives every consumer inferred types without casts.

#### Scenario: Augmented map yields inference
- **GIVEN** a plugin package augments `EditorjsPluginApiMap` with `{ shortcuts: ShortcutsPluginApi }`
- **WHEN** a consumer whose compilation includes that package's types writes `api.plugins.shortcuts`
- **THEN** the expression is typed as `ShortcutsPluginApi | undefined` with no cast required

#### Scenario: Access to an unknown id fails to compile
- **GIVEN** no package has augmented `EditorjsPluginApiMap` with the key `unknownPlugin`
- **WHEN** a consumer writes `api.plugins.unknownPlugin`
- **THEN** compilation fails, because the key is absent from the map

#### Scenario: Declared id must match the augmented key
- **GIVEN** a plugin augments `EditorjsPluginApiMap` under key `shortcuts`
- **WHEN** its static `name` is declared as a different literal
- **THEN** compilation fails, so the runtime key and the type key cannot drift apart

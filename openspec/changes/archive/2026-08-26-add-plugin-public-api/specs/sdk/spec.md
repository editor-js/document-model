## MODIFIED Requirements

### Requirement: Plugin contracts
The system SHALL define `EditorjsPlugin`/`EditorjsPluginConstructor` (generic UI-plugin contract with optional `destroy()`, an optional `publicApi` member, a static `type`, and a static `name`) and `EditorJSAdapterPlugin`/`EditorjsAdapterPluginConstructor` (singleton adapter plugin contract with `createBlockToolAdapter`/`destroyBlockToolAdapter`).

#### Scenario: Destroying a plugin
- **GIVEN** a registered `EditorjsPlugin` implements an optional `destroy()` method
- **WHEN** the editor tears down
- **THEN** `destroy()` is called on the plugin instance to release its resources

#### Scenario: Plugin declares an id and a public API
- **GIVEN** a plugin class declares a static `name` and an instance `publicApi` member
- **WHEN** its type is checked against `EditorjsPluginConstructor`
- **THEN** the `name` literal and the `publicApi` type are both inferred, and a mismatch with the plugin's `EditorjsPluginApiMap` augmentation is a compile error

Implemented in `src/entities/EditorjsPlugin.ts`, `src/entities/EditorjsAdapterPlugin.ts`, `src/entities/EntityType.ts`.

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` type aggregating `BlocksAPI`, `SelectionAPI`, `DocumentAPI`, `TextAPI`, and `PluginsAPI` — the API object passed into tools, plugins, and adapters.

#### Scenario: Tool receives the aggregated API
- **GIVEN** a tool is constructed by the core orchestrator
- **WHEN** its constructor options are built
- **THEN** it receives a single `EditorAPI` object exposing `blocks`, `selection`, `document`, `text`, and `plugins` sub-APIs

#### Scenario: Plugins namespace is typed by the plugin API map
- **GIVEN** `EditorjsPluginApiMap` has been augmented by one or more plugin packages
- **WHEN** `api.plugins` is accessed
- **THEN** it is typed as `Partial<EditorjsPluginApiMap>`, so known ids infer their API type and unknown ids fail to compile

Implemented in `src/api/EditorAPI.ts`, `src/api/{BlocksAPI,DocumentAPI,SelectionAPI,TextAPI,PluginsAPI}.ts`.

## ADDED Requirements

### Requirement: Augmentable plugin type maps
The system SHALL declare two empty, augmentable interfaces — `EditorjsPluginApiMap` (plugin id → public API type) and `ToolPluginOptionsMap` (plugin id → tool-directed options type) — that plugin packages extend via module augmentation of `@editorjs/sdk`.

#### Scenario: Plugin package augments both maps
- **GIVEN** a plugin package declares `declare module '@editorjs/sdk'` augmenting both interfaces under its `name`
- **WHEN** a consumer's compilation includes that package's types
- **THEN** `api.plugins.<name>` and `options.plugins.<name>` are both fully typed with no cast

#### Scenario: No augmentation present
- **GIVEN** no plugin package has augmented either interface
- **WHEN** `@editorjs/sdk` is compiled on its own
- **THEN** both interfaces are empty and `Partial<...>` of them permits no keys, so the base package remains self-consistent

### Requirement: Tool options carry plugin-directed configuration
`BaseToolOptions` SHALL include an optional `plugins` key typed as `Partial<ToolPluginOptionsMap>`, and `BaseToolFacade` SHALL expose an accessor returning the merged slice for a single plugin id.

#### Scenario: Facade merges plugin options
- **GIVEN** a tool's `static options` and the second argument of `use()` both carry a `plugins` key
- **WHEN** the facade's plugin-options accessor is called with a plugin id
- **THEN** it returns that id's configuration with `use()` values taking precedence over the static ones

Implemented in `src/entities/BaseTool.ts`, `src/tools/facades/BaseToolFacade.ts`.

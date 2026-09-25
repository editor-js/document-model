## MODIFIED Requirements

### Requirement: Augmentable plugin type maps
The system SHALL declare three empty, augmentable interfaces — `EditorjsPluginApiMap` (plugin id → public API type), `ToolPluginOptionsMap` (plugin id → tool-directed options type), and `EditorjsPluginDataMap` (plugin id → the shape of the per-block data that plugin stores) — that plugin packages extend via module augmentation of `@editorjs/sdk`. `PluginId` SHALL include the keys of all three maps. `BlocksAPI.getPluginData`/`updatePluginData` SHALL resolve their data type from `EditorjsPluginDataMap` for a declared id, and SHALL fall back to `Record<string, unknown>` for an id absent from it, using a non-distributive conditional so the `string & {}` member of `PluginId` does not widen a declared id's type.

#### Scenario: Plugin package augments both maps
- **GIVEN** a plugin package declares `declare module '@editorjs/sdk'` augmenting both interfaces under its `name`
- **WHEN** a consumer's compilation includes that package's types
- **THEN** `api.plugins.<name>` and `options.plugins.<name>` are both fully typed with no cast

#### Scenario: No augmentation present
- **GIVEN** no plugin package has augmented either interface
- **WHEN** `@editorjs/sdk` is compiled on its own
- **THEN** both interfaces are empty and `Partial<...>` of them permits no keys, so the base package remains self-consistent

#### Scenario: Plugin package declares its block data shape
- **GIVEN** a plugin package augments `EditorjsPluginDataMap` with `{ anchors: { id: string } }`
- **WHEN** a consumer calls `api.blocks.getPluginData({ plugin: 'anchors' })`
- **THEN** the result is typed `{ id: string } | undefined`, and `updatePluginData({ plugin: 'anchors', data: { id: 1 } })` is a compile error

#### Scenario: Plugin data for an undeclared id
- **GIVEN** a plugin that has not augmented `EditorjsPluginDataMap`
- **WHEN** `getPluginData({ plugin: 'whatever' })` is called
- **THEN** the result is typed `Record<string, unknown> | undefined` rather than `never`, so an undeclared plugin still compiles

Implemented in `src/index.ts` (the map declarations, `PluginId`, `PluginsAPI`, `ToolPluginOptions`), `src/api/BlocksAPI.ts`, validated by `src/pluginTypeMaps.spec.ts`.

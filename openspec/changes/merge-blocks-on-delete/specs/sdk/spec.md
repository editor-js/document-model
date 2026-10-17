## MODIFIED Requirements

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` type aggregating `BlocksAPI`, `SelectionAPI`, `DocumentAPI`, `TextAPI`, and `PluginsAPI` — the API object passed into tools, plugins, and adapters. The `BlocksAPI` interface SHALL declare `merge` alongside `split` and `convert` as two overloads — `merge(params: { block: number | string; userId?: string | number }): MergeResult` and `merge(params: { index: Index; userId?: string | number }): MergeResult` — with `MergeResult` exported as `{ block: string; key: string; offset: number }`.

#### Scenario: Tool receives the aggregated API
- **GIVEN** a tool is constructed by the core orchestrator
- **WHEN** its constructor options are built
- **THEN** it receives a single `EditorAPI` object exposing `blocks`, `selection`, `document`, `text`, and `plugins` sub-APIs

#### Scenario: Plugins namespace is typed by the plugin API map
- **GIVEN** `EditorjsPluginApiMap` has been augmented by one or more plugin packages
- **WHEN** `api.plugins` is accessed
- **THEN** it is typed as `Partial<EditorjsPluginApiMap>`, so known ids infer their API type and unknown ids fail to compile

#### Scenario: Merging blocks through the API
- **GIVEN** an adapter, tool or plugin holds an `EditorAPI` instance
- **WHEN** it needs to merge a block into the previous one, or to remove a cross-block range and join its edges
- **THEN** it calls `api.blocks.merge({ block })` or `api.blocks.merge({ index })` and receives the junction as a `MergeResult`

Implemented in `src/api/EditorAPI.ts`, `src/api/{BlocksAPI,DocumentAPI,SelectionAPI,TextAPI,PluginsAPI}.ts`.

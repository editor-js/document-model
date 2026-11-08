# SDK

## Purpose

`@editorjs/sdk` is the shared-contracts package that tools, plugins, and adapters depend on. It provides type-only interfaces for block tools, inline tools, and plugins; the concrete `BlockToolAdapter` base class bridging model events to per-block DOM adapters; the `EventBus`/typed event class hierarchy; and the `EditorAPI` surface passed into tools and plugins. It has no dependency on `@editorjs/core` or `@editorjs/model` directly, letting tool authors depend only on this package.
## Requirements
### Requirement: Typed EventBus for channel:name events
The system SHALL re-export `EventBus` (a thin `EventTarget` subclass defined in `@editorjs/model-types`) and augment `EventTarget`/`addEventListener`/`removeEventListener` typings so listeners are typed by a `` `${Channel}:${Name}` `` event-type template.

#### Scenario: Subscribing to a typed core event
- **GIVEN** a consumer holds a reference to an `EventBus` instance
- **WHEN** it calls `addEventListener('core:block:added', handler)`
- **THEN** the handler is typed to receive the corresponding `CoreEventBase` subclass (e.g. `BlockAddedCoreEvent`) with its specific payload type

Since `EventBus` itself carries no custom subscribe/unsubscribe/error-handling logic, its dispatch semantics (multiple listeners, synchronous order, no built-in error isolation between listeners) are exactly native `EventTarget`/`CustomEvent` semantics.

Implemented in `src/entities/EventBus/EventBus.ts`, `Event.ts`, `events/core/*`, `events/ui/*`, `events/adapter/*` (base classes `CoreEventBase`, `UIEventBase`; enums `CoreEventType`, `AdapterEventType`).

### Requirement: Tools collection
The system SHALL provide a `ToolsCollection` (a `Map<string, ToolFacadeClass>` subclass) exposing filtered `blockTools`/`inlineTools` views over registered tool facades.

#### Scenario: Filtering registered facades by kind
- **GIVEN** a `ToolsCollection` containing a mix of block tool and inline tool facades
- **WHEN** `blockTools` or `inlineTools` is accessed
- **THEN** each getter returns only the facades matching that kind

Implemented in `src/tools/ToolsCollection.ts`, validated by its co-located `.spec.ts`.

### Requirement: BlockToolAdapter bridges model events to per-block DOM state
The system SHALL provide an abstract `BlockToolAdapter` (extending `EventTarget`) that subscribes to `api.document.onUpdate`, translates model-level `DataNodeAddedEvent`/`DataNodeRemovedEvent`/`ValueModifiedEvent` into adapter-level `KeyAddedEvent`/`KeyRemovedEvent`/`ValueNodeChangedEvent` dispatched on itself, and exposes `registerTextInputKey`, `registerValueKey`, `removeKey`, and `destroy()`.

#### Scenario: Cleaning up an adapter
- **GIVEN** a `BlockToolAdapter` instance is subscribed to model updates
- **WHEN** `destroy()` is called
- **THEN** it unsubscribes its model listener so no further translated events are dispatched

Implemented in `src/entities/BlockToolAdapter.ts`.

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

### Requirement: Keyboard shortcut matching and keypath utilities
The system SHALL provide `matchKeyboardShortcut(event, shortcutString)` to test a `KeyboardEvent` against a shortcut string (e.g. `CMD+SHIFT+H`), and re-export the keypath utilities (`get`/`set`/`has`/`insert`/`remove`/`renumberKeys`) from `@editorjs/model-types`.

#### Scenario: Matching a shortcut string
- **GIVEN** a `KeyboardEvent` and a shortcut string such as `CMD+SHIFT+H`
- **WHEN** `matchKeyboardShortcut(event, 'CMD+SHIFT+H')` is called
- **THEN** it returns `true` only if the event's modifier keys and key code match the shortcut string exactly

Implemented in `src/utils/keyboardShortcut.ts`, `src/utils/keypath.ts`.

### Requirement: Augmentable plugin type maps
The system SHALL declare three empty, augmentable interfaces — `EditorjsPluginApiMap` (plugin id → public API type), `ToolPluginOptionsMap` (plugin id → tool-directed options type), and `EditorjsPluginDataMap` (plugin id → the shape of the per-block data that plugin stores) — that plugin packages extend via module augmentation of `@editorjs/sdk`. `PluginId` SHALL include the keys of all three maps. `BlocksAPI.getPluginData`/`updatePluginData` SHALL resolve their data type from `EditorjsPluginDataMap` for a declared id, and SHALL fall back to `Record<string, unknown>` for an id absent from it, using a non-distributive conditional so the `string & {}` member of `PluginId` does not widen a declared id's type.

#### Scenario: Plugin package augments both maps
- **GIVEN** a plugin package declares `declare module '@editorjs/sdk'` augmenting `EditorjsPluginApiMap` and `ToolPluginOptionsMap` under its `name`
- **WHEN** a consumer's compilation includes that package's types
- **THEN** `api.plugins.<name>` and `options.plugins.<name>` are both fully typed with no cast

#### Scenario: No augmentation present
- **GIVEN** no plugin package has augmented any of the three interfaces
- **WHEN** `@editorjs/sdk` is compiled on its own
- **THEN** all three are empty and `Partial<...>` of them permits no keys, so the base package remains self-consistent

#### Scenario: Plugin package declares its block data shape
- **GIVEN** a plugin package augments `EditorjsPluginDataMap` with `{ anchors: { id: string } }`
- **WHEN** a consumer calls `api.blocks.getPluginData({ plugin: 'anchors' })`
- **THEN** the result is typed `{ id: string } | undefined`, and `updatePluginData({ plugin: 'anchors', data: { id: 1 } })` is a compile error

#### Scenario: Plugin data for an undeclared id
- **GIVEN** a plugin that has not augmented `EditorjsPluginDataMap`
- **WHEN** `getPluginData({ plugin: 'whatever' })` is called
- **THEN** the result is typed `Record<string, unknown> | undefined` rather than `never`, so an undeclared plugin still compiles

Implemented in `src/index.ts` (the map declarations, `PluginId`, `PluginsAPI`, `ToolPluginOptions`), `src/api/BlocksAPI.ts`, validated by `src/pluginTypeMaps.spec.ts`.

### Requirement: Tool options carry plugin-directed configuration
`BaseToolOptions` SHALL include an optional `plugins` key typed as `Partial<ToolPluginOptionsMap>`, and `BaseToolFacade` SHALL expose an accessor returning the merged slice for a single plugin id.

#### Scenario: Facade merges plugin options
- **GIVEN** a tool's `static options` and the second argument of `use()` both carry a `plugins` key
- **WHEN** the facade's plugin-options accessor is called with a plugin id
- **THEN** it returns that id's configuration with `use()` values taking precedence over the static ones

Implemented in `src/entities/BaseTool.ts`, `src/tools/facades/BaseToolFacade.ts`.

### Requirement: Tool contracts
The system SHALL define the static/instance contracts that block tools and inline tools must satisfy: `BaseTool`/`BaseToolConstructor` (common `name`, `options`, `prepare()`, `reset()`), `BlockTool`/`BlockToolConstructor` (adds `toolbox`, `shortcut`, `inlineToolbar`, `conversionConfig`, `canBeSplit`), and `InlineTool`/`InlineToolConstructor` (adds `isActive`, `getFormattingOptions`, `createWrapper`, `getToolbarConfig`). The SDK SHALL NOT define a Block Tune tool kind: per-block settings and per-block data are provided by plugins (see `block-settings` and `plugin-block-data`), and `ToolType` SHALL have no `Tune` member. `ToolConfig` SHALL be an SDK-owned contract (not a re-exported passthrough from `@editorjs/editorjs`), kept formally distinct from `ToolOptions`: `options` describes core/plugin-facing wiring available before any block instance exists, while `ToolConfig` describes tool-author-facing user data resolved per tool registration. A tool's static `options` SHALL be either a plain options object or a synchronous factory taking the tool's `ToolConfig` and returning that options object; the facade SHALL resolve the factory exactly once, at construction, and serve every option-reading getter from that resolved value without writing it back onto the tool class.

#### Scenario: Options and config merging in a tool facade
- **GIVEN** a tool class has static `options` (and optionally `options.config` typed as `ToolConfig`)
- **WHEN** the tool is registered via `use(Tool, options)` with overriding options
- **THEN** the facade's `options` getter merges the tool's resolved static options with `use()`-time options, with `use()`-time keys taking precedence, and the `config` getter merges similarly, injecting `defaultPlaceholder` only when `isDefault` is true and no `placeholder` key is already present

#### Scenario: Resolving static options from a config factory
- **GIVEN** a tool class declares `static options` as a function of its `ToolConfig` rather than as a plain object
- **WHEN** its facade is constructed for a registration made via `use(Tool, { config })`
- **THEN** the function is invoked exactly once with the `config` supplied at `use()` time, its returned options object becomes the tool's resolved static options for that facade, and the tool class's own `options` property is left untouched

#### Scenario: Deriving a toolbox entry from a config value
- **GIVEN** a block tool's `options` factory computes `toolbox` entries from a field of the config it receives
- **WHEN** the facade's `toolbox` getter is read
- **THEN** the entries reflect the config supplied at `use()` time, and any explicit `use()`-time `toolbox` override is merged on top using the existing array/object positional-merge algorithm, with a `use()`-time `toolbox: false` still hiding the tool from the toolbox

#### Scenario: Isolating factory-derived options per facade instance
- **GIVEN** two `Core` instances each register the same tool class through `use()` with a different `config`
- **WHEN** each instance's facade resolves the tool's `options` factory
- **THEN** each facade holds its own resolved options and neither instance's derived values are observable from the other

#### Scenario: Text content conversion without config
- **GIVEN** a block tool has no `conversionConfig`
- **WHEN** `exportTextContent`/`importTextContent` is called on its facade
- **THEN** it throws a descriptive error stating the tool does not have export/import configuration

#### Scenario: Text content conversion with a keypath
- **GIVEN** a block tool's `conversionConfig` specifies a dot-notation string key (including nested array paths, e.g. `items.0.text`)
- **WHEN** `exportTextContent`/`importTextContent` is called
- **THEN** the value at that keypath is read/written, producing or consuming a `TextNodeSerialized` value tagged with the hidden `Text` block-child-type marker

#### Scenario: No tune tool kind
- **WHEN** the SDK's public exports are inspected
- **THEN** there is no `BlockTune`, `BlockTuneConstructor`, `BlockTuneOptions`, `BlockTuneFacade`, or `ToolType.Tune`, and `BlockToolConstructor` has no `tunes` member

Implemented in `src/entities/BaseTool.ts`, `BlockTool.ts`, `InlineTool.ts`, `src/tools/facades/{BaseToolFacade,BlockToolFacade,InlineToolFacade}.ts`, validated by `src/tools/facades/BaseToolFacade.spec.ts`.


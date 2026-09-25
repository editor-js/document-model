## ADDED Requirements

### Requirement: Namespaced plugin options on tools
Tool options SHALL include a `plugins` key whose sub-keys are plugin ids, each holding the configuration that tool addresses to that plugin. The key SHALL be available both in a tool's `static options` and in the second argument of `core.use(Tool, options)`.

#### Scenario: Tool declares plugin-directed configuration
- **GIVEN** a tool declares `static options = { plugins: { shortcuts: { shortcut: 'CMD+B' } } }`
- **WHEN** the tool is prepared
- **THEN** the `shortcuts` plugin can read `{ shortcut: 'CMD+B' }` as that tool's configuration for it

#### Scenario: Tool declares nothing for a plugin
- **GIVEN** a tool declares no `plugins` key, or omits a given plugin id from it
- **WHEN** a plugin reads its slice for that tool
- **THEN** `undefined` is returned and the plugin takes no action for that tool

#### Scenario: Plugin options do not collide with core option keys
- **GIVEN** a plugin id equal to an existing tool option name such as `toolbox`
- **WHEN** a tool declares configuration for that plugin under `plugins`
- **THEN** the core option of the same name is unaffected, because plugin configuration lives in its own namespace

### Requirement: Merging of plugin options
Plugin-directed options SHALL merge per plugin id, with values supplied in `core.use(Tool, options)` overriding the tool's `static options`. Plugin ids present in only one of the two sources SHALL be preserved.

#### Scenario: Integrator overrides a tool's plugin configuration
- **GIVEN** a tool declares `static options = { plugins: { shortcuts: { shortcut: 'CMD+B' } } }`
- **WHEN** it is registered as `core.use(Tool, { plugins: { shortcuts: { shortcut: 'CMD+SHIFT+B' } } })`
- **THEN** the `shortcuts` plugin reads `CMD+SHIFT+B` for that tool

#### Scenario: Disjoint plugin ids are preserved
- **GIVEN** a tool's `static options` configure plugin `a` and the `use()` argument configures plugin `b`
- **WHEN** the merged options are computed
- **THEN** both `a` and `b` configurations are present

#### Scenario: Override replaces a plugin's slice
- **GIVEN** a tool's `static options` configure plugin `a` with two keys
- **WHEN** the `use()` argument supplies a configuration for plugin `a` containing only one of them
- **THEN** the slice supplied through `use()` wins for that plugin id, matching the precedence of the surrounding tool options

### Requirement: Plugin reads its own slice from a tool facade
A tool facade SHALL expose an accessor returning the merged plugin-options slice for a single plugin id, so a plugin reads only the configuration addressed to it and never inspects raw option keys.

#### Scenario: Plugin reads a tool's configuration for itself
- **GIVEN** a plugin observes a tool-loaded event carrying a tool facade
- **WHEN** it requests its own slice by its `name`
- **THEN** it receives the merged configuration for that plugin id only, without access to other plugins' slices

### Requirement: Type-safe plugin options
The `@editorjs/sdk` package SHALL declare an empty, augmentable `ToolPluginOptionsMap` interface keyed by `name`. The `plugins` key on tool options SHALL be typed as `Partial<ToolPluginOptionsMap>`, and the facade accessor SHALL return the mapped type for the requested id.

#### Scenario: Augmented map types a tool's declaration
- **GIVEN** a plugin package augments `ToolPluginOptionsMap` with `{ shortcuts: { shortcut: string } }`
- **WHEN** a tool declares `plugins: { shortcuts: { shortcut: 42 } }`
- **THEN** compilation fails on the type of `shortcut`

#### Scenario: Facade accessor is typed by id
- **GIVEN** `ToolPluginOptionsMap` is augmented with `{ shortcuts: ShortcutsToolOptions }`
- **WHEN** a plugin requests the slice for id `shortcuts`
- **THEN** the result is typed as `ShortcutsToolOptions | undefined` with no cast required

#### Scenario: Configuration for an unknown plugin in the use() argument fails to compile
- **GIVEN** no package has augmented `ToolPluginOptionsMap` with the key `unknownPlugin`
- **WHEN** an integrator calls `core.use(Tool, { plugins: { unknownPlugin: { ... } } })`
- **THEN** compilation fails, because the argument is a fresh object literal checked against `Partial<ToolPluginOptionsMap>`

#### Scenario: A tool's static options are checked only when the author opts in
- **GIVEN** a tool declares `static options` with a `plugins` key
- **WHEN** the declaration carries no contextual type, or the tool's compilation includes no augmentation of `ToolPluginOptionsMap`
- **THEN** no compile error is raised for an unknown plugin id, because TypeScript excess-property-checks only fresh literals against a non-empty target
- **AND** adding `satisfies` together with the plugin package's types makes the same declaration fail to compile

#### Scenario: Registering a tool does not validate its declared plugin ids
- **GIVEN** a tool whose `static options.plugins` addresses an id absent from `ToolPluginOptionsMap`
- **WHEN** it is passed to `core.use(Tool)`
- **THEN** registration compiles, because a constructor is checked by structural assignability where extra properties are legal, and an unrecognised slice is ignored at runtime

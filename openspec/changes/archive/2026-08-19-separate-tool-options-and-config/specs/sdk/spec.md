## MODIFIED Requirements

### Requirement: Tool and tune contracts
The system SHALL define the static/instance contracts that block tools, inline tools, and block tunes must satisfy: `BaseTool`/`BaseToolConstructor` (common `name`, `options`, `prepare()`, `reset()`), `BlockTool`/`BlockToolConstructor` (adds `toolbox`, `shortcut`, `inlineToolbar`, `tunes`, `conversionConfig`, `canBeSplit`), `InlineTool`/`InlineToolConstructor` (adds `isActive`, `getFormattingOptions`, `createWrapper`, `getToolbarConfig`), and `BlockTune`/`BlockTuneConstructor`. `ToolConfig` SHALL be an SDK-owned contract (not a re-exported passthrough from `@editorjs/editorjs`), kept formally distinct from `ToolOptions`: `options` describes core/plugin-facing wiring available before any block instance exists, while `ToolConfig` describes tool-author-facing user data resolved per tool registration. A tool's static `options` SHALL be either a plain options object or a synchronous factory taking the tool's `ToolConfig` and returning that options object; the facade SHALL resolve the factory exactly once, at construction, and serve every option-reading getter from that resolved value without writing it back onto the tool class.

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

Implemented in `src/entities/BaseTool.ts`, `BlockTool.ts`, `InlineTool.ts`, `BlockTune.ts`, `src/tools/facades/{BaseToolFacade,BlockToolFacade,InlineToolFacade,BlockTuneFacade}.ts`, validated by `src/tools/facades/BaseToolFacade.spec.ts`.

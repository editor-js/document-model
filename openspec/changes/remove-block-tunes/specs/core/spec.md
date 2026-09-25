## MODIFIED Requirements

### Requirement: Tool registration and validation
The system SHALL validate configured tools via `ToolsManager`, calling each tool's static `prepare()`, and sorting tools into `available`/`unavailable` collections exposed as `blockTools`/`inlineTools`. `Core#use` SHALL accept block tools, inline tools, adapter plugins, and generic plugins; there SHALL be no separate Block Tune registration path.

#### Scenario: Rejecting a malformed tool
- **GIVEN** a configured tool is neither a constructor function nor an object with a `class` property
- **WHEN** `ToolsManager` validates the configuration
- **THEN** it throws an error naming the offending tool and describing the required shape

#### Scenario: A former tune is registered as a plugin
- **GIVEN** a class implementing `EditorjsPlugin` that does what a Block Tune used to do
- **WHEN** it is registered via `core.use()`
- **THEN** it is instantiated with the other plugins and never appears in `ToolsManager`'s collections

Implemented in `src/tools/ToolsManager.ts`, `src/tools/ToolsFactory.ts`, validated by co-located `.spec.ts` files.

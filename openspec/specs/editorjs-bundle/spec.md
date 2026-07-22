# editorjs-bundle Specification

## Purpose
TBD - created by archiving change add-editorjs-bundle-package. Update Purpose after archive.
## Requirements
### Requirement: Batteries-included editor entry point
The system SHALL provide `@editorjs/editorjs`, a package whose default export is an `EditorJS` class that composes `@editorjs/core` with a default set of tools, plugins, infrastructure, and UI so that a caller can construct a fully functional editor from configuration alone.

#### Scenario: Default composition
- **GIVEN** a caller constructs `new EditorJS(config)`
- **WHEN** the instance is created
- **THEN** it registers the DOM adapter (`DOMAdapters`), collaboration (`CollaborationManager`), default block tool (paragraph), default inline tools (bold, italic, link), default plugins (clipboard), and the default UI packages on the underlying `Core` before initialization

#### Scenario: Delegates the engine to Core
- **GIVEN** `EditorJS` composes the editor
- **WHEN** it needs engine behavior (model, block rendering, `EditorAPI`, undo/redo)
- **THEN** it delegates to an internal `@editorjs/core` `Core` instance rather than reimplementing engine logic

### Requirement: Constructor auto-initialization with readiness promise
The `EditorJS` class SHALL begin initialization from within its constructor and expose an `isReady` promise that resolves when the editor has finished initializing and rejects if initialization fails.

#### Scenario: Awaiting readiness
- **GIVEN** a caller constructs `new EditorJS(config)`
- **WHEN** the caller awaits `editor.isReady`
- **THEN** the promise resolves after the underlying `Core.initialize()` completes and the editor is ready for interaction

#### Scenario: Initialization failure rejects readiness
- **GIVEN** initialization throws (e.g. an invalid configuration)
- **WHEN** the caller awaits `editor.isReady`
- **THEN** the promise rejects with the initialization error

### Requirement: v2-style tool configuration with override-by-name
The `EditorJS` class SHALL accept a v2-style `config.tools` map of tool name to tool constructor and merge it on top of the default tools, where a user-provided tool replaces a default tool that has the same name.

#### Scenario: Adding a user tool
- **GIVEN** `config.tools` contains a tool under a name not used by any default tool
- **WHEN** the editor is composed
- **THEN** that tool is registered in addition to all default tools

#### Scenario: Overriding a default tool by name
- **GIVEN** `config.tools` contains a tool under a name that matches a default tool (e.g. `paragraph`)
- **WHEN** the editor is composed
- **THEN** the user-provided tool replaces the default tool of that name, and the default is not also registered


## MODIFIED Requirements

### Requirement: Batteries-included editor entry point
The system SHALL provide `@editorjs/editorjs`, a package whose default export is an `EditorJS` class that composes `@editorjs/core` with a default set of tools, plugins, infrastructure, and UI so that a caller can construct a fully functional editor from configuration alone.

#### Scenario: Default composition
- **GIVEN** a caller constructs `new EditorJS(config)`
- **WHEN** the instance is created
- **THEN** it registers the DOM adapter (`DOMAdapters`), collaboration (`CollaborationManager`), default block tool (paragraph), default inline tools (bold, italic, link), default plugins (clipboard, shortcuts, block actions), and the default UI packages (including `BlockSettingsUI`) on the underlying `Core` before initialization

#### Scenario: Delegates the engine to Core
- **GIVEN** `EditorJS` composes the editor
- **WHEN** it needs engine behavior (model, block rendering, `EditorAPI`, undo/redo)
- **THEN** it delegates to an internal `@editorjs/core` `Core` instance rather than reimplementing engine logic

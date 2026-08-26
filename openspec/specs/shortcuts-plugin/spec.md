# Shortcuts Plugin

## Purpose

`@editorjs/shortcuts-plugin` is a built-in `EditorjsPlugin` that maps keyboard shortcuts declared in a tool's `options.shortcut` to inline-tool application through the `EditorAPI`. It subscribes to tool-loaded events to collect shortcuts and to delegated keydown events to dispatch them.

## Requirements

### Requirement: Keyboard shortcuts plugin
The system SHALL provide a `ShortcutsPlugin` (an `EditorjsPlugin`) that, on construction, subscribes to the `core:tool:loaded` and `ui:key-down` events, registers each loaded tool's string `options.shortcut`, and applies the matching inline tool to the current selection via the `EditorAPI` when its shortcut is pressed.

#### Scenario: Registering a shortcut from a loaded tool
- **GIVEN** a tool is loaded whose merged `options.shortcut` is a string (e.g. `CMD+B`)
- **WHEN** the `core:tool:loaded` event fires
- **THEN** the plugin registers a mapping from that shortcut string to the tool's name

#### Scenario: Ignoring tools without a string shortcut
- **GIVEN** a tool is loaded whose `options.shortcut` is absent or is not a string
- **WHEN** the `core:tool:loaded` event fires
- **THEN** the plugin registers no shortcut for that tool

#### Scenario: Triggering an inline tool via shortcut
- **GIVEN** an inline tool is registered with `options.shortcut` set to a key combination (e.g. `CMD+B`)
- **WHEN** that key combination is pressed while the editor has focus
- **THEN** the plugin prevents the native event's default action and applies the corresponding inline tool to the current selection via `api.selection.applyInlineTool`

#### Scenario: Matching only the first registered shortcut
- **GIVEN** more than one registered shortcut would match the keydown
- **WHEN** the `ui:key-down` event fires
- **THEN** the plugin applies only the first matching tool and stops

#### Scenario: Ignoring keydown during IME composition
- **GIVEN** the native keydown event has `isComposing === true`
- **WHEN** the `ui:key-down` event fires
- **THEN** the plugin performs no matching and leaves the native event untouched

#### Scenario: Tolerating a missing caret when applying a tool
- **GIVEN** applying the inline tool throws an `IndexError` (e.g. no caret in a text input)
- **WHEN** a matching shortcut is dispatched
- **THEN** the plugin swallows the error and leaves the editor unchanged, while any other error propagates

#### Scenario: Releasing shortcuts on destroy
- **GIVEN** a `ShortcutsPlugin` instance has registered shortcuts
- **WHEN** `destroy()` is called
- **THEN** it clears the registered shortcuts so subsequent keydowns dispatch nothing

Shortcuts for block tools and block tunes (a `shortcuts` map in tool `options`) are reserved for future work and not yet implemented.

Implemented in `src/index.ts`, validated by its co-located `.spec.ts`.

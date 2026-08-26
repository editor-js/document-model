## MODIFIED Requirements

### Requirement: Keyboard shortcuts plugin
The system SHALL provide a `ShortcutsPlugin` (an `EditorjsPlugin` with `name` `shortcuts`) that, on construction, subscribes to the `core:tool:loaded` and `ui:key-down` events, registers the string `shortcut` each loaded tool addresses to it under `options.plugins.shortcuts`, applies the matching inline tool to the current selection via the `EditorAPI` when its shortcut is pressed, and exposes a public API for registering and unregistering shortcuts at runtime. Tool-declared and API-registered shortcuts SHALL share one table, so a shortcut always resolves to exactly one handler.

#### Scenario: Registering a shortcut from a loaded tool
- **GIVEN** a tool is loaded whose `options.plugins.shortcuts.shortcut` is a string (e.g. `CMD+B`)
- **WHEN** the `core:tool:loaded` event fires
- **THEN** the plugin registers a handler for that shortcut string which applies the tool

#### Scenario: Ignoring tools without a string shortcut
- **GIVEN** a tool is loaded that addresses no slice to the `shortcuts` plugin, or whose `options.plugins.shortcuts.shortcut` is absent or is not a string
- **WHEN** the `core:tool:loaded` event fires
- **THEN** the plugin registers no shortcut for that tool

#### Scenario: Legacy flat shortcut key is ignored
- **GIVEN** a tool declares a flat `options.shortcut` and no `options.plugins.shortcuts`
- **WHEN** that key combination is pressed
- **THEN** no inline tool is applied, since shortcuts are sourced only from the namespaced key

#### Scenario: Triggering an inline tool via shortcut
- **GIVEN** an inline tool is registered with `options.plugins.shortcuts.shortcut` set to a key combination (e.g. `CMD+B`)
- **WHEN** that key combination is pressed while the editor has focus
- **THEN** the plugin prevents the native event's default action and applies the corresponding inline tool to the current selection via `api.selection.applyInlineTool`

#### Scenario: Registering a shortcut at runtime
- **GIVEN** an integrator holds `api.plugins.shortcuts`
- **WHEN** a shortcut and handler are registered through that public API
- **THEN** pressing the shortcut invokes the handler, and unregistering it through the same API stops further invocations

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

Shortcuts for block tools and block tunes (a `shortcuts` map under `options.plugins.shortcuts`) are reserved for future work and not yet implemented.

Implemented in `src/index.ts`, validated by its co-located `.spec.ts`.

## ADDED Requirements

### Requirement: UI teardown
Every UI plugin other than `BlocksUI` (`EditorjsUI`, `ToolbarUI`, `ToolboxUI`, `InlineToolbarUI`) SHALL remove each EventBus listener it registered and every DOM node it created when its `destroy()` is called. `EditorjsUI.destroy()` SHALL remove the editor wrapper from the holder and leave the holder element and any content the integrator put in it untouched. `BlocksUI` teardown is covered by #174 (the `remove-blocks-ui-listeners-on-destroy` change), so this change has no `BlocksUI` implementation.

#### Scenario: The editor wrapper is removed
- **GIVEN** `EditorjsUI` appended its wrapper to the holder
- **WHEN** `destroy()` is called
- **THEN** the wrapper is no longer in the DOM, and the holder stays in the DOM with any of its other children

#### Scenario: UI plugins stop reacting to events
- **GIVEN** `EditorjsUI`, `ToolbarUI`, `ToolboxUI`, and `InlineToolbarUI` are destroyed
- **WHEN** `ui:*` or `core:*` events they used to handle are dispatched on the EventBus
- **THEN** no UI plugin renders, appends, or dispatches anything in response

#### Scenario: Popovers are released
- **GIVEN** the toolbox or inline toolbar created a popover
- **WHEN** the owning plugin is destroyed
- **THEN** the popover is destroyed and its DOM removed

## ADDED Requirements

### Requirement: Adapter teardown
`DOMAdapters` SHALL implement `destroy()`. It SHALL destroy every `DOMBlockToolAdapter` still alive and clear the `InputsRegistry`, stop `CaretAdapter` watching DOM selection changes and model caret updates, stop `FormattingAdapter` listening to `core:ToolLoaded` and model updates, and call `destroy()` on the inline tool instances `FormattingAdapter` holds. The shared `selectionchange` watcher SHALL remove its `document` listener once its last subscriber unsubscribes, and add it back on the next subscription.

#### Scenario: Caret adapter stops tracking the holder
- **GIVEN** an initialized `DOMAdapters`
- **WHEN** `destroy()` is called and a `selectionchange` event then fires inside the holder
- **THEN** the model caret isn't updated, and later model caret updates don't change the DOM selection

#### Scenario: Remaining block adapters are destroyed
- **GIVEN** block adapters created for several blocks that haven't been removed
- **WHEN** `destroy()` is called
- **THEN** each adapter's `destroy()` runs, removing its model and `ui:beforeinput` listeners, and the inputs registry is empty

#### Scenario: Formatting adapter releases inline tools
- **GIVEN** inline tools attached to `FormattingAdapter` through `core:ToolLoaded`
- **WHEN** `destroy()` is called
- **THEN** each attached inline tool instance's `destroy()` is called, and later model formatting events don't touch the DOM

#### Scenario: Two editors on one page
- **GIVEN** two editors are initialized on the same page and share the `selectionchange` watcher
- **WHEN** the first editor is destroyed
- **THEN** the second editor still receives selection changes, and the `document` listener is removed only after the second editor is destroyed too

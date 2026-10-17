## ADDED Requirements

### Requirement: Tool-facing input events
The system SHALL forward native `keydown` and `beforeinput` events to the block tool owning the selection as cancelable, bubbling DOM `CustomEvent`s named `editor:keydown` and `editor:beforeinput`, dispatched on the input element registered for the data key holding the selection start. Each event's `detail` SHALL carry the native event as `nativeEvent`, the data `key` and the `range` of the selection inside that input, and `inputs`, every input of the block the selection touches in document order with its range. Events SHALL be forwarded only when the selection lies within registered inputs of a single block. Cancelling a forwarded event SHALL skip the editor's default handling of the native event; cancelling `editor:keydown` SHALL also call `preventDefault()` on the native `KeyboardEvent`. `editor:keydown` SHALL be dispatched before any plugin other than the rendering adapter receives the `KeydownUIEvent`.

#### Scenario: A tool listens on its wrapper
- **GIVEN** a block tool added an `editor:beforeinput` listener to the wrapper element containing its inputs
- **WHEN** a `beforeinput` event fires while the caret is inside one of those inputs
- **THEN** the listener receives an `editor:beforeinput` event whose `target` is that input element and whose `detail` carries the native `InputEvent`, the input's data key, and the caret offsets inside it

#### Scenario: A tool takes over Enter
- **GIVEN** a block tool cancels `editor:beforeinput` events whose `nativeEvent.inputType` is `insertParagraph`
- **WHEN** the user presses Enter inside the tool's input
- **THEN** `api.blocks.split` is not called and no text is removed, inserted, or moved by the adapter

#### Scenario: A tool takes over a key that produces no input
- **GIVEN** a block tool cancels `editor:keydown` events whose `nativeEvent.key` is `Tab`
- **WHEN** the user presses Tab inside the tool's input
- **THEN** the native `keydown` event is default-prevented, focus stays in the editor, and plugin listeners for `KeydownUIEvent` observe the key as already claimed

#### Scenario: The tool sees a key before plugins
- **GIVEN** the shortcuts plugin has a shortcut registered for a key, and a block tool cancels `editor:keydown` for that same key
- **WHEN** the key is pressed inside the tool's input
- **THEN** the tool's listener runs first and the shortcut handler is not invoked

#### Scenario: No listener cancels
- **GIVEN** a block tool that does not cancel `editor:keydown` or `editor:beforeinput`
- **WHEN** any key or input action happens inside its inputs
- **THEN** the adapter, `BlocksUI`, and plugins handle it exactly as they would without the forwarded events

#### Scenario: Backspace at the start of a block
- **GIVEN** a collapsed caret at offset 0 of a block's first input, so the native event's target range starts in the previous block
- **WHEN** a `deleteContentBackward` `beforeinput` event fires
- **THEN** `editor:beforeinput` is dispatched on that block's input with `range` `[0, 0]`, because routing follows the selection rather than the target range

#### Scenario: Selection spanning several inputs of one block
- **GIVEN** a non-collapsed selection that starts in one input of a block and ends in another input of the same block
- **WHEN** a `beforeinput` event fires
- **THEN** `editor:beforeinput` is dispatched once, on the input holding the selection start, with `inputs` listing every touched input of the block and its range

#### Scenario: Selection spanning blocks
- **GIVEN** a selection that starts in one block and ends in another
- **WHEN** a `keydown` or `beforeinput` event fires
- **THEN** no `editor:keydown` or `editor:beforeinput` event is dispatched and the default handling runs

#### Scenario: Events during IME composition
- **GIVEN** an IME composition is in progress inside a tool's input
- **WHEN** `keydown` or `beforeinput` events fire
- **THEN** they are forwarded with `nativeEvent.isComposing` set to `true`, and are not filtered by the adapter

Implemented in `src/index.ts`, `src/BlockToolAdapter/index.ts`, `src/events/*`.

## MODIFIED Requirements

### Requirement: Block-level DOM binding and input translation
The system SHALL provide `DOMBlockToolAdapter`, attached by tools to a contenteditable element for a model data key, which intercepts `beforeinput` events and applies model text-add/remove events back into the DOM. The default handling of a `beforeinput` event SHALL run only when the forwarded `editor:beforeinput` event for it was not cancelled, or when none was dispatched.

#### Scenario: Text insertion via beforeinput
- **GIVEN** a `beforeinput` event of type `insertText`, `insertCompositionText`, `insertFromPaste`, `insertFromDrop`, or `insertReplacementText`
- **WHEN** it fires on a bound input and the forwarded `editor:beforeinput` event is not cancelled
- **THEN** the adapter computes the absolute offset and calls `api.text.insert(...)`, letting the model — not the browser — own the DOM mutation

#### Scenario: Deleting across a cross-input selection
- **GIVEN** a non-collapsed selection where the input is the "middle" block of a multi-block selection
- **WHEN** a delete `beforeinput` event fires
- **THEN** the adapter calls `api.blocks.delete` (whole-block delete) instead of removing a text range

#### Scenario: Splitting a block on Enter
- **GIVEN** the caret is within a bound input
- **WHEN** an `insertParagraph` `beforeinput` event fires and the forwarded `editor:beforeinput` event is not cancelled
- **THEN** any selected text is removed, `api.blocks.split` is called, and after the next animation frame the caret moves to offset `[0,0]` of the newly created next block

#### Scenario: Model-to-DOM text sync
- **GIVEN** a `TextAddedEvent` or `TextRemovedEvent` affects a bound input's data key
- **WHEN** the event is received
- **THEN** the adapter inserts/deletes DOM text nodes at the mapped boundary point, normalizes the node, and updates the caret index to the new position

Implemented in `src/BlockToolAdapter/index.ts`, `src/BlockToolAdapter/types/InputType.ts`.

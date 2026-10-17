## ADDED Requirements

### Requirement: Tool-facing keyboard events
The system SHALL forward native `keydown` events to the block tool owning the selection as a cancelable, bubbling DOM `CustomEvent` named `editor:keydown`, dispatched on the input element registered for the data key holding the selection start. The event's `detail` SHALL carry the native `KeyboardEvent` as `nativeEvent`, the data `key` and the `range` of the selection inside that input, and `inputs`, every input of the block the selection touches in document order with its range. The event SHALL be forwarded only when the selection lies within registered inputs of a single block. Cancelling `editor:keydown` SHALL call `preventDefault()` on the native `KeyboardEvent`. `editor:keydown` SHALL be dispatched before any plugin other than the rendering adapter receives the `KeydownUIEvent`.

#### Scenario: A tool listens on its wrapper
- **GIVEN** a block tool added an `editor:keydown` listener to the wrapper element containing its inputs
- **WHEN** a key is pressed while the caret is inside one of those inputs
- **THEN** the listener receives an `editor:keydown` event whose `target` is that input element and whose `detail` carries the native `KeyboardEvent`, the input's data key, and the caret offsets inside it

#### Scenario: A tool takes over Enter
- **GIVEN** a block tool cancels `editor:keydown` events whose `nativeEvent.key` is `Enter`
- **WHEN** the user presses Enter inside the tool's input
- **THEN** the native `keydown` event is default-prevented, so no `insertParagraph` input is produced and `api.blocks.split` is not called

#### Scenario: A tool takes over Tab
- **GIVEN** a block tool cancels `editor:keydown` events whose `nativeEvent.key` is `Tab`
- **WHEN** the user presses Tab inside the tool's input
- **THEN** the native `keydown` event is default-prevented, focus stays in the editor, and plugin listeners for `KeydownUIEvent` observe the key as already claimed

#### Scenario: The tool sees a key before plugins
- **GIVEN** the shortcuts plugin has a shortcut registered for a key, and a block tool cancels `editor:keydown` for that same key
- **WHEN** the key is pressed inside the tool's input
- **THEN** the tool's listener runs first and the shortcut handler is not invoked

#### Scenario: No listener cancels
- **GIVEN** a block tool that does not cancel `editor:keydown`
- **WHEN** any key is pressed inside its inputs
- **THEN** the adapter, `BlocksUI`, and plugins handle it exactly as they would without the forwarded event

#### Scenario: Selection spanning several inputs of one block
- **GIVEN** a non-collapsed selection that starts in one input of a block and ends in another input of the same block
- **WHEN** a key is pressed
- **THEN** `editor:keydown` is dispatched once, on the input holding the selection start, with `inputs` listing every touched input of the block and its range

#### Scenario: Selection spanning blocks
- **GIVEN** a selection that starts in one block and ends in another
- **WHEN** a key is pressed
- **THEN** no `editor:keydown` event is dispatched and the key is handled as it is today

#### Scenario: Keys during IME composition
- **GIVEN** an IME composition is in progress inside a tool's input
- **WHEN** `keydown` events fire
- **THEN** they are forwarded with `nativeEvent.isComposing` set to `true`, and are not filtered by the adapter

Implemented in `src/index.ts`, `src/BlockToolAdapter/index.ts`, `src/events/*`.

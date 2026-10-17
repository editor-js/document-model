## MODIFIED Requirements

### Requirement: Block-level DOM binding and input translation
The system SHALL provide `DOMBlockToolAdapter`, attached by tools to a contenteditable element for a model data key, which intercepts `beforeinput` events and applies model text-add/remove events back into the DOM. A target range SHALL be treated as crossing blocks when its model `Index` has segments in more than one block. Deletions that cross a block boundary — a target range spanning blocks, or a collapsed caret at the start of a block's first text input or the end of its last text input with a delete input type — SHALL be performed by exactly one adapter: through a single `api.blocks.merge()` call when the blocks on both sides have text inputs, after which the adapter SHALL place the caret at the returned junction, or through `api.blocks.delete()` of the neighbouring block when that block has no text inputs. Adapters SHALL NOT clip cross-block ranges or join blocks themselves, and every follow-up after `merge()` SHALL address the block id it returns, since the merge may remove the acting adapter's own block.

#### Scenario: Text insertion via beforeinput
- **GIVEN** a `beforeinput` event of type `insertText`, `insertCompositionText`, `insertFromPaste`, `insertFromDrop`, or `insertReplacementText`
- **WHEN** it fires on a bound input
- **THEN** the adapter computes the absolute offset and calls `api.text.insert(...)`, letting the model — not the browser — own the DOM mutation

#### Scenario: Deleting across a cross-block selection
- **GIVEN** a `beforeinput` event of a delete type whose target range starts in one block and ends in another
- **WHEN** it fires
- **THEN** only the adapter whose input contains the range start acts, converting the target range to an `Index` and calling `api.blocks.merge({ index })` once; no adapter calls `api.blocks.delete` or `api.text.remove` for that event, and the caret is placed at the returned junction

#### Scenario: Typing over a cross-block selection
- **GIVEN** a `beforeinput` event of an insert type whose target range spans blocks
- **WHEN** it fires
- **THEN** the adapter owning the range start calls `api.blocks.merge({ index })` and then inserts the data at the returned junction

#### Scenario: Backspace at the start of a block
- **GIVEN** the DOM selection is collapsed at offset 0 of a block's first text input, the input type is `deleteContentBackward`, `deleteWordBackward`, `deleteSoftLineBackward` or `deleteHardLineBackward`, and the previous block has a registered text input
- **WHEN** the `beforeinput` event fires
- **THEN** the adapter calls `api.blocks.merge({ block })` with its own block and places the caret at the returned junction, regardless of the target range reported by the browser

#### Scenario: Delete at the end of a block
- **GIVEN** the DOM selection is collapsed at the end of a block's last text input, the input type is the forward counterpart of a backward delete type, and the next block has a registered text input
- **WHEN** the `beforeinput` event fires
- **THEN** the adapter calls `api.blocks.merge({ block })` with the next block and places the caret at the returned junction

#### Scenario: Backspace or Delete next to a block without text inputs
- **GIVEN** the caret is at the start of a block's first text input with a backward delete type, or at the end of its last text input with a forward delete type, and the neighbouring block in that direction has no registered text input
- **WHEN** the `beforeinput` event fires
- **THEN** the adapter calls `api.blocks.delete()` for that neighbouring block, does not call `api.blocks.merge()`, and leaves the caret where it is

#### Scenario: Backspace or Delete at the edge of the document
- **GIVEN** the caret is at the start of the first block with a backward delete type, or at the end of the last block with a forward delete type
- **WHEN** the `beforeinput` event fires
- **THEN** the adapter makes no API call and the document is unchanged

#### Scenario: Selection within one formatted input
- **GIVEN** a target range inside a single text input whose start and end lie in different DOM text nodes because of inline formatting
- **WHEN** a delete `beforeinput` event fires
- **THEN** the range is not treated as crossing blocks and the adapter calls `api.text.remove` for that input

#### Scenario: Selection across inputs of one block
- **GIVEN** a target range spanning two text inputs of the same block
- **WHEN** a delete `beforeinput` event fires
- **THEN** the block's adapter removes the selected text from each input with `api.text.remove` and does not call `api.blocks.merge()`

#### Scenario: Acting adapter's block is removed by the merge
- **GIVEN** Backspace at the start of a block merges that block into the previous one, or a cross-block range starting at offset 0 of its first block makes that block give way
- **WHEN** the adapter that called `api.blocks.merge()` performs its follow-up
- **THEN** the caret placement and any `text.insert`/`blocks.split` address the block id returned by `merge()` and succeed although the acting adapter's own block no longer exists

#### Scenario: Moving between inputs of one block
- **GIVEN** the DOM selection is collapsed at offset 0 of a block's non-first text input with a backward delete type, or at the end of its non-last text input with a forward delete type
- **WHEN** the `beforeinput` event fires
- **THEN** the caret moves to the end of the previous or the start of the next text input of the same block and the document is unchanged

#### Scenario: Splitting a block on Enter
- **GIVEN** the caret is within a bound input
- **WHEN** an `insertParagraph` `beforeinput` event fires
- **THEN** any selected text is removed — through `api.blocks.merge({ index })` when the selection spans blocks — `api.blocks.split` is called at the resulting caret position, and after the next animation frame the caret moves to offset `[0,0]` of the newly created next block

#### Scenario: Model-to-DOM text sync
- **GIVEN** a `TextAddedEvent` or `TextRemovedEvent` affects a bound input's data key
- **WHEN** the event is received
- **THEN** the adapter inserts/deletes DOM text nodes at the mapped boundary point, normalizes the node, and updates the caret index to the new position

Implemented in `src/BlockToolAdapter/index.ts`, `src/BlockToolAdapter/types/InputType.ts`.

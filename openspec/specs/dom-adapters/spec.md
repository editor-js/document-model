# DOM Adapters

## Purpose

`@editorjs/dom-adapters` is the glue layer between the document model and real browser DOM elements. It has no rendering/UI logic of its own: it listens to model change events (text added/removed, formatted/unformatted, caret updates) and mutates the DOM to match, and listens to native DOM events (`beforeinput`, `selectionchange`) and translates them into model API calls. It is exposed as an `EditorJSAdapterPlugin` (`DOMAdapters`) wired through an Inversify DI container.

## Requirements

### Requirement: DOMAdapters plugin entry point
The system SHALL provide `DOMAdapters` as the `EditorJSAdapterPlugin` entry point that builds the DI container, creates/destroys a `DOMBlockToolAdapter` per block, and instantiates the singleton `FormattingAdapter` and `CaretAdapter`.

#### Scenario: Creating a block adapter
- **GIVEN** a new block is added to the document
- **WHEN** `DOMAdapters.createBlockToolAdapter` is invoked for that block
- **THEN** a `DOMBlockToolAdapter` scoped to that block is created and returned via the DI container

Implemented in `src/index.ts`, `src/tokens.ts`.

### Requirement: Shared input registry
The system SHALL maintain an `InputsRegistry` singleton mapping `(blockId, dataKey)` to the corresponding `HTMLElement`, as the single source of truth queried and mutated by both `DOMBlockToolAdapter` and `CaretAdapter`.

#### Scenario: Looking up a bound input element
- **GIVEN** a tool has previously bound an `HTMLElement` to a `(blockId, dataKey)` pair via the registry
- **WHEN** `CaretAdapter` or `DOMBlockToolAdapter` looks up that pair
- **THEN** the same registered `HTMLElement` is returned

Implemented in `src/InputsRegistry/index.ts`.

### Requirement: Block-level DOM binding and input translation
The system SHALL provide `DOMBlockToolAdapter`, attached by tools to a contenteditable element for a model data key, which intercepts `beforeinput` events and applies model text-add/remove events back into the DOM.

#### Scenario: Text insertion via beforeinput
- **GIVEN** a `beforeinput` event of type `insertText`, `insertCompositionText`, `insertFromPaste`, `insertFromDrop`, or `insertReplacementText`
- **WHEN** it fires on a bound input
- **THEN** the adapter computes the absolute offset and calls `api.text.insert(...)`, letting the model — not the browser — own the DOM mutation

#### Scenario: Deleting across a cross-input selection
- **GIVEN** a non-collapsed selection where the input is the "middle" block of a multi-block selection
- **WHEN** a delete `beforeinput` event fires
- **THEN** the adapter calls `api.blocks.delete` (whole-block delete) instead of removing a text range

#### Scenario: Splitting a block on Enter
- **GIVEN** the caret is within a bound input
- **WHEN** an `insertParagraph` `beforeinput` event fires
- **THEN** any selected text is removed, `api.blocks.split` is called, and after the next animation frame the caret moves to offset `[0,0]` of the newly created next block

#### Scenario: Model-to-DOM text sync
- **GIVEN** a `TextAddedEvent` or `TextRemovedEvent` affects a bound input's data key
- **WHEN** the event is received
- **THEN** the adapter inserts/deletes DOM text nodes at the mapped boundary point, normalizes the node, and updates the caret index to the new position

Implemented in `src/BlockToolAdapter/index.ts`, `src/BlockToolAdapter/types/InputType.ts`.

### Requirement: Caret and selection synchronization
The system SHALL provide `CaretAdapter`, which tracks `document.selectionchange`, converts DOM `Selection`/`Range` into a model `Index` (including composite indexes for cross-input selections), and mirrors model caret updates back onto the DOM selection for both native inputs and contenteditable elements.

#### Scenario: Classifying a multi-block selection
- **GIVEN** a browser selection spanning multiple bound inputs
- **WHEN** the adapter maps it to indexes
- **THEN** each input's portion is classified as containing the whole selection, only its start, only its end, or being fully "in between," and segments are sorted into document order before being combined into a composite `Index`

#### Scenario: Avoiding redundant DOM selection updates
- **GIVEN** a model caret update whose resulting selection is identical to the current DOM selection
- **WHEN** the adapter would otherwise restore `selectionStart`/`selectionEnd` (native input) or a `Range`/`Selection` (contenteditable)
- **THEN** it skips reapplying the identical selection to avoid interrupting native browser behavior

Implemented in `src/CaretAdapter/index.ts`, `src/utils/selectionRangeInInput.ts` (validated by `src/utils/selectionRangeInInput.spec.ts`), `src/utils/getAbsoluteRangeOffset.ts`, `getRelativeIndex.ts`.

#### Scenario: Range clipping against an input's boundaries
- **GIVEN** a selection range and a specific input element
- **WHEN** `getClippedTextRangeForInput` is computed
- **THEN** it returns `null` if the range doesn't intersect the input, `[0, textLength]` if the input sits fully between two other blocks' selection anchors, and a normalized `[start, end]` if either anchor falls inside the input

### Requirement: Inline formatting rendering
The system SHALL provide `FormattingAdapter`, which registers `InlineTool` instances (from `core:ToolLoaded` events) and renders `InlineFragment`s as DOM wrapper elements, re-rendering affected ranges on `TextFormattedEvent`/`TextUnformattedEvent`.

#### Scenario: Re-rendering overlapping formats
- **GIVEN** a `TextFormattedEvent` or `TextUnformattedEvent` affecting a range
- **WHEN** the adapter re-renders that range
- **THEN** it expands the range by one character on each side to catch adjacent boundary fragments, extracts the range into a template, wraps overlapping fragments using each tool's `createWrapper(data)` output, and replaces the DOM range contents so overlapping/adjacent inline formats nest correctly

Implemented in `src/FormattingAdapter/index.ts`, `src/utils/surround.ts`, `src/utils/expandRangeNodeBoundary.ts`.

## MODIFIED Requirements

### Requirement: Rich clipboard data on copy
The system SHALL provide `ClipboardPlugin`, which subscribes to the `ui:copy` event on construction and, when blocks are selected, populates the native clipboard event with `text/plain` and `text/html` data and prevents the native copy action. It SHALL add `application/x-editor-js` data only when the current selection covers whole blocks: a block selection (`BlockIndex`), or a text selection whose segments span two or more distinct blocks. Block entries in that payload SHALL NOT carry block ids.

#### Scenario: Populating clipboard data for a multi-block selection
- **GIVEN** the current selection is a block selection, or a text selection spanning two or more blocks, and the native copy event exposes `clipboardData`
- **WHEN** the `ui:copy` event fires
- **THEN** the plugin prevents the native event's default action and calls `clipboardData.setData` with the DOM selection's plain text (`text/plain`), the DOM selection's cloned range contents as HTML (`text/html`), and a JSON-serialized `{ blocks }` object (`application/x-editor-js`) built from the selected blocks

#### Scenario: Copying within a single block
- **GIVEN** the current selection is a text selection whose segments all belong to one block
- **WHEN** the `ui:copy` event fires
- **THEN** the plugin prevents the native event's default action and sets only `text/plain` and `text/html`, without `application/x-editor-js`, so a later paste cannot insert content outside the selection

#### Scenario: Omitting metadata from the EditorJS payload
- **GIVEN** blocks are selected and the `application/x-editor-js` payload is being built
- **WHEN** the plugin serializes the payload
- **THEN** the resulting JSON contains `blocks` as its only key and carries no `meta` object or version field

#### Scenario: Omitting block ids from the EditorJS payload
- **GIVEN** blocks are selected and the `application/x-editor-js` payload is being built
- **WHEN** the plugin serializes each block
- **THEN** each entry contains `name` and `data`, plus `tunes` only when the block has tunes, and contains no `id`

#### Scenario: Falling back to native copy when no blocks are selected
- **GIVEN** `api.selection.selectedBlocks` is empty
- **WHEN** the `ui:copy` event fires
- **THEN** the plugin returns without calling `preventDefault` or touching `clipboardData`, leaving the browser's native copy behavior intact

#### Scenario: Falling back to native copy when clipboard access is unavailable
- **GIVEN** blocks are selected but the native event's `clipboardData` is `undefined` (or `window.getSelection()` returns `null`)
- **WHEN** the `ui:copy` event fires
- **THEN** the plugin returns without calling `preventDefault`, leaving the browser's native copy behavior intact

#### Scenario: Building HTML from a multi-range selection
- **GIVEN** the DOM selection has zero or more `Range`s
- **WHEN** the plugin builds the `text/html` payload
- **THEN** it clones each range's contents into a shared `<template>` in range order and serializes the template's `innerHTML`, producing an empty string when the selection has no ranges (without allocating a template)

#### Scenario: Releasing the listeners on destroy
- **GIVEN** a `ClipboardPlugin` instance is subscribed to `ui:copy`, `ui:paste` and `core:tool:loaded`
- **WHEN** `destroy()` is called
- **THEN** it removes all of those listeners from the `EventBus`

Implemented in `src/index.ts`, validated by its co-located `.spec.ts`.

## ADDED Requirements

### Requirement: Reading pasted content
`ClipboardPlugin` SHALL subscribe to `ui:paste` and turn the native event's `clipboardData` into content to insert. It SHALL prefer `application/x-editor-js` over `text/plain`. Other clipboard types (for example `text/html` or files) SHALL be ignored in this version.

#### Scenario: Pasting an EditorJS payload
- **GIVEN** `clipboardData` contains `application/x-editor-js` that parses as an object with a `blocks` array
- **WHEN** the paste is handled
- **THEN** the content is the list of block entries whose `name` is a registered block tool and whose `data` is an object, each reduced to `{ name, data, tunes? }` with any `id` discarded

#### Scenario: Payload entries with unknown tools are dropped
- **GIVEN** the EditorJS payload contains entries for block tools that are not registered, or entries without an object `data`
- **WHEN** the paste is handled
- **THEN** those entries are skipped, and the remaining entries are pasted in their original order

#### Scenario: Unusable EditorJS payload falls back to plain text
- **GIVEN** `application/x-editor-js` is not valid JSON, has no `blocks` array, or has no usable entries after filtering
- **WHEN** the paste is handled
- **THEN** the plugin handles `text/plain` as if the EditorJS payload were absent

#### Scenario: Pasting a single line of plain text
- **GIVEN** there is no usable EditorJS payload and `text/plain` has no line breaks
- **WHEN** the paste is handled
- **THEN** the content is that text, to be inserted inline

#### Scenario: Pasting multi-line plain text
- **GIVEN** there is no usable EditorJS payload and `text/plain` contains line breaks (`\n`, `\r\n` or `\r`)
- **WHEN** the paste is handled
- **THEN** the text is split into lines, lines that are empty or whitespace-only are dropped, and each remaining line becomes one block of the configured default tool, with data built by that tool's `importTextContent(line, [])`

#### Scenario: Multi-line text that reduces to one line
- **GIVEN** `text/plain` contains line breaks but only one non-blank line
- **WHEN** the paste is handled
- **THEN** that line is inserted inline, as for a single line

### Requirement: Placement of pasted content
The plugin SHALL insert the content relative to the current caret (`api.selection.caretIndex`). When the caret is a non-collapsed selection within one text input, the selected text SHALL be removed first, and placement then uses the collapsed position at the start of the removed range.

#### Scenario: Inline text into a text input
- **GIVEN** the caret is in a text input of block `b` at offset `o`
- **WHEN** inline text is pasted
- **THEN** the text is inserted into that input at `o` via `api.text.insert`

#### Scenario: Blocks with the caret at the start of an input
- **GIVEN** the caret is at offset 0 of a text input of block `b`, and the block is not an empty default block
- **WHEN** blocks are pasted
- **THEN** they are inserted at index `b`, before the current block, and no empty block is created

#### Scenario: Blocks with the caret in the middle of an input
- **GIVEN** the caret is strictly inside a text input of block `b`
- **WHEN** blocks are pasted
- **THEN** block `b` is split at the caret via `api.blocks.split`, and the pasted blocks are inserted at index `b + 1`, between the two halves

#### Scenario: Blocks with the caret at the end of an input
- **GIVEN** the caret is at the end of a text input of block `b`, which is not empty
- **WHEN** blocks are pasted
- **THEN** they are inserted at index `b + 1`, and no empty block is created

#### Scenario: Blocks into an empty default block
- **GIVEN** the caret is in block `b`, which is of the configured default tool and whose caret input is empty
- **WHEN** blocks are pasted
- **THEN** block `b` is removed and the pasted blocks are inserted at index `b`, so the first pasted block takes its place

#### Scenario: No text input holds the caret
- **GIVEN** the caret is a block selection (`BlockIndex`) of block `b`, or there is no caret
- **WHEN** content is pasted
- **THEN** the content is inserted as block(s) at index `b + 1`, or at the end of the document when there is no caret, with inline text first turned into one default-tool block

#### Scenario: Caret placed after the pasted content
- **GIVEN** a paste has been applied
- **WHEN** the inserted blocks have been rendered
- **THEN** for inline text the caret is collapsed right after the inserted text, and for blocks it is collapsed at the end of the last text input of the last pasted block. If that block has no text input, the caret is left unchanged

### Requirement: Paste is a single undo step
The plugin SHALL perform every model change of one paste (removing selected text, splitting, deleting a replaced block, inserting text or blocks) inside a single `api.document.group(...)` call.

#### Scenario: Undoing a multi-block paste
- **GIVEN** the local user pasted three lines of plain text into the middle of a paragraph
- **WHEN** `api.document.undo()` is called once
- **THEN** the document equals its state before the paste, including the text that was selected before pasting

### Requirement: Native paste fallback
The plugin SHALL call `preventDefault()` on the native paste event only when it handles the paste itself. When it does not, it SHALL leave the event untouched, so the existing `beforeinput` (`insertFromPaste`) path inserts `text/plain` as before.

#### Scenario: No clipboard access
- **GIVEN** the native paste event's `clipboardData` is `null` or `undefined`
- **WHEN** `ui:paste` fires
- **THEN** the plugin returns without calling `preventDefault`

#### Scenario: Nothing usable on the clipboard
- **GIVEN** `clipboardData` has no usable EditorJS payload and `text/plain` is empty or blank
- **WHEN** `ui:paste` fires
- **THEN** the plugin returns without calling `preventDefault`

#### Scenario: Selection spans several inputs
- **GIVEN** the caret is a text selection whose segments span more than one input
- **WHEN** `ui:paste` fires
- **THEN** the plugin returns without calling `preventDefault`, so the native path handles the paste

#### Scenario: Handled paste suppresses the native path
- **GIVEN** the plugin handles a paste
- **WHEN** `ui:paste` fires
- **THEN** it calls `preventDefault()` on the native event before changing the document, so no `beforeinput` insertion follows

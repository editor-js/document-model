# Clipboard Plugin

## Purpose

`@editorjs/clipboard-plugin` is a built-in `EditorjsPlugin` that enriches native browser copy events with EditorJS-specific clipboard data. When the user copies a selection that spans one or more blocks, it augments the system clipboard with plain text, HTML, and a custom `application/x-editor-js` payload carrying the serialized block data, so paste targets that understand EditorJS can reconstruct the original blocks.

## Requirements

### Requirement: Rich clipboard data on copy
The system SHALL provide `ClipboardPlugin`, which subscribes to the `ui:copy` event on construction and, when blocks are selected, populates the native clipboard event with `text/plain`, `text/html`, and `application/x-editor-js` data and prevents the native copy action.

#### Scenario: Populating clipboard data for a block selection
- **GIVEN** one or more blocks are selected and the native copy event exposes `clipboardData`
- **WHEN** the `ui:copy` event fires
- **THEN** the plugin prevents the native event's default action and calls `clipboardData.setData` with the DOM selection's plain text (`text/plain`), the DOM selection's cloned range contents as HTML (`text/html`), and a JSON-serialized `{ blocks, meta: { version } }` object (`application/x-editor-js`) built from the selected blocks

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

#### Scenario: Releasing the listener on destroy
- **GIVEN** a `ClipboardPlugin` instance is subscribed to `ui:copy`
- **WHEN** `destroy()` is called
- **THEN** it removes the `ui:copy` listener from the `EventBus`

Implemented in `src/index.ts`, validated by its co-located `.spec.ts`.

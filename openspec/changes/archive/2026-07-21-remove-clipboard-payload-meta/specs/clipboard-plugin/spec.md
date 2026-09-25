## MODIFIED Requirements

### Requirement: Rich clipboard data on copy
The system SHALL provide `ClipboardPlugin`, which subscribes to the `ui:copy` event on construction and, when blocks are selected, populates the native clipboard event with `text/plain`, `text/html`, and `application/x-editor-js` data and prevents the native copy action.

#### Scenario: Populating clipboard data for a block selection
- **GIVEN** one or more blocks are selected and the native copy event exposes `clipboardData`
- **WHEN** the `ui:copy` event fires
- **THEN** the plugin prevents the native event's default action and calls `clipboardData.setData` with the DOM selection's plain text (`text/plain`), the DOM selection's cloned range contents as HTML (`text/html`), and a JSON-serialized `{ blocks }` object (`application/x-editor-js`) built from the selected blocks

#### Scenario: Omitting metadata from the EditorJS payload
- **GIVEN** blocks are selected and the `application/x-editor-js` payload is being built
- **WHEN** the plugin serializes the payload
- **THEN** the resulting JSON contains `blocks` as its only key and carries no `meta` object or version field

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

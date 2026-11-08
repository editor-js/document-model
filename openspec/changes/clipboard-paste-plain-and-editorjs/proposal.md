## Why

Pasting only works because the `beforeinput` path in `BlockToolAdapter` treats `insertFromPaste` like typing. It inserts `text/plain` as one string into the focused input. Multi-line text ends up in a single block, and the `application/x-editor-js` payload that `ClipboardPlugin` writes on copy is never read, so copying and pasting blocks inside the editor loses their structure. Issue #137 ("Paste plugin") lists the full V2-derived requirements. This change delivers the first slice: plain text and EditorJS payloads. HTML, files, patterns and the tag registry are left for later changes.

Copy also has two problems that would break paste once the payload is read:
- It writes block `id`s. Re-inserting them throws `BlockAlreadyExistsError`.
- It writes whole blocks even when the selection is inside a single input, so pasting would insert content the user didn't select.

## What Changes

- **Paste handling in `ClipboardPlugin`.**
  - The plugin subscribes to a new `ui:paste` event and reads `application/x-editor-js`, falling back to `text/plain`.
  - It calls `preventDefault()` on the native event and applies the result through `EditorAPI` synchronously, inside the `ui:paste` handler. Core's per-task undo grouping (`undo-group-by-task`) then records the whole paste as one undo step.
  - Multi-line plain text becomes one default-tool block per line.
  - EditorJS payload blocks are inserted after validation. Entries whose tool isn't registered are dropped, and any `id` is removed so the model generates new ones.
  - Where the content goes depends on the caret position (start, middle or end of a block, or an empty default block, which is replaced).
  - The caret ends up after the pasted content.
- **The plugin falls back to native handling when it can't handle the paste.**
  - It doesn't call `preventDefault()` when `clipboardData` is missing, when the clipboard holds neither usable format, or when the selection spans more than one input. The existing `beforeinput` → `insertFromPaste` path then runs unchanged.
  - When no text input has the caret, the content is inserted as new block(s) after the current block, or at the end of the document.
- **BREAKING (clipboard format): the copy payload no longer includes block ids.** Each entry in `application/x-editor-js` `blocks` holds only `name`, `data` and `tunes` (if any).
- **BREAKING (clipboard content): copy writes `application/x-editor-js` only for whole blocks.** It does so when the selection is a block selection or spans two or more blocks. A selection inside a single input writes only `text/plain` and `text/html`.
- **`PasteUIEvent`** (`ui:paste`) in `@editorjs/sdk`, mirroring `CopyUIEvent`. `BlocksUI` dispatches it from the blocks holder's native `paste` event without calling `preventDefault()` itself.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `clipboard-plugin`: "Rich clipboard data on copy" changes: blocks have no ids, and the EditorJS payload is written only for whole-block or multi-block selections. New requirements cover reading the paste payload, where the content goes, one undo step per paste, and native fallback.
- `ui`: "Blocks holder rendering and input capture" also forwards native `paste` as `PasteUIEvent`.
- `sdk`: new requirement for the `PasteUIEvent` UI event contract.

## Impact

- **Depends on** the `undo-group-by-task` change for "a paste is one undo step". It uses no API from that change, but should land after it.
- **Packages**:
  - `sdk`: new `PasteUIEvent` in `entities/EventBus/events/ui`.
  - `ui`: `Blocks.ts` handles the `paste` listener.
  - `plugins/clipboard-plugin`: copy rules, paste pipeline, tests, README.
- **Unchanged**: `dom-adapters`. Its `insertFromPaste` handling remains the fallback for when the plugin is absent or skips a paste.
- **Clipboard format**: third-party readers of `application/x-editor-js` must not expect `id`. Payloads that still contain ids, for example copied before this change, are accepted on paste and the ids are discarded.
- **Collaboration**: when `collaboration-manager` is registered, its undo manager does not group by task yet (see `undo-group-by-task`), so a paste undoes in several steps there.
- **Docs**: `docs/events.md` (add `CopyUIEvent`, which is currently missing, and `PasteUIEvent` to the UI events table), `docs/input-handling.md` (the paste path and the native fallback), and the plugin's `README.md`. No existing document is superseded.
- **Deferred to later changes** (#137): HTML parsing and sanitizing (R5, R6, R8–R10), files (R4, R17), patterns (R11–R13, R18), merging a pasted block into the current block of the same tool (R15), tool-level `pasteConfig` opt-out (R1), read-only mode (R2), deleting a selection across blocks, cut, and drop.

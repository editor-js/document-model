## 0. Prerequisite

- [ ] 0.1 Confirm that `undo-group-by-task` is merged, so core groups the changes of one task into one undo step

## 1. sdk: PasteUIEvent

- [ ] 1.1 Write failing tests: "should dispatch as ui:paste" and "should carry the native ClipboardEvent as detail.nativeEvent"
- [ ] 1.2 Add `PasteUIEvent`, `PasteUIEventName` and `PasteUIEventPayload` in `packages/sdk/src/entities/EventBus/events/ui/PasteUIEvent.ts`, modelled on `CopyUIEvent`. Export them from `events/ui/index.ts` and register the event in the typed event map so `addEventListener('ui:paste', …)` is typed
- [ ] 1.3 Run `yarn test` and `yarn lint` in `packages/sdk`

## 2. ui: forward native paste

- [ ] 2.1 Write a failing `Blocks` test: "should dispatch PasteUIEvent with the native event and not prevent default"
- [ ] 2.2 Add a `paste` listener in `BlocksUI.#prepareBlocksHolder` that dispatches `PasteUIEvent({ nativeEvent: e })`
- [ ] 2.3 Run `yarn test` and `yarn lint` in `packages/ui`

## 3. clipboard-plugin: copy changes

- [ ] 3.1 Write failing tests:
  - should omit id from every block entry
  - should include tunes only when the block has tunes
  - should omit application/x-editor-js when the selection is within one block
  - should include application/x-editor-js for a BlockIndex selection
  - should include application/x-editor-js for a text selection spanning two blocks
- [ ] 3.2 Implement id-free entries and the whole-block rule (design D6) in `packages/plugins/clipboard-plugin/src/index.ts`
- [ ] 3.3 Update the existing copy tests that expected `id` in the payload or `x-editor-js` for single-block selections

## 4. clipboard-plugin: classify (pure)

- [ ] 4.1 Write failing tests for `src/paste/classify.ts`:
  - should return blocks from a valid EditorJS payload without ids
  - should drop entries with unregistered tools or non-object data
  - should fall back to plain text on invalid JSON, a missing blocks array, or no usable entries
  - should return inline for single-line text
  - should split \n, \r\n and \r into default-tool blocks via importTextContent
  - should drop blank lines
  - should return inline when only one non-blank line remains
  - should return null for empty or blank text with no payload
  - should return null for multi-line text when the default tool has no import config
- [ ] 4.2 Implement `classify` (design D1, D3, D7)

## 5. clipboard-plugin: apply and placement

- [ ] 5.1 Write failing tests for `src/paste/apply.ts` with a mocked `EditorAPI`, one per placement scenario:
  - should insert inline text at the caret
  - should remove the selected range before inserting
  - should insert blocks before the block when the caret is at offset 0
  - should split and insert between the halves when the caret is in the middle
  - should insert after the block when the caret is at the end
  - should replace an empty default block
  - should insert after a BlockIndex selection
  - should append at the end when there is no caret
  - should wrap inline text as a default block when no text input holds the caret
- [ ] 5.2 Write failing tests for the returned caret target: after inline text; at the end of the last text node of the last pasted block; `null` when that block has no text node
- [ ] 5.3 Implement `apply` (design D4, D5)

## 6. clipboard-plugin: paste wiring

- [ ] 6.1 Write failing plugin tests:
  - should subscribe to ui:paste and core:tool:loaded
  - should not preventDefault when clipboardData is missing
  - should not preventDefault when classify returns null
  - should not preventDefault for a multi-segment text selection
  - should preventDefault and run apply synchronously in the ui:paste handler
  - should update the caret in requestAnimationFrame
  - should remove all listeners on destroy
- [ ] 6.2 Collect block tool facades from `core:tool:loaded` (`tool.isBlock()`), and wire `#onPaste` as in design D1–D2
- [ ] 6.3 Write an integration test with a real `Core`, paragraph tool and the plugin: "should undo a three-line paste into the middle of a paragraph in one step"
- [ ] 6.4 Write an integration test: "should paste a copied multi-block selection twice without BlockAlreadyExistsError"
- [ ] 6.5 Run `yarn test`, `yarn lint` and `yarn test:mutations` in `packages/plugins/clipboard-plugin`

## 7. Docs and wrap-up

- [ ] 7.1 Update the plugin's `README.md`: payload format (no ids), when `x-editor-js` is written, paste behaviour and fallback
- [ ] 7.2 Update `docs/events.md` (add `CopyUIEvent` and `PasteUIEvent` to the UI events table) and `docs/input-handling.md` (the paste path, the plugin's decision to handle or skip, and the `insertFromPaste` fallback)
- [ ] 7.3 Comment on issue #137 listing which requirements this change delivers (R3, R7, R14, R16) and which remain
- [ ] 7.4 Check the paste flows by hand in `packages/playground`: single line, multi-line, copy and paste of blocks, undo
- [ ] 7.5 Run `yarn lint` and `yarn test` from the repo root
- [ ] 7.6 Run `openspec validate clipboard-paste-plain-and-editorjs --type change` and fix any issues

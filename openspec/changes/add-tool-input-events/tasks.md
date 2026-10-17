## 1. Event type

- [ ] 1.1 Add `packages/dom-adapters/src/events/` with `EditorKeydownEventName`, the generic `EditorInputEventDetail<E>`, `EditorKeydownEvent` (bubbling, cancelable `CustomEvent`) and the `HTMLElementEventMap` augmentation, per design decision 2
- [ ] 1.2 Export them from the `@editorjs/dom-adapters` entry point
- [ ] 1.3 Add a type-level test asserting `element.addEventListener('editor:keydown', e => e.detail.nativeEvent.key)` type-checks without casts

## 2. Selection routing

- [ ] 2.1 Write failing specs for resolving the document selection to `{ blockId, key, range, inputs }`: collapsed caret, selection across inputs of one block, selection across blocks (no result), selection outside registered inputs (no result)
- [ ] 2.2 Implement the resolver on top of `InputsRegistry` and the existing range-clipping helpers

## 3. keydown forwarding

- [ ] 3.1 Write failing specs: on `ui:key-down` it should dispatch `editor:keydown` on the selection's input with `target`, `nativeEvent`, `key`, `range` and `inputs` set; cancelling it should call `preventDefault()` on the native event; not cancelling it should leave the native event untouched; no dispatch for a selection spanning blocks; composing keys are forwarded with `isComposing`
- [ ] 3.2 Implement a single `ui:key-down` listener registered in the `DOMAdapters` constructor that routes to the owning block's adapter, which dispatches on the input element; remove the listener in `destroy()`
- [ ] 3.3 Write a failing integration spec: with the shortcuts plugin registered for a key and a tool cancelling `editor:keydown` for the same key, the tool's listener runs and the shortcut handler does not
- [ ] 3.4 Write a failing Playwright e2e test in `packages/editorjs/e2e`: a test tool cancelling `editor:keydown` for Enter keeps the block count unchanged, and one cancelling Tab keeps focus in the editor (needs a real browser: jsdom does not suppress `beforeinput` after a prevented `keydown`)

## 4. Docs and validation

- [ ] 4.1 Add a "Tool-facing keyboard events" section to `docs/input-handling.md` (event name, detail, cancel semantics, routing rule, tool-before-plugins ordering, "cancel only what you handle" guidance, composition, the mobile/IME limitation until `beforeinput` is forwarded)
- [ ] 4.2 Run `yarn lint` and the tests of the touched packages
- [ ] 4.3 Run `openspec validate add-tool-input-events --type change`

## 1. Native event on BeforeInputUIEvent

- [ ] 1.1 Write a failing spec in `packages/ui/src/Blocks/Blocks.spec.ts`: it should dispatch `BeforeInputUIEvent` carrying the native `InputEvent` as `nativeEvent`
- [ ] 1.2 Add `nativeEvent: InputEvent` to `BeforeInputUIEventPayload` in `packages/sdk/src/entities/EventBus/events/ui/BeforeInputUIEvent.ts` and pass it from `BlocksUI`

## 2. Event types

- [ ] 2.1 Add `packages/dom-adapters/src/events/` with `EditorKeydownEventName`, `EditorBeforeInputEventName`, `EditorInputEventDetail`, `EditorKeydownEvent`, `EditorBeforeInputEvent` (bubbling, cancelable `CustomEvent`s) and the `HTMLElementEventMap` augmentation, per design decision 2
- [ ] 2.2 Export them from the `@editorjs/dom-adapters` entry point
- [ ] 2.3 Add a type-level test asserting `element.addEventListener('editor:beforeinput', e => e.detail.nativeEvent.inputType)` type-checks without casts

## 3. Selection routing

- [ ] 3.1 Write failing specs for resolving the document selection to `{ blockId, key, range, inputs }`: collapsed caret, selection across inputs of one block, selection across blocks (no result), selection outside registered inputs (no result), caret at offset 0 of a block's first input
- [ ] 3.2 Implement the resolver on top of `InputsRegistry` and the existing range-clipping helpers

## 4. beforeinput forwarding

- [ ] 4.1 Write failing specs in `packages/dom-adapters/src/BlockToolAdapter/index.spec.ts`: it should dispatch `editor:beforeinput` on the input holding the selection start, with `target`, `nativeEvent`, `key`, `range` and `inputs` set
- [ ] 4.2 Write failing specs: when the event is cancelled it should not call `api.blocks.split`, `api.text.insert`, or `api.text.remove`; when it isn't, existing behaviour is unchanged
- [ ] 4.3 Write a failing spec: it should not dispatch `editor:beforeinput` for a selection spanning blocks
- [ ] 4.4 Implement in `#processDelegatedBeforeInput`: dispatch before any default handling (including deleting the selected range), return early when cancelled

## 5. keydown forwarding

- [ ] 5.1 Write failing specs in `packages/dom-adapters/src/index.spec.ts`: on `ui:key-down` it should dispatch `editor:keydown` on the selection's input; cancelling it should call `preventDefault()` on the native event; no dispatch for a selection spanning blocks
- [ ] 5.2 Implement a single `ui:key-down` listener registered in the `DOMAdapters` constructor that routes to the owning block's adapter, and remove it in `destroy()`
- [ ] 5.3 Write a failing integration spec: with the shortcuts plugin registered for a key and a tool cancelling `editor:keydown` for the same key, the tool's listener runs and the shortcut handler does not

## 6. Docs and validation

- [ ] 6.1 Add a "Tool-facing input events" section to `docs/input-handling.md` (event names, detail, cancel semantics, routing rule, "cancel only what you handle" guidance, composition) and update `docs/diagrams/block-adapter-input-flow.mmd` if it shows the beforeinput path
- [ ] 6.2 Run `yarn lint` and the tests of the touched packages
- [ ] 6.3 Run `openspec validate add-tool-input-events --type change`

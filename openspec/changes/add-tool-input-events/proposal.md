## Why

Block tools in v3 cannot react to Enter, Backspace, Tab or any other key. The blocks holder is the single `contenteditable` editing host, so the browser targets `keydown` and `beforeinput` at the holder: listeners on a tool's own elements never fire, in either the capture or the bubble phase (verified in Chromium). Tools also don't receive the `EventBus`. The only consumer of these events is `DOMBlockToolAdapter`, which always applies its own default — Enter always calls `api.blocks.split`, Tab reaches nobody.

That rules out any tool whose editing model is not "one block = one text field": a List needs Enter to add an item inside the block and Tab to nest it, a Code block needs Enter and Tab to insert characters, a Table needs Tab to move between cells. Editor.js v2 tools did this by listening on their own DOM, which worked because every input was its own editing host. v3 needs an equivalent that fits the single editing host.

## What Changes

- **`DOMBlockToolAdapter` forwards input events to its tool as DOM events dispatched on the tool's input element.** Two event types, `editor:keydown` and `editor:beforeinput`, are `CustomEvent`s that bubble and are cancelable. They carry the real browser event (`nativeEvent`) plus the model position of the selection: the data `key` of the input and the `range` inside it, and every input of the block the selection touches.
- **Tools subscribe with plain `addEventListener`**, on an input or once on their wrapper (the event bubbles, `event.target` is the input element). No new tool interface, no SDK hook per key.
- **Cancelling the forwarded event skips the editor's default** for that input: the split on `insertParagraph`, text insertion/deletion, and so on. For `keydown` the adapter also cancels the native event, so `BlocksUI` and plugins stop handling the key and the browser default (e.g. focus moving on Tab) does not run.
- **The block's tool sees `keydown` before plugins.** Forwarding is driven by one listener the `DOMAdapters` plugin registers when it is constructed, which is before other plugins are initialized, so a tool that handles a key wins over a plugin shortcut bound to the same key.
- **Defaults are unchanged** when no listener cancels: today's behaviour is preserved for every existing tool.
- **`BeforeInputUIEvent` carries the native `InputEvent`** as `nativeEvent`, like `KeydownUIEvent` already does, so the adapter can hand tools the real browser event.
- Typed event names and detail are exported from `@editorjs/dom-adapters`, with an `HTMLElementEventMap` augmentation so `addEventListener('editor:beforeinput', e => e.detail…)` is typed.

Not in scope:
- Backspace/Delete merging at an input boundary. The pending `add-blocks-merge-api` change provides `blocks.merge`; wiring it becomes a new *default* for un-cancelled `deleteContentBackward`/`deleteContentForward` in a follow-up, with no change to this API.
- `insertLineBreak` handling (still a `@todo` default; tools can already implement it by cancelling).
- Fixing the default for a selection spanning several inputs of one block, which deletes the whole block. Tools can intercept it through this API; the default is a separate bug.
- Re-keying inputs after array data shifts. `detail.key` is read from the `InputsRegistry`, so it is only as correct as the registry; that is a separate model/adapter fix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui`: the "Blocks holder rendering and input capture" requirement's beforeinput scenario additionally carries the native event as `nativeEvent`.
- `dom-adapters`: a new requirement for forwarding `keydown`/`beforeinput` to tools as cancelable DOM events, and the "Block-level DOM binding and input translation" requirement now runs its default handling only when the forwarded event was not cancelled.

## Impact

- **Code**: `packages/sdk/src/entities/EventBus/events/ui/BeforeInputUIEvent.ts` (`nativeEvent` in the payload), `packages/ui/src/Blocks/Blocks.ts` (pass it), `packages/dom-adapters/src/index.ts` (shared `ui:key-down` listener), `packages/dom-adapters/src/BlockToolAdapter/index.ts` (dispatch before default handling, skip default when cancelled), new `packages/dom-adapters/src/events/` (event classes, names, detail types, `HTMLElementEventMap` augmentation), exports from the package entry point; co-located specs.
- **APIs**: additive. New exported event types in `@editorjs/dom-adapters`; a new `nativeEvent` field on `BeforeInputUIEventPayload` in `@editorjs/sdk`. No changes to existing tools.
- **Docs**: `docs/input-handling.md` gains a section on tool-facing input events; nothing it says today is superseded (the "BeforeInput delegation" section stays accurate and is extended). `docs/events.md` lists bus events and is unaffected, since these are DOM events, not bus events.

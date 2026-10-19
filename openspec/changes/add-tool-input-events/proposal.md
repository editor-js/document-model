## Why

Block tools in v3 cannot react to Enter, Backspace, Tab or any other key. The blocks holder is the single `contenteditable` editing host, so the browser targets `keydown` at the holder: listeners on a tool's own elements never fire, in either the capture or the bubble phase (verified in Chromium). Tools also don't receive the `EventBus`. The only consumers of keyboard input are `BlocksUI`, plugins on `ui:key-down`, and `DOMBlockToolAdapter`'s `beforeinput` handling, which always applies its own default — Enter always calls `api.blocks.split`, Tab reaches nobody.

That rules out any tool whose editing model is not "one block = one text field": a List needs Enter to add an item inside the block and Tab to nest it, a Code block needs Enter and Tab to insert characters, a Table needs Tab to move between cells. Editor.js v2 tools did this by listening on their own DOM, which worked because every input was its own editing host. v3 needs an equivalent that fits the single editing host.

## What Changes

- **`@editorjs/dom-adapters` forwards `keydown` to the block tool as a DOM event dispatched on the tool's input element.** `editor:keydown` is a `CustomEvent` that bubbles and is cancelable. It carries the real browser `KeyboardEvent` (`nativeEvent`) plus the model position of the selection: the data `key` of the input, the `range` inside it, and every input of the block the selection touches.
- **Tools subscribe with plain `addEventListener`**, on an input or once on their wrapper (the event bubbles, `event.target` is the input element). No new tool interface, no SDK hook per key.
- **Cancelling `editor:keydown` cancels the native `keydown`.** On desktop browsers that suppresses the `beforeinput` that would follow, so the editor's default (split on Enter, text deletion on Backspace) does not run; it also stops the browser default (focus moving on Tab), and `BlocksUI` and plugins treat the key as claimed.
- **The block's tool sees `keydown` before plugins.** Forwarding is driven by one listener the `DOMAdapters` plugin registers when it is constructed, which is before other plugins are initialized, so a tool that handles a key wins over a plugin shortcut bound to the same key.
- **Nothing changes when no listener cancels**: today's behaviour is preserved for every existing tool.
- Typed event name and detail are exported from `@editorjs/dom-adapters`, with an `HTMLElementEventMap` augmentation so `addEventListener('editor:keydown', e => e.detail…)` is typed.

Not in scope:
- Forwarding `beforeinput` (`editor:beforeinput`). It is the reliable signal for text-changing actions where `keydown` is not — Android virtual keyboards (key `Unidentified`/229), IME composition, platform word/line deletes, context-menu cut — and can be added later with the same shape. Until then, tools handling Enter/Backspace via `keydown` may not get them on those inputs, and the editor's default runs instead.
- Backspace/Delete merging at an input boundary. The pending `add-blocks-merge-api` change provides `blocks.merge`; wiring it is a follow-up and becomes a default a tool can pre-empt by cancelling `editor:keydown`.
- `insertLineBreak` handling (still a `@todo` default).
- Fixing the default for a selection spanning several inputs of one block, which deletes the whole block. Tools can pre-empt Backspace/Delete through this API; the default is a separate bug.
- Re-keying inputs after array data shifts. `detail.key` is read from the `InputsRegistry`, so it is only as correct as the registry; that is a separate model/adapter fix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dom-adapters`: a new requirement for forwarding `keydown` to tools as a cancelable DOM event.

## Impact

- **Code**: `packages/dom-adapters/src/index.ts` (shared `ui:key-down` listener), `packages/dom-adapters/src/BlockToolAdapter/index.ts` (dispatch on the selection's input), new `packages/dom-adapters/src/events/` (event class, name, detail type, `HTMLElementEventMap` augmentation), exports from the package entry point; co-located specs.
- **APIs**: additive. New exported event type in `@editorjs/dom-adapters`. No changes to `@editorjs/sdk`, `BlocksUI`, or existing tools.
- **Docs**: `docs/input-handling.md` gains a section on tool-facing keyboard events; nothing it says today is superseded. `docs/events.md` lists bus events and is unaffected, since this is a DOM event, not a bus event.

## Context

`BlocksUI` (`packages/ui/src/Blocks/Blocks.ts`) makes the blocks holder the single `contenteditable` editing host. It:

- listens to `beforeinput`, always calls `preventDefault()`, and re-dispatches a `BeforeInputUIEvent` (`data`, `inputType`, `isComposing`, `targetRanges`, `isCrossInputSelection`) on the `EventBus`;
- listens to `keydown`, dispatches `KeydownUIEvent { nativeEvent }` on the bus first, and stops its own handling (undo/redo) when a listener called `preventDefault()` on the native event. The shortcuts plugin uses this to claim keys.

Each block gets a `DOMBlockToolAdapter` (`packages/dom-adapters/src/BlockToolAdapter/index.ts`). Every adapter subscribes to `ui:before-input`, keeps the event only if its target ranges touch one of its own inputs (`#findInputsByRanges`), and applies a fixed default per `inputType`: insert/delete text, `insertParagraph` → `api.blocks.split`, `insertLineBreak` → nothing (`@todo`).

Because the holder is the editing host, the browser targets both events at the holder. A tool's elements are *below* the target, so they are not on the propagation path at all — neither capture nor bubble listeners on them fire. This was confirmed in Chromium with a nested `contenteditable` inside an editable holder: only the holder's listener ran, with `eventPhase === AT_TARGET`. Pointer events (`click`, `pointerdown`) are unaffected: they target the element under the pointer, so tools can already listen for those on their own nodes.

Tools receive `adapter`, `api`, `data`, `config`; they do not receive the `EventBus`. Their only event channel today is `adapter.addEventListener('adapter:updated', …)`.

`Core.initialize()` initializes the rendering adapter plugin (`DOMAdapters`) before any other plugin (`packages/core/src/index.ts`, `#initializeAdapter()` then `#initializePlugins()`). The `EventBus` is an `EventTarget`, so listeners run in registration order.

## Goals / Non-Goals

**Goals:**

- A tool can take over any key or input action in its own block without a new API per key.
- Tool authors use the DOM event APIs they know: `addEventListener` on their elements, delegation from a wrapper, `preventDefault()`.
- Tools get the model position (data key and offsets) along with the event, so they don't have to map DOM selections to the model themselves.
- Works where `keydown` is unreliable (Android virtual keyboards, IME composition), by forwarding `beforeinput` too.
- Existing tools and plugins behave exactly as today.

**Non-Goals:**

- New defaults: block merging on Backspace/Delete, line breaks, the cross-input delete fix. They plug in later as defaults that run when nothing cancelled.
- Forwarding events for selections spanning several blocks. Those stay with the editor's default handling.
- Non-DOM adapters. This is a `@editorjs/dom-adapters` feature; keyboard input is a DOM concern.
- Re-keying inputs when array data shifts (needed for correct `detail.key` in tools like List, tracked separately).

## Decisions

### 1. Two forwarded events: `editor:keydown` and `editor:beforeinput`

Both are needed and they don't overlap:

- `keydown` is the only signal for keys that don't change text: Tab, arrows, Escape, shortcuts. Browsers fire no `beforeinput` for them.
- `beforeinput` is the reliable signal for anything that does change text. Its `inputType` names the action however it was triggered: Enter (`insertParagraph`), Shift+Enter (`insertLineBreak`), Backspace (`deleteContentBackward`), platform word/line deletes (`deleteWordBackward`, `deleteSoftLineBackward`), cut, drop, autocorrect, voice input. On Android, `keydown` often reports `Unidentified`/229 for these keys, and during IME composition Enter commits the composition rather than splitting.

They map one-to-one onto the two events `BlocksUI` already puts on the bus.

*Alternative rejected: one hook per intent* (`split`, `merge`, `indent`, `line-break`). Every new key would need a new API. With raw events, a new behaviour is a new branch in the tool's listener.

### 2. Dispatched as DOM `CustomEvent`s on the tool's input element

```ts
export const EditorKeydownEventName = 'editor:keydown';
export const EditorBeforeInputEventName = 'editor:beforeinput';

export interface EditorInputEventDetail<E extends Event> {
  /** The real, trusted browser event */
  nativeEvent: E;
  /** Data key of the input holding the selection start */
  key: DataKey;
  /** Selection offsets inside `key`; collapsed caret → [n, n] */
  range: [number, number];
  /** Every input of this block the selection touches, in document order */
  inputs: Array<{ key: DataKey; range: [number, number] }>;
}

export class EditorKeydownEvent extends CustomEvent<EditorInputEventDetail<KeyboardEvent>> {}
export class EditorBeforeInputEvent extends CustomEvent<EditorInputEventDetail<InputEvent>> {}

declare global {
  interface HTMLElementEventMap {
    'editor:keydown': EditorKeydownEvent;
    'editor:beforeinput': EditorBeforeInputEvent;
  }
}
```

The adapter dispatches on the input element registered for `key` (`bubbles: true`, `cancelable: true`). So:

- a single-input tool can listen on the input or on its wrapper;
- a multi-input tool (List) listens once on its wrapper, and reads which item from `event.target` (DOM) or `detail.key` (model);
- `dispatchEvent` returning `false` is the "handled" signal.

*Why not dispatch on the adapter (`adapter.addEventListener('adapter:keydown', …)`)?* That would work too and was the first candidate, but it makes tool authors subscribe to a non-DOM object. Dispatching on the element costs the same: the adapter already knows the element via `InputsRegistry`.

*Why not re-dispatch copies of the native events (`new KeyboardEvent('keydown', …)`) on the element?* The copies would be untrusted, `InputEventInit` support for `targetRanges`/`dataTransfer` is uneven across browsers, and a copy named `keydown` bubbling up to the holder would re-enter `BlocksUI`'s own listener. A distinct event type carrying the real event avoids all three.

*Why the `editor:` prefix:* it can't collide with native event names, and it reads like the bus channels (`ui:`, `core:`, `adapter:`) without being one.

### 3. Selection, not target ranges, decides who receives the event

The event goes to the block that contains the **selection**, read from the document selection when the event is handled (both events fire before the DOM changes):

- a collapsed caret, or a selection whose start and end are both in inputs of the same block → that block's adapter dispatches, on the input holding the selection start;
- a selection spanning blocks, or one outside any registered input → nothing is forwarded, the default runs.

Target ranges are not used for routing, because they can reach outside the caret's block. Backspace at the very start of a block's first input has a target range that starts in the previous block; routing by it would treat a plain caret as a cross-block selection. Tools that need target ranges read them from `nativeEvent.getTargetRanges()`.

### 4. Cancelling skips the default; for `keydown` it also cancels the native event

- `editor:beforeinput`: if cancelled, the adapter does nothing else for that event — no selection deletion, no split, no text insertion. `BlocksUI` has already prevented the native default, as today.
- `editor:keydown`: if cancelled, the adapter calls `nativeEvent.preventDefault()`. That stops the browser default (focus moving on Tab, and the `beforeinput` that would follow on desktop) and makes `BlocksUI` and later plugin listeners treat the key as claimed — the existing `KeydownUIEvent` contract.
- Not cancelled: everything runs exactly as today.

The editor never treats `nativeEvent.defaultPrevented` as the tool's answer for `beforeinput`, because `BlocksUI` always prevents it before dispatching.

### 5. `keydown` forwarding is registered once, by the `DOMAdapters` plugin, so tools run before plugins

Per-block adapters are created when blocks are added, after every plugin is initialized, so a per-adapter `ui:key-down` listener would run *after* plugin listeners such as shortcuts. Instead the `DOMAdapters` plugin subscribes once in its constructor — before `#initializePlugins()` — resolves the selection to a block, and asks that block's adapter to dispatch. A tool that cancels a key therefore wins over a plugin shortcut bound to the same key, and a tool that doesn't cancel leaves the key to plugins.

`beforeinput` keeps its current per-adapter subscription: only adapters consume it, so ordering against plugins doesn't matter.

### 6. `BeforeInputUIEvent` carries the native event

`KeydownUIEvent` already has `nativeEvent`; `BeforeInputUIEvent` gets the same optional-to-consumers field so the adapter can forward the real `InputEvent`. The existing normalized fields stay.

### 7. IME composition is forwarded as-is

Events fired during composition are forwarded with `nativeEvent.isComposing` set. Tools are expected to ignore them unless they mean to handle composition (the shortcuts plugin follows the same rule). Filtering in the adapter would hide `insertCompositionText` from tools that need it.

## How a List tool would use it

```ts
this.#wrapper.addEventListener('editor:beforeinput', (e) => {
  const { nativeEvent, key, range } = e.detail;
  if (nativeEvent.isComposing) return;

  switch (nativeEvent.inputType) {
    case 'insertParagraph':          // Enter: split the item / unindent / exit list
      this.#onEnter(key, range);
      e.preventDefault();
      break;
    case 'deleteContentBackward':    // Backspace at item start: merge into previous item
      if (range[0] === 0 && range[1] === 0 && this.#onBackspaceAtStart(key)) e.preventDefault();
      break;
  }
});

this.#wrapper.addEventListener('editor:keydown', (e) => {
  const { nativeEvent, key } = e.detail;
  if (nativeEvent.key !== 'Tab') return;
  if (this.#indent(key, nativeEvent.shiftKey)) e.preventDefault();   // leave Tab alone if nothing to indent
});
```

## Risks / Trade-offs

- **Tools can break baseline editing.** A tool that cancels `insertText` blocks typing in its block. That is the point of the API; the docs must say "cancel only what you handle".
- **Keyboard traps.** A tool cancelling Tab unconditionally keeps focus in the editor. The guidance is to cancel only when the tool actually acts (the List example above), but it is not enforced.
- **Bubbling across nested blocks.** If blocks are ever nested, an outer tool's wrapper listener would see inner blocks' events. Nothing is nested today; a tool can check `detail.key` or call `stopPropagation()`.
- **`detail.key` correctness depends on the `InputsRegistry`.** Until inputs are re-keyed after array shifts, a tool with array data (List) gets stale keys for shifted items. `event.target` remains correct.
- **Ordering relies on plugin initialization order.** If core ever initializes the adapter after other plugins, tool-first ordering silently flips. A spec scenario pins it.

## Open Questions

- Should `editor:keydown` also be forwarded for selections spanning blocks (to the block holding the focus end), for tools that want to react to, e.g., Tab over a block selection? Proposed: no, until a use case appears.
- Event names: `editor:` vs `editorjs:` prefix.

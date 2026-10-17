## Context

`BlocksUI` (`packages/ui/src/Blocks/Blocks.ts`) makes the blocks holder the single `contenteditable` editing host. It:

- listens to `beforeinput`, always calls `preventDefault()`, and re-dispatches a `BeforeInputUIEvent` on the `EventBus`, which each `DOMBlockToolAdapter` turns into model operations with a fixed default per `inputType` (`insertParagraph` → `api.blocks.split`);
- listens to `keydown`, dispatches `KeydownUIEvent { nativeEvent }` on the bus first, and stops its own handling (undo/redo) when a listener called `preventDefault()` on the native event. The shortcuts plugin uses this to claim keys.

Because the holder is the editing host, the browser targets `keydown` at the holder. A tool's elements are *below* the target, so they are not on the propagation path at all — neither capture nor bubble listeners on them fire. This was confirmed in Chromium with a nested `contenteditable` inside an editable holder: only the holder's listener ran, with `eventPhase === AT_TARGET`. Pointer events (`click`, `pointerdown`) are unaffected: they target the element under the pointer, so tools can already listen for those on their own nodes.

Tools receive `adapter`, `api`, `data`, `config`; they do not receive the `EventBus`. Their only event channel today is `adapter.addEventListener('adapter:updated', …)`.

`Core.initialize()` initializes the rendering adapter plugin (`DOMAdapters`) before any other plugin (`packages/core/src/index.ts`, `#initializeAdapter()` then `#initializePlugins()`). The `EventBus` is an `EventTarget`, so listeners run in registration order.

## Goals / Non-Goals

**Goals:**

- A tool can take over any key in its own block without a new API per key.
- Tool authors use the DOM event APIs they know: `addEventListener` on their elements, delegation from a wrapper, `preventDefault()`.
- Tools get the model position (data key and offsets) along with the event, so they don't have to map DOM selections to the model themselves.
- Existing tools and plugins behave exactly as today.

**Non-Goals:**

- Forwarding `beforeinput`. See decision 5.
- New defaults: block merging on Backspace/Delete, line breaks, the cross-input delete fix.
- Forwarding keys for selections spanning several blocks. Those stay with the editor's default handling.
- Non-DOM adapters. This is a `@editorjs/dom-adapters` feature; keyboard input is a DOM concern.
- Re-keying inputs when array data shifts (needed for correct `detail.key` in tools like List, tracked separately).

## Decisions

### 1. One forwarded event, the raw `keydown`, not a hook per intent

Tools get every `keydown` in their block and decide what to handle. A new behaviour is a new branch in the tool's listener, not a new API.

*Alternative rejected: one hook per intent* (`split`, `merge`, `indent`, `line-break`). Every new key would need a new API.

### 2. Dispatched as a DOM `CustomEvent` on the tool's input element

```ts
export const EditorKeydownEventName = 'editor:keydown';

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

declare global {
  interface HTMLElementEventMap {
    'editor:keydown': EditorKeydownEvent;
  }
}
```

The detail type is generic over the native event so a later `editor:beforeinput` can reuse it.

The adapter dispatches on the input element registered for `key` (`bubbles: true`, `cancelable: true`). So:

- a single-input tool can listen on the input or on its wrapper;
- a multi-input tool (List) listens once on its wrapper, and reads which item from `event.target` (DOM) or `detail.key` (model);
- `dispatchEvent` returning `false` is the "handled" signal.

*Why not dispatch on the adapter (`adapter.addEventListener('adapter:keydown', …)`)?* It would work, but makes tool authors subscribe to a non-DOM object. Dispatching on the element costs the same: the adapter already knows the element via `InputsRegistry`.

*Why not re-dispatch a copy of the native event (`new KeyboardEvent('keydown', …)`) on the element?* The copy would be untrusted, and a copy named `keydown` bubbling up to the holder would re-enter `BlocksUI`'s own listener. A distinct event type carrying the real event avoids both.

*Why the `editor:` prefix:* it can't collide with native event names, and it reads like the bus channels (`ui:`, `core:`, `adapter:`) without being one.

### 3. Routing follows the document selection

At `keydown` time the adapter reads the document selection:

- a collapsed caret, or a selection whose start and end are both in inputs of the same block → that block's adapter dispatches, on the input holding the selection start;
- a selection spanning blocks, or one outside any registered input → nothing is forwarded.

### 4. Cancelling cancels the native event

If the tool cancels `editor:keydown`, the adapter calls `nativeEvent.preventDefault()`. That:

- stops the browser default (focus moving on Tab);
- on desktop browsers, suppresses the `beforeinput` that the key would produce, so `DOMBlockToolAdapter`'s default (split, delete) does not run;
- makes `BlocksUI` and later plugin listeners treat the key as claimed — the existing `KeydownUIEvent` contract.

Not cancelled: everything runs exactly as today. No change to the adapter's `beforeinput` handling is needed.

### 5. `beforeinput` forwarding is deferred

`keydown` is the only signal for keys that don't change text (Tab, arrows, Escape), and on desktop it covers Enter and Backspace too. It is unreliable where text input doesn't come from physical keys: Android virtual keyboards report `Unidentified`/229 for Enter and Backspace, IME composition commits on Enter, and context-menu or voice edits fire no `keydown` at all. `beforeinput` names those actions by `inputType`.

Shipping `keydown` first keeps this change small. An `editor:beforeinput` with the same detail shape can be added later without breaking tools that only listen to `editor:keydown`. The cost until then: on Android and during IME input, a tool's Enter/Backspace handling may not run and the editor's default applies.

### 6. Forwarding is registered once, by the `DOMAdapters` plugin, so tools run before plugins

Per-block adapters are created when blocks are added, after every plugin is initialized, so a per-adapter `ui:key-down` listener would run *after* plugin listeners such as shortcuts. Instead the `DOMAdapters` plugin subscribes once in its constructor — before `#initializePlugins()` — resolves the selection to a block, and asks that block's adapter to dispatch. A tool that cancels a key therefore wins over a plugin shortcut bound to the same key, and a tool that doesn't cancel leaves the key to plugins.

### 7. IME composition is forwarded as-is

`keydown` events fired during composition are forwarded with `nativeEvent.isComposing` set. Tools are expected to ignore them (the shortcuts plugin follows the same rule).

## How a List tool would use it

```ts
this.#wrapper.addEventListener('editor:keydown', (e) => {
  const { nativeEvent, key, range } = e.detail;
  if (nativeEvent.isComposing) return;

  switch (nativeEvent.key) {
    case 'Enter':                    // split the item / unindent / exit list
      if (nativeEvent.shiftKey) return;
      this.#onEnter(key, range);
      e.preventDefault();
      break;
    case 'Backspace':                // at item start: merge into previous item
      if (range[0] === 0 && range[1] === 0 && this.#onBackspaceAtStart(key)) e.preventDefault();
      break;
    case 'Tab':                      // leave Tab alone if nothing to indent
      if (this.#indent(key, nativeEvent.shiftKey)) e.preventDefault();
      break;
  }
});
```

## Risks / Trade-offs

- **Mobile and IME gaps** (decision 5). Tools relying on Enter/Backspace get the editor's default on Android and during composition until `beforeinput` is forwarded.
- **Tools can break baseline editing.** A tool that cancels every `keydown` blocks typing in its block on desktop. That is the point of the API; the docs must say "cancel only what you handle".
- **Keyboard traps.** A tool cancelling Tab unconditionally keeps focus in the editor. The guidance is to cancel only when the tool actually acts, but it is not enforced.
- **Bubbling across nested blocks.** If blocks are ever nested, an outer tool's wrapper listener would see inner blocks' events. Nothing is nested today; a tool can check `detail.key` or call `stopPropagation()`.
- **`detail.key` correctness depends on the `InputsRegistry`.** Until inputs are re-keyed after array shifts, a tool with array data (List) gets stale keys for shifted items. `event.target` remains correct.
- **Ordering relies on plugin initialization order.** If core ever initializes the adapter after other plugins, tool-first ordering silently flips. A spec scenario pins it.

## Open Questions

- Should `editor:keydown` also be forwarded for selections spanning blocks (to the block holding the focus end), for tools that want to react to, e.g., Tab over a block selection? Proposed: no, until a use case appears.
- Event name: `editor:` vs `editorjs:` prefix.

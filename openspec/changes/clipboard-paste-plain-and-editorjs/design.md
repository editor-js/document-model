## Context

- `BlocksUI` (`packages/ui/src/Blocks/Blocks.ts`) listens on the contenteditable blocks holder:
  - It forwards `copy` as `CopyUIEvent` without calling `preventDefault`.
  - It turns every `beforeinput` into `BeforeInputUIEvent`, with `preventDefault` always called.
  - It has no `paste` listener.
- `BlockToolAdapter` handles `insertFromPaste` like typing: it deletes the selected text in its own input, then calls `api.text.insert(text/plain)`. The browser fires `paste` before `beforeinput`, and calling `preventDefault()` on `paste` stops `beforeinput` from firing at all. So the plugin's decision to handle or skip a paste decides which of the two paths runs.
- `ClipboardPlugin` (`packages/plugins/clipboard-plugin/src/index.ts`) writes `{ blocks: api.selection.selectedBlocks }`:
  - `selectedBlocks` returns **whole** serialized blocks, ids included, for every block the selection touches.
  - `EditorDocument.addBlock` throws `BlockAlreadyExistsError` for a duplicate id. Without an id, `BlockNode` calls `generateBlockId()`, and the new id travels to collaborators inside `BlockAddedEvent`.
- APIs available to the plugin:
  - `api.selection.caretIndex` (`TextIndex` / `BlockIndex` / `null`)
  - `api.text.insert/remove/get`
  - `api.blocks.split/insertMany/delete/getIdByIndex`
  - `api.selection.getCaret()`
  - Core's undo manager records all local changes made in one browser task as one undo step, once `undo-group-by-task` lands
- `blocks.insert({ focus })` is an unimplemented `@todo`.
- `BlockToolFacade.importTextContent(value, fragments)` turns plain text into a tool's data using `conversionConfig.import`. `BlockManager.splitBlock` already relies on the default tool providing it.
- Plugins learn about tools from `core:tool:loaded` (`ToolLoadedCoreEvent`), as `shortcuts-plugin` does.

## Goals / Non-Goals

**Goals:**
- Paste `application/x-editor-js` blocks and multi-line plain text as blocks. Paste single-line text inline.
- Place content predictably around the caret without creating empty blocks.
- One paste is one undo step.
- Fall back to the existing native path whenever the plugin can't handle the paste well.
- Make copy safe to paste back: no ids, and no whole-block payload for a selection inside one block.

**Non-Goals:** everything #137 lists beyond plain text and `x-editor-js`:
- HTML parsing and sanitizing
- the tag, pattern and file registries, and `pasteConfig`
- R15-style merging of a pasted block into the current block
- read-only mode
- deleting a selection across blocks
- cut and drop
- clipping partially selected blocks when copying across blocks

## Decisions

### D1. Two stages: classify (pure), then apply (API)

```
ui:paste ─▶ #onPaste(e)
             ├─ guard: clipboardData? caret shape OK? ──no──▶ return (native path)
             ├─ content = classify(clipboardData, registeredBlockTools, defaultTool)
             │     → { kind: 'inline', text } | { kind: 'blocks', blocks: BlockNodeInit[] } | null
             ├─ content === null ──▶ return (native path)
             ├─ nativeEvent.preventDefault()
             ├─ apply(content, caretIndex)  (synchronous)                → returns caret target
             └─ requestAnimationFrame(() => caret.update(target))
```

`classify` is a pure module function (`src/paste/classify.ts`) and needs no DOM or model in tests. `apply` (`src/paste/apply.ts`) is the only code that calls the API. Rejected alternative: one method that reads `clipboardData` and mutates the document as it goes. It's harder to test, and it can't decide whether to fall back before changing the document.

### D2. The guard runs before `preventDefault`

The plugin handles a paste only when:
- `clipboardData` exists,
- `classify` returns content, and
- `caretIndex` is `null`, a `BlockIndex`, or a `TextIndex` with a single segment.

A multi-segment `TextIndex` (selection across inputs) falls back, because deleting such a selection needs a primitive that doesn't exist yet. The native path deletes each input's part and pastes plain text, as it does today. All of these checks read state only, so skipping is always safe.

### D3. Tool knowledge through `core:tool:loaded`

The plugin collects the block tool facades it sees on `core:tool:loaded` into a `Map<name, BlockToolFacade>` (checked with `tool.isBlock()`). The default tool is `config.defaultBlock`. Each line becomes `{ name: defaultBlock, data: defaultFacade.importTextContent(line, []) }`, so the plugin never assumes a data key such as `text`. If the default tool has no import config, `importTextContent` throws. Multi-line text then falls back (classify returns `null`). An inline single line needs no import and still works. Rejected alternative: hardcode `{ text: ... }` for paragraphs. That breaks with any other default tool.

### D4. Placement follows `splitBlock`'s own edge cases

With a single-segment `TextIndex` `[s, e]` in block `b`, key `k`, the steps are as follows. They all run synchronously in the paste handler's task, so `undo-group-by-task` records them as one undo step:

1. If `s !== e`, call `api.text.remove({ block: b, key: k, start: s, end: e })`. Then `o = s`, `len = text.get(b, k).length`.
2. Inline: `text.insert` at `o`. The caret goes to `o + text.length` in `(b, k)`.
3. Blocks, checked in this order:
   - Empty default block (`name === defaultBlock` and `len === 0`): `blocks.delete(b)`, then `insertMany(at b)`.
   - `o === 0`: `insertMany(at b)`.
   - `o === len`: `insertMany(at b + 1)`.
   - Otherwise: `blocks.split(b, k, o)`, then `insertMany(at b + 1)`.

For a `BlockIndex` `b`, or no caret: inline text is first wrapped as one default block, then `insertMany(at b + 1)` (or at `getBlocksCount()`).

`splitBlock` already inserts an empty block when splitting at offset 0 of the first input, and leaves an empty tail block when splitting at the end. The rules above avoid both. Rejected alternative: always split, then clean up empty blocks. That makes more events, and it's harder to reason about undo.

### D5. Caret placement after rendering

`apply` returns the target `Index`:
- Inline: `TextIndex(b, k, [o + n, o + n])`.
- Blocks: the last pasted block's index, and the last text node found by a depth-first walk of its `data`. A node counts as text when `NODE_TYPE_HIDDEN_PROP === BlockChildType.Text`. The offset is the length of that node's `value`.

The plugin then calls `api.selection.getCaret()?.update(target)` inside `requestAnimationFrame`, the same approach `BlockToolAdapter.#handleSplit` uses, so the new blocks' inputs are attached before `CaretAdapter` applies the change to the DOM. If the last block has no text node, the caret isn't moved.

### D6. What copy writes

- Copy builds each entry with `({ name, data, tunes }) => tunes ? { name, data, tunes } : { name, data }`, so the payload has no ids.
- Copy adds `application/x-editor-js` only if `caretIndex` is a `BlockIndex`, or a `TextIndex` whose segments cover two or more distinct `blockIndex` values. It still calls `preventDefault` and writes `text/plain` and `text/html` for any non-empty block selection, as today.

Rejected alternative: clip the first and last blocks to the selected text. It's the right long-term fix, but it needs per-tool knowledge of which data keys to clip. Cross-block partial copies still export whole blocks (see R1).

### D7. Parsing the payload defensively

Paste code uses `JSON.parse` in `try/catch`. It keeps only entries where `typeof name === 'string'`, the name is a registered block tool, and `data` is a non-null object. `tunes` is kept only if it is an object. `id` and any other keys are dropped. This covers payloads copied before this change (with ids) and payloads written by other applications.

## Risks / Trade-offs

- **[R1] A partial selection across blocks still copies whole blocks.** For example, selecting from the middle of block 1 to the middle of block 2 pastes both blocks in full. → Known limitation until copy clips partial blocks. It's less surprising than the single-block case, which this change fixes.
- **[R2] A multi-input paste falls back to plain text.** → Deliberate (D2). It will be revisited together with a primitive for deleting a selection across blocks.
- **[R3] Caret placement in `requestAnimationFrame` may run before an async tool render.** → It matches the adapter's existing approach. If a tool renders asynchronously, the caret simply isn't placed; the paste itself is unaffected.
- **[R4] Blank lines are dropped.** Some users may expect empty paragraphs. → This matches V2's behaviour and avoids pasting runs of empty blocks. Easy to change later in `classify`.
- **[R5] A `core:tool:loaded` event missed before the plugin was constructed.** → Plugins are initialized before tools (`core` spec, composition root), the same assumption `shortcuts-plugin` makes. A test pins it.
- **[R6] Under collaboration, a paste undoes in several steps.** → Inherited from `undo-group-by-task`'s non-goal.
- **[R7] Breaking change to the clipboard format (no ids).** → Nothing in the repository read ids from the payload. Paste accepts payloads with ids.

## Migration Plan

`undo-group-by-task` should land first; without it, a paste still works but undoes in several steps. The copy format change and the new paste behaviour ship together in this change. Rollback is reverting the change. No stored data depends on the clipboard format.

## Open Questions

- Should a paste over a `BlockIndex` selection (whole block selected) replace that block instead of inserting after it? This design inserts after it, to avoid adding block deletion to this slice.

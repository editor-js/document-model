## Why

Tracks [editor-js/document-model#135](https://github.com/editor-js/document-model/issues/135) — "Blocks merge": implement merging in `BlocksManager` and expose it on `BlocksAPI`.

In Editor.js v2 every block was its own contenteditable, and merging was triggered by Backspace at the start of a block or Delete at the end of one. In v3 the whole document is **one contenteditable with cross-block selection**, so merging is also needed whenever a deletion crosses a block boundary:

- Backspace at the start of a block deletes the boundary between it and the previous block.
- Delete at the end of a block deletes the boundary between it and the next block.
- Deleting a selection that spans several blocks deletes everything between two points, boundaries included — so the head of the first block and the tail of the last block must end up joined. The same applies to typing, pasting or pressing Enter over such a selection.

Today none of these join anything. Backspace/Delete at a boundary is a no-op, and a cross-block selection delete is handled independently by every block's `DOMBlockToolAdapter` (edge blocks trim their slice, middle blocks call `blocks.delete`), leaving the two edge blocks apart — there is a `@todo support input merging` at exactly that spot. Several adapters mutating the document for one user action also means no single place owns the outcome.

## What Changes

- **One new API method, `BlocksAPI.merge()`**, backed by a new `BlocksManager.mergeBlocks()`, in two forms:
  - **`merge({ block })`** merges `block` into the block **before it**. Only neighbouring blocks can be merged, so one block is enough.
  - **`merge({ index })`** takes a text range that starts in one block and ends in another: the text inside the range is removed, the blocks strictly between are removed, and the end block is merged into the start block at the range start. `merge({ block })` is exactly `merge({ index })` over the empty range from the end of the previous block to the start of `block`.
  - Both return the junction `{ block, key, offset }` — where the two blocks met — so callers can place the caret without re-deriving it. `merge` itself never moves the caret, like `split` and `convert`.
- **The second block is always converted into the first.** The first block survives with its id and tool; the second block's content is appended to it and the second block is removed. There is no separate convert step and no direction: Backspace at the start of B and Delete at the end of A delete the same boundary and give the same result. Blocks of different tools merge in one step, as in v2.
- **The second block's tool decides what is absorbed**, through its existing `conversionConfig.export`:
  - a key path → that text input, **with its inline formatting** (read from the model, no plain-string round trip);
  - a function → its plain-string result;
  - none → its first text input.
  Content the export does not carry is dropped with the block, exactly as `convert` drops it. The content lands in the first block's text input at the junction (its last text input for `{ block }`, the range's start input for `{ index }`).
- **Empty blocks give way.** If the first block is empty (after the range is removed), it is removed instead and the second block survives with its id and tool — Backspace after an empty line or Delete in an empty line removes that line, as in v2. If the second block has nothing to absorb, it is simply removed.
- **Blocks without text inputs are unmergeable.** `merge({ block })` throws when either of the two blocks has no text inputs. Backspace right after such a block (an image, a delimiter) or Delete right before it **removes that block** instead, through the existing `blocks.delete`. In a range, blocks without text inputs lying between the edges are removed like any other block in between.
- **Errors:** `merge` throws, leaving the document unchanged, when the block does not exist or is the first block, when the index is not a text index or does not start and end in different blocks, or when either block to be joined has no text inputs. No `canMerge`, no new tool option — `conversionConfig` only refines what is absorbed, it never blocks a merge.
- **Undo grouping is out of scope.** A merge emits several model events, which today's `UndoRedoManager` records as several undo steps. The open `undo-group-by-task` change ([#201](https://github.com/editor-js/document-model/pull/201), implemented in [#203](https://github.com/editor-js/document-model/pull/203)) records all events of one browser task as one undo step, which makes a merge — and a merge plus its follow-up insert — a single step without anything in this change. It also fixes undo of block insertion/removal, which currently throws, so undoing a merge depends on it.
- **`DOMBlockToolAdapter` only maps events to calls; the merge rules live in core:**
  - whether a range crosses blocks is decided from its model `Index` (segments in different blocks), not from the `isCrossInputSelection` flag, which is also true inside one formatted input;
  - delete input type over a cross-block range → the adapter owning the range start calls `merge({ index })` once and puts the caret at the junction;
  - insert types or Enter over a cross-block range → the same, followed by `text.insert` or `blocks.split` at the junction;
  - a range across several inputs of the **same** block keeps the existing per-input `text.remove` handling;
  - Backspace at the start of a block's first input / Delete at the end of its last input → `merge({ block })` with the current / next block when the neighbour has text inputs, `blocks.delete` of the neighbour when it has none, nothing when there is no neighbour;
  - Backspace/Delete at an edge between two inputs of the same block → caret moves to the neighbouring input (no document change).
  The merge may remove the acting adapter's own block, so every follow-up (caret, insert, split) addresses the block id returned by `merge`. The per-adapter cross-block slicing and the "middle block → `blocks.delete`" path are removed.
- **Deliberate deviations from v2:**
  - inline formatting survives a merge between different tools when the second tool's export is a key path;
  - text blocks v2 treated as unmergeable (target without a `merge()` method, or different tools without conversion configs) now merge — v2 only moved the caret;
  - Backspace/Delete next to a block without text inputs removes it instead of moving the caret into it (block selection does not exist yet).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `core`: new "Block merging" requirement (`BlocksManager.mergeBlocks` / `BlocksAPI.merge`, both forms, conversion of the second block, empty and unmergeable blocks, junction); the "EditorAPI surface" requirement lists `merge` on `BlocksAPI`.
- `sdk`: the "EditorAPI surface" requirement gains the `BlocksAPI.merge` signature and its `MergeResult` type.
- `dom-adapters`: the "Block-level DOM binding and input translation" requirement replaces per-adapter cross-block deletion with a single `merge` call, and adds the boundary Backspace/Delete mapping, including removal of neighbours without text inputs.

## Impact

- **Code**:
  - `packages/sdk/src/api/BlocksAPI.ts` — `merge` signature and `MergeResult` type.
  - `packages/core/src/api/BlocksAPI.ts` — thin wrapper.
  - `packages/core/src/components/BlockManager.ts` — `mergeBlocks` and the internal content-append helper.
  - `packages/dom-adapters/src/BlockToolAdapter/index.ts` (and `CaretAdapter` for range → `Index`) — map events to `merge`; remove per-adapter cross-block slicing.
  - Co-located Jest specs; Playwright e2e in `packages/editorjs/e2e/tests`.
- **APIs**: one additive method on `BlocksAPI`. No breaking changes, no tool changes required — `Paragraph` and `@editorjs/header` merge without opting in.
- **Depends on**: `undo-group-by-task` ([#201](https://github.com/editor-js/document-model/pull/201) / [#203](https://github.com/editor-js/document-model/pull/203)) for merges to undo as one step and for undo of the removed blocks to work at all. Related open work: the run-based inline model ([#198](https://github.com/editor-js/document-model/pull/198)) — the junction formatting clean-up is written against the model's public operations, so it holds before and after; clipboard paste ([#191](https://github.com/editor-js/document-model/pull/191)) hands selections across several inputs back to `insertFromPaste`, which this change routes through `merge({ index })`.
- **Model**: no changes to `@editorjs/model`; everything is composed from existing `getBlockTextContent`/`insertText`/`removeText`/`format`/`unformat`/`getFragments`/`removeBlock` operations, so collaboration needs no new OT support.
- **Behaviour users will notice**: deleting, typing, pasting or pressing Enter over a cross-block selection now joins the edge blocks; Backspace/Delete at block boundaries now merge, or remove a neighbouring block that has no text inputs.
- **Docs**: does not supersede any document. `docs/input-handling.md` gains a "Merging blocks" section describing how deletions map to `merge`; its "BeforeInput delegation" section stays accurate.

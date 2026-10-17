## Context

v3 renders the whole document inside one `contenteditable` owned by `BlocksUI`. Every `beforeinput` is prevented and re-dispatched as `BeforeInputUIEvent`; **every** block's `DOMBlockToolAdapter` listens and acts on the inputs its target ranges touch. `CaretAdapter` turns the DOM selection into a model `Index`, which is a composite `TextIndex` (one segment per touched input, in document order) when the selection spans inputs. All adapters share one `InputsRegistry`.

Current deletion behaviour (`BlockToolAdapter#handleDeleteInContentEditable`):

- In-input range → `api.text.remove`.
- Cross-block range → each adapter clips the range to its own inputs and removes that slice; adapters whose input lies fully in between call `api.blocks.delete` on their whole block. The first and last blocks stay separate (`@todo support input merging`).
- Collapsed caret at a block boundary (Backspace at start / Delete at end) → the clipped ranges are empty, so nothing happens.

Editor.js v2 had per-block contenteditables and merged only on Backspace/Delete at a boundary: `BlockManager.mergeBlocks(targetBlock, blockToMerge)`, gated by `areBlocksMergeable()` (target has a `merge()` method; different tools need `export`/`import` conversion configs), moving cross-tool content as a plain string.

`BlocksManager` already implements `splitBlock()` and `convertBlock()` purely from `EditorJSModel` primitives, and `BlocksAPI` wraps them with params objects. Merging is the missing inverse of `split`.

## Goals / Non-Goals

**Goals:**

- One operation that merges two neighbouring blocks, usable both for a block boundary (Backspace/Delete, programmatic calls) and for a cross-block range (selection delete, and typing/paste/Enter over a selection).
- All merge rules in core, so the DOM adapter only maps events to calls.
- Exactly one document-changing call per user action (plus the insert/split follow-up when typing or pressing Enter over a selection), all within one browser task.
- Inline formatting survives the merge, including between different tools.
- No new tool option and no API besides `BlocksAPI.merge`.

**Non-Goals:**

- Undo grouping. Today `UndoRedoManager` only groups consecutive text inserts/removals in one input, so a merge would be several undo steps, and undoing a block removal currently throws. Both are addressed by the open `undo-group-by-task` change ([#201](https://github.com/editor-js/document-model/pull/201) / [#203](https://github.com/editor-js/document-model/pull/203)), which records all events of one browser task as one step. This change relies on it and adds nothing to `UndoRedoManager`.
- Selecting non-text neighbours (image, delimiter) on Backspace/Delete — block selection does not exist yet; such neighbours are removed instead (Decision 5).
- A two-step "turn a structured block into plain text first, merge on the next keypress" behaviour, and list-style structural clean-up (removing only `items.0`). Both need a tool-level hook; no tool in this repository needs it yet.
- v2's whitespace/empty-tag special cases (`&nbsp;`, `<b></b>` before the caret) — those stem from v2 reading the DOM; v3 reads the model.
- `insertCompositionText` over a cross-block selection (composition is already a `@todo`).
- Multi-client concurrency tests for merges.

## Decisions

### 1. One method, two forms

```ts
interface MergeResult {
  /** Id of the block the content was merged into */
  block: string;
  /** Data key of the text input the content was merged into */
  key: string;
  /** Offset in that input where the merged content starts */
  offset: number;
}

interface BlocksAPI {
  merge(params: { block: number | string; userId?: string | number }): MergeResult;
  merge(params: { index: Index; userId?: string | number }): MergeResult;
}
```

- **`{ block }`** merges `block` into the block before it. Only neighbouring blocks can be merged — joining distant blocks has no meaningful outcome for the blocks between them — so a single block identifies the pair. Backspace at the start of block `b` is `merge({ block: b })`; Delete at the end of block `b` is `merge({ block: b + 1 })`.
- **`{ index }`** takes a text `Index` that starts in one block and ends in a later one (a composite `TextIndex`, as `CaretAdapter` produces for a cross-block selection). It removes the content inside the range, removes the blocks strictly between, and merges the end block into the start block at the range start.

`{ block }` is defined as `{ index }` over the empty range from the end of the previous block's last text input to the start of `block`'s first text input, so both forms run the same algorithm and cannot drift apart.

*Why `BlocksAPI`:* merging changes which blocks exist, like `split`, `convert` and `delete`. Putting range deletion with block side effects into `TextAPI.remove` would give a text method block-level effects, and a separate `SelectionAPI` method would partly mirror `TextAPI.remove`. A range-accepting `merge` keeps block structure changes in `BlocksAPI`, and `TextAPI.remove` keeps its single-input contract.

*Why one name for both forms:* both collapse everything between two points and join what is left on each side. The range form also removes the text inside the range, which its documentation states up front. "Collapse" was considered and rejected: in DOM and selection terminology a collapsed range is a caret, and collapsing never deletes content; it would also read like folding a block.

*Why a return value:* the junction is the caret position every interactive caller wants, and `merge` computes it anyway. Returning data has precedent (`TextAPI.remove` returns the removed text). `merge` itself does not move the caret — `BlocksManager` deliberately has no caret/adapter dependency (see its class comment about the `BlocksManager → Adapter → EditorAPI → BlocksAPI → BlocksManager` cycle).

*No direction:* the second block is always converted into the first (Decision 3). Backspace at the start of B and Delete at the end of A delete the same boundary, so they give the same result and `merge` needs no direction parameter.

### 2. Algorithm

Let the range start at `(A, keyA, s)` and end at `(B, keyB, e)` with `A < B`. For `{ block: b }`: `A = b - 1`, `keyA` = last text input of `A`, `s` = its length; `B = b`, `keyB` = first text input of `B`, `e = 0`.

1. **Validate** (Decision 5) before any mutation.
2. **Remove the range content in B** (B has the highest index, so lower indexes stay valid): remove `[0, e]` from `keyB` and empty every text input of B that the range fully covers (the segments before `keyB`).
3. **Remove the blocks strictly between A and B**, by index range in descending order — not by segment, so blocks without text inputs (which produce no segments) are removed too.
4. **Remove the range content in A**: remove `[s, end]` from `keyA` and empty every text input of A the range fully covers (segments after `keyA`).
5. **If A is now empty** (Decision 4): remove A; B survives with its id and tool, changed only by step 2. Junction → `(B, keyB, 0)`.
6. **Otherwise convert B into A**: compute B's absorbed content (Decision 3) from B's **current** state, append it into `keyA` at `s` (Decision 6), and remove B. Junction → `(A, keyA, s)`.
7. Return the junction.

All mutations are dispatched synchronously within the caller's browser task, which is what `undo-group-by-task` needs to record them — together with the adapter's follow-up insert or split — as one undo step.

### 3. The second block is converted into the first

The first block always survives with its id and tool; the second block is absorbed. What is absorbed is decided by the second block's tool through its existing `conversionConfig.export`, read from the model after step 2:

| `export` of B's tool | Absorbed content |
|---|---|
| key path (e.g. `'text'`, `'items.0.text'`) | that text input's value **and** inline fragments, from `getBlockTextContent` (key paths and model data keys share the dot notation) |
| function | `exportTextContent(data)` — plain string, no fragments |
| absent | B's first text input, value and fragments |

Anything the export does not carry is dropped with B, exactly as `convertBlock` drops it — e.g. a quote whose export is `'text'` loses its caption, as in v2. A key path that does not resolve to one of B's text inputs absorbs nothing, consistent with `exportTextContent` returning `''` for a missing key; B is still removed.

`Paragraph` and `@editorjs/header` (on its `v3` branch) both declare `export: 'text'`, so merges between them keep formatting in both directions.

The content is **appended into A's existing input** rather than going through A's `conversionConfig.import`: import produces a whole new data object, while merging extends the input at the junction. So A's tool needs no conversion config, and neither tool can block a merge — `conversionConfig` only refines what is absorbed. This replaces v2's mergeability gate (`merge()` method + `export`/`import` presence): in v3 the join only moves text between text inputs, which accept text with fragments by definition.

*Deviation from v2:* v2 round-tripped cross-tool content through a plain string; here formatting survives whenever B's export is a key path or absent.

### 4. Empty blocks give way

A block is **empty** when it has at least one text input and all of them are `''`. If A is empty after step 4, A is removed and B is kept as-is (step 5). This gives v2's empty-block behaviour without special cases:

- Backspace at the start of B when the previous block is an empty line → the empty line is removed, B keeps its tool (v2: "should remove previous Block if Caret at the start of the Block and previous Block is empty").
- Delete at the end of an empty block A → A is removed, the next block keeps its tool.
- A selection starting at the very beginning of A → A is removed and the trimmed B survives.

If B has nothing to absorb (empty, or emptied by step 2), step 6 appends nothing and removes B — Backspace in an empty paragraph removes it, with the junction at the end of the previous block.

### 5. Validation and unmergeable blocks

A block **without text inputs** (image, delimiter, embed) is **unmergeable**: there is nothing to absorb from it and nothing to append into it. `merge` throws, leaving the document unchanged, when:

- `{ block }` does not resolve to a block, or resolves to the first block;
- `{ index }` is not a text index, or does not start and end in different blocks (single-block ranges stay on `TextAPI.remove`);
- either block to be joined has no text inputs (for `{ index }` both edges lie in text inputs by construction, so this can only happen with `{ block }`).

Blocks without text inputs that lie **strictly between** the edges of a range are not joined, only removed (step 3), so they never make a range merge fail.

On the keyboard, an unmergeable neighbour is **removed** instead of merged: Backspace at the start of a block right after an image, or Delete at the end of a block right before one, deletes the image through the existing `api.blocks.delete`, and the caret stays where it is. This is the adapter's mapping (Decision 7), not a `merge` rule: `merge` keeps one meaning — joining two text blocks — and a programmatic caller that merges an image gets an error rather than a silent deletion.

There is no `canMerge`: every failure condition is structural and visible to the caller up front. The DOM adapter never hits them, because it checks the neighbour's registered text inputs before choosing between `merge` and `delete`.

### 6. Appending with formatting hygiene

`BlocksManager` gets an internal helper (not on `BlocksAPI`):

```ts
appendTextContent(blockIndex: number, key: DataKey, offset: number, content: { value: string; fragments: InlineFragment[] }, userId): void
```

1. If `content.value` is empty, return.
2. `model.insertText(userId, blockIndex, key, content.value, offset)`.
3. Normalize the inserted range: inserted text takes the formatting of the text it is inserted into, so appending at the end of an input that ends with a bold run makes the merged text bold. This holds for the current inline tree (`ParentInlineNode.insertText` inserts into the child found by `findChildByIndex`) and for the run model proposed in [#198](https://github.com/editor-js/document-model/pull/198) (`RunList.insert` extends the run at the offset with its marks). The clean-up only uses the model's public operations, so it works with either: read `model.getFragments(blockIndex, key, undefined, offset, offset + value.length)` and `model.unformat(...)` every tool found there.
4. Re-apply each `content.fragments` entry with `model.format(...)` shifted by `offset`.

Fragments of inline tools A's tool does not enable are kept, consistent with `splitBlock`.

### 7. The DOM adapter maps events to calls

`DOMBlockToolAdapter` decides only *which call* an event maps to, from facts it already has (its DOM, the shared `InputsRegistry`); every document rule is in `merge`.

**Classifying the target range.** The adapter converts the target range to a model `Index` (`CaretAdapter`'s selection-to-`Index` logic, refactored so it accepts any DOM `Range` — a `beforeinput` target range is not always the current selection, e.g. drag-and-drop). The range **crosses blocks** when its segments belong to more than one block. The `isCrossInputSelection` flag on `BeforeInputUIEvent` is not used for this: `BlocksUI` computes it as `startContainer !== endContainer`, which is also true inside a single input with formatting, because start and end land in different text nodes. The existing `insertParagraph` check on that flag moves to the same `Index`-based test.

| `beforeinput` | Call |
|---|---|
| delete type, range crossing blocks | adapter owning the range start: `merge({ index })`, caret → junction |
| insert type (`insertText`, `insertFromPaste`, `insertFromDrop`, `insertReplacementText`), range crossing blocks | same, then `api.text.insert` at the junction |
| `insertParagraph`, range crossing blocks | same, then `api.blocks.split` at the junction |
| any type, range across several inputs of one block | unchanged: per-input `api.text.remove` by the block's adapter, then the type's usual insert/split |
| backward delete type, collapsed at offset 0 of the block's first text input | previous block has a registered text input → `merge({ block: current })`, caret → junction; previous block has none → `api.blocks.delete` of the previous block, caret unchanged; no previous block → no-op |
| forward delete type, collapsed at the end of the block's last text input | next block has a registered text input → `merge({ block: next })`, caret → junction; next block has none → `api.blocks.delete` of the next block, caret unchanged; no next block → no-op |
| backward/forward delete type at an edge between two inputs of the same block | caret moves to the end of the previous / start of the next input; no document change |
| anything within one input | unchanged (`api.text.remove` / `insert` / `split`) |

Backward types are `deleteContentBackward`, `deleteWordBackward`, `deleteSoftLineBackward`, `deleteHardLineBackward`; forward types are their `Forward` counterparts. Boundary detection uses the collapsed DOM selection and the input type, **not** the browser's target range, because browsers disagree on the target range they report for Backspace at the start of a block. Neighbours are found with `api.blocks.getIdByIndex` and their text inputs with `InputsRegistry.getBlockInputs`.

**Only one adapter acts per event**: the one owning the range start (or the caret). The per-adapter clipping of *cross-block* ranges and the "middle block → `api.blocks.delete`" path in `#handleDeleteInContentEditable` are removed, together with the `@todo support input merging`; per-input clipping within one block stays.

**The acting adapter may lose its own block.** Backspace at the start of B removes B; a range starting at offset 0 of A removes A. Either way the adapter handling the event is destroyed by the merge it called. Every follow-up — caret placement, `text.insert`, `blocks.split` — therefore addresses `MergeResult.block` and goes through shared services (`CaretAdapter`, the API), never `this.blockId` or the adapter's own inputs.

## Risks / Trade-offs

- **Browser differences around boundary events** → boundary detection relies on the collapsed DOM selection and the input type, not on the reported target range; covered by Playwright e2e on chromium and webkit (the browsers the e2e project runs).
- **Caret races with adapter-side caret updates.** The adapter's model-to-DOM text sync also updates the caret index after `TextAddedEvent`/`TextRemovedEvent`. The adapter sets the caret to the returned junction after `merge` returns, so its write is last; e2e tests assert the caret lands at the junction.
- **Formatting bleed at the junction** → explicit unformat-then-reformat step (Decision 6), covered by a test that merges into an input ending with a formatted run.
- **Content outside the export is dropped.** A range ending in a quote's caption, or Backspace into a quote with a caption, drops what the quote's export does not carry. Same rule as `convert`, and v2's behaviour; worth stating in the `merge` docs.
- **Export functions lose formatting.** Tools that want formatting to survive a merge should use a key path. Documented on `conversionConfig.export`.
- **Behaviour change for cross-block selections:** delete/type/paste/Enter now join the edge blocks. Intended, but it changes what current users of the playground see.
- **Collaboration/OT:** only existing operations are emitted, so no new transform support is needed; concurrent edits during a merge go through the existing machinery but are not specifically tested here.
- **Undo depends on `undo-group-by-task`.** Until #201/#203 land, a merge is several undo steps and undoing its block removal throws. Undo tests for merging belong in that change or after it lands; this change only asserts that all of a merge's events are emitted synchronously.
- **Removing non-text neighbours is immediate.** Backspace after an image deletes the image with no intermediate "selected" state. Accepted until block selection exists; the adapter mapping is the only place to change then.

## Open Questions

None.

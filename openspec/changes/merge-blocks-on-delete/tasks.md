## 1. SDK contract

- [ ] 1.1 Add `MergeResult` (`{ block: string; key: string; offset: number }`) and two `merge` overloads — `merge(params: { block: number | string; userId?: string | number }): MergeResult` and `merge(params: { index: Index; userId?: string | number }): MergeResult` — to `BlocksAPI` in `packages/sdk/src/api/BlocksAPI.ts`, next to `split`/`convert`; document both forms, that the second block is converted into the first via its `conversionConfig.export`, that the range form removes the content inside the range, that blocks without text inputs are unmergeable, and that it does not move the caret; export `MergeResult` from the package entry
- [ ] 1.2 Note on `conversionConfig.export` in `packages/sdk/src/entities/BlockTool.ts` that it also decides what is absorbed when the block is merged, and that a key path keeps inline formatting while a function does not
- [ ] 1.3 Run `yarn workspace @editorjs/sdk lint` and `build` to confirm the contract compiles

## 2. Append helper (TDD)

- [ ] 2.1 Write failing tests in `packages/core/src/components/BlockManager.spec.ts` for an internal `appendTextContent(blockIndex, key, offset, content, userId)`: appends text at the offset, re-applies fragments shifted by the offset, is a no-op for empty content
- [ ] 2.2 Implement it with `model.insertText` + `model.format`, and make the tests pass
- [ ] 2.3 Write a failing test that appending to an input ending with a formatted run does not extend that formatting over the appended text, then implement the normalization step (`model.getFragments` over the appended range → `model.unformat` per tool found) before re-applying the content's fragments

## 3. mergeBlocks — block form (TDD)

- [ ] 3.1 Write failing tests for `BlocksManager.mergeBlocks({ block })`: two paragraphs merge into the previous one, which keeps its id, and the junction is returned; the block can be passed by index or id
- [ ] 3.2 Implement the block form on top of `appendTextContent` + `removeBlock`, and make the tests pass
- [ ] 3.3 Write failing tests for what is absorbed: export key path → that input with fragments (including a nested key such as `items.0.text`); export function → its string without fragments; no `conversionConfig` → first text input with fragments; a second input not covered by the export is dropped with the block; an export key path matching none of the block's text inputs absorbs nothing and the block is still removed — then implement the export resolution and make them pass
- [ ] 3.4 Write failing tests for empty blocks: an empty previous block is removed and the merged block keeps its id, tool and text with the junction at its offset 0; an empty merged block is removed and the previous block is unchanged — then make them pass
- [ ] 3.5 Write failing tests that `{ block }` throws, leaving the document unchanged, for an unknown block, the first block, and a block or previous block without text inputs (unmergeable); make them pass
- [ ] 3.6 Write a test that all model events of one `merge` call are emitted synchronously, before `merge` returns (the precondition for `undo-group-by-task` to record them as one step)

## 4. mergeBlocks — range form (TDD)

- [ ] 4.1 Write failing tests for `mergeBlocks({ index })` across two blocks: range content removed, end block's remaining content merged at the range start, end block removed, junction at the range start
- [ ] 4.2 Implement the range form in the order end block → blocks strictly between (descending, by index range) → start block → empty-start check → convert end block into start block, and make the tests pass
- [ ] 4.3 Write failing tests for: blocks without text inputs between the edges are removed; a range starting at offset 0 of the first block removes that block and keeps the trimmed end block with its tool; a range ending in a non-exported input of the end block absorbs only what the export carries — then make them pass
- [ ] 4.4 Write failing tests that `{ index }` throws for a non-text index and for a range within a single block; make them pass
- [ ] 4.5 Write a test that `merge({ block: b })` produces the same document as `merge({ index })` over the empty boundary range before block `b`

## 5. BlocksAPI wiring and integration

- [ ] 5.1 Write failing tests in `packages/core/src/api/BlocksAPI.spec.ts` that `merge()` delegates both forms to `BlocksManager.mergeBlocks` with the config's `userId` by default and an explicit one when passed, and returns its result
- [ ] 5.2 Implement `merge()` in `packages/core/src/api/BlocksAPI.ts` as a thin params-object wrapper mirroring `split`/`convert`, and make the tests pass
- [ ] 5.3 Add integration tests in `packages/core/src/api/BlocksAPI.integration.spec.ts` (real model, mocked DOM adapters) for: paragraph → paragraph merge; paragraph merged into a header-like tool keeps formatting; header-like block merged into a paragraph; cross-block range across three blocks, one of them without text inputs, with formatting preserved; the caret is not moved by `merge`

## 6. DOMBlockToolAdapter

- [ ] 6.1 Refactor `CaretAdapter`'s selection-to-`Index` logic so it can convert an arbitrary DOM `Range` (from a `beforeinput` target range), keeping `selectionchange` behaviour unchanged; cover with a test
- [ ] 6.2 Write failing tests for classifying a target range from its `Index`: a range inside one formatted input (start and end in different text nodes) does not cross blocks; a range across two inputs of one block does not cross blocks; a range whose segments belong to two blocks does — then implement the check and switch the existing `insertParagraph` condition from `isCrossInputSelection` to it
- [ ] 6.3 Write failing tests that a delete `beforeinput` with a cross-block target range leads to exactly one `api.blocks.merge({ index })` call, from the adapter owning the range start, no `api.blocks.delete`/`api.text.remove` calls, and the caret placed at the returned junction
- [ ] 6.4 Write failing tests that an insert-type `beforeinput` over a cross-block range calls `merge({ index })` then `api.text.insert` at the junction, and that `insertParagraph` over it calls `merge({ index })` then `api.blocks.split` at the junction
- [ ] 6.5 Write failing tests that a collapsed selection at offset 0 of a block's first input with a backward delete type calls `merge({ block })` with its own block, and at the end of its last input with a forward type calls it with the next block — regardless of the reported target range; that `api.blocks.delete` is called for a neighbour without registered text inputs, with the caret left in place; and that nothing is called at the start of the first or the end of the last block
- [ ] 6.6 Write failing tests that a backward/forward delete at an edge between two inputs of the same block only moves the caret to the neighbouring input, and that a delete over a range across two inputs of one block still removes text per input without calling `merge`
- [ ] 6.7 Write failing tests that when `merge` removes the acting adapter's own block (Backspace at a block's start; a cross-block range starting at offset 0), the caret placement and the follow-up `text.insert`/`blocks.split` address `MergeResult.block` and succeed
- [ ] 6.8 Implement the mapping in `packages/dom-adapters/src/BlockToolAdapter/index.ts`, remove the per-adapter clipping of cross-block ranges (keeping per-input clipping within one block), the "middle block → `blocks.delete`" path and the `@todo support input merging`, and make the tests pass

## 7. End-to-end

- [ ] 7.1 Register a minimal header-like text tool with `conversionConfig` and a minimal tool without text inputs (delimiter-like) in `packages/editorjs/e2e/fixtures/main.ts` so cross-tool and unmergeable cases can be driven from the UI
- [ ] 7.2 Add `packages/editorjs/e2e/tests/merge.spec.ts` covering, on chromium and webkit: Backspace at the start of a paragraph merges it into the previous paragraph with the caret at the junction; Backspace at the start of the header-like block merges it into the previous paragraph in one step; Backspace in an empty paragraph removes it; Backspace after an empty paragraph removes that one and keeps the current block's tool; Delete at the end of a paragraph merges the next block; deleting and typing over a cross-block selection joins the edge blocks; Enter over a cross-block selection leaves two blocks; Backspace at the start of a block's second input moves the caret to its first input; Backspace right after and Delete right before the delimiter-like block remove it and leave the caret in place

## 8. Docs and verification

- [ ] 8.1 Add a "Merging blocks" section to `docs/input-handling.md` describing how cross-block and boundary deletions map to `BlocksAPI.merge` (and to `blocks.delete` for blocks without text inputs), the conversion of the second block, the empty-block rules and the reliance on `undo-group-by-task` for undo, and a diagram in `docs/diagrams/` if the existing ones no longer match
- [ ] 8.2 Run `yarn workspace @editorjs/core test`, `yarn workspace @editorjs/dom-adapters test`, `yarn workspace @editorjs/sdk test`, `yarn workspace @editorjs/editorjs test:e2e` and `yarn lint` across the affected workspaces; fix any fallout
- [ ] 8.3 Run `openspec validate merge-blocks-on-delete --type change` and fix any reported issues

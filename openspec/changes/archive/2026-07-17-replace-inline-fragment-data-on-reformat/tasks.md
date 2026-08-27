## 1. Model: data-aware comparison

- [x] 1.1 Add a pure `isSameInlineData(a?, b?)` deep-equality helper in the model's inline-fragments utils
- [x] 1.2 Make `FormattingInlineNode.isEqual()` and `mergeWith()` use `isSameInlineData` so distinct-data fragments don't merge
- [x] 1.3 Rewrite `FormattingInlineNode.format()`: same tool + equal data → no-op; same tool + different data → replace via split (reuse the `unformat` split pattern), full-cover → replace `data` in place
- [x] 1.4 Introduce a controlled way to set the fragment's `data` (private `#data` field + public getter), keeping it non-public
- [x] 1.5 Make `ParentInlineNode.getFragments()` normalization data-aware so the read/serialization path keeps distinct-data fragments separate

## 2. SDK: comparator seam

- [x] 2.1 Add optional `isSameData?(a, b): boolean` to the `InlineTool` interface with a doc comment marking it the deferred override point

## 3. Tool: remove the link workaround

- [x] 3.1 In `inline-link`, always send `FormattingAction.Format` on confirm; drop the `FormattingAction.None` branch and the stale `@todo`

## 4. Verify

- [x] 4.1 Add/extend tests for the spec scenarios: re-apply different data → replaced; re-apply equal data → no-op; partial-range replace splits correctly; normalization keeps distinct-data fragments separate (integration spec) plus a focused `isSameInlineData` unit spec
- [x] 4.2 Run the model + tools test suites and typecheck; confirm green

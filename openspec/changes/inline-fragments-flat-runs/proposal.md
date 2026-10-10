## Why

The inline formatting of a `TextNode` is stored as a tree (`FormattingInlineNode` / `TextInlineNode`) whose shape depends on the order the formatting was applied in, not only on the resulting formatting. The same markup can therefore produce different trees, which leaks out as:

- split fragments: `getFragments()` only merges a fragment with the one right before it in pre-order, so applying bold 0–2, italic 0–4, bold 2–4 on `abcd` returns `bold 0–2, italic 0–4, bold 2–4` instead of `bold 0–4, italic 0–4` (#53);
- order-dependent fragment order, and so order-dependent DOM nesting (`FormattingAdapter` wraps fragments in the order the model returns them);
- loading a text from fragments gives a tree that depends on the order of the fragments array.

Replacing the tree with a canonical flat representation (runs of text, each with the set of marks applied to it) removes the cause rather than patching each symptom, and simplifies every operation to "split, change marks, merge".

## What Changes

- `TextNode` stores its content as a list of runs `{ text, marks }` with three invariants: no empty runs, adjacent runs never carry equal mark sets, at most one mark per tool in a run.
- `getFragments()` returns maximal fragments: each stretch of characters formatted with the same tool and equal data is one fragment, regardless of how it was applied (fixes #53).
- Fragments are returned in a deterministic order: start ascending, end descending, tool name ascending. DOM nesting produced by `FormattingAdapter` becomes deterministic as a consequence: a fragment that contains another wraps it, and for equal ranges the tool later in name order ends up outside (`surround()` wraps whatever is already in the range).
- The formatting state, and so the fragments, no longer depend on the order of `format`/`unformat` operations or on the order of fragments passed to the `TextNode` constructor.
- `getFragments(start, end)` returns whole fragments that intersect the range; for text whose fragments used to be split by the tree, the returned ranges are now the full, merged ranges.
- Public `TextNode` API (`insertText`, `removeText`, `getText`, `format`, `unformat`, `getFragments`, `serialized`, `length`), its events and the serialized format stay the same.
- **BREAKING** (package API): `FormattingInlineNode`, `ParentInlineNode`, `TextInlineNode`, the `ParentNode`/`ChildNode` mixins and the `InlineNode` type are removed from `@editorjs/model` exports. No package in the monorepo imports them. `TextNode#format`/`#unformat` return `void` instead of the created tree nodes (the return value is not used anywhere).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `model`: the "Inline text tree" requirement is replaced by requirements for run-based inline text: canonical formatting state, maximal fragments, deterministic fragment order, range queries and insertion inheritance.

## Impact

- **Code**: `packages/model/src/entities/inline-fragments/` is rewritten and renamed to `inline-text/`. `TextNode` stays as the public class; `ParentInlineNode`, `FormattingInlineNode`, `TextInlineNode`, `InlineNode` and the `ParentNode`/`ChildNode` mixins (with their mocks and specs) are removed. Specs asserting exact tree shapes are replaced by specs asserting fragments and run invariants.
- **Consumers**: `BlockNode`, `EditorDocument`, `EditorJSModel`, `core`, `dom-adapters` and `collaboration-manager` only use the `TextNode` API, events and fragments, so they need no changes. The visible differences are merged fragment ranges and a deterministic fragment order, which may change DOM nesting for text that was formatted with overlapping tools.
- **Data**: serialized text (`value` + `fragments`) is unchanged; existing documents load as before, and their fragments come out merged and sorted.
- **Docs**: `docs/model.md` and `docs/diagrams/model-tree-structure.mmd` describe the inline tree (`FormattingInlineNode` + `TextInlineNode`); they are superseded by this change and must be updated to describe runs.
- **Related work**: fixes #53. The `wire-inline-tool-data-comparator` change keeps working: mark equality goes through a single comparison point (`isSameInlineData`) that a per-tool comparator can replace. Out of scope, but designed to fit later: per-tool `rank` in the sort, multiple instances of one tool (nested quotes, overlapping comments), mark identity via an id table, inline embeds, and a balanced run container.

## Context

`TextNode` (in `packages/model/src/entities/inline-fragments/`, renamed to `inline-text/` by this change) holds a text value and its inline formatting. Today it is the root of a tree: `ParentInlineNode` → nested `FormattingInlineNode`s (one per applied tool, with `tool` and `data`) → `TextInlineNode` leaves, glued together by the `ParentNode`/`ChildNode` decorator mixins.

The tree is private to the model in practice:

- serialization is `{ value, fragments }`, where `fragments` comes from `getFragments()`; the tree itself is never stored;
- loading replays `format()` per fragment (`TextNode#initialize`);
- `FormattingAdapter` (dom-adapters) renders from fragments it reads through the API, wrapping each with `surround()` in array order;
- collaboration and undo/redo operate on `format`/`unformat` ranges;
- no package outside `inline-fragments/` imports the node classes.

The tree's shape depends on operation order. `ParentNode#normalize` only merges equal neighbouring siblings, and `ParentInlineNode#getFragments` only merges a fragment into the one right before it in pre-order. With the current code:

| Operations | `getFragments()` |
|---|---|
| `abcd`: bold 0–2, italic 0–4, bold 2–4 | `bold 0–2, italic 0–4, bold 2–4` |
| `abcd`: bold 0–4, italic 0–4 | `bold 0–4, italic 0–4` |
| `abcdef`: bold 0–3, italic 1–3, italic 3–6, bold 3–5 | `bold 0–3, italic 1–6, bold 3–5` |
| `abcd`: italic 1–3, bold 0–4 | `bold 0–1, italic 1–3, bold 1–4` |

All four should return maximal fragments; the first two describe identical formatting.

## Goals / Non-Goals

**Goals:**

- Canonical formatting state: identical formatting gives identical internal state, identical fragments and identical fragment order.
- Maximal fragments (#53) and a deterministic fragment order.
- Keep the `TextNode` public API, events, event payloads and serialized format.
- Keep current behaviour where it is not order-dependent: insertion inheritance, range-query semantics, data replacement on re-application, validation errors.
- Simpler code that is easy to test to the model's Stryker threshold.

**Non-Goals:**

- Per-tool inclusivity (e.g. text typed right after a link not extending it).
- Per-tool `rank` to control nesting between tools beyond the default sort.
- Several marks of the same tool on one character (nested `<q>`, overlapping comments).
- Mark identity (an id table so a link's data is stored once).
- Inline embeds (atomic inline objects with their own content).
- A balanced run container (rope / B-tree) for very long texts.

Each of these fits the run model later without changing its core rule (see Decision 1); none is needed now.

## Decisions

### 1. Flat runs instead of a (canonical) tree

`TextNode` stores its content in a `RunList`, which holds `TextRun`s:

```ts
class TextMark { readonly tool: InlineToolName; readonly data?: InlineToolData; equals(mark: TextMark): boolean }
class TextRun  { readonly text: string; readonly marks: readonly TextMark[] } // marks sorted by tool name
```

Invariants, restored at the end of every mutating operation:

1. No empty runs. Empty text is `[]`.
2. Adjacent runs never have equal mark sets (they are merged).
3. A run carries at most one mark per tool.

Invariant 2 makes the representation canonical: the runs are a pure function of "which marks apply to which character".

Alternatives considered:

- **Keep the tree, rebuild it canonically after each operation** with a stack rule (start asc, end desc, tool name). Canonical, but keeps all the tree code, still needs a global fragment merge (a tree has to cut crossing fragments), and rebuilds the tree on every operation.
- **Keep the tree, build the fewest-splits tree.** Exact minimisation is a dynamic program over mark orders per run, O(runs · k! · k) for k overlapping marks; it needs the run decomposition as input anyway, plus a deterministic tie-break.
- **Fix only `getFragments` merging (#53).** Fixes the fragment output but leaves order-dependent fragment order, DOM nesting and loading.

The tree's advantages (direct mapping from HTML, stored nesting, inline nodes with children) are not used by the model today, and the flat fragment format could not carry them anyway.

### 2. Operations: split, change marks, merge

All range edits use one helper, `#splitAt(offset)`, which guarantees a run boundary at `offset` (cutting a run in two with the same marks if needed). Then:

- `format(tool, start, end, data)`: split at `start` and `end`; on every run in `[start, end)` set the mark for `tool` to `{ tool, data }` (adding it or replacing an existing one: Invariant 3 and "re-applying replaces data"); merge.
- `unformat(tool, start, end)`: split at `start` and `end`; remove the `tool` mark from runs in `[start, end)`; merge.
- `removeText(start, end)`: split at `start` and `end`; remove the runs in `[start, end)`, collecting their text; merge.
- `insertText(text, index)`: find the run that owns `index` (Decision 4) and insert into its string. Mark sets don't change, so no split or merge is needed. Into empty text, create `{ text, marks: [] }`.
- A zero-length `format`/`unformat`/`removeText` range changes nothing (same as today).

`#merge()` is one pass joining adjacent runs with equal mark sets and dropping empty runs. Operations stay O(runs), and runs exist only where formatting changes.

Events are dispatched by `TextNode` exactly as today (same event classes, `PartialIndex({ textRange })`, context user, `{ tool, data }` payloads), including when `format` re-applies identical data.

### 3. Fragments: one sweep, then a fixed sort

`getFragments()` walks the runs once with a map of open fragments by tool:

- a fragment closes at the current offset when the run no longer has a mark of that tool, or has one with different data;
- a fragment opens for every mark of the run that isn't already open;
- everything still open closes at the end.

The result is sorted by start ascending, end descending, tool name ascending. Because a fragment stays open across runs while its mark continues, fragments are maximal by construction (#53), and the sort makes the order, and therefore `FormattingAdapter`'s DOM nesting, deterministic. `surround()` wraps whatever is already in the range, so a containing fragment (listed first) wraps the contained one, and for equal ranges the tool later in name order ends up outside. Fragment objects, ranges and data are fresh copies per call, so callers can't change internal state through them.

### 4. Insertion inherits from the left

`insertText` at index `i > 0` inserts into the run containing character `i - 1`; at `i = 0` it inserts into the first run. This reproduces today's `findChildByIndex` behaviour (`index <= offset + length` picks the left node) and was confirmed against the current implementation.

### 5. Range queries

`getFragments(start, end, tool?)` validates the range, computes all fragments, and keeps those with `fragment.start < end && fragment.end > start`. That matches today's `#reduceChildrenInRange` (strict overlap, so touching fragments and empty ranges return nothing), but returns full merged ranges instead of the tree pieces that happened to overlap. `tool` filters the result as today. Computing all fragments per query is O(runs); it can be narrowed later if profiling shows a need.

### 6. Single equality point for mark data

Two marks are equal when their tools are equal and `isSameInlineData(a.data, b.data)` holds. Run merging (Invariant 2), the fragment sweep and the identical-data check all go through `TextMark#equals`. The `wire-inline-tool-data-comparator` change can replace the data comparison there with a per-tool comparator without touching the algorithms.

`isSameInlineData` treats `undefined` and `{}` as equal, but they serialize differently. Without care, merging runs keeps whichever one was on the left and re-applying replaces one with the other, so equal formatting could serialize differently. `TextMark` therefore stores empty data as `undefined`, and fragments never carry `data: {}`. It also stores a deep copy of the data (`cloneInlineData`), and `RunList#toFragments` hands out copies, so neither the object passed to `format` nor a returned fragment can change the runs behind the model's back.

Alternatives considered: normalizing to `{}` instead (adds `data: {}` to every fragment without data, changing serialized output for most documents); freezing the data (throws on consumers that mutate fragments in strict mode).

### 6a. Deterministic loading of conflicting fragments

Our own serialized fragments never overlap for one tool, but external input can (v2 import, hand-written or remote JSON). `TextNode#initialize` applies initial fragments sorted by start, end descending, tool name, then `JSON.stringify(data)`, so where fragments of one tool overlap with different data, the one that sorts later wins regardless of input order. The comparator is a total order, unlike the fragment output sort, which never compares two fragments of the same tool with equal ranges.

### 7. Module layout and exports

- `TextNode/index.ts` keeps the public class. It extends `EventBus` directly (it no longer has a `ParentInlineNode` base) and keeps its constructor options (`value`, `fragments`).
- `TextMark`, `TextRun` and `RunList` are classes in their own folders under `inline-text/` (the `inline-fragments/` folder is renamed, since it no longer holds fragments), not exported from the package:
  - `TextMark` is an immutable value object with `equals()`.
  - `TextRun` is an immutable data class with no behaviour, kept as a class for consistency with the other entities.
  - `RunList` owns the runs and their invariants. Its public methods (`insert`, `remove`, `setMark`, `removeMark`, `toFragments`, `getText`, `length`, and a `runs` copy for tests) restore the invariants before returning. Splitting, merging and mark-set helpers are private.
  - `TextNode` keeps validation, events and loading, and delegates storage to `RunList`.
  - Fields are `public readonly`, not `#private`, because Jest's `toEqual` ignores `#` fields and run assertions would pass vacuously.
- `ParentInlineNode`, `FormattingInlineNode`, `TextInlineNode`, `InlineNode`, the `ParentNode`/`ChildNode` mixins and their mocks are deleted, along with their exports from `@editorjs/model`.
- `format`/`unformat` return `void`.
- Validation errors keep their current messages, since specs and callers may rely on them.

### 8. Testing strategy

- **Regression first.** The four cases from Context, plus behaviour-preservation tests (insertion inheritance, range queries, data replacement, removal, validation), are added to `TextNode/TextNode.integration.spec.ts` before the rewrite (the unit spec mocks the tree, so it can't host them). They run against the current implementation (the order-dependent ones fail) and stay unchanged afterwards as the contract.
- **Invariant checks on `RunList`.** The invariants belong to `RunList`, so they are checked there: a test-only helper (a `*.testing.ts` file, excluded from Stryker) reads `RunList#runs` and asserts them after every `RunList` spec and after every step of the `RunList` random sequences. `TextNode` has no test-only API; its tests go through its public API only.
- **Seeded random sequences.** A shared helper (no new dependency) generates operation sequences and applies them to a per-character reference model:
  - the `RunList` sequences check the invariants, text and fragments after every operation;
  - the `TextNode` sequences check text and fragments after every operation, then that rebuilding from `serialized` gives the same fragments, and that shuffling the serialized fragments before loading gives the same result.
- Integration specs (`InlineTree.integration.spec.ts`) are kept where they assert fragments and rewritten where they assert tree shape.

## Risks / Trade-offs

- [Fragments that used to carry `data: {}` (bold and italic applied from the UI) now come out without `data`] → Equal under `isSameInlineData`, and documents load the same either way. Consumers reading `fragment.data` of such tools must accept `undefined`; the SDK already types `createWrapper(data?)` as optional. `@editorjs/inline-link` dereferences `data` without a guard, so a link with empty data (which has no meaning) would throw; links always carry `href` in practice.

- [Fragment order changes for existing documents with overlapping formatting, so DOM nesting can differ from before] → Content and formatting are identical; only wrapper nesting changes, and it becomes stable. Mention it in the PR description.
- [`FormattingAdapter`'s incremental re-render can leave empty wrappers (e.g. `<b></b>`) next to a re-rendered range] → Pre-existing: the same sequence on `main` leaves them too. Out of scope; the model is correct either way.
- [`getFragments(start, end)` returns larger ranges where the tree used to return split pieces; `FormattingAdapter` re-renders the union of returned ranges] → That's the correct range to re-render. Covered by existing dom-adapters tests; the playground should be checked once by hand.
- [Removing exported classes is a breaking change for anyone importing them from `@editorjs/model`] → Nothing in the monorepo does. Listed as BREAKING in the proposal.
- [Rewriting a mutation-tested module can lower the Stryker score] → The run code is much smaller; the regression, invariant and randomized tests target it directly. Run `test:mutations` for the model before opening the PR.
- [Open conflicts with in-flight PRs] → #192 and #194 touch `EditorDocument`/`BlockNode`/`model-types`, not `inline-fragments/`. The folder rename only changes import paths in `BlockNode` and `entities/index.ts`, which may need a trivial rebase. #192 also edits `BlockNode` specs that build `TextNode`s, which only use the public API.

## Migration Plan

No data migration: the serialized format is unchanged and loading is order-independent. Ship as a single implementation PR stacked on this spec PR. Rollback is reverting that PR.

## Open Questions

None blocking. Follow-ups once needed: per-tool rank and inclusivity, multi-instance marks, a mark id table, inline embeds.
